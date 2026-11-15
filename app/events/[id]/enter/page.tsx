'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import type { EventItem } from '@/types/api';

function EnterEventContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 구역별 제비 배분 상태: Record<sectionId, ballots>
  const [counts, setCounts] = useState<Record<string, number>>({});

  // 에러 상태 및 409(이미 응모됨) 분기 처리
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [alreadyEntered, setAlreadyEntered] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadEvent() {
      try {
        const data = await apiFetch<EventItem>(`/api/public/events/${id}`, {
          auth: false,
        }).catch(() => apiFetch<EventItem>(`/api/events/${id}`, { auth: false }));

        if (!ignore) {
          setEvent(data);
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

    loadEvent();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
          응모 화면을 준비하는 중입니다…
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMsg || '존재하지 않는 공연입니다.'}
        </div>
        <Link
          href="/events"
          className="mt-4 inline-block text-xs font-bold text-stone-600 hover:text-stone-900"
        >
          &larr; 공연 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const maxBallots = event.ballotsPerUser || 3;
  const sections = event.sections ?? [];
  const usedBallots = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const remainingBallots = maxBallots - usedBallots;
  const isClosed = event.status !== 'open';

  // 제비 수 증감 핸들러
  const updateCount = (sectionId: string, delta: number) => {
    setErrorMsg(null);
    setAlreadyEntered(false);

    setCounts((prev) => {
      const current = prev[sectionId] || 0;
      const next = current + delta;

      if (next < 0) return prev;
      if (delta > 0 && usedBallots >= maxBallots) return prev;

      return {
        ...prev,
        [sectionId]: next,
      };
    });
  };

  // 응모 제출 핸들러 (POST /api/events/{id}/entries)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usedBallots === 0 || submitting || isClosed) return;

    // 0장인 구역은 제외하고 allocations 배열 구성
    const allocations = Object.entries(counts)
      .filter(([, ballots]) => ballots > 0)
      .map(([sectionId, ballots]) => ({
        sectionId,
        ballots,
      }));

    setSubmitting(true);
    setErrorMsg(null);
    setAlreadyEntered(false);

    try {
      await apiFetch(`/api/events/${id}/entries`, {
        method: 'POST',
        body: JSON.stringify({ allocations }),
      });

      // 성공 시 내 응모 확인 화면으로 이동
      router.push(`/events/${id}/me`);
    } catch (err) {
      if (err instanceof ApiError) {
        // 403 PHONE_NOT_VERIFIED: 휴대폰 인증 화면으로 안내[cite: 28]
        if (err.status === 403 || err.code === 'PHONE_NOT_VERIFIED') {
          router.push(`/verify-phone?next=${encodeURIComponent(`/events/${id}/enter`)}`);
          return;
        }

        // 409 ALREADY_ENTERED: 이미 응모 안내 + 내 응모 보기 링크 노출[cite: 28]
        if (err.status === 409 || err.code === 'ALREADY_ENTERED') {
          setAlreadyEntered(true);
          setErrorMsg('이미 응모했습니다.');
          setSubmitting(false);
          return;
        }

        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : '응모 처리 중 오류가 발생했습니다.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 antialiased">
      {/* 상단 네비게이션 */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
          <Link
            href={`/events/${id}`}
            className="text-xs font-bold text-stone-600 hover:text-stone-900"
          >
            &larr; 공연 상세로
          </Link>
          <span className="text-xs font-black text-stone-900">제비 배분 응모</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        {/* 공연 요약 */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <h1 className="text-lg font-black text-stone-900">{event.title}</h1>
          <p className="mt-1 text-xs text-stone-500">
            {event.venue} · {formatKst(event.eventAt)}
          </p>
        </div>

        {/* 남은 제비 카운터 배너[cite: 28] */}
        <div className="rounded-3xl border border-indigo-200 bg-indigo-50/80 p-6 text-center shadow-xs">
          <span className="text-xs font-bold text-indigo-600">
            1인당 최대 {maxBallots}장의 제비를 구역별로 자유롭게 나눌 수 있습니다
          </span>
          <div className="mt-2 text-3xl font-black tracking-tight text-indigo-950">
            남은 제비{' '}
            <span className="text-indigo-600 tabular-nums">
              {remainingBallots}/{maxBallots}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-stone-500">
            제비를 모두 쓰지 않고 일부만 넣어도 응모할 수 있으며, 한 구역에 여러 장을 넣을수록 해당 구역 당첨 확률이 높아집니다[cite: 19, 21].
          </p>
        </div>

        {/* 구역별 제비 조절 폼[cite: 28] */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="divide-y divide-stone-100 rounded-3xl border border-stone-200 bg-white px-5 py-2 shadow-xs">
            {sections.length > 0 ? (
              sections.map((sec) => {
                const count = counts[sec.id] || 0;
                const price = sec.price ?? event.price;

                return (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-stone-900">
                          {sec.name}
                        </span>
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                          정원 {sec.capacity.toLocaleString('ko-KR')}석
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-stone-700">
                        {price.toLocaleString('ko-KR')}원
                      </p>
                    </div>

                    {/* - / 수량 / + 조절 버튼[cite: 28] */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`${sec.name} 제비 1장 빼기`}
                        disabled={count === 0 || submitting || isClosed}
                        onClick={() => updateCount(sec.id, -1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-300 bg-white text-base font-black text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        -
                      </button>

                      <span className="w-6 text-center text-base font-black text-stone-900 tabular-nums">
                        {count}
                      </span>

                      <button
                        type="button"
                        aria-label={`${sec.name} 제비 1장 추가`}
                        disabled={usedBallots >= maxBallots || submitting || isClosed}
                        onClick={() => updateCount(sec.id, 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-base font-black text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-xs text-stone-400">
                응모 가능한 좌석 구역이 없습니다.
              </div>
            )}
          </div>

          {/* 에러 메시지 및 409 이미 응모 안내[cite: 28] */}
          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-xs font-bold text-rose-700"
            >
              <p>{errorMsg}</p>
              {alreadyEntered && (
                <Link
                  href={`/events/${id}/me`}
                  className="mt-2 inline-block rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700"
                >
                  내 응모 보기 &rarr;
                </Link>
              )}
            </div>
          )}

          {/* 제출 버튼 (합계 0장 또는 제출 중일 때 비활성화)[cite: 28] */}
          <button
            type="submit"
            disabled={usedBallots === 0 || submitting || isClosed}
            className="w-full rounded-2xl bg-stone-900 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isClosed
              ? '응모가 마감된 공연입니다'
              : submitting
              ? '응모 접수 중입니다…'
              : usedBallots === 0
              ? '최소 1장 이상의 제비를 배분해 주세요'
              : `총 ${usedBallots}장 제비로 응모하기`}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function EnterEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl px-4 py-16">
          <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
            응모 화면을 불러오는 중입니다…
          </div>
        </div>
      }
    >
      <EnterEventContent params={params} />
    </Suspense>
  );
}