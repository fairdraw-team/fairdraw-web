import type { EventStatus } from '@/types/api';

const LABEL: Record<EventStatus, [string, string]> = {
  draft: ['준비 중', 'bg-stone-100 text-stone-700 ring-stone-300'],
  open: ['응모 중', 'bg-emerald-50 text-emerald-700 ring-emerald-300'],
  closed: ['마감', 'bg-rose-50 text-rose-700 ring-rose-300'],
  drawn: ['추첨 완료', 'bg-indigo-50 text-indigo-700 ring-indigo-300'],
  paying: ['결제 중', 'bg-amber-50 text-amber-700 ring-amber-300'],
  done: ['종료', 'bg-stone-200 text-stone-600 ring-stone-300'],
};

export function StatusBadge({ status }: { status: EventStatus }) {
  const [text, cls] = LABEL[status] ?? [status, 'bg-stone-100 text-stone-700 ring-stone-300'];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>{text}</span>;
}
