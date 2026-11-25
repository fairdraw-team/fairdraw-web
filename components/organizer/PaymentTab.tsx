'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import type {
  BookingPage,
  BookingRow,
  EventStatus,
  PaymentStats,
} from '@/types/api';

type BookingFilter = '' | 'pending' | 'paid' | 'expired';

const BOOKING_STATUS_BADGE: Record<BookingRow['status'], { label: string; cls: string }> = {
  pending: {
    label: '결제 대기',
    cls: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  paid: {
    label: '결제 완료',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  expired: {
    label: '만료',
    cls: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  cancelled: {
    label: '취소',
    cls: 'border-stone-200 bg-stone-100 text-stone-600',
  },
};

interface PaymentTabProps {
  eventId: string;
  eventStatus: EventStatus;
  paymentDueAt: string;
  initialStats?: PaymentStats | null;
  onStatusChange?: (status: EventStatus) => void;
}

export function PaymentTab({
  eventId,
  eventStatus,
  paymentDueAt,
  initialStats = null,
  onStatusChange,
}: PaymentTabProps) {
  const [stats, setStats] = useState<PaymentStats | null>(initialStats);
  const [filter, setFilter] = useState<BookingFilter>('pending');
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copiedScanUrl, setCopiedScanUrl] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiFetch<PaymentStats>(`/api/events/${eventId}/payment/stats`);
      setStats(data);
      if (data.status && data.status !== eventStatus) {
        onStatusChange?.(data.status);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '결제 현황 통계를 불러오지 못했습니다.');
    }
  }, [eventId, eventStatus, onStatusChange]);

  const loadBookings = useCallback(
    async (pageNum: number, currentFilter: BookingFilter, append: boolean) => {
      setLoadingRows(true);
      try {
        const q = currentFilter ? `status=${currentFilter}&` : '';
        const res = await apiFetch<BookingPage>(
          `/api/events/${eventId}/bookings?${q}page=${pageNum}&size=20`,
        );
        setRows((prev) => (append ? [...prev, ...res.content] : res.content));
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      } catch (err) {
        if (!append) setRows([]);
        setErrorMsg(err instanceof Error ? err.message : '예매 명단을 불러오지 못했습니다.');
      } finally {
        setLoadingRows(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadBookings(0, filter, false);
  }, [filter, loadBookings]);

  const handleProcessNow = async () => {
    if (processing) return;
    setProcessing(true);
    setErrorMsg(null);
    try {
      const updated = await apiFetch<PaymentStats>(`/api/events/${eventId}/payment/process`, {
        method: 'POST',
      });
      setStats(updated);
      if (updated.status) {
        onStatusChange?.(updated.status);
      }
      await loadBookings(0, filter, false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '미결제 처리에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyScanUrl = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/scan?eventId=${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedScanUrl(true);
      setTimeout(() => setCopiedScanUrl(false), 2000);
    } catch {
      alert('스캔 주소를 복사하지 못했습니다.');
    }
  };

  const currentStatus = stats?.status ?? eventStatus;
  const dueAtText = formatKst(stats?.paymentDueAt || paymentDueAt);
  const hasMore = page + 1 < totalPages;

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700"
        >
          {errorMsg}
        </div>
      )}

      {/* 1. 구역별 표 & 2. '미결제 지금 처리' 버튼 */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900">구역별 결제 및 승계 현황</h2>
            <p className="mt-0.5 text-xs font-semibold text-stone-600">
              결제 마감 시각: <span className="text-rose-600">{dueAtText}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadStats();
              loadBookings(0, filter, false);
            }}
            className="rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
          >
            새로고침
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="pb-3 font-semibold">구역</th>
                <th className="pb-3 text-right font-semibold">정원</th>
                <th className="pb-3 text-right font-semibold text-emerald-700">결제 완료</th>
                <th className="pb-3 text-right font-semibold text-amber-700">결제 대기</th>
                <th className="pb-3 text-right font-semibold text-rose-700">만료</th>
                <th className="pb-3 text-right font-semibold text-indigo-700">승계</th>
                <th className="pb-3 text-right font-semibold">남은 대기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stats?.sections && stats.sections.length > 0 ? (
                stats.sections.map((sec) => (
                  <tr key={sec.sectionId} className="hover:bg-stone-50/50">
                    <td className="py-3.5 font-bold text-stone-900">{sec.name}</td>
                    <td className="py-3.5 text-right tabular-nums text-stone-700">
                      {sec.capacity.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right font-bold tabular-nums text-emerald-600">
                      {sec.paid.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right font-semibold tabular-nums text-amber-600">
                      {sec.pending.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right font-semibold tabular-nums text-rose-600">
                      {sec.expired.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right font-semibold tabular-nums text-indigo-600">
                      {sec.succeeded.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right font-semibold tabular-nums text-stone-700">
                      {sec.waitlistLeft.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs text-stone-400">
                    집계된 결제 현황이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 2. '미결제 지금 처리' 버튼 (공연이 done이면 숨김) */}
        {currentStatus !== 'done' && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-stone-600">
              기한이 지난 예매를 만료시키고 대기자에게 자리를 넘깁니다. 5분마다 자동으로도 실행됩니다.
            </p>
            <button
              type="button"
              onClick={handleProcessNow}
              disabled={processing}
              className="shrink-0 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-stone-800 disabled:opacity-50"
            >
              {processing ? '미결제 처리 중…' : '미결제 지금 처리'}
            </button>
          </div>
        )}
      </section>

      {/* 3. 예매 명단 & 필터 버튼 넷 (전체, 결제 대기, 결제 완료, 만료) */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">예매 명단</h2>
            <p className="text-xs text-stone-500">
              총 {totalElements.toLocaleString()}건 조회됨 (연락처는 뒤 4자리만 표시됩니다)
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['', '전체'],
                ['pending', '결제 대기'],
                ['paid', '결제 완료'],
                ['expired', '만료'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key || 'all'}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  filter === key
                    ? 'bg-stone-900 text-white'
                    : 'border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-stone-200 text-left uppercase tracking-wider text-stone-500">
              <tr>
                <th className="pb-2.5 font-semibold">이름</th>
                <th className="pb-2.5 font-semibold">번호</th>
                <th className="pb-2.5 font-semibold">구역</th>
                <th className="pb-2.5 text-center font-semibold">상태</th>
                <th className="pb-2.5 text-right font-semibold">금액</th>
                <th className="pb-2.5 text-right font-semibold">결제 기한</th>
                <th className="pb-2.5 text-center font-semibold">구분</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.length > 0 ? (
                rows.map((row) => {
                  const badge = BOOKING_STATUS_BADGE[row.status] ?? BOOKING_STATUS_BADGE.pending;
                  return (
                    <tr key={row.bookingId} className="hover:bg-stone-50/50">
                      <td className="py-3 font-semibold text-stone-900">{row.realName}</td>
                      <td className="py-3 font-mono text-stone-600">{row.phone}</td>
                      <td className="py-3 font-bold text-stone-800">{row.sectionName}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold tabular-nums text-stone-900">
                        {row.amount.toLocaleString('ko-KR')}원
                      </td>
                      <td className="py-3 text-right tabular-nums text-stone-600">
                        {formatKst(row.payDueAt)}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            row.source === 'succession'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {row.source === 'succession' ? '승계' : '추첨'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-stone-400">
                    {loadingRows ? '예매 명단을 불러오는 중입니다…' : '해당 상태의 예매 명단이 없습니다.'}
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
              disabled={loadingRows}
              onClick={() => loadBookings(page + 1, filter, true)}
              className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
            >
              {loadingRows ? '불러오는 중…' : '다음 20개'}
            </button>
          </div>
        )}
      </section>

      {/* 4. 입장: 티켓 N장 · 입장 M명 + 입장 스캔 열기 링크 + 주소 복사 버튼 */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              현장 QR 검표 및 입장
            </span>
            <h3 className="mt-1 text-lg font-black text-stone-900 tabular-nums">
              티켓 {(stats?.issued ?? 0).toLocaleString()}장 · 입장 {(stats?.entered ?? 0).toLocaleString()}명
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              주최자 본인 또는 등록된 스태프 계정으로 로그인하여 관객의 QR 티켓을 스캔할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyScanUrl}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 shadow-2xs transition hover:bg-stone-50"
            >
              {copiedScanUrl ? '주소 복사됨!' : '주소 복사'}
            </button>
            <Link
              href={`/scan?eventId=${eventId}`}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
            >
              입장 스캔 열기 &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
