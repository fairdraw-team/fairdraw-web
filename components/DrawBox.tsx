'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import type { DrawInfo } from '@/types/api';
import { Check, Copy, ShieldCheck, Sparkles } from 'lucide-react';

interface DrawBoxProps {
  eventId: string;
  /** 이미 상위 컴포넌트에서 추첨 응답(예: POST /draw 결과)을 받은 경우 바로 주입 가능 */
  initialDraw?: DrawInfo | null;
  /** 검증하기 링크 숨김 여부 (검증 페이지 내부에서 사용할 때 등) */
  hideVerifyLink?: boolean;
}

export function DrawBox({
  eventId,
  initialDraw = null,
  hideVerifyLink = false,
}: DrawBoxProps) {
  const [draw, setDraw] = useState<DrawInfo | null>(initialDraw);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialDraw) {
      setDraw(initialDraw);
      return;
    }

    let ignore = false;

    apiFetch<DrawInfo>(`/api/public/events/${eventId}/draw`, { auth: false })
      .then((data) => {
        if (!ignore) setDraw(data);
      })
      .catch((err) => {
        // 404 DRAW_NOT_FOUND 등 추첨 전 상태면 상자를 숨김
        if (!ignore) {
          if (err instanceof ApiError && err.status === 404) {
            setDraw(null);
          } else {
            setDraw(null);
          }
        }
      });

    return () => {
      ignore = true;
    };
  }, [eventId, initialDraw]);

  // 추첨 전(404 DRAW_NOT_FOUND)이면 렌더링하지 않음
  if (!draw) return null;

  const handleCopySeed = async () => {
    try {
      await navigator.clipboard.writeText(draw.seed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('시드 복사에 실패했습니다.');
    }
  };

  const shortSeed =
    draw.seed.length > 12
      ? `${draw.seed.slice(0, 8)}...${draw.seed.slice(-4)}`
      : draw.seed;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs">
      {/* 상단 헤더 및 검증 링크 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-black text-stone-900">공개 추첨 정보</h2>
          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
            결정적 공개 시드
          </span>
        </div>

        {!hideVerifyLink && (
          <Link
            href={`/events/${eventId}/verify`}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-800 transition hover:bg-stone-100"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
            검증하기 &rarr;
          </Link>
        )}
      </div>

      {/* 추첨 시각 & 공개 시드 */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2.5">
          <span className="block text-[11px] font-semibold text-stone-500">추첨 시각</span>
          <b className="mt-0.5 block text-xs font-bold text-stone-900 tabular-nums">
            {formatKst(draw.drawnAt)}
          </b>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2.5">
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold text-stone-500">
              추첨 시드 (SHA-256)
            </span>
            <code className="mt-0.5 block truncate font-mono text-xs font-bold text-indigo-700">
              {shortSeed}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopySeed}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-700 transition hover:bg-stone-100"
            title="전체 64글자 시드 복사"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                복사됨
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                전체 복사
              </>
            )}
          </button>
        </div>
      </div>

      {/* 구역별 당첨·대기 집계 표 */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-100/80 text-stone-600">
              <th className="px-3 py-2 font-bold">구역</th>
              <th className="px-3 py-2 text-right font-bold">정원</th>
              <th className="px-3 py-2 text-right font-bold">제비 수</th>
              <th className="px-3 py-2 text-right font-bold text-emerald-700">당첨</th>
              <th className="px-3 py-2 text-right font-bold text-amber-700">대기</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {draw.sections.map((sec) => (
              <tr key={sec.sectionId} className="hover:bg-stone-50/60">
                <td className="px-3 py-2 font-extrabold text-stone-900">{sec.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-stone-600">
                  {sec.capacity.toLocaleString()}석
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-stone-600">
                  {sec.ballots.toLocaleString()}장
                </td>
                <td className="px-3 py-2 text-right font-extrabold tabular-nums text-emerald-700">
                  {sec.won.toLocaleString()}명
                </td>
                <td className="px-3 py-2 text-right font-bold tabular-nums text-amber-700">
                  {sec.waitlisted.toLocaleString()}명
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}