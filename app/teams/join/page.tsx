'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { Team } from '@/types/api';

function JoinTeamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = (searchParams.get('code') || '').toUpperCase();

  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setCode(val);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setErrorMsg('초대 코드는 6자리 영문 및 숫자 조합입니다.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const team = await apiFetch<Team>('/api/teams/join', {
        method: 'POST',
        body: JSON.stringify({ code: cleanCode }),
      });
      router.push(`/teams/${team.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_CODE' || err.status === 404) {
          setErrorMsg(
            '초대 코드를 다시 확인해 주시기 바랍니다. 존재하지 않거나 만료된 코드입니다.',
          );
        } else if (err.code === 'TEAM_FULL' || err.status === 400) {
          setErrorMsg('해당 연석 팀은 이미 정원이 마감되었습니다.');
        } else if (err.code === 'ALREADY_ENTERED' || err.status === 409) {
          setErrorMsg(
            '이미 해당 공연에 응모하셨거나 다른 팀에 합류하셨습니다.',
          );
        } else {
          setErrorMsg(err.message || '팀 합류 중 오류가 발생했습니다.');
        }
      } else {
        setErrorMsg('네트워크 연결을 확인하신 후 다시 시도해 주시기 바랍니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#191F28] antialiased font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      <header className="border-b border-[#E5E8EB] bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7684] transition-colors hover:text-[#191F28]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>공연 목록</span>
          </Link>
          <span className="text-xs font-semibold text-[#191F28]">
            연석 팀 합류
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-12">
        <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
          <div className="border-b border-[#E5E8EB] px-6 py-5">
            <h1 className="text-lg font-semibold tracking-tight text-[#191F28]">
              초대 코드 입력
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[#6B7684]">
              팀장에게 전달받은 6자리 초대 코드를 입력하면 동일한 구역에 연석 팀원으로 자동 응모됩니다.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-5 p-6">
            {errorMsg && (
              <div
                role="alert"
                className="rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
              >
                {errorMsg}
              </div>
            )}

            <div>
              <label
                htmlFor="invite-code-input"
                className="mb-1.5 block text-xs font-medium text-[#333D4B]"
              >
                초대 코드 6자리
              </label>
              <input
                id="invite-code-input"
                type="text"
                maxLength={6}
                spellCheck={false}
                autoComplete="off"
                value={code}
                onChange={handleInputChange}
                placeholder="K7P2QX"
                className="w-full rounded-md border border-[#D1D6DB] bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.2em] text-[#191F28] placeholder:text-[#B0B8C1] transition-colors focus:border-[#1B64DA] focus:outline-none focus:ring-2 focus:ring-[#1B64DA]/15"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full cursor-pointer rounded-md bg-[#1B64DA] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1554BD] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? '확인 중…' : '연석 팀 합류하기'}
            </button>
          </form>

          <div className="border-t border-[#E5E8EB] bg-[#F9FAFB] px-6 py-3.5 text-[11px] leading-relaxed text-[#6B7684]">
            합류 즉시 팀장이 지정한 구역에 1인당 제비(기본 3장)가 투입되며, 추첨 시 전원 동시 당첨 또는 동시 탈락으로 처리됩니다.
          </div>
        </section>
      </main>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4 text-xs text-[#6B7684]">
          초대 화면을 준비하는 중입니다…
        </main>
      }
    >
      <JoinTeamContent />
    </Suspense>
  );
}
