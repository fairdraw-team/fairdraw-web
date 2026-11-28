'use client';
// 관객용 공개 공연 목록 — 로그인 없이 누구나 조회 가능한 메인 공연 허브 (GET /api/public/events)
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatKst, timeLeft } from '@/lib/datetime';
import { isAtLeast } from '@/lib/eventStatus';
import type { EventItem } from '@/types/api';
import { AuthMenu } from '@/components/AuthMenu';

const POSTER_GRADIENTS = [
  'from-indigo-600 to-sky-500',
  'from-rose-600 to-orange-400',
  'from-emerald-600 to-teal-400',
  'from-violet-600 to-pink-500',
];
const gradientOf = (id: string) =>
  POSTER_GRADIENTS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % POSTER_GRADIENTS.length];

// P-7: 공연 상태별 배지 라벨 및 스타일
function getEventStatusBadge(status: EventItem['status']) {
  switch (status) {
    case 'open':
      return { label: '응모 중', className: 'bg-emerald-600/90 text-white' };
    case 'closed':
      return { label: '마감', className: 'bg-stone-700/90 text-white' };
    case 'drawn':
      return { label: '추첨 완료', className: 'bg-indigo-600/90 text-white' };
    case 'paying':
      return { label: '결제 중', className: 'bg-amber-600/90 text-white' };
    case 'done':
      return { label: '종료', className: 'bg-stone-500/90 text-white' };
    default:
      return { label: '준비 중', className: 'bg-stone-500/90 text-white' };
  }
}

export default function PublicEventsPage() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 초기값을 null로 설정하여 빌드 타임 사전 평가 방지
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // 브라우저 마운트 직후 시각 초기화 및 1분 주기 갱신
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);

    apiFetch<EventItem[]>('/api/public/events', { auth: false })
      .then((data) => {
        // P-7: 응모 중(open)인 공연을 목록 최상단에 배치
        const sorted = [...data].sort((a, b) => {
          if (a.status === 'open' && b.status !== 'open') return -1;
          if (a.status !== 'open' && b.status === 'open') return 1;
          return 0;
        });
        setEvents(sorted);
      })
      .catch((e: Error) => setError(e.message));

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
            <AuthMenu />
          </div>
        </div>
      </header>

      {/* 본문 메인 컨테이너 */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* 상단 섹션 타이틀 */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Fair Draw Events
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
            공연 응모 및 결과 확인
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">
            응모 마감 시각 전까지 언제 신청하셔도 당첨 확률은 공정하게 동일합니다. 마감된 공연은 추첨 결과와 검증 내역을 확인하실 수 있습니다.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!events && !error && (
          <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
            <span>공연 목록을 불러오는 중입니다…</span>
          </div>
        )}

        {events?.length === 0 && (
          <div className="rounded-3xl border border-stone-200 bg-white p-16 text-center shadow-xs">
            <p className="text-base font-bold text-stone-700">현재 공개된 공연이 없습니다.</p>
            <p className="mt-1 text-xs text-stone-500">
              주최자가 새 공연을 개설하고 [응모 열기]를 승인하면 이곳에 자동으로 공개됩니다.
            </p>
          </div>
        )}

        {/* 포스터 카드 갤러리 그리드 */}
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {events?.map((ev) => {
            const badge = getEventStatusBadge(ev.status);
            const drawn = isAtLeast(ev.status, 'drawn');
            const rawEv = ev as unknown as {
              startsAt?: string;
              eventAt?: string;
              entryClosesAt?: string;
              entryEndAt?: string;
            };
            const eventDate = rawEv.startsAt ?? rawEv.eventAt ?? '';
            const closeDate = rawEv.entryClosesAt ?? rawEv.entryEndAt ?? '';

            return (
              <li
                key={ev.id}
                className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-3 shadow-xs transition duration-200 hover:shadow-md"
              >
                {/* 포스터 및 메타데이터 클릭 시 공연 상세(/events/[id])로 이동 */}
                <Link href={`/events/${ev.id}`} className="block">
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

                    {/* 포스터 오버레이 상태 배지 + 남은 시간 */}
                    <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-1">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold backdrop-blur-xs ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {ev.status === 'open' && closeDate && (
                        <span className="rounded-md bg-stone-950/75 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-xs">
                          {now ? timeLeft(closeDate, now) : '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 포스터 하단 메타데이터 */}
                  <div className="mt-3">
                    <h2 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 group-hover:text-indigo-600">
                      {ev.title}
                    </h2>
                    <p className="mt-1 truncate text-xs text-stone-500">{ev.venue}</p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-stone-700">
                      {eventDate ? formatKst(eventDate) : '-'}
                    </p>
                    <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2 text-xs">
                      <span className="text-stone-400">티켓 가격</span>
                      <span className="font-bold text-stone-900">{ev.price.toLocaleString('ko-KR')}원~</span>
                    </div>
                  </div>
                </Link>

                {/* 하단 액션 버튼: 추첨 완료 이상이면 결과/검증, 진행 중이면 응모/팀 만들기 */}
                <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-stone-100 pt-2">
                  {drawn ? (
                    <>
                      <Link
                        href={`/events/${ev.id}/result`}
                        className="block rounded-xl bg-stone-900 py-2 text-center text-xs font-bold text-white transition hover:bg-stone-800"
                      >
                        내 결과 보기
                      </Link>
                      <Link
                        href={`/events/${ev.id}/verify`}
                        className="block rounded-xl border border-stone-200 bg-stone-50 py-2 text-center text-xs font-bold text-stone-700 transition hover:bg-stone-100"
                      >
                        추첨 검증
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/events/${ev.id}`}
                        className="block rounded-xl bg-stone-900 py-2 text-center text-xs font-bold text-white transition hover:bg-stone-800"
                      >
                        {ev.status === 'open' ? '응모하기' : '상세 보기'}
                      </Link>
                      <Link
                        href={`/events/${ev.id}/team/new`}
                        className="block rounded-xl border border-stone-200 bg-stone-50 py-2 text-center text-xs font-bold text-stone-700 transition hover:bg-stone-100"
                      >
                        팀 만들기
                      </Link>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}