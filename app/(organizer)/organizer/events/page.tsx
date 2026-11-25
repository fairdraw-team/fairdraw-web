'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatKst, timeLeft } from '@/lib/datetime';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import type { EventItem, EventStatus } from '@/types/api';

type StatusFilter = 'all' | EventStatus;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'draft', label: '준비 중' },
  { key: 'open', label: '응모 중' },
  { key: 'closed', label: '마감' },
  { key: 'drawn', label: '추첨 완료' },
  { key: 'paying', label: '결제 중' },
  { key: 'done', label: '종료' },
];

export default function MyEventsPage() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setNow(Date.now());
    apiFetch<EventItem[]>('/api/events')
      .then(setEvents)
      .catch((e: Error) => setError(e.message));
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const summary = useMemo(() => {
    const list = events ?? [];
    const openCount = list.filter((e) => e.status === 'open').length;
    const activeOpsCount = list.filter(
      (e) => e.status === 'closed' || e.status === 'drawn' || e.status === 'paying',
    ).length;
    const totalSeats = list.reduce(
      (sum, ev) => sum + (ev.sections ?? []).reduce((s, sec) => s + sec.capacity, 0),
      0,
    );
    return {
      total: list.length,
      openCount,
      activeOpsCount,
      totalSeats,
    };
  }, [events]);

  const countsByStatus = useMemo(() => {
    const map: Record<StatusFilter, number> = {
      all: events?.length ?? 0,
      draft: 0,
      open: 0,
      closed: 0,
      drawn: 0,
      paying: 0,
      done: 0,
    };
    for (const ev of events ?? []) {
      map[ev.status] = (map[ev.status] ?? 0) + 1;
    }
    return map;
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const q = query.trim().toLowerCase();
    return events.filter((ev) => {
      if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.venue.toLowerCase().includes(q) ||
        ev.id.toLowerCase().includes(q)
      );
    });
  }, [events, statusFilter, query]);

  return (
    <div className="space-y-5">
      {/* 페이지 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#191F28]">
            주최 공연 관리
          </h1>
          <p className="mt-1 text-xs text-[#6B7684]">
            등록된 공연의 좌석 정원, 응모·추첨·결제 진행 상태와 스태프 권한을 관리합니다.
          </p>
        </div>
        <Link
          href="/organizer/events/new"
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-md bg-[#191F28] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#333D4B] sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>새 공연 등록</span>
        </Link>
      </div>

      {/* 통합 KPI 지표 바 (플랫 단일 패널) */}
      <section
        aria-label="공연 운영 요약 지표"
        className="grid grid-cols-2 divide-x divide-y divide-[#E5E8EB] overflow-hidden rounded-lg border border-[#E5E8EB] bg-white sm:grid-cols-4 sm:divide-y-0"
      >
        <div className="px-5 py-4">
          <div className="text-xs text-[#6B7684]">전체 등록 공연</div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-[#191F28]">
              {events ? summary.total.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-[#8B95A1]">건</span>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-xs text-[#6B7684]">응모 진행 중</div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-emerald-700">
              {events ? summary.openCount.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-[#8B95A1]">건</span>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-xs text-[#6B7684]">마감 · 추첨 · 결제</div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-[#1B64DA]">
              {events ? summary.activeOpsCount.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-[#8B95A1]">건</span>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-xs text-[#6B7684]">총 배정 좌석</div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-[#191F28]">
              {events ? summary.totalSeats.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-[#8B95A1]">석</span>
          </div>
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

      {/* 메인 공연 데이터 테이블 패널 */}
      <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
        {/* 필터 탭 + 검색 툴바 */}
        <div className="flex flex-col gap-3 border-b border-[#E5E8EB] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              const count = countsByStatus[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    active
                      ? 'bg-[#191F28] font-medium text-white'
                      : 'font-medium text-[#4E5968] hover:bg-[#F2F4F6] hover:text-[#191F28]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`tabular-nums text-[11px] ${
                      active ? 'text-white/75' : 'text-[#8B95A1]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#8B95A1]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="공연명 또는 공연장 검색…"
              aria-label="공연명 또는 공연장 검색"
              className="w-full rounded-md border border-[#D1D6DB] bg-white py-1.5 pr-3 pl-8 text-xs text-[#191F28] placeholder:text-[#8B95A1] transition-colors focus:border-[#1B64DA] focus:outline-none focus:ring-2 focus:ring-[#1B64DA]/15"
            />
          </div>
        </div>

        {/* 로딩 상태 */}
        {!events && !error && (
          <div className="px-6 py-16 text-center text-xs text-[#6B7684]">
            공연 목록을 불러오는 중입니다…
          </div>
        )}

        {/* 빈 상태 (등록 공연 0건) */}
        {events && events.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-[#191F28]">등록된 주최 공연이 없습니다.</p>
            <p className="mt-1 text-xs text-[#6B7684]">
              새 공연과 좌석 구역을 등록한 뒤 응모를 시작할 수 있습니다.
            </p>
            <Link
              href="/organizer/events/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#191F28] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#333D4B]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>첫 공연 등록하기</span>
            </Link>
          </div>
        )}

        {/* 검색/필터 결과 없음 */}
        {events && events.length > 0 && filteredEvents.length === 0 && (
          <div className="px-6 py-12 text-center text-xs text-[#6B7684]">
            선택한 조건에 해당하는 공연이 없습니다.
          </div>
        )}

        {/* 데스크톱 운영 테이블 */}
        {filteredEvents.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E8EB] bg-[#F9FAFB] text-[11px] font-medium text-[#6B7684]">
                    <th className="px-4 py-2.5 font-medium">공연 정보</th>
                    <th className="px-4 py-2.5 font-medium">상태</th>
                    <th className="px-4 py-2.5 font-medium">공연 일시 / 마감</th>
                    <th className="px-4 py-2.5 text-right font-medium">구역 · 정원</th>
                    <th className="px-4 py-2.5 text-right font-medium">기본가</th>
                    <th className="px-4 py-2.5 text-right font-medium">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EB]">
                  {filteredEvents.map((ev) => {
                    const totalSeats = (ev.sections ?? []).reduce(
                      (sum, s) => sum + s.capacity,
                      0,
                    );
                    const isPaymentPhase =
                      ev.status === 'drawn' || ev.status === 'paying';
                    const deadlineLabel = isPaymentPhase ? '결제 마감' : '응모 마감';
                    const deadlineText =
                      now !== null
                        ? timeLeft(
                            isPaymentPhase ? ev.paymentDueAt : ev.entryClosesAt,
                            now,
                          )
                        : '—';

                    return (
                      <tr
                        key={ev.id}
                        className="group transition-colors hover:bg-[#F9FAFB]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/organizer/events/${ev.id}`}
                            className="flex items-center gap-3"
                          >
                            <div className="h-11 w-9 shrink-0 overflow-hidden rounded border border-[#E5E8EB] bg-[#F2F4F6]">
                              {ev.posterUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={ev.posterUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8B95A1]">
                                  {ev.title.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-[#191F28] group-hover:text-[#1B64DA]">
                                {ev.title}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#6B7684]">
                                <span className="truncate">{ev.venue}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-[#8B95A1]">
                                  {ev.id.slice(-8)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <StatusBadge status={ev.status} />
                        </td>

                        <td className="px-4 py-3 align-middle tabular-nums">
                          <div className="font-medium text-[#191F28]">
                            {formatKst(ev.startsAt)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#6B7684]">
                            {deadlineLabel} {deadlineText}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right align-middle tabular-nums">
                          <div className="font-medium text-[#191F28]">
                            {totalSeats.toLocaleString()}석
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#6B7684]">
                            {ev.sections?.length
                              ? `${ev.sections.length}개 구역`
                              : '구역 미설정'}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right align-middle font-medium tabular-nums text-[#191F28]">
                          {ev.price.toLocaleString('ko-KR')}원
                        </td>

                        <td className="px-4 py-3 text-right align-middle">
                          <Link
                            href={`/organizer/events/${ev.id}`}
                            className="inline-flex items-center gap-0.5 rounded-md border border-[#D1D6DB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#333D4B] transition-colors hover:border-[#8B95A1] hover:text-[#191F28]"
                          >
                            <span>관리</span>
                            <ChevronRight className="h-3.5 w-3.5 text-[#8B95A1]" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 모바일 컴팩트 리스트 */}
            <ul className="divide-y divide-[#E5E8EB] md:hidden">
              {filteredEvents.map((ev) => {
                const totalSeats = (ev.sections ?? []).reduce(
                  (sum, s) => sum + s.capacity,
                  0,
                );
                return (
                  <li key={ev.id}>
                    <Link
                      href={`/organizer/events/${ev.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#F9FAFB]"
                    >
                      <div className="h-12 w-9 shrink-0 overflow-hidden rounded border border-[#E5E8EB] bg-[#F2F4F6]">
                        {ev.posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ev.posterUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8B95A1]">
                            {ev.title.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={ev.status} />
                          <span className="truncate text-[11px] tabular-nums text-[#6B7684]">
                            {formatKst(ev.startsAt)}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-[#191F28]">
                          {ev.title}
                        </div>
                        <div className="mt-0.5 text-xs text-[#6B7684]">
                          {ev.venue} · {totalSeats.toLocaleString()}석 ·{' '}
                          {ev.price.toLocaleString('ko-KR')}원
                        </div>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-[#8B95A1]"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
