'use client';

import { useState } from 'react';
import type { SealInfo } from '@/types/api';
import { formatKst } from '@/lib/datetime';

interface SealBoxProps {
  seal: SealInfo;
  className?: string;
}

export function SealBox({ seal, className = '' }: SealBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(seal.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('해시값을 복사하지 못했습니다. 수동으로 복사해 주시기 바랍니다.');
    }
  };

  return (
    <div
      className={`rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-950 p-6 text-neutral-100 shadow-xl backdrop-blur-md ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Fair Draw Trust Seal
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
            명단 봉인 완료
          </span>
        </div>
        <span className="text-xs text-neutral-400">
          봉인 일시: {formatKst(seal.sealedAt)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-neutral-900/80 p-3.5 border border-neutral-800">
          <div className="text-xs text-neutral-400">봉인된 총 제비 수</div>
          <div className="mt-1 text-2xl font-bold text-emerald-400">
            {seal.totalBallots.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-neutral-400">장</span>
          </div>
        </div>
        <div className="rounded-xl bg-neutral-900/80 p-3.5 border border-neutral-800">
          <div className="text-xs text-neutral-400">확정 응모 건수</div>
          <div className="mt-1 text-2xl font-bold text-neutral-100">
            {seal.totalEntries.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-neutral-400">건</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between pb-1.5">
          <label className="text-xs font-medium text-neutral-300">
            암호학적 무결성 지문 (SHA-256 해시)
          </label>
          <button
            type="button"
            onClick={handleCopyHash}
            className="inline-flex items-center gap-1 rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-200 transition hover:bg-neutral-700"
          >
            {copied ? (
              <span className="text-emerald-400 font-semibold">복사 완료!</span>
            ) : (
              <span>해시 복사</span>
            )}
          </button>
        </div>
        <div className="rounded-lg bg-neutral-950 p-3 font-mono text-xs break-all text-neutral-300 border border-neutral-800 select-all leading-relaxed">
          {seal.hash}
        </div>
        <p className="mt-2 text-xs leading-normal text-neutral-400">
          이 지문은 응모 마감 순간의 모든 제비 명단을 결합하여 생성된 64자리 위변조 방지 식별값입니다.
          추첨 이후에도 명단이 단 한 글자도 조작되지 않았음을 누구나 수학적으로 검증하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
