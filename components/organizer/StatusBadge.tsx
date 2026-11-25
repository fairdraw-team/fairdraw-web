import type { EventStatus } from '@/types/api';

const STATUS_STYLE: Record<EventStatus, { label: string; dot: string; badge: string }> = {
  draft: {
    label: '준비 중',
    dot: 'bg-[#8B95A1]',
    badge: 'border-[#E5E8EB] bg-[#F2F4F6] text-[#4E5968]',
  },
  open: {
    label: '응모 중',
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
  },
  closed: {
    label: '마감 · 봉인',
    dot: 'bg-[#4E5968]',
    badge: 'border-[#D1D6DB] bg-[#F2F4F6] text-[#191F28]',
  },
  drawn: {
    label: '추첨 완료',
    dot: 'bg-[#1B64DA]',
    badge: 'border-blue-200/80 bg-blue-50 text-[#1B64DA]',
  },
  paying: {
    label: '결제 중',
    dot: 'bg-amber-500',
    badge: 'border-amber-200/80 bg-amber-50 text-amber-800',
  },
  done: {
    label: '종료',
    dot: 'bg-[#B0B8C1]',
    badge: 'border-[#E5E8EB] bg-[#F9FAFB] text-[#6B7684]',
  },
};

export function StatusBadge({ status }: { status: EventStatus }) {
  const s = STATUS_STYLE[status] ?? {
    label: status,
    dot: 'bg-[#8B95A1]',
    badge: 'border-[#E5E8EB] bg-[#F2F4F6] text-[#4E5968]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium leading-tight whitespace-nowrap ${s.badge}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}
