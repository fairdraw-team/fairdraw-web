'use client';
// 현장 입장 검표 스태프 등록 (관계자용 정중한 존댓말 적용)
import { useState } from 'react';
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
      setMsg({ ok: false, text: '올바른 휴대폰 번호 형식을 입력해 주세요. (예: 010-1234-5678)' });
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/events/${eventId}/staff`, { method: 'POST', body: JSON.stringify({ phone: e164 }) });
      setAdded((a) => [...a, phone]);
      setPhone('');
      setMsg({ ok: true, text: '현장 입장 스태프 권한이 성공적으로 등록되었습니다.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : '스태프 등록에 실패하였습니다.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
      <h2 className="text-base font-bold text-stone-900">현장 입장 검표 스태프 관리</h2>
      <p className="mt-1 text-xs text-stone-500">
        공연 당일 현장에서 관객의 QR 티켓을 스캔하여 입장을 검표할 스태프의 휴대폰 번호를 등록해 주세요.
      </p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          type="tel"
          inputMode="tel"
          placeholder="010-1234-5678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputCls}
          aria-label="스태프 휴대폰 번호"
        />
        <button
          disabled={busy || !phone}
          className="shrink-0 rounded-xl bg-stone-900 px-5 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-40"
        >
          {busy ? '등록 중…' : '스태프 등록'}
        </button>
      </form>
      {msg && (
        <p role="status" className={`mt-2.5 text-xs font-medium ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
          {msg.text}
        </p>
      )}
      {added.length > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <span className="text-xs font-semibold text-stone-500">등록된 스태프 연락처 목록:</span>
          <ul className="mt-2 flex flex-wrap gap-2">
            {added.map((p, i) => (
              <li key={`${p}-${i}`} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
