'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink, QrCode, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import type {
  BookingPage,
  BookingRow,
  EventStatus,
  PaymentStats,
} from '@/types/api';

type BookingFilter = '' | 'pending' | 'paid' | 'expired';

const BOOKING_STATUS_BADGE: Record<
  BookingRow['status'],
  { label: string; dot: string; cls: string }
> = {
  pending: {
    label: '결제 대기',
    dot: 'bg-amber-500',
    cls: 'border-amber-200/80 bg-amber-50 text-amber-800',
  },
  paid: {
    label: '결제 완료',
    dot: 'bg-emerald-500',
    cls: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
  },
  expired: {
    label: '만료',
    dot: 'bg-rose-500',
    cls: 'border-rose-200/80 bg-rose-50 text-rose-700',
  },
  cancelled: {
    label: '취소',
    dot: 'bg-[#8B95A1]',
    cls: 'border-[#E5E8EB] bg-[#F2F4F6] text-[#4E5968]',
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
      const data = await apiFetch<PaymentStats>(
        `/api/events/${eventId}/payment/stats`,
      );
      setStats(data);
      if (data.status && data.status !== eventStatus) {
        onStatusChange?.(data.status);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : '결제 현황 통계를 불러오지 못했습니다.',
      );
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
        setErrorMsg(
          err instanceof Error
            ? err.message
            : '예매 명단을 불러오지 못했습니다.',
        );
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
      const updated = await apiFetch<PaymentStats>(
        `/api/events/${eventId}/payment/process`,
        {
          method: 'POST',
        },
      );
      setStats(updated);
      if (updated.status) {
        onStatusChange?.(updated.status);
      }
      await loadBookings(0, filter, false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : '미결제 처리에 실패했습니다.',
      );
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
  const issued = stats?.issued ?? 0;
  const entered = stats?.entered ?? 0;
  const entryRate = issued > 0 ? Math.min(100, Math.round((entered / issued) * 100)) : 0;

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
        >
          {errorMsg}
        </div>
      )}

      {/* 1. 구역별 결제 및 승계 현황 */}
      <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E8EB] px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-[#191F28]">
              구역별 결제 및 승계 현황
            </h2>
            <p className="mt-0.5 text-xs text-[#6B7684]">
              결제 마감 시각{' '}
              <span className="font-medium tabular-nums text-[#191F28]">
                {dueAtText}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadStats();
              loadBookings(0, filter, false);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#D1D6DB] bg-white px-3 py-1.5 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6]"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#6B7684]" aria-hidden="true" />
            <span>새로고침</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E8EB] bg-[#F9FAFB] text-left text-[11px] font-medium text-[#6B7684]">
                <th className="px-5 py-2.5 font-medium">구역</th>
                <th className="px-5 py-2.5 text-right font-medium">정원</th>
                <th className="px-5 py-2.5 text-right font-medium">결제 완료</th>
                <th className="px-5 py-2.5 text-right font-medium">결제 대기</th>
                <th className="px-5 py-2.5 text-right font-medium">만료</th>
                <th className="px-5 py-2.5 text-right font-medium">승계</th>
                <th className="px-5 py-2.5 text-right font-medium">남은 대기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8EB]">
              {stats?.sections && stats.sections.length > 0 ? (
                stats.sections.map((sec) => (
                  <tr key={sec.sectionId} className="hover:bg-[#F9FAFB]">
                    <td className="px-5 py-3 font-medium text-[#191F28]">
                      {sec.name}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[#4E5968]">
                      {sec.capacity.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-emerald-700">
                      {sec.paid.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-amber-700">
                      {sec.pending.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-rose-600">
                      {sec.expired.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-[#1B64DA]">
                      {sec.succeeded.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[#4E5968]">
                      {sec.waitlistLeft.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-[#6B7684]">
                    집계된 결제 현황이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {currentStatus !== 'done' && (
          <div className="flex flex-col gap-3 border-t border-[#E5E8EB] bg-[#F9FAFB] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#4E5968]">
              기한이 지난 예매를 만료 처리하고 대기자에게 자리를 승계합니다. (5분마다 자동 실행)
            </p>
            <button
              type="button"
              onClick={handleProcessNow}
              disabled={processing}
              className="shrink-0 cursor-pointer rounded-md bg-[#191F28] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#333D4B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? '처리 중…' : '미결제 지금 처리'}
            </button>
          </div>
        )}
      </section>

      {/* 2. 예매 명단 */}
      <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E5E8EB] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#191F28]">예매 명단</h2>
            <p className="mt-0.5 text-xs text-[#6B7684]">
              총 <span className="tabular-nums">{totalElements.toLocaleString()}</span>건 조회됨 · 연락처 뒤 4자리만 표시
            </p>
          </div>

          <div className="inline-flex rounded-md bg-[#F2F4F6] p-0.5">
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
                className={`cursor-pointer rounded px-3 py-1 text-xs font-medium transition-colors ${
                  filter === key
                    ? 'bg-white text-[#191F28] shadow-2xs'
                    : 'text-[#6B7684] hover:text-[#191F28]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E8EB] bg-[#F9FAFB] text-left text-[11px] font-medium text-[#6B7684]">
                <th className="px-5 py-2.5 font-medium">이름</th>
                <th className="px-5 py-2.5 font-medium">연락처</th>
                <th className="px-5 py-2.5 font-medium">구역</th>
                <th className="px-5 py-2.5 text-center font-medium">상태</th>
                <th className="px-5 py-2.5 text-right font-medium">금액</th>
                <th className="px-5 py-2.5 text-right font-medium">결제 기한</th>
                <th className="px-5 py-2.5 text-center font-medium">구분</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8EB]">
              {rows.length > 0 ? (
                rows.map((row) => {
                  const badge =
                    BOOKING_STATUS_BADGE[row.status] ??
                    BOOKING_STATUS_BADGE.pending;
                  return (
                    <tr key={row.bookingId} className="hover:bg-[#F9FAFB]">
                      <td className="px-5 py-2.5 font-medium text-[#191F28]">
                        {row.realName}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-[#4E5968]">
                        {row.phone}
                      </td>
                      <td className="px-5 py-2.5 font-medium text-[#333D4B]">
                        {row.sectionName}
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
                            aria-hidden="true"
                          />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium tabular-nums text-[#191F28]">
                        {row.amount.toLocaleString('ko-KR')}원
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-[#6B7684]">
                        {formatKst(row.payDueAt)}
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                            row.source === 'succession'
                              ? 'border-blue-200 bg-blue-50 text-[#1B64DA]'
                              : 'border-[#E5E8EB] bg-[#F9FAFB] text-[#4E5968]'
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
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-[#6B7684]">
                    {loadingRows
                      ? '예매 명단을 불러오는 중입니다…'
                      : '해당 상태의 예매 명단이 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="border-t border-[#E5E8EB] bg-[#F9FAFB] px-5 py-3 text-center">
            <button
              type="button"
              disabled={loadingRows}
              onClick={() => loadBookings(page + 1, filter, true)}
              className="cursor-pointer rounded-md border border-[#D1D6DB] bg-white px-4 py-1.5 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6] disabled:opacity-50"
            >
              {loadingRows ? '불러오는 중…' : '다음 20개 더 보기'}
            </button>
          </div>
        )}
      </section>

      {/* 3. 현장 QR 입장 검표 연동 */}
      <section className="flex flex-col gap-4 rounded-lg border border-[#E5E8EB] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[#4E5968]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[#191F28]">
              현장 입장 현황
            </h3>
            <span className="text-xs font-medium tabular-nums text-[#6B7684]">
              ({entryRate}%)
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-2 text-sm tabular-nums text-[#191F28]">
            <span>
              발급 티켓 <strong className="font-semibold">{issued.toLocaleString()}장</strong>
            </span>
            <span className="text-[#D1D6DB]" aria-hidden="true">|</span>
            <span>
              입장 완료{' '}
              <strong className="font-semibold text-emerald-700">
                {entered.toLocaleString()}명
              </strong>
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#F2F4F6]">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${entryRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[#6B7684]">
            주최자 본인 또는 등록된 스태프 계정으로 로그인해 QR 티켓을 검표할 수 있습니다.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyScanUrl}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#D1D6DB] bg-white px-3 py-2 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6]"
          >
            {copiedScanUrl ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span className="text-emerald-700">주소 복사됨</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#6B7684]" aria-hidden="true" />
                <span>스캔 주소 복사</span>
              </>
            )}
          </button>
          <Link
            href={`/scan?eventId=${eventId}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1B64DA] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1554BD]"
          >
            <span>입장 스캔 열기</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
