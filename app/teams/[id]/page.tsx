'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy, Share2, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import { isAtLeast } from '@/lib/eventStatus';
import { SealBox } from '@/components/SealBox';
import type {
  EventItem,
  MyBooking,
  MyDrawResult,
  SealInfo,
  Team,
} from '@/types/api';

function TeamDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [team, setTeam] = useState<Team | null>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [seal, setSeal] = useState<SealInfo | null>(null);
  const [drawMe, setDrawMe] = useState<MyDrawResult | null>(null);
  const [bookingMe, setBookingMe] = useState<MyBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadTeamData() {
      try {
        const teamData = await apiFetch<Team>(`/api/teams/${id}`);
        if (ignore) return;
        setTeam(teamData);

        if (teamData.eventId) {
          const eventData = await apiFetch<EventItem>(
            `/api/public/events/${teamData.eventId}`,
            { auth: false },
          ).catch(() =>
            apiFetch<EventItem>(`/api/events/${teamData.eventId}`, {
              auth: false,
            }),
          );

          if (!ignore && eventData) {
            setEvent(eventData);
            if (isAtLeast(eventData.status, 'closed')) {
              apiFetch<SealInfo>(
                `/api/public/events/${teamData.eventId}/seal`,
                { auth: false },
              )
                .then((sealData) => {
                  if (!ignore) setSeal(sealData);
                })
                .catch(() => {});
            }

            if (isAtLeast(eventData.status, 'drawn')) {
              apiFetch<MyDrawResult>(
                `/api/events/${teamData.eventId}/draw/me`,
              )
                .then((d) => {
                  if (!ignore) setDrawMe(d);
                })
                .catch(() => {});
            }

            if (isAtLeast(eventData.status, 'paying')) {
              apiFetch<MyBooking>(
                `/api/events/${teamData.eventId}/booking/me`,
              )
                .then((b) => {
                  if (!ignore) setBookingMe(b);
                })
                .catch(() => {});
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : '팀 정보를 불러오지 못했습니다.',
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadTeamData();
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleCopyCode = async () => {
    if (!team?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      alert('초대 코드를 복사하지 못했습니다.');
    }
  };

  const handleShareLink = async () => {
    if (!team?.inviteCode) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/teams/join?code=${team.inviteCode}`;
    const displayTitle = event?.title || '공연';

    if (navigator.share) {
      try {
        await navigator.share({
          title: `[Fair Draw] ${displayTitle} 연석 팀 초대`,
          text: `함께 관람할 연석 팀에 초대합니다! 초대 코드: ${team.inviteCode}`,
          url: shareUrl,
        });
        return;
      } catch {
        // 모바일 공유 취소 시 무시
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      alert('초대 링크를 복사하지 못했습니다.');
    }
  };

  const handleLeaveTeam = async () => {
    if (!team) return;
    const isLeader = Boolean(team.inviteCode);
    const confirmMessage = isLeader
      ? '팀장님이 탈퇴하시면 팀이 즉시 해체되며, 함께 합류한 팀원 전원의 응모가 취소됩니다. 정말로 탈퇴하시겠습니까?'
      : '연석 팀에서 탈퇴하시겠습니까? 탈퇴 시 본인의 해당 공연 응모 내역도 함께 취소됩니다.';

    if (!confirm(confirmMessage)) return;

    setLeaving(true);
    try {
      await apiFetch(`/api/teams/${team.id}/members/me`, {
        method: 'DELETE',
      });
      alert('성공적으로 팀 탈퇴 처리가 완료되었습니다.');
      router.push('/events');
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '팀 탈퇴 처리에 실패했습니다.',
      );
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4 text-xs text-[#6B7684]">
        팀 정보를 불러오는 중입니다…
      </main>
    );
  }

  if (!team) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4">
        <div className="w-full max-w-sm rounded-lg border border-[#E5E8EB] bg-white p-6 text-center">
          <h2 className="text-sm font-semibold text-[#191F28]">
            팀 정보를 찾을 수 없습니다
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#6B7684]">
            {errorMsg || '요청하신 연석 팀 정보가 존재하지 않거나 해체되었습니다.'}
          </p>
          <Link
            href="/events"
            className="mt-4 inline-block rounded-md border border-[#D1D6DB] bg-white px-4 py-2 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6]"
          >
            공연 목록으로 이동
          </Link>
        </div>
      </main>
    );
  }

  const isClosed = event
    ? event.status !== 'open' && event.status !== 'draft'
    : false;
  const isDrawn = event ? isAtLeast(event.status, 'drawn') : false;
  const isPaying = event ? isAtLeast(event.status, 'paying') : false;

  const drawResultText =
    drawMe?.result === 'won'
      ? `당첨되었습니다 · ${drawMe.sectionName ?? team.sectionName}구역`
      : drawMe?.result === 'waitlisted'
        ? `${drawMe.sectionName ?? team.sectionName}구역 대기 ${drawMe.waitlistRank ?? 1}번`
        : drawMe?.result === 'lost'
          ? '아쉽지만 이번에는 당첨되지 않았습니다'
          : null;

  const bookingStatusText =
    bookingMe?.status === 'pending'
      ? `결제 대기 · ${formatKst(bookingMe.payDueAt)}까지`
      : bookingMe?.status === 'paid'
        ? '예매 확정'
        : bookingMe?.status === 'expired'
          ? '결제 기한 만료'
          : null;

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
          <span
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium ${
              team.full
                ? 'border-emerald-200/80 bg-emerald-50 text-emerald-700'
                : 'border-amber-200/80 bg-amber-50 text-amber-800'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                team.full ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            {team.full
              ? `팀 완성 (${team.members.length}/${team.maxSize}명)`
              : `모집 중 (${team.members.length}/${team.maxSize}명)`}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-5 px-4 py-8">
        {/* 공연 및 구역 요약 */}
        <section className="rounded-lg border border-[#E5E8EB] bg-white p-5">
          <h1 className="text-lg font-semibold tracking-tight text-[#191F28]">
            {event?.title || '연석 응모 팀'}
          </h1>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#6B7684]">
            <div className="flex items-center gap-1.5">
              <dt>선택 구역</dt>
              <dd className="font-semibold text-[#191F28]">{team.sectionName}</dd>
            </div>
            {event?.startsAt && (
              <div className="flex items-center gap-1.5">
                <dt>공연 일시</dt>
                <dd className="font-medium tabular-nums text-[#333D4B]">
                  {formatKst(event.startsAt)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* 추첨 및 예매 상태 */}
        {isDrawn && (
          <section className="overflow-hidden rounded-lg border border-[#BFDBFE] bg-[#F5F9FF]">
            <div className="flex items-center justify-between gap-2 border-b border-[#DCEBFF] px-5 py-3">
              <h2 className="text-xs font-semibold text-[#191F28]">
                팀 추첨 및 예매 상태
              </h2>
              <Link
                href={`/events/${team.eventId}/result`}
                className="rounded-md bg-[#1B64DA] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#1554BD]"
              >
                내 결과 보기
              </Link>
            </div>

            <div className="space-y-2.5 px-5 py-4">
              {drawResultText && (
                <p className="text-sm font-semibold text-[#191F28]">
                  {drawResultText}
                </p>
              )}

              {isPaying && (
                <div className="space-y-1 border-t border-[#DCEBFF] pt-2.5 text-xs">
                  {bookingStatusText && (
                    <p className="font-semibold text-emerald-700">
                      내 예매 상태: {bookingStatusText}
                    </p>
                  )}
                  <p className="text-[#4E5968]">
                    팀원은 각자 결제합니다. 팀원이 결제하지 않으면 옆자리가 다른 사람에게 넘어갑니다.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 팀장 전용 초대 코드 */}
        {team.inviteCode && !isClosed && (
          <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
            <div className="border-b border-[#E5E8EB] px-5 py-3.5">
              <h2 className="text-sm font-semibold text-[#191F28]">
                동행자 초대 코드
              </h2>
              <p className="mt-0.5 text-xs text-[#6B7684]">
                동행자가 아래 6자리 코드를 입력하면 같은 구역으로 자동 응모됩니다.
              </p>
            </div>
            <div className="p-5 text-center">
              <div className="rounded-md border border-dashed border-[#B0B8C1] bg-[#F9FAFB] py-4 font-mono text-3xl font-bold tracking-[0.2em] text-[#191F28] select-all">
                {team.inviteCode}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#D1D6DB] bg-white py-2 text-xs font-medium text-[#333D4B] transition-colors hover:bg-[#F2F4F6]"
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      <span className="text-emerald-700">코드 복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#6B7684]" aria-hidden="true" />
                      <span>초대 코드 복사</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleShareLink}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#1B64DA] py-2 text-xs font-medium text-white transition-colors hover:bg-[#1554BD]"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>링크 복사됨</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>초대 링크 공유</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {isClosed && seal && <SealBox seal={seal} />}

        {/* 참여 팀원 목록 */}
        <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5E8EB] px-5 py-3.5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#191F28]">
              <Users className="h-4 w-4 text-[#6B7684]" aria-hidden="true" />
              <span>
                참여 팀원 ({team.members.length}/{team.maxSize}명)
              </span>
            </h2>
            <span className="text-xs tabular-nums text-[#6B7684]">
              1인당 제비 {event?.ballotsPerUser || 3}장
            </span>
          </div>

          <ul className="divide-y divide-[#E5E8EB]">
            {team.members.map((member) => (
              <li
                key={member.profileId}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E8EB] bg-[#F7F8FA] text-xs font-semibold text-[#4E5968]">
                    {member.realName.slice(0, 1)}
                  </div>
                  <span className="text-sm font-medium text-[#191F28]">
                    {member.realName}
                  </span>
                </div>
                {member.leader ? (
                  <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-[#1B64DA]">
                    팀장
                  </span>
                ) : (
                  <span className="text-xs text-[#8B95A1]">팀원</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* 탈퇴 / 해체 */}
        {!isClosed && (
          <div className="pt-1">
            <button
              type="button"
              disabled={leaving}
              onClick={handleLeaveTeam}
              className="w-full cursor-pointer rounded-md border border-rose-200 bg-white py-2.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {leaving ? '탈퇴 처리 중입니다…' : '팀 탈퇴 및 해체하기'}
            </button>
            <p className="mt-2 text-center text-xs text-[#6B7684]">
              마감 전까지만 탈퇴 가능하며, 마감 이후에는 공정 추첨 무결성을 위해 취소할 수 없습니다.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4 text-xs text-[#6B7684]">
          팀 화면을 불러오는 중입니다…
        </main>
      }
    >
      <TeamDetailContent params={params} />
    </Suspense>
  );
}
