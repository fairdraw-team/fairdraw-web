'use client';
// 관객용 공개 공연 목록 — 로그인 없이 누구나 조회 가능한 메인 공연 허브 (GET /api/public/events)
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatKst, timeLeft } from '@/lib/datetime';
import type { EventItem } from '@/types/api';

const POSTER_GRADIENTS = [
  'from-indigo-600 to-sky-500',
  'from-rose-600 to-orange-400',
  'from-emerald-600 to-teal-400',
  'from-violet-600 to-pink-500',
];
const gradientOf = (id: string) =>
  POSTER_GRADIENTS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % POSTER_GRADIENTS.length];

export default function PublicEventsPage() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    apiFetch<EventItem[]>('/api/public/events', { auth: false })
      .then(setEvents)
      .catch((e: Error) => setError(e.message));
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 antialiased">
      {/* 글로벌 탑 네비게이션 헤더 */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900 text-sm font-black text-white shadow-xs">
              F
            </span>
            <span className="text-lg font-black tracking-tight text-stone-900">Fair Draw</span>
            <span className="hidden text-xs font-medium text-stone-400 sm:inline">|</span>
            <span className="hidden text-xs font-semibold text-stone-500 sm:inline">
              선착순 매크로 없는 공정 추첨 예매
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/teams/join"
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
            >
              초대 코드로 팀 합류
            </Link>
            <Link
              href="/organizer/events"
              className="rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50"
            >
              주최자 콘솔 이동 &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* 본문 메인 컨테이너 */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* 상단 섹션 타이틀 */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Now Open
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
            현재 응모 진행 중인 공연
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">
            응모 마감 시각 전까지 언제 신청하셔도 당첨 확률은 공정하게 동일합니다. 원하시는 좌석 구역을 확인하시고 제비를 응모해 보세요.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!events && !error && (
          <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
            <span>응모 가능한 공연 목록을 불러오는 중입니다…</span>
          </div>
        )}

        {events?.length === 0 && (
          <div className="rounded-3xl border border-stone-200 bg-white p-16 text-center shadow-xs">
            <p className="text-base font-bold text-stone-700">현재 오픈된 응모 공연이 없습니다.</p>
            <p className="mt-1 text-xs text-stone-500">
              주최자가 새 공연을 개설하고 [응모 열기]를 승인하면 이곳에 자동으로 공개됩니다.
            </p>
          </div>
        )}

        {/* 티켓링크식 포스터 카드 갤러리 그리드 */}
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {events?.map((ev) => (
            <li key={ev.id} className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-3 shadow-xs transition duration-200 hover:shadow-md">
              <div>
                {/* 포스터 썸네일 프레임 (3:4 비율) */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-xs">
                  {ev.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ev.posterUrl}
                      alt={ev.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-end bg-gradient-to-br ${gradientOf(ev.id)} p-4 text-white`}
                    >
                      <span className="text-6xl font-black opacity-20">{ev.title.charAt(0)}</span>
                    </div>
                  )}

                  {/* 포스터 오버레이 뱃지 */}
                  <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-1">
                    <span className="rounded-md bg-emerald-600/90 px-2 py-0.5 text-[11px] font-extrabold text-white backdrop-blur-xs">
                      응모 중
                    </span>
                    <span className="rounded-md bg-stone-950/75 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-xs">
                      {timeLeft(ev.entryEndAt, now)}
                    </span>
                  </div>
                </div>

                {/* 포스터 하단 메타데이터 */}
                <div className="mt-3">
                  <h2 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 group-hover:text-indigo-600">
                    {ev.title}
                  </h2>
                  <p className="mt-1 truncate text-xs text-stone-500">{ev.venue}</p>
                  <p className="mt-0.5 text-xs font-semibold tabular-nums text-stone-700">
                    {formatKst(ev.eventAt)}
                  </p>
                  <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2 text-xs">
                    <span className="text-stone-400">티켓 가격</span>
                    <span className="font-bold text-stone-900">{ev.price.toLocaleString('ko-KR')}원~</span>
                  </div>
                </div>
              </div>

              {/* 연석 팀 만들기 액션 버튼 */}
              <div className="mt-3 pt-2 border-t border-stone-100">
                <Link
                  href={`/events/${ev.id}/team/new`}
                  className="block w-full rounded-xl bg-stone-900 py-2 text-center text-xs font-bold text-white transition hover:bg-stone-800"
                >
                  연석 팀 만들기 &rarr;
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
