'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import { DrawBox } from '@/components/DrawBox';
import type {
  DrawInfo,
  DrawResultPage,
  DrawResultRow,
  EventStatus,
  PaymentStats,
} from '@/types/api';

type ResultFilter = '' | 'won' | 'waitlisted' | 'lost';

const RESULT_BADGE: Record<
  DrawResultRow['result'],
  { label: string; dot: string; cls: string }
> = {
  won: {
    label: '당첨',
    dot: 'bg-emerald-500',
    cls: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
  },
  waitlisted: {
    label: '대기',
    dot: 'bg-amber-500',
    cls: 'border-amber-200/80 bg-amber-50 text-amber-800',
  },
  lost: {
    label: '낙첨',
    dot: 'bg-[#8B95A1]',
    cls: 'border-[#E5E8EB] bg-[#F2F4F6] text-[#4E5968]',
  },
};

interface DrawTabProps {
  eventId: string;
  eventStatus: EventStatus;
  paymentDueAt: string;
  initialDraw?: DrawInfo | null;
  onPaymentOpened: (stats?: PaymentStats) => void;
  onReloadEvent: () => void;
}

export function DrawTab({
  eventId,
  eventStatus,
  paymentDueAt,
  initialDraw = null,
  onPaymentOpened,
  onReloadEvent,
}: DrawTabProps) {
  const [drawInfo, setDrawInfo] = useState<DrawInfo | null>(initialDraw);
  const [filter, setFilter] = useState<ResultFilter>('won');
  const [rows, setRows] = useState<DrawResultRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [openingPayment, setOpeningPayment] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialDraw) {
      setDrawInfo(initialDraw);
      return;
    }
    let ignore = false;
    apiFetch<DrawInfo>(`/api/public/events/${eventId}/draw`, { auth: false })
      .then((data) => {
        if (!ignore) setDrawInfo(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [eventId, initialDraw]);

  const loadResults = useCallback(
    async (pageNum: number, currentFilter: ResultFilter, append: boolean) => {
      setLoadingRows(true);
      try {
        const q = currentFilter ? `result=${currentFilter}&` : '';
        const res = await apiFetch<DrawResultPage>(
          `/api/events/${eventId}/draw/results?${q}page=${pageNum}&size=20`,
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
            : '추첨 결과 명단을 불러오지 못했습니다.',
        );
      } finally {
        setLoadingRows(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    loadResults(0, filter, false);
  }, [filter, loadResults]);

  const handleOpenPayment = async () => {
    if (openingPayment) return;
    const wonTotal = drawInfo
      ? drawInfo.sections.reduce((sum, sec) => sum + sec.won, 0)
      : 0;
    if (
      !confirm(
        `당첨자 ${wonTotal}명에게 결제를 엽니다. 결제 마감은 ${formatKst(paymentDueAt)}입니다. 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }

    setOpeningPayment(true);
    setErrorMsg(null);
    try {
      const stats = await apiFetch<PaymentStats>(
        `/api/events/${eventId}/payment/open`,
        {
          method: 'POST',
        },
      );
      onPaymentOpened(stats);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 && err.code === 'ALREADY_PAYING') {
          onReloadEvent();
          return;
        }
        if (err.code === 'EVENT_NOT_DRAWN') {
          setErrorMsg('먼저 추첨을 진행하세요');
          return;
        }
        if (err.code === 'PAYMENT_WINDOW_CLOSED') {
          setErrorMsg('결제 마감 시각이 이미 지났습니다');
          return;
        }
        if (err.status === 403 || err.code === 'FORBIDDEN') {
          setErrorMsg('권한이 없습니다');
          return;
        }
        setErrorMsg(err.message);
      } else {
        setErrorMsg(
          err instanceof Error ? err.message : '결제 열기에 실패했습니다.',
        );
      }
    } finally {
      setOpeningPayment(false);
    }
  };

  const hasMore = page + 1 < totalPages;

  return (
    <div className="space-y-5">
      <DrawBox eventId={eventId} initialDraw={drawInfo} />

      {eventStatus === 'drawn' && (
        <section className="flex flex-col gap-4 rounded-lg border border-[#BFDBFE] bg-[#F5F9FF] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#191F28]">
              당첨자 결제 개시
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#4E5968]">
              결제를 열면 당첨자별 예매(결제 대기)가 생성되며 공연 상태가 &lsquo;결제 중&rsquo;으로 전환됩니다. (결제 마감: {formatKst(paymentDueAt)})
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenPayment}
            disabled={openingPayment}
            className="shrink-0 cursor-pointer rounded-md bg-[#1B64DA] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1554BD] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {openingPayment ? '결제 여는 중…' : '결제 열기'}
          </button>
        </section>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
        >
          {errorMsg}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E5E8EB] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#191F28]">추첨 결과 명단</h2>
            <p className="mt-0.5 text-xs text-[#6B7684]">
              총 <span className="tabular-nums">{totalElements.toLocaleString()}</span>건 조회됨 · 연락처 뒤 4자리만 표시
            </p>
          </div>

          <div className="inline-flex rounded-md bg-[#F2F4F6] p-0.5">
            {(
              [
                ['', '전체'],
                ['won', '당첨'],
                ['waitlisted', '대기'],
                ['lost', '낙첨'],
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
                <th className="px-5 py-2.5 text-center font-medium">결과</th>
                <th className="px-5 py-2.5 text-center font-medium">구분</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8EB]">
              {rows.length > 0 ? (
                rows.map((row) => {
                  const badge = RESULT_BADGE[row.result];
                  return (
                    <tr key={row.entryId} className="hover:bg-[#F9FAFB]">
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
                          {row.result === 'waitlisted' && row.waitlistRank != null
                            ? `대기 ${row.waitlistRank}번`
                            : badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        {row.teamId ? (
                          <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-[#1B64DA]">
                            연석 팀
                          </span>
                        ) : (
                          <span className="text-[#8B95A1]">개인</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-xs text-[#6B7684]">
                    {loadingRows
                      ? '추첨 결과 명단을 불러오는 중입니다…'
                      : '해당 조건의 추첨 결과가 없습니다.'}
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
              onClick={() => loadResults(page + 1, filter, true)}
              className="cursor-pointer rounded-md border border-[#D1D6DB] bg-white px-4 py-1.5 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6] disabled:opacity-50"
            >
              {loadingRows ? '불러오는 중…' : '다음 20개 더 보기'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
