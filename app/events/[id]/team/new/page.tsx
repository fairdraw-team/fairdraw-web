'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Info } from 'lucide-react';
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
          setErrorMsg(
            err instanceof Error
              ? err.message
              : '공연 정보를 불러오지 못했습니다.',
          );
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
        setErrorMsg(
          '이미 해당 공연에 개인으로 응모하셨습니다. 개인 응모를 취소하신 후 팀을 생성해 주시기 바랍니다.',
        );
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : '팀 생성에 실패했습니다. 다시 시도해 주시기 바랍니다.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4 text-xs text-[#6B7684]">
        공연 및 좌석 구역 정보를 불러오는 중입니다…
      </main>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4">
        <div className="w-full max-w-sm rounded-lg border border-[#E5E8EB] bg-white p-6 text-center">
          <p className="text-xs text-[#6B7684]">
            {errorMsg || '공연 정보를 찾을 수 없습니다.'}
          </p>
          <Link
            href="/events"
            className="mt-4 inline-block rounded-md border border-[#D1D6DB] bg-white px-4 py-2 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6]"
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
    <div className="min-h-screen bg-[#F7F8FA] text-[#191F28] antialiased font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      <header className="border-b border-[#E5E8EB] bg-white">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7684] transition-colors hover:text-[#191F28]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>공연 목록</span>
          </Link>
          <span className="text-xs font-semibold text-[#191F28]">
            연석 팀 생성
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8">
        <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
          <div className="border-b border-[#E5E8EB] px-6 py-5">
            <h1 className="text-lg font-semibold tracking-tight text-[#191F28]">
              {event.title}
            </h1>
            <p className="mt-1 text-xs tabular-nums text-[#6B7684]">
              {event.venue} · {formatKst(event.startsAt)}
            </p>
          </div>

          <form onSubmit={handleCreateTeam} className="space-y-5 p-6">
            <div className="flex items-start gap-2.5 rounded-md border border-[#E5E8EB] bg-[#F9FAFB] p-3.5 text-xs leading-relaxed text-[#4E5968]">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-[#1B64DA]"
                aria-hidden="true"
              />
              <div>
                <strong className="font-semibold text-[#191F28]">
                  연석 팀 응모 안내
                </strong>
                <p className="mt-0.5">
                  팀원 각자의 제비({event.ballotsPerUser || 3}장)가 선택한 구역에 함께 투입됩니다. 최대 {event.maxTeamSize || 2}명까지 참여할 수 있으며, 추첨 시 전원 동시 당첨 또는 동시 탈락으로 처리됩니다.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
              >
                {errorMsg}
              </div>
            )}

            <div>
              <div className="mb-2.5 text-xs font-semibold text-[#191F28]">
                희망 좌석 구역 선택 <span className="text-rose-600">*</span>
              </div>
              <div className="divide-y divide-[#E5E8EB] overflow-hidden rounded-lg border border-[#E5E8EB]">
                {sections.map((sec) => {
                  const isChecked = selectedSectionId === sec.id;
                  const price = sec.price ?? event.price;
                  return (
                    <label
                      key={sec.id}
                      className={`flex cursor-pointer items-center justify-between px-4 py-3.5 transition-colors ${
                        isChecked
                          ? 'bg-[#F5F9FF]'
                          : 'bg-white hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="sectionRadio"
                          value={sec.id}
                          checked={isChecked}
                          onChange={() => setSelectedSectionId(sec.id)}
                          className="h-4 w-4 accent-[#1B64DA]"
                        />
                        <div>
                          <div className="text-sm font-medium text-[#191F28]">
                            {sec.name}
                          </div>
                          <div className="mt-0.5 text-xs tabular-nums text-[#6B7684]">
                            정원 {sec.capacity.toLocaleString()}석
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums text-[#191F28]">
                        {price.toLocaleString('ko-KR')}원
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer rounded-md bg-[#1B64DA] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1554BD] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? '팀을 생성하는 중입니다…'
                  : '연석 팀 만들기 (초대 코드 발급)'}
              </button>
              <p className="mt-2.5 text-center text-xs text-[#6B7684]">
                팀 생성 시 팀장님의 제비 {event.ballotsPerUser || 3}장이 해당 구역으로 자동 응모됩니다.
              </p>
            </div>
          </form>
        </section>
      </main>
    </div>
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
        <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4 text-xs text-[#6B7684]">
          연석 팀 생성 화면을 불러오는 중입니다…
        </main>
      }
    >
      <NewTeamContent params={params} />
    </Suspense>
  );
}
