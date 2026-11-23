'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { formatKst } from '@/lib/datetime';
import { verifyDraw, type VerifyResult } from '@/lib/verify';
import type {
  DrawInfo,
  EventItem,
  MyDrawResult,
  PublicBallot,
  PublicBallotsResponse,
} from '@/types/api';
import { CheckCircle2, XCircle, ShieldCheck, AlertTriangle } from 'lucide-react';

function DrawVerifyContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [drawInfo, setDrawInfo] = useState<DrawInfo | null>(null);
  const [ballots, setBallots] = useState<PublicBallot[]>([]);
  const [myBallotIds, setMyBallotIds] = useState<Set<string>>(new Set());
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [notDrawn, setNotDrawn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cryptoUnsupported, setCryptoUnsupported] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadAndVerify() {
      try {
        apiFetch<EventItem>(`/api/public/events/${eventId}`, { auth: false })
          .then((ev) => {
            if (!ignore) setEvent(ev);
          })
          .catch(() => {});

        const [infoRes, ballotsRes] = await Promise.all([
          apiFetch<DrawInfo>(`/api/public/events/${eventId}/draw`, { auth: false }),
          apiFetch<PublicBallotsResponse>(
            `/api/public/events/${eventId}/draw/ballots`,
            { auth: false },
          ),
        ]);

        if (ignore) return;

        const sortedBallots = [...(ballotsRes.ballots ?? [])].sort(
          (a, b) => a.order - b.order,
        );
        setDrawInfo(infoRes);
        setBallots(sortedBallots);

        if (typeof window === 'undefined' || !window.crypto?.subtle) {
          setCryptoUnsupported(true);
        } else {
          const result = await verifyDraw(
            {
              rosterHash: infoRes.rosterHash,
              seed: infoRes.seed,
              drawnAtMillis: infoRes.drawnAtMillis,
            },
            sortedBallots.map((b) => ({
              order: b.order,
              ballotId: b.ballotId,
            })),
          );
          if (!ignore) setVerifyResult(result);
        }

        const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
        let canFetchMe = isMock;
        if (!isMock) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          canFetchMe = Boolean(session);
        }

        if (canFetchMe) {
          apiFetch<MyDrawResult>(`/api/events/${eventId}/draw/me`)
            .then((me) => {
              if (!ignore && me?.ballotIds) {
                setMyBallotIds(new Set(me.ballotIds));
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotDrawn(true);
        } else {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : '공개 추첨 검증 데이터를 불러오지 못했습니다.',
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadAndVerify();
    return () => {
      ignore = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
          브라우저에서 SHA-256 해시를 직접 계산하여 검증하는 중입니다…
        </div>
      </div>
    );
  }

  const verifyRows: {
    key: keyof VerifyResult;
    label: string;
    formula: string;
    publishedValue: string;
  }[] = drawInfo
    ? [
        {
          key: 'rosterOk',
          label: '명단 지문',
          formula: 'SHA-256(정렬된 제비 ID 목록)',
          publishedValue: drawInfo.rosterHash,
        },
        {
          key: 'seedOk',
          label: '시드',
          formula: `SHA-256(명단 지문 + ":" + ${drawInfo.drawnAtMillis})`,
          publishedValue: drawInfo.seed,
        },
        {
          key: 'orderOk',
          label: '추첨 순서',
          formula: 'SHA-256(시드 + ":" + 제비 ID) 오름차순 정렬',
          publishedValue: `총 ${ballots.length.toLocaleString()}장 순서 대조`,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link
            href={`/events/${eventId}`}
            className="text-xs font-bold text-stone-600 hover:text-stone-900"
          >
            &larr; 공연 상세로 돌아가기
          </Link>
          <span className="flex items-center gap-1.5 text-xs font-black text-indigo-700">
            <ShieldCheck className="h-4 w-4" />
            공개 무결성 검증
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section className="rounded-3xl border border-indigo-200 bg-indigo-50/70 p-6 shadow-xs">
          <span className="inline-block rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
            Client-Side SHA-256 Verification
          </span>
          <h1 className="mt-2 text-xl font-black text-stone-900 sm:text-2xl">
            {event ? `${event.title} 추첨 검증` : '공연 추첨 무결성 검증'}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-indigo-950">
            이 페이지는 발표된 결과를 그대로 보여주지 않고, 공개된 제비 목록으로 여러분의 브라우저가 직접 다시 계산합니다.
          </p>
          {drawInfo && (
            <p className="mt-2 text-xs text-stone-600">
              봉인 시각: {formatKst(drawInfo.sealedAt)} · 추첨 시각: {formatKst(drawInfo.drawnAt)} (
              {drawInfo.drawnAtMillis})
            </p>
          )}
        </section>

        {notDrawn && (
          <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-xs">
            <p className="text-base font-bold text-stone-800">아직 추첨이 진행되지 않은 공연입니다.</p>
            <p className="mt-1 text-xs text-stone-500">
              주최자가 추첨을 실행한 뒤 이 페이지에서 누구나 결과를 재계산할 수 있습니다.
            </p>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {errorMsg}
          </div>
        )}

        {cryptoUnsupported && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold">브라우저 암호화 API(crypto.subtle)를 사용할 수 없는 주소입니다.</p>
              <p className="mt-0.5">
                보안 정책상 <b>https:// 배포 주소</b> 또는 <b>localhost</b>로 접속해야 브라우저 해시 재계산이 동작합니다.
              </p>
            </div>
          </div>
        )}

        {drawInfo && verifyResult && (
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-black text-stone-900">브라우저 독립 재계산 결과</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              서버가 발표한 값과 현재 브라우저가 직접 계산한 SHA-256 해시값을 비교한 결과입니다.
            </p>

            <div className="mt-4 divide-y divide-stone-100 rounded-2xl border border-stone-200">
              {verifyRows.map((row) => {
                const ok = verifyResult[row.key];
                return (
                  <div
                    key={row.key}
                    className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-stone-900">{row.label}</span>
                        <span className="text-[11px] font-medium text-stone-400">
                          {row.formula}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-stone-500">
                        {row.publishedValue}
                      </p>
                    </div>

                    {ok ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-extrabold text-emerald-700 sm:self-center">
                        <CheckCircle2 className="h-4 w-4" />
                        일치
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-extrabold text-rose-700 sm:self-center">
                        <XCircle className="h-4 w-4" />
                        불일치
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {drawInfo && (
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-stone-900">
                  공개 제비 추첨 순서 ({ballots.length.toLocaleString()}장)
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  개인정보 보호를 위해 이름·전화번호 없이 무작위 제비 ID와 추첨 순서만 공개됩니다.
                </p>
              </div>
              {myBallotIds.size > 0 && (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700">
                  내 제비 {myBallotIds.size}장 강조 표시됨
                </span>
              )}
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/80 text-stone-600">
                    <th className="px-3.5 py-2.5 font-bold">순서</th>
                    <th className="px-3.5 py-2.5 font-bold">제비 ID (앞 8글자)</th>
                    <th className="px-3.5 py-2.5 font-bold">구역</th>
                    <th className="px-3.5 py-2.5 text-right font-bold">결과</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {ballots.map((b) => {
                    const isMine = myBallotIds.has(b.ballotId);
                    return (
                      <tr
                        key={b.ballotId}
                        className={
                          isMine
                            ? 'bg-indigo-50/70 font-semibold'
                            : 'hover:bg-stone-50/70'
                        }
                      >
                        <td className="px-3.5 py-2.5 font-extrabold tabular-nums text-stone-900">
                          {b.order}번
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-stone-700">
                          <div className="flex items-center gap-2">
                            <span>{b.ballotId.slice(0, 8)}</span>
                            {isMine && (
                              <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                                내 제비
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-stone-800">
                          {b.sectionName}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          {b.result === 'won' && (
                            <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                              당첨
                            </span>
                          )}
                          {b.result === 'waitlisted' && (
                            <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                              대기
                            </span>
                          )}
                          {!b.result && <span className="text-stone-400">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function DrawVerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-16 text-sm text-stone-400">
            검증 페이지를 불러오는 중입니다…
          </div>
        </div>
      }
    >
      <DrawVerifyContent params={params} />
    </Suspense>
  );
}