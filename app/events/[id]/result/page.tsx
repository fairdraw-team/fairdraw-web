'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { formatKst } from '@/lib/datetime';
import { SealBox } from '@/components/SealBox';
import { DrawBox } from '@/components/DrawBox';
import type { EventItem, MyDrawResult, SealInfo } from '@/types/api';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  ShieldCheck,
  AlertCircle,
  Lock,
} from 'lucide-react';

type ResultViewState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: MyDrawResult }
  | { kind: 'draw_not_found' }
  | { kind: 'entry_not_found' }
  | { kind: 'error'; message: string };

function MyDrawResultContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [seal, setSeal] = useState<SealInfo | null>(null);
  const [state, setState] = useState<ResultViewState>({ kind: 'loading' });

  useEffect(() => {
    let ignore = false;

    async function load() {
      // 비로그인 상태면 로그인 화면으로 이동 후 복귀 (USE_MOCK이 아닐 때 우선 체크)
      const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
      if (!isMock) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.replace(`/login?next=/events/${eventId}/result`);
          return;
        }
      }

      // 1. 공연 기본 정보(결제 마감 시각 paymentDueAt 등) 로드
      const evPromise = apiFetch<EventItem>(`/api/public/events/${eventId}`, {
        auth: false,
      })
        .catch(() => apiFetch<EventItem>(`/api/events/${eventId}`, { auth: false }))
        .catch(() => null);

      // 2. 내 추첨 결과 조회 (GET /api/events/{id}/draw/me)
      const mePromise = apiFetch<MyDrawResult>(`/api/events/${eventId}/draw/me`);

      const [evData] = await Promise.all([
        evPromise,
        mePromise
          .then((res) => {
            if (!ignore) {
              setState({ kind: 'ready', data: res });
            }
          })
          .catch((err) => {
            if (ignore) return;
            if (err instanceof ApiError && err.status === 404) {
              if (err.code === 'DRAW_NOT_FOUND') {
                setState({ kind: 'draw_not_found' });
              } else if (err.code === 'ENTRY_NOT_FOUND') {
                setState({ kind: 'entry_not_found' });
              } else {
                // 코드가 비어 있을 경우 기본 404 처리
                setState({ kind: 'draw_not_found' });
              }
              return;
            }
            setState({
              kind: 'error',
              message:
                err instanceof Error ? err.message : '추첨 결과를 불러오지 못했습니다.',
            });
          }),
      ]);

      if (ignore) return;
      if (evData) {
        setEvent(evData);
      }

      // 추첨 전(DRAW_NOT_FOUND) 상태에서도 봉인 상자를 보여주기 위해 봉인 정보 조회
      apiFetch<SealInfo>(`/api/public/events/${eventId}/seal`, { auth: false })
        .then((s) => {
          if (!ignore) setSeal(s);
        })
        .catch(() => {});
    }

    load();
    return () => {
      ignore = true;
    };
  }, [eventId, router]);

  if (state.kind === 'loading') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
          내 추첨 결과를 확인하는 중입니다…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 antialiased">
      {/* 상단 네비게이션 */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link
            href={`/events/${eventId}`}
            className="text-xs font-bold text-stone-600 hover:text-stone-900"
          >
            &larr; 공연 상세로 돌아가기
          </Link>
          <span className="text-xs font-black text-stone-900">추첨 결과 확인</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* 공연 제목 요약 */}
        {event && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-600">대상 공연</span>
            <h1 className="mt-1 text-lg font-black text-stone-900">{event.title}</h1>
            <p className="mt-1 text-xs text-stone-500">
              {event.venue} · {formatKst(event.eventAt)}
            </p>
          </div>
        )}

        {/* 1) 정상 결과 (won / waitlisted / lost) */}
        {state.kind === 'ready' && (
          <section className="space-y-4">
            {/* 당첨 (won) */}
            {state.data.result === 'won' && (
              <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/60 p-6 shadow-xs">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    Winner
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-black text-stone-900">
                  당첨되었습니다. {state.data.sectionName}구역
                </h2>
                <div className="mt-4 space-y-1.5 rounded-2xl border border-emerald-200 bg-white p-4 text-xs text-stone-700">
                  {event?.paymentDueAt && (
                    <p>
                      <span className="font-semibold text-stone-500">결제 마감 시각: </span>
                      <b className="font-extrabold text-rose-600">
                        {formatKst(event.paymentDueAt)}
                      </b>
                    </p>
                  )}
                  <p className="font-bold text-emerald-800">결제는 다음 주에 열립니다.</p>
                </div>
              </div>
            )}

            {/* 대기 (waitlisted) */}
            {state.data.result === 'waitlisted' && (
              <div className="rounded-3xl border-2 border-amber-400 bg-amber-50/60 p-6 shadow-xs">
                <div className="flex items-center gap-2 text-amber-700">
                  <Clock className="h-6 w-6 shrink-0" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    Waitlisted
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-black text-stone-900">
                  {state.data.sectionName}구역 대기 {state.data.waitlistRank}번
                </h2>
                <p className="mt-3 rounded-2xl border border-amber-200 bg-white p-4 text-xs font-semibold text-amber-900">
                  앞 순번이 결제하지 않으면 자리가 넘어옵니다.
                </p>
              </div>
            )}

            {/* 낙첨 (lost) */}
            {state.data.result === 'lost' && (
              <div className="rounded-3xl border border-stone-300 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2 text-stone-500">
                  <XCircle className="h-6 w-6 shrink-0" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    Not Selected
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-black text-stone-900">
                  아쉽지만 이번에는 당첨되지 않았습니다
                </h2>
                <p className="mt-2 text-xs text-stone-500">
                  추첨 과정의 공정성과 내 제비 순서는 아래 검증 페이지에서 직접 확인하실 수 있습니다.
                </p>
              </div>
            )}

            {/* 연석 팀 안내 (teamId가 있는 경우) */}
            {state.data.teamId && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3.5 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-indigo-900">
                  <Users className="h-4 w-4 text-indigo-600" />
                  팀 전원이 같은 결과입니다
                </span>
                <Link
                  href={`/teams/${state.data.teamId}`}
                  className="font-extrabold text-indigo-600 underline hover:text-indigo-800"
                >
                  팀 화면으로 이동 &rarr;
                </Link>
              </div>
            )}

            {/* 검증 페이지 바로가기 버튼 */}
            <div className="flex justify-end">
              <Link
                href={`/events/${eventId}/verify`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-800 transition hover:bg-stone-50"
              >
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                내 제비 순서 직접 검증하기 &rarr;
              </Link>
            </div>
          </section>
        )}

        {/* 2) 404 DRAW_NOT_FOUND: 아직 추첨 전입니다 + 봉인 상자 */}
        {state.kind === 'draw_not_found' && (
          <section className="space-y-4">
            <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="mt-3 text-lg font-black text-stone-900">아직 추첨 전입니다</h2>
              <p className="mt-1 text-xs text-stone-500">
                주최자가 추첨을 실행하면 이 화면에서 바로 결과를 확인하실 수 있습니다.
              </p>
            </div>
            {seal && <SealBox seal={seal} />}
          </section>
        )}

        {/* 3) 404 ENTRY_NOT_FOUND: 응모하지 않은 공연입니다 */}
        {state.kind === 'entry_not_found' && (
          <section className="rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-lg font-black text-stone-900">응모하지 않은 공연입니다</h2>
            <p className="mt-1 text-xs text-stone-500">
              응모 내역이 없는 계정입니다. 전체 추첨 결과와 검증은 아래에서 확인하실 수 있습니다.
            </p>
            <div className="mt-5">
              <Link
                href={`/events/${eventId}`}
                className="inline-block rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800"
              >
                공연 상세로 이동
              </Link>
            </div>
          </section>
        )}

        {/* 4) 기타 오류 */}
        {state.kind === 'error' && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {state.message}
          </div>
        )}

        {/* 화면 하단: 공개 추첨 정보 상자 (DrawBox) */}
        <DrawBox eventId={eventId} />
      </main>
    </div>
  );
}

export default function MyDrawResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
            결과 페이지를 불러오는 중입니다…
          </div>
        </div>
      }
    >
      <MyDrawResultContent params={params} />
    </Suspense>
  );
}