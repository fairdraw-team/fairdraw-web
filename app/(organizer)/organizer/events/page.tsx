'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatKst, timeLeft } from '@/lib/datetime';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import type { EventItem } from '@/types/api';

const POSTER_GRADIENTS = [
  'from-indigo-600 to-sky-500',
  'from-rose-600 to-orange-400',
  'from-emerald-600 to-teal-400',
  'from-violet-600 to-pink-500',
];
const gradientOf = (id: string) =>
  POSTER_GRADIENTS[
    [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % POSTER_GRADIENTS.length
  ];

export default function MyEventsPage() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // 1. 클라이언트 마운트 직후 시각 설정 및 1초 주기 타이머
    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    // 2. 주최자 본인의 공연 목록 조회
    async function loadEvents() {
      try {
        const data = await apiFetch<EventItem[]>('/api/organizer/events');
        setEvents(data);
      } catch (err: any) {
        setError(err.message || '공연 목록을 불러오지 못했습니다.');
        setEvents([]); // 에러 시 빈 배열로 안전하게 폴백
      }
    }

    loadEvents();

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* 타이틀 및 등록 버튼 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
              주최 공연 관리
            </h1>
            {events && (
              <span className="rounded-full bg-stone-200/80 px-2.5 py-0.5 text-xs font-bold text-stone-700">
                총 {events.length}건
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-500">
            개설하신 공연의 좌석 구역 설정, 응모 개시, 스태프 권한을 통합 관리하실 수 있습니다.
          </p>
        </div>
        <Link
          href="/organizer/events/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-stone-800"
        >
          <span>+ 새 공연 등록</span>
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!events && !error && (
        <div className="flex items-center justify-center rounded-2xl border border-stone-200 bg-white p-12 text-sm text-stone-400">
          <span>공연 목록을 불러오는 중입니다…</span>
        </div>
      )}

      {events?.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
          <p className="text-base font-semibold text-stone-700">등록된 주최 공연이 없습니다.</p>
          <p className="mt-1 text-sm text-stone-500">새로운 공연과 좌석 구역을 개설하고 공정 추첨을 시작해 보세요.</p>
          <Link
            href="/organizer/events/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-stone-800"
          >
            <span>+ 첫 공연 등록하기</span>
          </Link>
        </div>
      )}

      {/* 공연 카드 그리드 */}
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events?.map((ev) => {
          const totalSeats = (ev.sections ?? []).reduce((sum, s) => sum + s.capacity, 0);

          return (
            <li key={ev.id}>
              <Link
                href={`/organizer/events/${ev.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs transition hover:-translate-y-1 hover:border-stone-300 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                {/* 상단 포스터 이미지 썸네일 */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
                  {ev.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ev.posterUrl}
                      alt={ev.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`flex h-full w-full items-end bg-gradient-to-br ${gradientOf(ev.id)} p-4 text-white`}>
                      <span className="text-4xl font-black opacity-30">{ev.title.charAt(0)}</span>
                    </div>
                  )}

                  {/* 포스터 위 뱃지 오버레이 (now가 있을 때만 계산, 없을 땐 빈 텍스트) */}
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                    <StatusBadge status={ev.status} />
                    <span className="rounded-md bg-stone-950/75 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-xs">
                      응모 마감 {now ? timeLeft(ev.entryEndAt, now) : '-'}
                    </span>
                  </div>
                </div>

                {/* 하단 공연 상세 메타데이터 */}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="line-clamp-2 text-base font-bold leading-snug text-stone-900 group-hover:text-indigo-600">
                    {ev.title}
                  </h2>

                  <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3 text-xs text-stone-600">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">공연 일시</span>
                      <span className="font-medium text-stone-800">{formatKst(ev.eventAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">공연 장소</span>
                      <span className="truncate font-medium text-stone-800">{ev.venue}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">좌석 정원</span>
                      <span className="font-semibold text-stone-900">
                        {ev.sections?.length ? `${ev.sections.length}개 구역 (총 ${totalSeats.toLocaleString()}석)` : '구역 미설정'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end border-t border-stone-100 pt-3 text-xs font-semibold text-stone-500 group-hover:text-stone-900">
                    <span>상세 관리 및 제어 이동 →</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
