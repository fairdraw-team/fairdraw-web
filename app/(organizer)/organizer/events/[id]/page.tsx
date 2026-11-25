'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, RefreshCw } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { formatKst, timeLeft } from '@/lib/datetime';
import { isAtLeast } from '@/lib/eventStatus';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { StaffForm } from '@/components/organizer/StaffForm';
import { DrawTab } from '@/components/organizer/DrawTab';
import { PaymentTab } from '@/components/organizer/PaymentTab';
import { SealBox } from '@/components/SealBox';
import { DrawBox } from '@/components/DrawBox';
import type {
  DrawInfo,
  EntriesPageResponse,
  EventEntry,
  EventItem,
  EventStats,
  EventStatus,
  PaymentStats,
  SealInfo,
} from '@/types/api';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

type TabKey = 'info' | 'stats' | 'draw' | 'payment';

const WORKFLOW_STEPS: { status: EventStatus; label: string }[] = [
  { status: 'draft', label: '준비 중' },
  { status: 'open', label: '응모 중' },
  { status: 'closed', label: '마감 · 봉인' },
  { status: 'drawn', label: '추첨 완료' },
  { status: 'paying', label: '결제 중' },
  { status: 'done', label: '종료' },
];

function EventDetailContent() {
  const params = useParams();
  const id =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : '';

  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [ev, setEv] = useState<EventItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const [opening, setOpening] = useState(false);
  const [closingAndSealing, setClosingAndSealing] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const [stats, setStats] = useState<EventStats | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [seal, setSeal] = useState<SealInfo | null>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);

  const [drawInfo, setDrawInfo] = useState<DrawInfo | null>(null);
  const [initialPaymentStats, setInitialPaymentStats] =
    useState<PaymentStats | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadEvent = useCallback(() => {
    if (!id) return;
    apiFetch<EventItem>(`/api/events/${id}`)
      .then((data) => {
        setEv(data);
        if (isAtLeast(data.status, 'closed')) {
          apiFetch<SealInfo>(`/api/public/events/${id}/seal`, { auth: false })
            .then(setSeal)
            .catch(() => {});
        }
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const loadStats = useCallback(
    async (isManual = false) => {
      if (!id) return;
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

  const loadEntriesPage = useCallback(
    async (pageNum: number, append = false) => {
      if (!id) return;
      setLoadingEntries(true);
      try {
        const res = await apiFetch<EntriesPageResponse>(
          `/api/events/${id}/entries?page=${pageNum}&size=20`,
        );
        const list = res.content ?? [];
        setEntries((prev) => (append ? [...prev, ...list] : list));
        setPage(res.page ?? pageNum);
        setTotalPages(res.totalPages ?? 1);
        setTotalElements(res.totalElements ?? list.length);
      } catch {
        // 명단 로드 실패 시 무시
      } finally {
        setLoadingEntries(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
      loadEntriesPage(0, false);

      const interval = setInterval(() => {
        loadStats();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [activeTab, loadStats, loadEntriesPage]);

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
      setError(
        e instanceof Error ? e.message : '응모 개시 처리에 실패하였습니다.',
      );
    } finally {
      setOpening(false);
    }
  }

  async function closeAndSealEvent() {
    if (!ev) return;
    const applicantCount = stats ? stats.totalApplicants : 0;
    if (
      !confirm(
        `마감 후에는 응모 및 취소가 불가능하며 절대 되돌릴 수 없습니다.\n총 ${applicantCount.toLocaleString()}명의 응모를 최종 마감하고 명단을 봉인하시겠습니까?`,
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
      setEv((prev) => (prev ? { ...prev, status: 'closed' } : null));
      await loadStats();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '마감 및 명단 봉인 처리에 실패하였습니다.',
      );
    } finally {
      setClosingAndSealing(false);
    }
  }

  async function handleRunDraw() {
    if (!ev || drawing) return;
    const ballotCount = seal?.ballotCount ?? stats?.totalBallots ?? 0;
    if (
      !confirm(
        `추첨은 한 번만 할 수 있고 되돌릴 수 없습니다. 봉인된 제비 ${ballotCount}장으로 추첨할까요?`,
      )
    ) {
      return;
    }

    setDrawing(true);
    setError(null);
    try {
      const res = await apiFetch<DrawInfo>(`/api/events/${id}/draw`, {
        method: 'POST',
      });
      setDrawInfo(res);
      setEv((prev) => (prev ? { ...prev, status: 'drawn' } : null));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 && err.code === 'ALREADY_DRAWN') {
          loadEvent();
          return;
        }
        if (err.code === 'EVENT_NOT_CLOSED') {
          setError('먼저 응모를 마감하세요');
          return;
        }
        if (err.status === 409 && err.code === 'ROSTER_MISMATCH') {
          setError(err.message);
          return;
        }
        setError(err.message);
      } else {
        setError(
          err instanceof Error ? err.message : '추첨 실행에 실패하였습니다.',
        );
      }
    } finally {
      setDrawing(false);
    }
  }

  if (!ev) {
    return error ? (
      <div
        role="alert"
        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
      >
        {error}
      </div>
    ) : (
      <div className="rounded-lg border border-[#E5E8EB] bg-white px-6 py-16 text-center text-xs text-[#6B7684]">
        공연 정보를 불러오는 중입니다…
      </div>
    );
  }

  const sections = ev.sections ?? [];
  const totalSeats = sections.reduce((sum, s) => sum + s.capacity, 0);
  const schedule: [string, string][] = [
    ['응모 시작', ev.entryOpensAt],
    ['응모 마감', ev.entryClosesAt],
    ['결제 마감', ev.paymentDueAt],
    ['공연 일시', ev.startsAt],
  ];

  const endAt = new Date(ev.entryClosesAt).getTime();
  const isAfterEnd = now !== null ? now >= endAt : false;
  const hasMoreEntries = page + 1 < totalPages;
  const showDrawTab = isAtLeast(ev.status, 'drawn');
  const showPaymentTab = isAtLeast(ev.status, 'paying');
  const currentStepIdx = WORKFLOW_STEPS.findIndex((s) => s.status === ev.status);

  return (
    <div className="space-y-5">
      <Link
        href="/organizer/events"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7684] transition-colors hover:text-[#191F28]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>주최 공연 목록</span>
      </Link>

      {/* 공연 상단 제어 헤더 패널 */}
      <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-[#E5E8EB] bg-[#F2F4F6]">
              {ev.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ev.posterUrl}
                  alt={ev.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8B95A1]">
                  {ev.title.charAt(0)}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ev.status} />
                <span className="font-mono text-[11px] text-[#8B95A1]">
                  ID {ev.id.slice(-8)}
                </span>
                <span className="text-[11px] tabular-nums text-[#6B7684]">
                  {ev.status === 'drawn' || ev.status === 'paying'
                    ? `결제 마감 ${now ? timeLeft(ev.paymentDueAt, now) : '—'}`
                    : `응모 마감 ${now ? timeLeft(ev.entryClosesAt, now) : '—'}`}
                </span>
              </div>
              <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-[#191F28] sm:text-xl">
                {ev.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7684]">
                <span>{ev.venue}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">총 {totalSeats.toLocaleString()}석</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">기본가 {won(ev.price)}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">1인당 {ev.ballotsPerUser || 3}장</span>
              </div>
            </div>
          </div>

          {/* 현재 단계 핵심 액션 버튼 */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[#E5E8EB] pt-3.5 lg:border-t-0 lg:pt-0">
            {ev.status === 'draft' && (
              <>
                <Link
                  href={`/organizer/events/${ev.id}/edit`}
                  className="rounded-md border border-[#D1D6DB] bg-white px-3 py-1.5 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6]"
                >
                  정보 수정
                </Link>
                <button
                  type="button"
                  onClick={openEntry}
                  disabled={opening}
                  className="cursor-pointer rounded-md bg-[#1B64DA] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1554BD] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {opening ? '처리 중…' : '응모 열기'}
                </button>
              </>
            )}

            {ev.status === 'open' && (
              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className="cursor-pointer rounded-md bg-[#191F28] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#333D4B]"
              >
                응모 현황 · 마감 관리
              </button>
            )}

            {ev.status === 'closed' && (
              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className="cursor-pointer rounded-md bg-[#1B64DA] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1554BD]"
              >
                추첨 실행하기
              </button>
            )}

            {showDrawTab && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('draw')}
                  className="cursor-pointer rounded-md border border-[#D1D6DB] bg-white px-3 py-1.5 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6]"
                >
                  추첨 결과
                </button>
                {showPaymentTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('payment')}
                    className="cursor-pointer rounded-md bg-[#191F28] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#333D4B]"
                  >
                    결제 현황
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 운영 단계 진행 바 */}
        <div className="border-t border-[#E5E8EB] bg-[#F9FAFB] px-5 py-2.5">
          <ol className="flex items-center gap-2 overflow-x-auto text-[11px]">
            {WORKFLOW_STEPS.map((step, idx) => {
              const done = currentStepIdx > idx;
              const current = currentStepIdx === idx;
              return (
                <li key={step.status} className="flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      current
                        ? 'font-semibold text-[#191F28]'
                        : done
                          ? 'font-medium text-[#4E5968]'
                          : 'text-[#8B95A1]'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] tabular-nums ${
                        done
                          ? 'bg-emerald-600 text-white'
                          : current
                            ? 'bg-[#1B64DA] text-white'
                            : 'border border-[#D1D6DB] bg-white text-[#8B95A1]'
                      }`}
                    >
                      {done ? <Check className="h-2.5 w-2.5" aria-hidden="true" /> : idx + 1}
                    </span>
                    <span>{step.label}</span>
                  </span>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <span className="h-px w-4 bg-[#D1D6DB]" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
        >
          {error}
        </div>
      )}

      {/* 탭 바 */}
      <div
        role="tablist"
        aria-label="공연 관리 탭"
        className="flex items-center gap-1 overflow-x-auto border-b border-[#E5E8EB]"
      >
        {(
          [
            { key: 'info', label: '기본 정보', visible: true },
            {
              key: 'stats',
              label: '응모 현황',
              visible: true,
              badge: stats ? `${stats.totalApplicants.toLocaleString()}` : undefined,
            },
            { key: 'draw', label: '추첨 결과', visible: showDrawTab },
            { key: 'payment', label: '결제 현황', visible: showPaymentTab },
          ] as { key: TabKey; label: string; visible: boolean; badge?: string }[]
        )
          .filter((t) => t.visible)
          .map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2.5 text-[13px] transition-colors ${
                  active
                    ? 'border-[#191F28] font-semibold text-[#191F28]'
                    : 'border-transparent font-medium text-[#6B7684] hover:text-[#191F28]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="rounded bg-[#F2F4F6] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-[#4E5968]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* 탭 1: 기본 정보 */}
      {activeTab === 'info' && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
              <div className="border-b border-[#E5E8EB] px-5 py-3.5">
                <h2 className="text-sm font-semibold text-[#191F28]">진행 일정</h2>
              </div>
              <dl className="divide-y divide-[#E5E8EB] text-xs">
                {schedule.map(([label, iso]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <dt className="text-[#6B7684]">{label}</dt>
                    <dd className="font-medium tabular-nums text-[#191F28]">
                      {formatKst(iso)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
              <div className="border-b border-[#E5E8EB] px-5 py-3.5">
                <h2 className="text-sm font-semibold text-[#191F28]">추첨 및 연석 정책</h2>
              </div>
              <dl className="divide-y divide-[#E5E8EB] text-xs">
                <div className="flex items-center justify-between px-5 py-3">
                  <dt className="text-[#6B7684]">기본 티켓 가격</dt>
                  <dd className="font-semibold tabular-nums text-[#191F28]">
                    {won(ev.price)}
                  </dd>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <dt className="text-[#6B7684]">1인당 부여 제비 수</dt>
                  <dd className="font-semibold tabular-nums text-[#191F28]">
                    {ev.ballotsPerUser || 3}장
                  </dd>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <dt className="text-[#6B7684]">최대 연석 팀 인원</dt>
                  <dd className="font-semibold tabular-nums text-[#191F28]">
                    {ev.maxTeamSize || 2}명
                  </dd>
                </div>
              </dl>
              <div className="border-t border-[#E5E8EB] bg-[#F9FAFB] px-5 py-3 text-[11px] leading-relaxed text-[#6B7684]">
                1인당 부여된 제비 수 내에서 구역별 분배 응모가 가능하며, 최대 인원 범위 내에서 연석 팀을 결성할 수 있습니다.
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
            <div className="flex items-center justify-between border-b border-[#E5E8EB] px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-[#191F28]">좌석 구역 및 정원</h2>
                <p className="mt-0.5 text-xs text-[#6B7684]">
                  구역별 가격 미지정 시 기본 티켓 가격이 적용됩니다.
                </p>
              </div>
              <span className="text-xs font-medium tabular-nums text-[#4E5968]">
                총 {totalSeats.toLocaleString('ko-KR')}석
              </span>
            </div>

            {sections.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-[#6B7684]">
                등록된 좌석 구역이 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E8EB] bg-[#F9FAFB] text-left text-[11px] font-medium text-[#6B7684]">
                      <th className="px-5 py-2.5 font-medium">구역명</th>
                      <th className="px-5 py-2.5 text-right font-medium">배정 정원</th>
                      <th className="px-5 py-2.5 text-right font-medium">티켓 가격</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E8EB]">
                    {sections.map((s) => (
                      <tr key={s.id} className="hover:bg-[#F9FAFB]">
                        <td className="px-5 py-3 font-medium text-[#191F28]">{s.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[#333D4B]">
                          {s.capacity.toLocaleString('ko-KR')}석
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums text-[#191F28]">
                          {won(s.price ?? ev.price)}
                          {s.price == null && (
                            <span className="ml-1.5 text-[11px] font-normal text-[#8B95A1]">
                              (기본가)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <StaffForm eventId={ev.id} />
        </div>
      )}

      {/* 탭 2: 응모 현황 · 마감 봉인 · 추첨 실행 */}
      {activeTab === 'stats' && (
        <div className="space-y-5">
          {/* 통합 KPI 스트립 */}
          <div className="grid grid-cols-2 divide-x divide-y divide-[#E5E8EB] overflow-hidden rounded-lg border border-[#E5E8EB] bg-white sm:grid-cols-4 sm:divide-y-0">
            <div className="px-5 py-4">
              <div className="text-xs text-[#6B7684]">총 응모 인원</div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums text-[#191F28]">
                  {stats ? stats.totalApplicants.toLocaleString() : '—'}
                </span>
                <span className="text-xs text-[#8B95A1]">명</span>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="text-xs text-[#6B7684]">투입된 총 제비</div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums text-[#1B64DA]">
                  {stats ? stats.totalBallots.toLocaleString() : '—'}
                </span>
                <span className="text-xs text-[#8B95A1]">장</span>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="text-xs text-[#6B7684]">결성된 연석 팀</div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums text-[#191F28]">
                  {stats ? stats.teamCount.toLocaleString() : '—'}
                </span>
                <span className="text-xs text-[#8B95A1]">팀</span>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="text-xs text-[#6B7684]">취소된 응모</div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums text-[#6B7684]">
                  {stats ? stats.cancelledCount.toLocaleString() : '—'}
                </span>
                <span className="text-xs text-[#8B95A1]">건</span>
              </div>
            </div>
          </div>

          {/* 구역별 실시간 경쟁률 */}
          <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E8EB] px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-[#191F28]">
                  구역별 실시간 경쟁률
                </h2>
                <p className="mt-0.5 text-xs text-[#6B7684]">
                  30초마다 자동 갱신되며 투입 제비 수 기준으로 산출됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadStats(true)}
                disabled={refreshingStats}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#D1D6DB] bg-white px-3 py-1.5 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6] disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-[#6B7684] ${refreshingStats ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{refreshingStats ? '갱신 중…' : '새로고침'}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E8EB] bg-[#F9FAFB] text-left text-[11px] font-medium text-[#6B7684]">
                    <th className="px-5 py-2.5 font-medium">구역명</th>
                    <th className="px-5 py-2.5 text-right font-medium">배정 정원</th>
                    <th className="px-5 py-2.5 text-right font-medium">응모자 수</th>
                    <th className="px-5 py-2.5 text-right font-medium">투입 제비</th>
                    <th className="px-5 py-2.5 text-right font-medium">경쟁률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EB]">
                  {stats?.sections && stats.sections.length > 0 ? (
                    stats.sections.map((s) => (
                      <tr key={s.sectionId} className="hover:bg-[#F9FAFB]">
                        <td className="px-5 py-3 font-medium text-[#191F28]">{s.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[#4E5968]">
                          {s.capacity.toLocaleString()}석
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-[#333D4B]">
                          {s.applicants.toLocaleString()}명
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-[#191F28]">
                          {s.ballots.toLocaleString()}장
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-[#1B64DA]">
                          {s.ratio} : 1
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-xs text-[#6B7684]">
                        집계된 응모 현황이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 응모자 명단 */}
          <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
            <div className="flex items-center justify-between border-b border-[#E5E8EB] px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-[#191F28]">응모자 명단</h2>
                <p className="mt-0.5 text-xs text-[#6B7684]">
                  개인정보 보호를 위해 연락처 뒤 4자리만 표시됩니다.
                </p>
              </div>
              <span className="text-xs font-medium tabular-nums text-[#6B7684]">
                총 {totalElements.toLocaleString()}명
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E8EB] bg-[#F9FAFB] text-left text-[11px] font-medium text-[#6B7684]">
                    <th className="px-5 py-2.5 font-medium">이름</th>
                    <th className="px-5 py-2.5 font-medium">연락처</th>
                    <th className="px-5 py-2.5 font-medium">응모 구역</th>
                    <th className="px-5 py-2.5 text-right font-medium">투입 제비</th>
                    <th className="px-5 py-2.5 text-center font-medium">구분</th>
                    <th className="px-5 py-2.5 text-right font-medium">응모 일시</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EB]">
                  {entries.length > 0 ? (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#F9FAFB]">
                        <td className="px-5 py-2.5 font-medium text-[#191F28]">
                          {entry.realName}
                        </td>
                        <td className="px-5 py-2.5 font-mono text-[#4E5968]">
                          {entry.phone}
                        </td>
                        <td className="px-5 py-2.5 text-[#333D4B]">
                          {entry.allocations && entry.allocations.length > 0
                            ? entry.allocations
                                .map((a) => `${a.sectionName || a.sectionId}(${a.ballots})`)
                                .join(', ')
                            : '—'}
                        </td>
                        <td className="px-5 py-2.5 text-right font-medium tabular-nums text-[#191F28]">
                          {entry.ballots}장
                        </td>
                        <td className="px-5 py-2.5 text-center">
                          {entry.teamId ? (
                            <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-[#1B64DA]">
                              연석 팀
                            </span>
                          ) : (
                            <span className="text-[#8B95A1]">개인</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-[#6B7684]">
                          {formatKst(entry.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-xs text-[#6B7684]">
                        접수된 응모자가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {hasMoreEntries && (
              <div className="border-t border-[#E5E8EB] bg-[#F9FAFB] px-5 py-3 text-center">
                <button
                  type="button"
                  disabled={loadingEntries}
                  onClick={() => loadEntriesPage(page + 1, true)}
                  className="cursor-pointer rounded-md border border-[#D1D6DB] bg-white px-4 py-1.5 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6] disabled:opacity-50"
                >
                  {loadingEntries ? '불러오는 중…' : '다음 20개 더 보기'}
                </button>
              </div>
            )}
          </section>

          {/* 마감 및 명단 봉인 제어 패널 */}
          {ev.status === 'open' && !seal && (
            <section className="flex flex-col gap-4 rounded-lg border border-[#E5E8EB] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#191F28]">
                  응모 마감 및 명단 봉인
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#6B7684]">
                  마감 즉시 응모 명단을 잠그고 SHA-256 무결성 해시를 생성해 관객에게 공개합니다. 마감 후에는 되돌릴 수 없습니다.
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                <button
                  type="button"
                  disabled={!isAfterEnd || closingAndSealing}
                  onClick={closeAndSealEvent}
                  className={`rounded-md px-4 py-2 text-xs font-medium text-white transition-colors ${
                    isAfterEnd
                      ? 'cursor-pointer bg-[#1B64DA] hover:bg-[#1554BD]'
                      : 'cursor-not-allowed bg-[#B0B8C1]'
                  }`}
                >
                  {closingAndSealing
                    ? '봉인 처리 중…'
                    : '응모 마감하고 명단 봉인'}
                </button>
                {!isAfterEnd && (
                  <span className="text-[11px] tabular-nums text-rose-600">
                    마감 시각({formatKst(ev.entryClosesAt)}) 이후 활성화됩니다.
                  </span>
                )}
              </div>
            </section>
          )}

          {seal && <SealBox seal={seal} />}

          {/* 추첨 실행 제어 패널 (closed 상태 전용) */}
          {ev.status === 'closed' && (
            <section className="flex flex-col gap-4 rounded-lg border border-[#BFDBFE] bg-[#F5F9FF] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#191F28]">
                  봉인된 명단으로 공정 추첨 실행
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#4E5968]">
                  추첨은 1회만 실행되며 되돌릴 수 없습니다. 실행 즉시 공개 시드와 구역별 당첨·대기 순번이 확정됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunDraw}
                disabled={drawing}
                className="shrink-0 cursor-pointer rounded-md bg-[#1B64DA] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1554BD] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {drawing ? '추첨 실행 중…' : '추첨하기'}
              </button>
            </section>
          )}

          {showDrawTab && <DrawBox eventId={ev.id} initialDraw={drawInfo} />}
        </div>
      )}

      {/* 탭 3: 추첨 결과 */}
      {activeTab === 'draw' && showDrawTab && (
        <DrawTab
          eventId={ev.id}
          eventStatus={ev.status}
          paymentDueAt={ev.paymentDueAt}
          initialDraw={drawInfo}
          onPaymentOpened={(pStats) => {
            if (pStats) setInitialPaymentStats(pStats);
            setEv((prev) => (prev ? { ...prev, status: 'paying' } : null));
            setActiveTab('payment');
          }}
          onReloadEvent={loadEvent}
        />
      )}

      {/* 탭 4: 결제 현황 */}
      {activeTab === 'payment' && showPaymentTab && (
        <PaymentTab
          eventId={ev.id}
          eventStatus={ev.status}
          paymentDueAt={ev.paymentDueAt}
          initialStats={initialPaymentStats}
          onStatusChange={(nextStatus: EventStatus) => {
            setEv((prev) => (prev ? { ...prev, status: nextStatus } : null));
          }}
        />
      )}
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-[#E5E8EB] bg-white px-6 py-16 text-center text-xs text-[#6B7684]">
          공연 화면을 준비하는 중입니다…
        </div>
      }
    >
      <EventDetailContent />
    </Suspense>
  );
}
