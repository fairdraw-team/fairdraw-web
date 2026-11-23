'use client';

import { Suspense, use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { formatKst, timeLeft } from '@/lib/datetime';
import { startPayment } from '@/lib/pay';
import { SealBox } from '@/components/SealBox';
import { DrawBox } from '@/components/DrawBox';
import type { EventItem, MyBooking, MyDrawResult, SealInfo } from '@/types/api';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  ShieldCheck,
  AlertCircle,
  Lock,
  Ticket,
  CreditCard,
  Sparkles,
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

  // 4주차: 내 예매(booking/me) 및 결제 진행 상태
  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [bookingChecked, setBookingChecked] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadBooking = useCallback(async () => {
    try {
      const b = await apiFetch<MyBooking>(`/api/events/${eventId}/booking/me`);
      setBooking(b);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setBooking(null);
      }
    } finally {
      setBookingChecked(true);
    }
  }, [eventId]);

  useEffect(() => {
    let ignore = false;

    async function load() {
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

      const evPromise = apiFetch<EventItem>(`/api/public/events/${eventId}`, {
        auth: false,
      })
        .catch(() => apiFetch<EventItem>(`/api/events/${eventId}`, { auth: false }))
        .catch(() => null);

      const mePromise = apiFetch<MyDrawResult>(`/api/events/${eventId}/draw/me`);

      const [evData] = await Promise.all([
        evPromise,
        mePromise
          .then(async (res) => {
            if (ignore) return;
            setState({ kind: 'ready', data: res });
            // 당첨(won) 또는 대기(waitlisted)인 경우에만 내 예매(booking/me) 조회
            if (res.result === 'won' || res.result === 'waitlisted') {
              await loadBooking();
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
  }, [eventId, router, loadBooking]);

  const handlePay = async () => {
    if (!booking || paying) return;
    setPaying(true);
    setPayError(null);
    try {
      const res = await startPayment(booking.bookingId, eventId);
      if (res.ok) {
        await loadBooking();
      } else {
        setPayError(res.message);
      }
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : '결제 요청 중 오류가 발생했습니다.',
      );
    } finally {
      setPaying(false);
    }
  };

  if (state.kind === 'loading') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
          내 추첨 및 예매 결과를 확인하는 중입니다…
        </div>
      </div>
    );
  }

  const rawEv = event as unknown as {
    startsAt?: string;
    eventAt?: string;
    paymentDueAt?: string;
    paymentDeadlineAt?: string;
  } | null;
  const eventStartsAt = rawEv?.startsAt ?? rawEv?.eventAt ?? '';
  const eventPayDueAt = rawEv?.paymentDueAt ?? rawEv?.paymentDeadlineAt ?? '';

  // 예매 기한 만료 여부 (클라이언트 시각 기준)
  const isPayWindowOver =
    booking?.status === 'pending' && now !== null
      ? now >= new Date(booking.payDueAt).getTime()
      : false;

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link
            href={`/events/${eventId}`}
            className="text-xs font-bold text-stone-600 hover:text-stone-900"
          >
            &larr; 공연 상세로 돌아가기
          </Link>
          <span className="text-xs font-black text-stone-900">추첨 결과 및 결제</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* 공연 제목 요약 */}
        {event && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-600">대상 공연</span>
            <h1 className="mt-1 text-lg font-black text-stone-900">{event.title}</h1>
            <p className="mt-1 text-xs text-stone-500">
              {event.venue} · {eventStartsAt ? formatKst(eventStartsAt) : '-'}
            </p>
          </div>
        )}

        {/* 1) 정상 결과 (won / waitlisted / lost) + 예매(booking) 상태 통합 */}
        {state.kind === 'ready' && (
          <section className="space-y-4">
            {/* 케이스 A: 예매 확정 (paid) — 당첨자이든 승계받은 대기자이든 동일 */}
            {(state.data.result === 'won' || state.data.result === 'waitlisted') &&
              booking?.status === 'paid' && (
                <div className="rounded-3xl border-2 border-emerald-600 bg-emerald-50/70 p-6 shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                    <span className="text-xs font-extrabold uppercase tracking-wider">
                      Booking Confirmed
                    </span>
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-stone-900">
                    예매 확정 · {booking.sectionName}구역
                  </h2>
                  <div className="mt-4 space-y-1.5 rounded-2xl border border-emerald-200 bg-white p-4 text-xs text-stone-700">
                    <p>
                      <span className="font-semibold text-stone-500">결제 금액: </span>
                      <b className="font-extrabold text-stone-900">
                        {booking.amount.toLocaleString('ko-KR')}원
                      </b>
                    </p>
                    {booking.paidAt && (
                      <p>
                        <span className="font-semibold text-stone-500">결제 시각: </span>
                        <b className="font-bold text-stone-800">{formatKst(booking.paidAt)}</b>
                      </p>
                    )}
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/ticket"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-stone-800"
                    >
                      <Ticket className="h-4 w-4" />
                      내 티켓 보기 (QR 입장권)
                    </Link>
                  </div>
                </div>
              )}

            {/* 케이스 B: 결제 대기 (pending) — 당첨자 또는 승계받은 대기자 */}
            {(state.data.result === 'won' || state.data.result === 'waitlisted') &&
              booking?.status === 'pending' && (
                <div className="rounded-3xl border-2 border-indigo-600 bg-indigo-50/60 p-6 shadow-xs">
                  {booking.source === 'succession' && (
                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-extrabold text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                      자리가 넘어왔습니다
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-indigo-700">
                    <CreditCard className="h-5 w-5 shrink-0" />
                    <span className="text-xs font-extrabold uppercase tracking-wider">
                      Payment Pending
                    </span>
                  </div>

                  <h2 className="mt-1.5 text-2xl font-black text-stone-900">
                    {booking.source === 'succession'
                      ? `승계 좌석 결제 대기 · ${booking.sectionName}구역`
                      : `당첨되었습니다. ${booking.sectionName}구역`}
                  </h2>

                  <div className="mt-4 space-y-2 rounded-2xl border border-indigo-200 bg-white p-4 text-xs text-stone-700">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-500">결제 금액</span>
                      <b className="text-base font-black text-stone-900">
                        {booking.amount.toLocaleString('ko-KR')}원
                      </b>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-500">결제 마감 기한</span>
                      <b className="font-extrabold text-rose-600">
                        {formatKst(booking.payDueAt)}
                      </b>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-500">남은 시간</span>
                      <b className="font-extrabold text-indigo-700">
                        {isPayWindowOver
                          ? '기한 만료'
                          : now
                            ? timeLeft(booking.payDueAt, now)
                            : '-'}
                      </b>
                    </div>
                  </div>

                  {/* 팀 응모 안내 */}
                  {state.data.teamId && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900">
                      팀원은 각자 결제합니다. 팀원이 결제하지 않으면 옆자리가 다른 사람에게 넘어갑니다.
                    </p>
                  )}

                  {/* 결제 실패 메시지 */}
                  {payError && (
                    <div
                      role="alert"
                      className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700"
                    >
                      {payError}
                    </div>
                  )}

                  <div className="mt-4">
                    {isPayWindowOver ? (
                      <button
                        type="button"
                        disabled
                        className="w-full cursor-not-allowed rounded-2xl bg-stone-300 py-3.5 text-sm font-bold text-stone-600"
                      >
                        결제 기한이 지났습니다
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={paying}
                        onClick={handlePay}
                        className="w-full cursor-pointer rounded-2xl bg-indigo-600 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {paying
                          ? '결제 준비 중...'
                          : `${booking.amount.toLocaleString('ko-KR')}원 결제하기`}
                      </button>
                    )}
                  </div>
                </div>
              )}

            {/* 케이스 C: 결제 기한 만료 (expired) */}
            {(state.data.result === 'won' || state.data.result === 'waitlisted') &&
              booking?.status === 'expired' && (
                <div className="rounded-3xl border border-rose-300 bg-rose-50/70 p-6 shadow-xs">
                  <div className="flex items-center gap-2 text-rose-700">
                    <XCircle className="h-6 w-6 shrink-0" />
                    <span className="text-xs font-extrabold uppercase tracking-wider">
                      Booking Expired
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-black text-stone-900">
                    결제 기한이 지나 자리가 다음 순번에게 넘어갔습니다
                  </h2>
                  <p className="mt-2 text-xs text-stone-600">
                    미결제 만료 처리된 좌석은 같은 구역의 다음 대기 순번에게 자동으로 승계됩니다.
                  </p>
                </div>
              )}

            {/* 케이스 D: 당첨(won)이지만 아직 주최자가 결제를 열지 않음 (404 BOOKING_NOT_FOUND) */}
            {state.data.result === 'won' && bookingChecked && !booking && (
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
                  {eventPayDueAt && (
                    <p>
                      <span className="font-semibold text-stone-500">결제 마감 시각: </span>
                      <b className="font-extrabold text-rose-600">
                        {formatKst(eventPayDueAt)}
                      </b>
                    </p>
                  )}
                  <p className="font-bold text-emerald-800">
                    주최자가 결제를 열면 여기서 결제합니다.
                  </p>
                </div>
              </div>
            )}

            {/* 케이스 E: 대기(waitlisted)이고 아직 승계 전 (404 BOOKING_NOT_FOUND) */}
            {state.data.result === 'waitlisted' && bookingChecked && !booking && (
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

            {/* 케이스 F: 낙첨 (lost) */}
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

        {/* 2) 404 DRAW_NOT_FOUND */}
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

        {/* 3) 404 ENTRY_NOT_FOUND */}
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