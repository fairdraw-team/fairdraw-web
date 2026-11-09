'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import type { EventItem } from '@/types/api';

export default function TrashPage() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<EventItem[]>('/api/events?trash=true')
      .then(setEvents)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  // 공연 복구
  async function handleRestore(id: string) {
    if (!confirm('이 공연을 다시 복구하시겠습니까?\n\n복구 시 정상적으로 주최 공연 관리 목록에 다시 노출됩니다.')) return;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/events/${id}/restore`, { method: 'POST' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '복구 처리에 실패하였습니다.');
    } finally {
      setBusyId(null);
    }
  }

  // 영구 삭제
  async function handlePermanentDelete(id: string) {
    if (!confirm('이 공연을 완전히 영구 삭제하시겠습니까?\n\n* 영구 삭제된 공연 데이터는 복구하실 수 없습니다.')) return;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/events/${id}/permanent`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '영구 삭제 처리에 실패하였습니다.');
    } finally {
      setBusyId(null);
    }
  }

  // 휴지통 전체 비우기
  async function handleEmptyTrash() {
    if (!confirm('휴지통에 보관된 모든 공연을 완전히 비우시겠습니까?\n\n* 비워진 모든 공연은 영구히 삭제되며 되돌릴 수 없습니다.')) return;
    setError(null);
    try {
      await apiFetch('/api/events/trash/empty', { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '휴지통 비우기에 실패하였습니다.');
    }
  }

  return (
    <div className="space-y-6">
      {/* 타이틀 및 휴지통 비우기 버튼 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">휴지통</h1>
            {events && (
              <span className="rounded-full bg-stone-200/80 px-2.5 py-0.5 text-xs font-bold text-stone-700">
                총 {events.length}건 보관 중
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-500">
            삭제된 공연 목록입니다. 보관된 공연은 다시 복구하시거나 완전히 영구 삭제하실 수 있습니다.
          </p>
        </div>

        {events && events.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-2xs hover:bg-rose-50"
          >
            <span>휴지통 전체 비우기</span>
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!events && !error && (
        <div className="flex items-center justify-center rounded-2xl border border-stone-200 bg-white p-12 text-sm text-stone-400">
          <span>휴지통 목록을 불러오는 중입니다…</span>
        </div>
      )}

      {events?.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-stone-200 bg-white p-16 text-center">
          <p className="text-base font-bold text-stone-700">휴지통이 비어 있습니다.</p>
          <p className="mt-1 text-xs text-stone-500">삭제 처리된 공연이 없습니다.</p>
          <Link
            href="/organizer/events"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800"
          >
            <span>주최 공연 관리로 돌아가기</span>
          </Link>
        </div>
      )}

      {/* 휴지통 공연 목록 카드 */}
      <ul className="space-y-4">
        {events?.map((ev) => (
          <li
            key={ev.id}
            className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 sm:w-20">
                {ev.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.posterUrl} alt={ev.title} className="h-full w-full object-cover grayscale opacity-75" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-stone-200 text-lg font-bold text-stone-400">
                    {ev.title.charAt(0)}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={ev.status} />
                  <span className="text-xs text-stone-400">
                    삭제 일시: {ev.deletedAt ? formatKst(ev.deletedAt) : '기록 없음'}
                  </span>
                </div>
                <h2 className="mt-1.5 text-base font-bold text-stone-800 line-clamp-1">{ev.title}</h2>
                <p className="mt-0.5 text-xs text-stone-500">{ev.venue}</p>
                <p className="mt-0.5 text-xs text-stone-500">공연 일시: {formatKst(ev.eventAt)}</p>
              </div>
            </div>

            {/* 복구 및 영구 삭제 액션 버튼 */}
            <div className="flex items-center gap-2 self-end border-t border-stone-100 pt-3 sm:self-center sm:border-0 sm:pt-0">
              <button
                onClick={() => handleRestore(ev.id)}
                disabled={busyId === ev.id}
                className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 disabled:opacity-50"
              >
                {busyId === ev.id ? '처리 중…' : '복구하기'}
              </button>
              <button
                onClick={() => handlePermanentDelete(ev.id)}
                disabled={busyId === ev.id}
                className="rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 shadow-2xs hover:bg-rose-50 hover:border-rose-300 disabled:opacity-50"
              >
                {busyId === ev.id ? '처리 중…' : '영구 삭제'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
