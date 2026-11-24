'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import type { EventItem, Team } from '@/types/api';
import { formatKst } from '@/lib/datetime';

function NewTeamContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    apiFetch<EventItem>(`/api/public/events/${id}`, { auth: false })
      .catch(() => apiFetch<EventItem>(`/api/events/${id}`, { auth: false }))
      .then((data) => {
        if (!ignore && data) {
          setEvent(data);
          if (data.sections && data.sections.length > 0) {
            setSelectedSectionId(data.sections[0].id);
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : '공연 정보를 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId) {
      alert('응모하실 구역을 선택해 주시기 바랍니다.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const newTeam = await apiFetch<Team>('/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          eventId: id,
          sectionId: selectedSectionId,
        }),
      });
      router.push(`/teams/${newTeam.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorMsg('이미 해당 공연에 개인으로 응모하셨습니다. 개인 응모를 취소하신 후 팀을 생성해 주시기 바랍니다.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : '팀 생성에 실패했습니다. 다시 시도해 주시기 바랍니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-neutral-400 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
          공연 및 좌석 구역 정보를 불러오는 중입니다...
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-neutral-400 text-sm">{errorMsg || '공연 정보를 찾을 수 없습니다.'}</p>
          <Link
            href="/events"
            className="mt-4 inline-block rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            공연 목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const sections =
    event.sections && event.sections.length > 0
      ? event.sections
      : [{ id: 'sec-default', name: '일반석', capacity: 100, price: event.price }];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/events"
            className="inline-flex items-center text-sm font-medium text-neutral-400 transition hover:text-neutral-200"
          >
            &larr; 공연 목록으로
          </Link>
          <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            연석 응모 팀 생성
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
          <div className="border-b border-neutral-800 bg-neutral-900/60 p-6">
            <h1 className="text-xl font-bold tracking-tight text-white">{event.title}</h1>
            <p className="mt-1 text-xs text-neutral-400">
              {event.venue} &middot; {formatKst(event.startsAt)}
            </p>
          </div>

          <form onSubmit={handleCreateTeam} className="p-6 space-y-6">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs leading-relaxed text-indigo-300">
              <strong className="block font-semibold text-indigo-200 mb-1">
                연석 팀 안내
              </strong>
              팀은 한 구역에 함께 응모되며, 팀원 각자의 제비({event.ballotsPerUser || 3}장)가 모두 선택하신 구역에 투입됩니다.
              최대 {event.maxTeamSize || 2}명까지 함께 참여하실 수 있으며, 추첨 시 전원 동시 당첨 또는 동시 탈락으로 처리됩니다.
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-200 mb-3">
                희망 구역 선택 <span className="text-rose-400">*</span>
              </label>
              <div className="space-y-3">
                {sections.map((sec) => {
                  const isChecked = selectedSectionId === sec.id;
                  const price = sec.price ?? event.price;
                  return (
                    <label
                      key={sec.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500'
                          : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="sectionRadio"
                          value={sec.id}
                          checked={isChecked}
                          onChange={() => setSelectedSectionId(sec.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-semibold text-sm text-neutral-100">{sec.name}</div>
                          <div className="text-xs text-neutral-400 mt-0.5">
                            정원 {sec.capacity.toLocaleString()}석
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-neutral-200">
                          {price.toLocaleString()}원
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {submitting ? '팀을 생성하는 중입니다...' : '연석 팀 만들기 (초대 코드 발급)'}
              </button>
              <p className="mt-2 text-center text-xs text-neutral-400">
                팀 생성 시 팀장님의 제비 {event.ballotsPerUser || 3}장이 해당 구역으로 자동 응모됩니다.
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function NewTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
          <div className="flex items-center gap-3 text-neutral-400 text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
            연석 팀 생성 화면을 불러오는 중입니다...
          </div>
        </main>
      }
    >
      <NewTeamContent params={params} />
    </Suspense>
  );
}
