'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as OTPAuth from 'otpauth';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import type { MyTicket } from '@/types/api';
import { Ticket, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';

// 티켓 한 장의 QR 글자 생성 (백엔드 Totp와 동일 규격: SHA1, 6자리, 30초, fromHex)
export function qrTextOf(ticket: { id: string; code: string }) {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromHex(ticket.code),
  });
  return `FD1.${ticket.id}.${totp.generate()}`;
}

export default function MyTicketPage() {
  const [tickets, setTickets] = useState<MyTicket[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1초마다 갱신되는 현재 시각(초)
  const [nowSec, setNowSec] = useState<number | null>(null);

  useEffect(() => {
    setNowSec(Math.floor(Date.now() / 1000));
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);

    apiFetch<MyTicket[]>('/api/tickets/me')
      .then((list) => {
        setTickets(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '티켓을 불러오지 못했습니다.');
      });

    return () => clearInterval(timer);
  }, []);

  // 30초 주기 남은 시간 계산
  const secondsLeft = nowSec !== null ? 30 - (nowSec % 30) : 30;
  const activeTicket =
    tickets?.find((t) => t.id === selectedId) ?? tickets?.[0] ?? null;

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <Link
            href="/me"
            className="text-xs font-bold text-stone-600 hover:text-stone-900"
          >
            &larr; 내 정보로 돌아가기
          </Link>
          <span className="flex items-center gap-1.5 text-xs font-black text-stone-900">
            <Ticket className="h-4 w-4 text-indigo-600" />
            내 티켓 (모바일 입장권)
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 py-8">
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        {!tickets && !error && (
          <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
            발급된 티켓을 불러오는 중입니다…
          </div>
        )}

        {/* 티켓이 없는 경우 */}
        {tickets && tickets.length === 0 && (
          <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500">
              <Ticket className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-bold text-stone-800">
              아직 티켓이 없습니다. 결제를 마치면 여기에 생깁니다.
            </p>
            <p className="mt-1.5 text-xs text-stone-500">
              당첨된 공연의 결제를 완료하시면 즉시 동적 QR 티켓이 발급됩니다.
            </p>
            <Link
              href="/events"
              className="mt-6 inline-block rounded-xl bg-stone-900 px-6 py-3 text-xs font-bold text-white hover:bg-stone-800"
            >
              공연 목록으로 이동
            </Link>
          </div>
        )}

        {/* 티켓이 여러 장일 때 상단 선택 카드 목록 */}
        {tickets && tickets.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tickets.map((t) => {
              const selected = t.id === activeTicket?.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`shrink-0 rounded-2xl border px-4 py-2.5 text-left text-xs transition ${
                    selected
                      ? 'border-indigo-600 bg-indigo-600 font-bold text-white shadow-xs'
                      : 'border-stone-200 bg-white font-semibold text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <p className="max-w-[160px] truncate">{t.eventTitle}</p>
                  <p
                    className={`mt-0.5 text-[11px] ${
                      selected ? 'text-indigo-100' : 'text-stone-400'
                    }`}
                  >
                    {t.sectionName}구역 · {t.status === 'used' ? '입장 완료' : '유효'}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* 선택된 티켓 상세 및 30초 동적 QR 카드 */}
        {activeTicket && (
          <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            {/* 상단 공연 정보 헤더 */}
            <div className="bg-stone-900 p-6 text-white">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] font-extrabold text-indigo-300 border border-indigo-400/30">
                  {activeTicket.sectionName}구역 입장권
                </span>
                <span className="text-xs font-bold text-stone-300">
                  {activeTicket.status === 'used'
                    ? '사용 완료'
                    : activeTicket.status === 'void'
                      ? '무효 티켓'
                      : '입장 가능'}
                </span>
              </div>
              <h1 className="mt-3 text-xl font-black leading-snug">
                {activeTicket.eventTitle}
              </h1>
              <p className="mt-1.5 text-xs text-stone-300">
                공연 일시: {formatKst(activeTicket.startsAt)}
              </p>
            </div>

            {/* 중앙 QR 영역 (valid일 때만 30초 동적 QR 표시) */}
            <div className="flex flex-col items-center justify-center p-8 text-center">
              {activeTicket.status === 'valid' && nowSec !== null && (
                <>
                  <div className="rounded-3xl border-2 border-stone-200 bg-white p-5 shadow-xs">
                    <QRCodeSVG
                      value={qrTextOf(activeTicket)}
                      size={210}
                      level="M"
                    />
                  </div>

                  {/* 30초 카운트다운 게이지 & 남은 초 */}
                  <div className="mt-5 w-full max-w-[240px]">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1 text-indigo-600">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        동적 QR 보안 활성화
                      </span>
                      <span className="tabular-nums text-rose-600">
                        {secondsLeft}초 뒤 새 QR
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-1000 ease-linear"
                        style={{ width: `${(secondsLeft / 30) * 100}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTicket.status === 'used' && (
                <div className="my-6 flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50/70 px-8 py-10">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                  <p className="mt-3 text-lg font-black text-emerald-950">
                    입장 완료
                  </p>
                  {activeTicket.usedAt && (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      입장 시각: {formatKst(activeTicket.usedAt)}
                    </p>
                  )}
                </div>
              )}

              {activeTicket.status === 'void' && (
                <div className="my-6 flex flex-col items-center rounded-2xl border border-rose-200 bg-rose-50 px-8 py-10">
                  <ShieldAlert className="h-12 w-12 text-rose-600" />
                  <p className="mt-3 text-base font-black text-rose-900">
                    무효화된 티켓입니다
                  </p>
                </div>
              )}

              {/* 캡처 방지 안내 문구 */}
              <div className="mt-6 w-full rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs font-semibold text-amber-900">
                캡처한 QR로는 입장할 수 없습니다. 입장할 때 이 화면을 보여 주세요.
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}