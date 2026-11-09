'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatKst, timeLeft } from '@/lib/datetime';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { StaffForm } from '@/components/organizer/StaffForm';
import { SealBox } from '@/components/SealBox';
import type {
  EventItem,
  EventStats,
  EventEntry,
  EntriesPageResponse,
  SealInfo,
} from '@/types/api';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // 기본 공연 정보 및 탭 상태
  const [activeTab, setActiveTab] = useState<'info' | 'stats'>('info');
  const [ev, setEv] = useState<EventItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 동작 상태
  const [opening, setOpening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [closingAndSealing, setClosingAndSealing] = useState(false);

  // 2주차: 실시간 통계 및 응모자 명단 상태
  const [stats, setStats] = useState<EventStats | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [seal, setSeal] = useState<SealInfo | null>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // 기본 공연 정보 로드
  const loadEvent = useCallback(() => {
    apiFetch<EventItem>(`/api/events/${id}`)
      .then((data) => {
        setEv(data);
        if (data.status === 'closed') {
          apiFetch<SealInfo>(`/api/events/${id}/seal`)
            .then(setSeal)
            .catch(() => {
              // 봉인 정보가 아직 없을 수 있음
            });
        }
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(loadEvent, [loadEvent]);

  // 실시간 통계 로드 함수
  const loadStats = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshingStats(true);
      try {
        const statsData = await apiFetch<EventStats>(`/api/events/${id}/stats`);
        setStats(statsData);
      } catch {
        // 통계 로드 실패 시 무시
      } finally {
        if (isManual) setRefreshingStats(false);
      }
    },
    [id],
  );

  // 응모자 명단 페이징 로드 함수
  const loadEntriesPage = useCallback(
    async (pageNum: number, append = false) => {
      setLoadingEntries(true);
      try {
        const res = await apiFetch<EntriesPageResponse>(
          `/api/events/${id}/entries?page=${pageNum}&size=20`,
        );
        if (append) {
          setEntries((prev) => [...prev, ...res.entries]);
        } else {
          setEntries(res.entries);
        }
        setPage(pageNum);
        setHasMore(res.hasMore);
      } catch {
        // 명단 로드 실패 시 무시
      } finally {
        setLoadingEntries(false);
      }
    },
    [id],
  );

  // 응모 현황 탭 진입 시 데이터 로드 및 30초 주기 자동 갱신
  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
      loadEntriesPage(0, false);

      const interval = setInterval(() => {
        loadStats();
      }, 30000); // 30초마다 자동 갱신

      return () => clearInterval(interval);
    }
  }, [activeTab, loadStats, loadEntriesPage]);

  // 응모 개시 승인
  async function openEntry() {
    if (
      !confirm(
        '응모를 개시하시면 관객 공개 화면에 즉시 노출되며 일반 관객의 응모 접수가 시작됩니다. 응모를 개시하시겠습니까?',
      )
    )
      return;
    setOpening(true);
    setError(null);
    try {
      const updated = await apiFetch<EventItem>(`/api/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'open' }),
      });
      setEv(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : '응모 개시 처리에 실패하였습니다.');
    } finally {
      setOpening(false);
    }
  }

  // 응모 취소 (조기 마감 처리)
  async function cancelEvent() {
    if (
      !confirm(
        '현재 응모 진행 중인 공연을 취소(마감)하시겠습니까?\n\n* 관객 화면에서 응모 접수가 즉시 중단되며, 기존 응모자 데이터는 안전하게 보존됩니다.',
      )
    )
      return;
    setCancelling(true);
    setError(null);
    try {
      const updated = await apiFetch<EventItem>(`/api/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'closed' }),
      });
      setEv(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : '공연 취소 처리에 실패하였습니다.');
    } finally {
      setCancelling(false);
    }
  }

  // 공연 삭제 (휴지통 이동)
  async function deleteEvent() {
    if (
      !confirm(
        '이 공연을 삭제하여 휴지통으로 이동하시겠습니까?\n\n* 삭제된 공연은 좌측 [휴지통] 메뉴에서 언제든 다시 복구하시거나 완전히 영구 삭제하실 수 있습니다.',
      )
    )
      return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
      router.push('/organizer/events');
    } catch (e) {
      setError(e instanceof Error ? e.message : '공연 삭제 처리에 실패하였습니다.');
      setDeleting(false);
    }
  }

  // 2주차 핵심: 응모 마감 및 명단 봉인
  async function closeAndSealEvent() {
    if (!ev) return;
    const entryCount = stats ? stats.totalEntries : 0;
    if (
      !confirm(
        `마감 후에는 응모 및 취소가 불가능하며 절대 되돌릴 수 없습니다.\n총 ${entryCount.toLocaleString()}건의 응모를 최종 마감하고 명단을 봉인하시겠습니까?`,
      )
    ) {
      return;
    }

    setClosingAndSealing(true);
    setError(null);
    try {
      const sealResult = await apiFetch<SealInfo>(`/api/events/${id}/close`, {
        method: 'POST',
      });
      setSeal(sealResult);
      // 이벤트 상태 closed로 갱신
      setEv((prev) => (prev ? { ...prev, status: 'closed' } : null));
      await loadStats();
      alert('성공적으로 응모가 마감되고 공정 추첨 명단이 봉인되었습니다!');
    } catch (e) {
      setError(e instanceof Error ? e.message : '마감 및 명단 봉인 처리에 실패하였습니다.');
    } finally {
      setClosingAndSealing(false);
    }
  }

  if (!ev) {
    return error ? (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    ) : (
      <div className="flex items-center justify-center rounded-2xl bg-white p-12 text-sm text-stone-400">
        공연 정보를 불러오는 중입니다…
      </div>
    );
  }

  const sections = ev.sections ?? [];
  const totalSeats = sections.reduce((sum, s) => sum + s.capacity, 0);
  const schedule: [string, string][] = [
    ['응모 시작 일시', ev.entryStartAt],
    ['응모 마감 일시', ev.entryEndAt],
    ['당첨 결제 마감', ev.paymentDeadlineAt],
    ['실제 공연 일시', ev.eventAt],
  ];

  // 마감 시각 도달 여부 판별
  const now = new Date().getTime();
  const endAt = new Date(ev.entryEndAt).getTime();
  const isAfterEnd = now >= endAt;

  return (
    <div className="space-y-6">
      {/* 뒤로가기 네비게이션 */}
      <Link
        href="/organizer/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"
      >
        <span>&larr; 주최 공연 목록으로 돌아가기</span>
      </Link>

      {/* 상단 티켓링크식 히어로 배너 카드 */}
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:p-8">
          {/* 좌측 포스터 */}
          <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm sm:w-44">
            {ev.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ev.posterUrl} alt={ev.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-900 text-3xl font-black text-white/30">
                {ev.title.charAt(0)}
              </div>
            )}
          </div>

          {/* 우측 공연 개요 및 제어 */}
          <div className="flex flex-1 flex-col justify-between self-stretch">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge status={ev.status} />
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700">
                  응모 마감 {timeLeft(ev.entryEndAt)}
                </span>
                <span className="text-xs text-stone-400">
                  공연 식별 번호: {ev.id.slice(0, 8)}…
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
                {ev.title}
              </h1>
              <p className="mt-1 text-sm font-medium text-stone-600">{ev.venue}</p>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-600">
                <div className="rounded-xl bg-stone-50 px-3 py-2">
                  <span className="text-stone-400">총 배정 좌석: </span>
                  <span className="font-bold text-stone-900">{totalSeats.toLocaleString()}석</span>
                </div>
                <div className="rounded-xl bg-stone-50 px-3 py-2">
                  <span className="text-stone-400">기본 티켓 가격: </span>
                  <span className="font-bold text-stone-900">{won(ev.price)}</span>
                </div>
                <div className="rounded-xl bg-stone-50 px-3 py-2">
                  <span className="text-stone-400">1인당 제비: </span>
                  <span className="font-bold text-stone-900">{ev.ballotsPerUser || 3}장</span>
                </div>
              </div>
            </div>

            {/* 상태별 제어 버튼 (헤더) */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-5">
              {ev.status === 'draft' && (
                <>
                  <Link
                    href={`/organizer/events/${ev.id}/edit`}
                    className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50"
                  >
                    공연 정보 수정
                  </Link>
                  <button
                    type="button"
                    onClick={openEntry}
                    disabled={opening || deleting}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {opening ? '응모 오픈 처리 중…' : '응모 열기'}
                  </button>
                  <button
                    type="button"
                    onClick={deleteEvent}
                    disabled={deleting || opening}
                    className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-300 disabled:opacity-50"
                  >
                    {deleting ? '삭제 처리 중…' : '공연 삭제'}
                  </button>
                </>
              )}

              {ev.status === 'open' && (
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>현재 관객 화면에 정상 공개되어 응모 접수가 진행 중인 공연입니다.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelEvent}
                      disabled={cancelling}
                      className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-2xs hover:bg-rose-50 disabled:opacity-50"
                    >
                      {cancelling ? '취소 처리 중…' : '공연 취소 (응모 조기 중단)'}
                    </button>
                  </div>
                </div>
              )}

              {ev.status === 'closed' && (
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-stone-700">
                    공연 응모가 마감되었습니다. {seal ? '명단이 암호학적으로 봉인되었습니다.' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={deleteEvent}
                    disabled={deleting}
                    className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-2xs hover:bg-rose-50 hover:border-rose-300 disabled:opacity-50"
                  >
                    {deleting ? '삭제 처리 중…' : '휴지통으로 이동'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* 봉인 완료 시 상단 SealBox 노출 */}
      {seal && (
        <SealBox seal={seal} className="my-2" />
      )}

      {/* 2주차 핵심: 탭 네비게이션 */}
      <div className="flex border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-bold transition ${
            activeTab === 'info'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <span>공연 기본 정보</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-bold transition ${
            activeTab === 'stats'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <span>실시간 응모 현황 및 봉인</span>
          {stats && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
              {stats.totalEntries}건
            </span>
          )}
        </button>
      </div>

      {/* 탭 1: 공연 기본 정보 (1주차 내용) */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
              <h2 className="mb-4 text-base font-bold text-stone-900">공연 진행 일정</h2>
              <ol className="space-y-3 text-sm">
                {schedule.map(([label, iso], idx) => (
                  <li
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-stone-100 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-600">
                        {idx + 1}
                      </span>
                      <span className="text-stone-600">{label}</span>
                    </div>
                    <span className="font-semibold tabular-nums text-stone-900">
                      {formatKst(iso)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
              <h2 className="mb-4 text-base font-bold text-stone-900">공정 추첨 정책</h2>
              <dl className="grid grid-cols-3 gap-3 text-center">
                {[
                  ['티켓 기본 가격', won(ev.price)],
                  ['1인당 제비 수', `${ev.ballotsPerUser || 3}장`],
                  ['최대 연석 인원', `${ev.maxTeamSize || 2}인 팀`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-stone-50 p-4">
                    <dt className="text-xs font-medium text-stone-500">{k}</dt>
                    <dd className="mt-1.5 text-base font-black text-stone-900 tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-stone-500">
                * 1인당 부여된 제비 수 내에서 구역별 응모가 분배되며, 최대 연석 인원 범위 내에서 동반인 팀 결성이 가능합니다.
              </p>
            </section>
          </div>

          {/* 좌석 구역 상세 표 */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">등록된 좌석 구역</h2>
                <p className="text-xs text-stone-500">
                  구역별 가격이 지정되지 않은 경우 기본 티켓 가격이 적용됩니다.
                </p>
              </div>
              <span className="text-xs font-semibold text-stone-500">
                총 {totalSeats.toLocaleString('ko-KR')}석
              </span>
            </div>

            {sections.length === 0 ? (
              <p className="text-sm text-stone-400">등록된 구역이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500">
                    <tr>
                      <th className="pb-3 font-semibold">구역 명칭</th>
                      <th className="pb-3 text-right font-semibold">배정 정원</th>
                      <th className="pb-3 text-right font-semibold">티켓 가격</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {sections.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 font-bold text-stone-900">{s.name}</td>
                        <td className="py-3 text-right font-semibold tabular-nums text-stone-800">
                          {s.capacity.toLocaleString('ko-KR')}석
                        </td>
                        <td className="py-3 text-right font-semibold tabular-nums text-stone-900">
                          {won(s.price ?? ev.price)}
                          {s.price == null && (
                            <span className="ml-1 text-[11px] font-normal text-stone-400">(기본가)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 현장 스태프 등록 */}
          <StaffForm eventId={ev.id} />
        </div>
      )}

      {/* 탭 2: 실시간 응모 현황 및 봉인 (2주차 신설 탭) */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* 상단 3대 주요 지표 카드 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="text-xs font-medium text-stone-500">총 응모 인원</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900 tabular-nums">
                  {stats ? stats.totalEntries.toLocaleString() : '—'}
                </span>
                <span className="text-xs text-stone-400">명</span>
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="text-xs font-medium text-stone-500">투입된 총 제비 수</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-600 tabular-nums">
                  {stats ? stats.totalBallots.toLocaleString() : '—'}
                </span>
                <span className="text-xs text-stone-400">장</span>
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="text-xs font-medium text-stone-500">결성된 연석 팀 수</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600 tabular-nums">
                  {stats ? stats.totalTeams.toLocaleString() : '—'}
                </span>
                <span className="text-xs text-stone-400">팀</span>
              </div>
            </div>
          </div>

          {/* 구역별 실시간 경쟁률 표 */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-stone-900">구역별 실시간 경쟁률</h2>
                <p className="text-xs text-stone-500">
                  30초마다 자동으로 새로고침되며, 투입된 제비 수 기준으로 공정 경쟁률을 산출합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadStats(true)}
                disabled={refreshingStats}
                className="rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
              >
                {refreshingStats ? '갱신 중…' : '지금 새로고침'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="pb-3 font-semibold">구역명</th>
                    <th className="pb-3 text-right font-semibold">배정 정원</th>
                    <th className="pb-3 text-right font-semibold">응모자 수</th>
                    <th className="pb-3 text-right font-semibold">투입 제비 수</th>
                    <th className="pb-3 text-right font-semibold text-indigo-600">실시간 경쟁률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {stats?.sectionStats && stats.sectionStats.length > 0 ? (
                    stats.sectionStats.map((s) => (
                      <tr key={s.sectionId} className="hover:bg-stone-50/50">
                        <td className="py-3.5 font-bold text-stone-900">{s.sectionName}</td>
                        <td className="py-3.5 text-right font-semibold tabular-nums text-stone-700">
                          {s.capacity.toLocaleString()}석
                        </td>
                        <td className="py-3.5 text-right font-semibold tabular-nums text-stone-800">
                          {s.entryCount.toLocaleString()}명
                        </td>
                        <td className="py-3.5 text-right font-semibold tabular-nums text-stone-900">
                          {s.ballotCount.toLocaleString()}장
                        </td>
                        <td className="py-3.5 text-right font-black tabular-nums text-indigo-600">
                          {s.ratio}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-stone-400">
                        집계된 응모 현황이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 응모자 명단 표 & 페이징 */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">응모자 명단</h2>
                <p className="text-xs text-stone-500">개인정보 보호를 위해 성함과 연락처 일부가 마스킹 처리됩니다.</p>
              </div>
              <span className="text-xs text-stone-400">
                총 {entries.length}명 조회됨
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-stone-200 text-left text-stone-500 uppercase tracking-wider">
                  <tr>
                    <th className="pb-2.5 font-semibold">이름</th>
                    <th className="pb-2.5 font-semibold">연락처</th>
                    <th className="pb-2.5 font-semibold">희망 구역</th>
                    <th className="pb-2.5 text-right font-semibold">투입 제비</th>
                    <th className="pb-2.5 text-center font-semibold">연석 팀</th>
                    <th className="pb-2.5 text-right font-semibold">응모 일시</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {entries.length > 0 ? (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-stone-50/50">
                        <td className="py-2.5 font-semibold text-stone-900">{entry.userName}</td>
                        <td className="py-2.5 font-mono text-stone-600">{entry.userPhone}</td>
                        <td className="py-2.5 font-medium text-stone-800">{entry.sectionName}</td>
                        <td className="py-2.5 text-right font-bold text-stone-900 tabular-nums">
                          {entry.ballotCount}장
                        </td>
                        <td className="py-2.5 text-center">
                          {entry.isTeam ? (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                              연석 팀
                            </span>
                          ) : (
                            <span className="text-stone-400">개인</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right text-stone-500 tabular-nums">
                          {formatKst(entry.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-stone-400">
                        접수된 응모자가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  disabled={loadingEntries}
                  onClick={() => loadEntriesPage(page + 1, true)}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
                >
                  {loadingEntries ? '불러오는 중…' : '다음 20개 더 보기'}
                </button>
              </div>
            )}
          </section>

          {/* 핵심 하이라이트: 응모 마감 및 명단 봉인 버튼 영역 */}
          {ev.status === 'open' && !seal && (
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    응모 마감 및 공정 추첨 명단 봉인
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                    마감 즉시 모든 응모 명단을 잠그고 SHA-256 무결성 해시 지문을 생성하여 관객들에게 영구 공개합니다.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    type="button"
                    disabled={!isAfterEnd || closingAndSealing}
                    onClick={closeAndSealEvent}
                    className={`rounded-2xl px-6 py-3.5 text-xs font-bold text-white shadow-md transition ${
                      isAfterEnd
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                        : 'bg-stone-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {closingAndSealing ? '명단 봉인 및 해시 계산 중…' : '응모 마감하고 명단 봉인'}
                  </button>
                  {!isAfterEnd && (
                    <span className="text-[11px] font-semibold text-rose-600">
                      * 마감 시각({formatKst(ev.entryEndAt)}) 이후에 누르실 수 있습니다.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
