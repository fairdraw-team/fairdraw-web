'use client';

import { useState } from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import type { SealInfo } from '@/types/api';
import { formatKst } from '@/lib/datetime';

interface SealBoxProps {
  seal: SealInfo;
  className?: string;
}

export function SealBox({ seal, className = '' }: SealBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = async () => {
    if (!seal.rosterHash) return;
    try {
      await navigator.clipboard.writeText(seal.rosterHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('해시값을 복사하지 못했습니다. 수동으로 복사해 주시기 바랍니다.');
    }
  };

  return (
    <section
      className={`overflow-hidden rounded-lg border border-[#D1E7DD] bg-white ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2F0E9] bg-[#F4FBF7] px-5 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <h3 className="text-[13px] font-semibold text-[#191F28]">명단 봉인 완료</h3>
          <span className="rounded border border-emerald-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
            SHA-256 검증 가능
          </span>
        </div>
        <span className="text-xs tabular-nums text-[#4E5968]">
          봉인 일시 {formatKst(seal.sealedAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 divide-y divide-[#E5E8EB] sm:grid-cols-[200px_1fr] sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <div className="text-xs text-[#6B7684]">봉인된 총 제비 수</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-[#191F28]">
            {(seal.ballotCount ?? 0).toLocaleString()}
            <span className="ml-1 text-xs font-normal text-[#6B7684]">장</span>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-xs text-[#6B7684]">구역별 봉인 내역</div>
          {seal.sections && seal.sections.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {seal.sections.map((sec) => (
                <span
                  key={sec.sectionId}
                  className="inline-flex items-center gap-1.5 rounded border border-[#E5E8EB] bg-[#F9FAFB] px-2.5 py-1 text-xs text-[#333D4B]"
                >
                  <span className="font-medium">{sec.name}</span>
                  <span className="tabular-nums font-semibold text-[#191F28]">
                    {sec.ballots.toLocaleString()}장
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-1.5 text-sm font-medium text-[#191F28]">
              전체 명단 해시 잠금 완료
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#E5E8EB] bg-[#F9FAFB] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#4E5968]">
            무결성 해시 지문 (SHA-256)
          </span>
          <button
            type="button"
            onClick={handleCopyHash}
            disabled={!seal.rosterHash}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#D1D6DB] bg-white px-2.5 py-1 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span className="text-emerald-700">복사됨</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#6B7684]" aria-hidden="true" />
                <span>해시 복사</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-2 rounded-md border border-[#E5E8EB] bg-white px-3 py-2 font-mono text-xs leading-relaxed break-all text-[#333D4B] select-all">
          {seal.rosterHash}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#6B7684]">
          응모 마감 시점의 전체 제비 명단을 결합해 생성한 64자리 위변조 방지 지문입니다. 추첨 이후에도 명단 조작 여부를 누구나 검증할 수 있습니다.
        </p>
      </div>
    </section>
  );
}
