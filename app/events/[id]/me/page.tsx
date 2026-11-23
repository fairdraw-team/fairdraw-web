'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import { isAtLeast } from '@/lib/eventStatus';
import { SealBox } from '@/components/SealBox';
import type { EventItem, MyEntry, SealInfo, Team } from '@/types/api';

function MyEntryContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [entry, setEntry] = useState<MyEntry | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [seal, setSeal] = useState<SealInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        // 1. 공연 기본 정보 로드
        const evData = await apiFetch<EventItem>(`/api/public/events/${id}`, {
          auth: false,
        }).catch(() => apiFetch<EventItem>(`/api/events/${id}`, { auth: false }));

        if (ignore) return;
        setEvent(evData);

        // 2. 마감(closed) 이상 상태면 공개 봉인 정보(SealBox) 로드
        if (evData.status !== 'draft' && evData.status !== 'open') {
          apiFetch<SealInfo>(`/api/public/events/${id}/seal`, { auth: false })
            .then((s) => {
              if (!ignore) setSeal(s);
            })
            .catch(() => {});
        }

        // 3. 내 응모 내역 조회 (GET /api/events/{id}/entries/me)
        try {
          const entryData = await apiFetch<MyEntry>(`/api/events/${id}/entries/me`);
          if (ignore) return;
          setEntry(entryData);
          setNotFound(false);

          // 4. 팀 응모인 경우 teamId로 팀 상세(팀원 이름 목록) 추가 조회
          if (entryData.teamId) {
            apiFetch<Team>(`/api/teams/${entryData.teamId}`)
              .then((t) => {
                if (!ignore) setTeam(t);
              })
              .catch(() => {});
          }
        } catch (err) {
          if (!ignore) {
            if (err instanceof ApiError && err.status === 404) {
              setNotFound(true);
            } else {
              setErrorMsg(
                err instanceof Error ? err.message : '응모 내역을 불러오지 못했습니다.'
              );
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(
            err instanceof Error ? err.message : '공연 정보를 불러오지 못했습니다.'
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [id]);

  // 개인 응모 취소 핸들러 (DELETE /api/events/{id}/entries/me)
  const handleCancelEntry = async () => {
    if (!confirm('정말로 응모를 취소하시겠습니까? 마감 전이라면 다시 응모하실 수 있습니다.')) {
      return;
    }

    setCancelling(true);
    try {
      await apiFetch(`/api/events/${id}/entries/me`, {
        method: 'DELETE',
      });
      alert('응모가 취소되었습니다.');
      router.push(`/events/${id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '응모 취소에 실패했습니다.');
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
          내 응모 내역을 확인하는 중입니다…
        </div>
      </div>
    );
  }

  const isClosed = event ? event.status !== 'open' : false;
  const isDrawn = event ? isAtLeast(event.status, 'drawn') : false;
  const isPaying = event ? isAtLeast(event.status, 'paying') : false;
  const isDone = event?.status === 'done';

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link
            href={`/events/${id}`}
            className="text-xs font-bold text-stone-600 hover:text-stone-900"
          >
            &larr; 공연 상세로 돌아가기
          </Link>
          <span className="text-xs font-black text-stone-900">내 응모 확인</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* 공연 제목 요약 */}
        {event && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-600">응모 공연</span>
            <h1 className="mt-1 text-lg font-black text-stone-900">{event.title}</h1>
            <p className="mt-1 text-xs text-stone-500">
              {event.venue} ·{' '}
              {formatKst(
                (event as unknown as { startsAt?: string; eventAt?: string }).startsAt ??
                  (event as unknown as { eventAt?: string }).eventAt ??
                  ''
              )}
            </p>
          </div>
        )}

        {/* 추첨 완료 / 결제 중 / 종료 안내 및 결과·검증 이동 배너 */}
        {isDrawn && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5 shadow-xs">
            <p className="text-sm font-extrabold text-indigo-950">
              {isDone ? '결제 종료' : isPaying ? '결제 진행 중' : '추첨 완료'}
            </p>
            <p className="mt-1 text-xs text-indigo-700">
              {isDone
                ? '모든 결제 절차가 종료되었습니다. 결과 및 티켓을 확인하실 수 있습니다.'
                : isPaying
                  ? '당첨자 및 승계 대상자의 결제가 진행 중입니다. 내 결과에서 결제 상태를 확인하세요.'
                  : '당첨·대기·낙첨 결과 확인과 공개 시드 검증을 진행하실 수 있습니다.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href={`/events/${id}/result`}
                className="rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-stone-800"
              >
                내 결과 보기 &rarr;
              </Link>
              <Link
                href={`/events/${id}/verify`}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-800 transition hover:bg-stone-50"
              >
                추첨 검증하기
              </Link>
            </div>
          </div>
        )}

        {/* 마감 후 명단 봉인 정보 상자 */}
        {seal && <SealBox seal={seal} />}

        {/* 에러 표시 */}
        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {errorMsg}
          </div>
        )}

        {/* 404: 아직 응모하지 않은 상태 */}
        {notFound && (
          <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-xs">
            <p className="text-base font-bold text-stone-800">아직 응모하지 않았습니다.</p>
            <p className="mt-1.5 text-xs text-stone-500">
              마감 시각 전까지 원하는 좌석 구역에 제비를 배분해 응모해 보세요.
            </p>
            {!isClosed && (
              <Link
                href={`/events/${id}/enter`}
                className="mt-6 inline-block rounded-xl bg-stone-900 px-6 py-3 text-xs font-bold text-white hover:bg-stone-800"
              >
                제비 배분하고 응모하기 &rarr;
              </Link>
            )}
          </div>
        )}

        {/* 응모 내역 상세 */}
        {entry && (
          <section className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">나의 제비 배분 내역</h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  응모 시각: {formatKst(entry.createdAt)}
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                {entry.status === 'active' ? '응모 완료' : '취소됨'}
              </span>
            </div>

            {/* 연석 팀 정보 표시 (entry.teamId가 있는 경우) */}
            {entry.teamId && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-700">
                    연석 팀 응모 {team ? `(${team.members.length}/${team.maxSize}명)` : ''}
                  </span>
                  <Link
                    href={`/teams/${entry.teamId}`}
                    className="text-xs font-bold text-indigo-600 underline"
                  >
                    팀 상세 화면 이동 &rarr;
                  </Link>
                </div>
                {team?.members && team.members.length > 0 && (
                  <p className="mt-1.5 text-xs text-stone-600">
                    함께 응모한 팀원: {team.members.map((m) => m.realName).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* 구역별 제비 수 표 */}
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 text-left text-xs text-stone-500">
                <tr>
                  <th className="pb-2.5 font-semibold">응모 구역</th>
                  <th className="pb-2.5 text-right font-semibold">투입한 제비 수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {entry.allocations.map((alloc) => (
                  <tr key={alloc.sectionId}>
                    <td className="py-3 font-bold text-stone-900">
                      {alloc.sectionName || alloc.sectionId}
                    </td>
                    <td className="py-3 text-right font-black tabular-nums text-indigo-600">
                      {alloc.ballots}장
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 하단 취소 / 팀 탈퇴 안내 */}
            {!isClosed && entry.status === 'active' && (
              <div className="border-t border-stone-100 pt-4">
                {entry.teamId ? (
                  <div className="rounded-xl bg-stone-100 p-3.5 text-center text-xs text-stone-600">
                    연석 팀으로 응모된 내역입니다. 취소하려면{' '}
                    <Link
                      href={`/teams/${entry.teamId}`}
                      className="font-bold text-indigo-600 underline"
                    >
                      팀 화면에서 탈퇴
                    </Link>
                    하세요.
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleCancelEntry}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    {cancelling ? '취소 처리 중...' : '개인 응모 취소하기'}
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default function MyEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
            내 응모 화면을 불러오는 중입니다…
          </div>
        </div>
      }
    >
      <MyEntryContent params={params} />
    </Suspense>
  );
}