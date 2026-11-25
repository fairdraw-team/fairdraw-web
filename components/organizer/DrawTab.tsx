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

const RESULT_BADGE: Record<DrawResultRow['result'], { label: string; cls: string }> = {
  won: {
    label: '당첨',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  waitlisted: {
    label: '대기',
    cls: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  lost: {
    label: '낙첨',
    cls: 'border-stone-200 bg-stone-100 text-stone-600',
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
        setErrorMsg(err instanceof Error ? err.message : '추첨 결과 명단을 불러오지 못했습니다.');
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
      const stats = await apiFetch<PaymentStats>(`/api/events/${eventId}/payment/open`, {
        method: 'POST',
      });
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
        setErrorMsg(err instanceof Error ? err.message : '결제 열기에 실패했습니다.');
      }
    } finally {
      setOpeningPayment(false);
    }
  };

  const hasMore = page + 1 < totalPages;

  return (
    <div className="space-y-6">
      {/* 위: 공개 추첨 정보 상자 */}
      <DrawBox eventId={eventId} initialDraw={drawInfo} />

      {/* FB-2: DrawBox 바로 아래 '결제 열기' 버튼 (공연 status가 drawn일 때만 노출) */}
      {eventStatus === 'drawn' && (
        <section className="rounded-3xl border-2 border-indigo-200 bg-indigo-50/60 p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-block rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-700">
                추첨 완료 · 결제 개시 대기
              </span>
              <h3 className="mt-2 text-base font-bold text-stone-900">
                당첨자 결제를 시작할 준비가 되었습니다
              </h3>
              <p className="mt-1 text-xs text-stone-600">
                결제 열기를 누르면 당첨자마다 예매(pending)가 생성되고 공연 상태가 &lsquo;결제 중&rsquo;으로 전환됩니다. (결제 마감: {formatKst(paymentDueAt)})
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenPayment}
              disabled={openingPayment}
              className="shrink-0 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {openingPayment ? '결제 여는 중…' : '결제 열기'}
            </button>
          </div>
        </section>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700"
        >
          {errorMsg}
        </div>
      )}

      {/* 아래: 추첨 결과 명단 및 필터 버튼 넷 (전체, 당첨, 대기, 낙첨) */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">추첨 결과 명단</h2>
            <p className="text-xs text-stone-500">
              총 {totalElements.toLocaleString()}건 조회됨 (연락처는 뒤 4자리만 표시됩니다)
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
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
                <th className="pb-2.5 text-center font-semibold">결과</th>
                <th className="pb-2.5 text-center font-semibold">구분</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.length > 0 ? (
                rows.map((row) => {
                  const badge = RESULT_BADGE[row.result];
                  return (
                    <tr key={row.entryId} className="hover:bg-stone-50/60">
                      <td className="py-3 font-semibold text-stone-900">{row.realName}</td>
                      <td className="py-3 font-mono text-stone-600">{row.phone}</td>
                      <td className="py-3 font-bold text-stone-800">{row.sectionName}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}
                        >
                          {row.result === 'waitlisted' && row.waitlistRank != null
                            ? `대기 ${row.waitlistRank}번`
                            : badge.label}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        {row.teamId ? (
                          <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                            연석 팀
                          </span>
                        ) : (
                          <span className="text-stone-400">개인</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-stone-400">
                    {loadingRows ? '추첨 결과 명단을 불러오는 중입니다…' : '해당 조건의 추첨 결과가 없습니다.'}
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
              onClick={() => loadResults(page + 1, filter, true)}
              className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
            >
              {loadingRows ? '불러오는 중…' : '다음 20개'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
