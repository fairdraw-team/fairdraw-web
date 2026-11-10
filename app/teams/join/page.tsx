'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
    // 영문과 숫자만 허용하고 자동 대문자 변환
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
          setErrorMsg('초대 코드를 다시 확인해 주시기 바랍니다. 존재하지 않거나 만료된 코드입니다.');
        } else if (err.code === 'TEAM_FULL' || err.status === 400) {
          setErrorMsg('해당 연석 팀은 이미 정원이 마감되었습니다.');
        } else if (err.code === 'ALREADY_ENTERED' || err.status === 409) {
          setErrorMsg('이미 해당 공연에 응모하셨거나 다른 팀에 합류하셨습니다.');
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
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/events"
          className="inline-flex items-center text-xs font-medium text-neutral-400 transition hover:text-neutral-200"
        >
          &larr; 공연 목록으로 돌아가기
        </Link>
        <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
          연석 팀 합류
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <span className="text-2xl font-black">#</span>
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-white">초대 코드 입력</h1>
          <p className="mt-2 text-xs leading-relaxed text-neutral-400">
            팀장에게 전달받은 6글자 초대 코드를 입력해 주시면 동일한 구역에 연석 팀원으로 자동 응모됩니다.
          </p>
        </div>

        <form onSubmit={handleJoin} className="mt-8 space-y-6">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              초대 코드 6자리
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={handleInputChange}
              placeholder="예: K7P2QX"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3.5 text-center font-mono text-2xl font-bold tracking-widest text-indigo-300 placeholder:text-neutral-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500 disabled:opacity-40"
          >
            {submitting ? '팀 합류 확인 중...' : '연석 팀 합류하기'}
          </button>
        </form>

        <div className="mt-6 border-t border-neutral-800/80 pt-4 text-center">
          <p className="text-[11px] text-neutral-400 leading-normal">
            * 합류 즉시 팀장의 지정 구역에 1인당 제비(기본 3장)가 투입되며, 추첨 시 전원 동시 당첨 또는 동시 탈락으로 처리됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <Suspense
        fallback={
          <div className="flex items-center gap-3 text-neutral-400 text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
            초대 화면을 준비하는 중입니다...
          </div>
        }
      >
        <JoinTeamContent />
      </Suspense>
    </main>
  );
}
