'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Team, EventItem, SealInfo } from '@/types/api';
import { SealBox } from '@/components/SealBox';
import { formatKst } from '@/lib/datetime';

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [team, setTeam] = useState<Team | null>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [seal, setSeal] = useState<SealInfo | null>(null);
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

        // 연관 공연 정보 및 봉인 정보 로드
        if (teamData.eventId) {
          const eventData = await apiFetch<EventItem>(`/api/events/${teamData.eventId}`);
          if (!ignore) {
            setEvent(eventData);
            if (eventData.status === 'closed') {
              try {
                const sealData = await apiFetch<SealInfo>(`/api/events/${teamData.eventId}/seal`);
                if (!ignore) setSeal(sealData);
              } catch {
                // 봉인 정보가 아직 없으면 무시
              }
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : '팀 정보를 불러오지 못했습니다.');
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

    if (navigator.share) {
      try {
        await navigator.share({
          title: `[Fair Draw] ${team.eventTitle || '공연'} 연석 팀 초대`,
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
    const isLeader = true; // 현재 접속자(모의)
    const confirmMessage = isLeader
      ? '팀장님이 탈퇴하시면 팀이 즉시 해체되며, 함께 합류한 팀원 전원의 응모가 취소됩니다. 정말로 탈퇴하시겠습니까?'
      : '연석 팀에서 탈퇴하시겠습니까? 탈퇴 시 본인의 해당 공연 응모 내역도 함께 취소됩니다.';

    if (!confirm(confirmMessage)) return;

    setLeaving(true);
    try {
      await apiFetch(`/api/teams/${team.id}/members/me`, {
        method: 'DELETE',
      });
      alert('성공적으로 팀 탈퇴 및 해체 처리가 완료되었습니다.');
      router.push('/events');
    } catch (err) {
      alert(err instanceof Error ? err.message : '팀 탈퇴 처리에 실패했습니다.');
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-neutral-400 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
          팀 정보를 불러오는 중입니다...
        </div>
      </main>
    );
  }

  if (!team || team.status === 'dissolved') {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-lg font-bold text-neutral-200">
            {team?.status === 'dissolved' ? '해체된 팀입니다' : '팀 정보를 찾을 수 없습니다'}
          </h2>
          <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
            {team?.status === 'dissolved'
              ? '팀장 또는 운영자에 의해 팀이 해체되었거나 응모가 취소되었습니다.'
              : errorMsg || '요청하신 연석 팀 정보가 존재하지 않습니다.'}
          </p>
          <Link
            href="/events"
            className="mt-6 inline-block rounded-xl bg-neutral-800 px-5 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
          >
            공연 목록으로 이동
          </Link>
        </div>
      </main>
    );
  }

  const isFull = team.members.length >= team.maxMembers;
  const isClosed = event?.status === 'closed';

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl space-y-6">
        {/* 상단 네비게이션 */}
        <div className="flex items-center justify-between">
          <Link
            href="/events"
            className="inline-flex items-center text-xs font-medium text-neutral-400 transition hover:text-neutral-200"
          >
            &larr; 공연 목록으로 돌아가기
          </Link>
          <div className="flex items-center gap-2">
            {isFull ? (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                팀 완성 ({team.members.length}/{team.maxMembers}명)
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400">
                팀원 모집 중 ({team.members.length}/{team.maxMembers}명)
              </span>
            )}
          </div>
        </div>

        {/* 공연 및 구역 요약 카드 */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
          <div className="text-xs font-medium text-neutral-400">연석 응모 지정 공연</div>
          <h1 className="mt-1 text-xl font-bold text-white tracking-tight">
            {team.eventTitle || event?.title || '공연명'}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-neutral-800 px-2.5 py-1 text-neutral-300 font-medium">
              선택 구역: {team.sectionName}
            </span>
            {event && (
              <span className="rounded-md bg-neutral-800 px-2.5 py-1 text-neutral-400">
                일시: {formatKst(event.eventAt)}
              </span>
            )}
          </div>
        </div>

        {/* 팀장 전용 초대 코드 박스 (마감 전 & 정원 미달일 때 핵심 노출) */}
        {team.inviteCode && !isClosed && (
          <div className="rounded-2xl border-2 border-dashed border-indigo-500/40 bg-indigo-950/20 p-6 text-center shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              친구 초대 전용 코드
            </span>
            <div className="my-3 font-mono text-4xl font-extrabold tracking-widest text-indigo-300 select-all">
              {team.inviteCode}
            </div>
            <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
              함께 관람할 동행자에게 초대 코드를 보내주세요. 동행자가 코드를 입력하면 이 구역으로 자동 응모됩니다.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopyCode}
                className="rounded-xl bg-neutral-800 py-3 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-700"
              >
                {copiedCode ? '코드 복사 완료!' : '초대 코드 복사'}
              </button>
              <button
                type="button"
                onClick={handleShareLink}
                className="rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow transition hover:bg-indigo-500"
              >
                {copiedLink ? '링크 복사 완료!' : '초대 링크 공유'}
              </button>
            </div>
          </div>
        )}

        {/* 마감 후 명단 봉인 박스 표시 */}
        {isClosed && seal && (
          <SealBox seal={seal} />
        )}

        {/* 현재 팀원 목록 */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h2 className="text-sm font-bold text-neutral-200">
              참여 팀원 ({team.members.length} / {team.maxMembers}명)
            </h2>
            <span className="text-xs text-neutral-400">
              1인당 {event?.ballotsPerUser || 3}장의 제비가 투입됨
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {team.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl bg-neutral-950 p-4 border border-neutral-800/80"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 font-bold text-neutral-300 text-xs">
                    {member.userName.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-200">{member.userName}</span>
                      {member.isLeader && (
                        <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/30">
                          팀장
                        </span>
                      )}
                    </div>
                    {member.userPhone && (
                      <div className="text-xs text-neutral-400 mt-0.5">{member.userPhone}</div>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  {formatKst(member.joinedAt)} 합류
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 탈퇴 / 해체 액션 (마감 전까지만 노출) */}
        {!isClosed && (
          <div className="pt-2">
            <button
              type="button"
              disabled={leaving}
              onClick={handleLeaveTeam}
              className="w-full rounded-xl border border-rose-500/30 bg-rose-950/20 py-3 text-xs font-semibold text-rose-400 transition hover:bg-rose-950/40 disabled:opacity-50"
            >
              {leaving ? '탈퇴 처리 중입니다...' : '팀 탈퇴 및 해체하기'}
            </button>
            <p className="mt-2 text-center text-xs text-neutral-400">
              * 마감 전까지만 탈퇴가 가능하며, 마감 이후에는 공정 추첨 무결성을 위해 취소하실 수 없습니다.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
