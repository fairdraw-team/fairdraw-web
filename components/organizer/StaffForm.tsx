'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { inputCls } from './EventInfoFields';

export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (/^01\d{8,9}$/.test(digits)) return `+82${digits.slice(1)}`;
  if (/^821\d{8,9}$/.test(digits)) return `+${digits}`;
  return null;
}

export function StaffForm({ eventId }: { eventId: string }) {
  const [phone, setPhone] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const e164 = toE164(phone);
    if (!e164) {
      setMsg({
        ok: false,
        text: '올바른 휴대폰 번호 형식을 입력해 주세요. (예: 010-1234-5678)',
      });
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/events/${eventId}/staff`, {
        method: 'POST',
        body: JSON.stringify({ phone: e164 }),
      });
      setAdded((a) => [...a, phone]);
      setPhone('');
      setMsg({
        ok: true,
        text: '이 번호로 휴대폰 인증을 마친 계정으로 로그인해야 스캔할 수 있습니다',
      });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : '스태프 등록에 실패하였습니다.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
      <div className="border-b border-[#E5E8EB] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-[#191F28]">현장 검표 스태프 등록</h2>
        <p className="mt-0.5 text-xs text-[#6B7684]">
          공연 당일 QR 티켓 검표 권한을 부여할 스태프의 휴대폰 번호를 등록합니다.
        </p>
      </div>

      <div className="p-5">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="tel"
            inputMode="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`${inputCls} tabular-nums sm:max-w-xs`}
            aria-label="스태프 휴대폰 번호"
          />
          <button
            type="submit"
            disabled={busy || !phone}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#191F28] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#333D4B] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{busy ? '등록 중…' : '스태프 추가'}</span>
          </button>
        </form>

        {msg && (
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 text-xs font-medium ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`}
          >
            {msg.text}
          </p>
        )}

        {added.length > 0 && (
          <div className="mt-4 border-t border-[#E5E8EB] pt-3.5">
            <div className="text-xs font-medium text-[#6B7684]">이번 세션에서 등록한 스태프</div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {added.map((p, i) => (
                <li
                  key={`${p}-${i}`}
                  className="rounded border border-[#E5E8EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-xs text-[#191F28]"
                >
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[#6B7684]">
              등록된 번호로 휴대폰 인증을 마친 계정으로 로그인해야 현장 스캔 화면에 접근할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
