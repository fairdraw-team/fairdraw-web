'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { apiFetch } from '../../../lib/api';
import { formatKST } from '../../../lib/format';
import {
  Ticket,
  Users,
  Clock,
  Trash2,
  Lock,
  Copy,
  Check,
  HelpCircle,
  X,
  ChevronLeft,
  AlertCircle,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

interface BallotAllocation {
  sectionId: string;
  sectionName: string;
  count: number;
}

interface TeamMember {
  userId: string;
  name: string;
}

interface MyEntryResponse {
  id: string;
  eventId: string;
  eventTitle: string;
  status: 'draft' | 'open' | 'closed' | 'drawn' | 'paying' | 'done';
  appliedAt: string; // UTC ISO string
  allocations: BallotAllocation[];
  team?: {
    teamId: string;
    teamName: string;
    isLeader: boolean;
    members: TeamMember[];
  } | null;
}

interface SealInfo {
  sealedAt: string;
  totalBallots: number;
  rosterHash: string;
}

// 상태 점 깜빡임 애니메이션
const PAGE_CSS = `
@keyframes tlPulse { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
.tl-pulse { animation: tlPulse 2s ease-in-out infinite; }
`;

const MONO = "font-['ui-monospace','SFMono-Regular','Menlo','Consolas',monospace]";

export default function MyEntryPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = (params?.id as string) || '1';

  const [entry, setEntry] = useState<MyEntryResponse | null>(null);
  const [seal, setSeal] = useState<SealInfo | null>(null);
  const [isNotEntered, setIsNotEntered] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancelling, setCancelling] = useState<boolean>(false);

  // 1주차 토큰 및 해시 복사 상태
  const [token, setToken] = useState<string>('');
  const [tokenCopied, setTokenCopied] = useState<boolean>(false);
  const [hashCopied, setHashCopied] = useState<boolean>(false);
  const [showHashHelp, setShowHashHelp] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setIsNotEntered(false);

        // 개발 환경 세션 토큰 추출
        if (process.env.NODE_ENV === 'development') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) setToken(session.access_token);
        }

        // 1. 내 응모 정보 조회
        const entryData = await apiFetch<MyEntryResponse>(
          `/api/events/${eventId}/entries/me`
        );
        setEntry(entryData);

        // 2. 공연 상태가 closed 이상인 경우 봉인 정보 조회
        if (entryData.status !== 'draft' && entryData.status !== 'open') {
          try {
            const sealData = await apiFetch<SealInfo>(
              `/api/public/events/${eventId}/seal`
            );
            setSeal(sealData);
          } catch {
            // 봉인 정보 호출 실패 시 무시
          }
        }
      } catch (err: any) {
        // 404: 아직 응모하지 않은 경우
        if (err.message?.includes('404') || err.message?.includes('NOT_FOUND') || err.message?.includes('응모')) {
          setIsNotEntered(true);
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId]);

  // 응모 취소 (DELETE)
  const handleCancelEntry = async () => {
    if (!window.confirm('정말 응모를 취소하시겠습니까? 배분된 제비는 즉시 회수됩니다.')) {
      return;
    }

    try {
      setCancelling(true);
      await apiFetch(`/api/events/${eventId}/entries/me`, {
        method: 'DELETE',
      });
      alert('응모가 정상적으로 취소되었습니다.');
      router.push(`/events/${eventId}`);
    } catch (err: any) {
      alert(err.message || '응모 취소에 실패했습니다.');
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyHash = async () => {
    if (!seal?.rosterHash) return;
    try {
      await navigator.clipboard.writeText(seal.rosterHash);
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2000);
    } catch {
      alert('지문 복사에 실패했습니다.');
    }
  };

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      alert('토큰 복사에 실패했습니다.');
    }
  };

  const isClosed = entry ? entry.status !== 'open' && entry.status !== 'draft' : false;
  const totalAllocated = entry?.allocations?.reduce((acc, curr) => acc + curr.count, 0) || 0;

  return (
    <div className="[&_*]:box-border leading-[1.5] min-h-screen bg-[#fff] text-[#222] select-none font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      <style>{PAGE_CSS}</style>

      {/* ───── 상단 유틸 바 ───── */}
      <div className="bg-[#f4f4f4]">
        <div className="mx-auto flex h-[30px] max-w-[480px] items-center justify-between px-[16px] text-[11px] text-[#555]">
          <Link
            href={`/events/${eventId}`}
            className="no-underline flex items-center gap-[2px] text-[11px] text-[#555] hover:text-[#111]"
          >
            <ChevronLeft className="h-[14px] w-[14px]" /> 공연 상세
          </Link>
          <Link href="/me" className="no-underline text-[11px] text-[#555] hover:text-[#111]">
            마이페이지
          </Link>
        </div>
      </div>

      {/* ───── 로고 헤더 ───── */}
      <header className="border-b border-[#222]">
        <div className="mx-auto flex h-[60px] max-w-[480px] items-center px-[16px]">
          <div className="flex items-center gap-[10px]">
            <span className="text-[26px] leading-none tracking-[-0.025em] text-[#111]">
              ticket<span className="font-[900]">LINK</span>
            </span>
            <span className="text-[16px] font-[700] leading-none text-[#111]">내 응모 내역</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] px-[16px] pb-[48px] pt-[28px]">
        {loading ? (
          <div className="py-[48px] text-center text-[13px] text-[#888]">
            응모 정보를 불러오고 있습니다...
          </div>
        ) : isNotEntered ? (
          /* 404: 미응모 상태 UI */
          <div className="flex flex-col items-center border border-[#e5e5e5] bg-[#fafafa] px-[16px] py-[36px] text-center">
            <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#eceef2] text-[#8A93A6]">
              <Ticket className="h-[28px] w-[28px]" />
            </span>
            <p className="m-[0px] mt-[14px] text-[16px] font-[700] text-[#111]">아직 응모하지 않았습니다</p>
            <p className="m-[0px] mt-[4px] text-[12px] text-[#777]">
              원하는 구역에 제비 3장을 배분하여 추첨에 참여해 보세요.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/events/${eventId}/enter`)}
              className="[font-family:inherit] mt-[18px] h-[40px] rounded-[3px] border-0 bg-[#F0352A] px-[28px] text-[13px] font-[700] text-[#fff] hover:bg-[#d92a20] cursor-pointer"
            >
              응모하러 가기
            </button>
          </div>
        ) : (
          <>
            {/* ───── 응모 요약 ───── */}
            <section className="flex items-start gap-[14px] border-b border-[#222] pb-[20px]">
              <span className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-[#eceef2] text-[#8A93A6]">
                <Ticket className="h-[28px] w-[28px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[8px]">
                  <span
                    className={`shrink-0 rounded-full border px-[10px] py-[1px] text-[11px] font-[600] ${
                      isClosed ? 'border-[#999] text-[#777]' : 'border-[#1E9E63] text-[#1E9E63]'
                    }`}
                  >
                    {isClosed ? '응모 마감' : '응모 완료'}
                  </span>
                </div>
                <h1 className="m-[0px] mt-[6px] text-[20px] font-[700] leading-[1.3] text-[#111]">
                  {entry?.eventTitle || '2026 가을 대동제 아티스트 특별 콘서트'}
                </h1>
                <p className="m-[0px] mt-[4px] flex items-center gap-[4px] text-[12px] text-[#777]">
                  <Clock className="h-[13px] w-[13px]" />
                  응모 시각: {entry?.appliedAt ? formatKST(entry.appliedAt) : '-'}
                </p>
              </div>
            </section>

            {/* ───── 구역별 배분 제비 ───── */}
            <section className="mt-[28px]">
              <div className="flex items-center justify-between border-b border-[#222] pb-[10px]">
                <h2 className="m-[0px] text-[14px] font-[700] text-[#111]">구역별 배분 제비</h2>
                <span className="text-[13px] font-[700] text-[#E5372B]">총 {totalAllocated}장</span>
              </div>
              <dl className="m-[0px]">
                {entry?.allocations?.map((item) => (
                  <div
                    key={item.sectionId}
                    className="flex items-center justify-between border-b border-[#eee] py-[14px] text-[13px]"
                  >
                    <dt className="text-[#777]">{item.sectionName || `${item.sectionId}구역`}</dt>
                    <dd className="m-[0px] font-[700] tabular-nums text-[#E5372B]">{item.count}장</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* ───── 팀 정보 (팀 응모인 경우) ───── */}
            {entry?.team && (
              <section className="mt-[28px]">
                <div className="flex items-center justify-between border-b border-[#222] pb-[10px]">
                  <h2 className="m-[0px] flex items-center gap-[6px] text-[14px] font-[700] text-[#111]">
                    <Users className="h-[16px] w-[16px] text-[#3B73E8]" /> 연석 팀
                  </h2>
                  <span className="rounded-full border border-[#2D8FD5] px-[10px] py-[1px] text-[11px] font-[600] text-[#2D8FD5]">
                    {entry.team.isLeader ? '팀장' : '팀원'}
                  </span>
                </div>
                <dl className="m-[0px]">
                  <div className="flex items-center justify-between border-b border-[#eee] py-[14px] text-[13px]">
                    <dt className="text-[#777]">팀 이름</dt>
                    <dd className="m-[0px] font-[700] text-[#222]">{entry.team.teamName}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-[12px] border-b border-[#eee] py-[14px] text-[13px]">
                    <dt className="shrink-0 text-[#777]">함께 응모한 팀원</dt>
                    <dd className="m-[0px] text-right font-[700] text-[#222]">
                      {entry.team.members.map((m) => m.name).join(', ')}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {/* ───── 취소 버튼 또는 안내 ───── */}
            <div className="mt-[20px]">
              {entry?.team && !entry.team.isLeader ? (
                <div className="flex items-center gap-[8px] border border-[#F2D9A6] bg-[#FFF8EA] px-[14px] py-[12px] text-[12px] font-[500] text-[#8A5A00]">
                  <AlertCircle className="h-[16px] w-[16px] shrink-0 text-[#D49A1A]" />
                  <span>팀원으로 응모된 상태입니다. 취소는 팀 화면에서 탈퇴하세요.</span>
                </div>
              ) : !isClosed ? (
                <button
                  type="button"
                  onClick={handleCancelEntry}
                  disabled={cancelling}
                  className="[font-family:inherit] flex h-[44px] w-full items-center justify-center gap-[6px] rounded-[3px] border border-[#222] bg-[#fff] text-[13px] font-[700] text-[#222] transition hover:border-[#E5372B] hover:text-[#E5372B] disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="h-[14px] w-[14px]" />
                  {cancelling ? '취소 처리 중...' : '응모 취소하기'}
                </button>
              ) : (
                <p className="m-[0px] py-[8px] text-center text-[12px] text-[#999]">
                  응모가 마감되어 취소 및 변경이 불가능합니다.
                </p>
              )}
            </div>

            {/* ───── 봉인 정보 (closed 이상인 경우) ───── */}
            {isClosed && seal && (
              <section className="mt-[32px]">
                <div className="flex items-center justify-between border-b border-[#222] pb-[10px]">
                  <h2 className="m-[0px] flex items-center gap-[6px] text-[14px] font-[700] text-[#111]">
                    <Lock className="h-[16px] w-[16px] text-[#3B73E8]" /> 응모 마감 및 명단 봉인 완료
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowHashHelp(true)}
                    className="[font-family:inherit] flex items-center gap-[2px] border-0 bg-transparent p-[0px] text-[11px] text-[#3B73E8] hover:underline cursor-pointer"
                  >
                    <HelpCircle className="h-[12px] w-[12px]" /> 이 지문은 무엇인가요?
                  </button>
                </div>
                <dl className="m-[0px]">
                  <div className="flex items-center justify-between border-b border-[#eee] py-[14px] text-[13px]">
                    <dt className="text-[#777]">총 봉인 제비 수</dt>
                    <dd className="m-[0px] font-[700] tabular-nums text-[#222]">
                      {seal.totalBallots.toLocaleString()}장
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#eee] py-[14px] text-[13px]">
                    <dt className="text-[#777]">봉인 시각</dt>
                    <dd className="m-[0px] font-[700] tabular-nums text-[#222]">{formatKST(seal.sealedAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-[8px] border-b border-[#eee] py-[14px] text-[13px]">
                    <dt className="text-[#777]">명단 지문</dt>
                    <dd className="m-[0px] flex items-center gap-[8px]">
                      <code className={`text-[12px] font-[700] text-[#E5372B] ${MONO}`}>
                        {seal.rosterHash.slice(0, 8)}...{seal.rosterHash.slice(-4)}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyHash}
                        className="[font-family:inherit] flex h-[26px] items-center gap-[4px] rounded-[3px] border border-[#222] bg-[#fff] px-[8px] text-[11px] font-[700] text-[#222] hover:bg-[#f6f6f6] cursor-pointer"
                      >
                        {hashCopied ? (
                          <>
                            <Check className="h-[12px] w-[12px] stroke-[3] text-[#1E9E63]" />
                            <span className="text-[#14724A]">복사됨</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-[12px] w-[12px]" /> 복사
                          </>
                        )}
                      </button>
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {/* ───── 1주차 개발용 토큰 (development 전용) ───── */}
            {process.env.NODE_ENV === 'development' && token && (
              <section className="mt-[32px]">
                <div className="flex items-center justify-between border-b border-[#222] pb-[10px]">
                  <h2 className="m-[0px] flex items-center gap-[6px] text-[14px] font-[700] text-[#111]">
                    <Shield className="h-[16px] w-[16px] text-[#3B73E8]" /> 1주차 개발용 Bearer 토큰
                  </h2>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="[font-family:inherit] flex h-[28px] items-center gap-[4px] rounded-[3px] border border-[#222] bg-[#fff] px-[10px] text-[11px] font-[700] text-[#222] transition hover:bg-[#f6f6f6] cursor-pointer"
                  >
                    {tokenCopied ? (
                      <>
                        <Check className="h-[14px] w-[14px] stroke-[3] text-[#1E9E63]" />
                        <span className="text-[#14724A]">복사 완료</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-[14px] w-[14px]" />
                        <span>토큰 복사</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-[12px] border border-dashed border-[#ccc] bg-[#f5f5f5] px-[14px] py-[12px]">
                  <p className="m-[0px] text-[12px] leading-[1.625] text-[#666]">
                    * 개발 모드(
                    <code className={`rounded-[2px] bg-[#e8e8e8] px-[4px] py-[1px] text-[11px] font-[600] text-[#333] ${MONO}`}>
                      development
                    </code>
                    )에서만 노출되며, 배포 사이트에서는 자동으로 숨겨집니다.
                  </p>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ───── 지문 설명 모달 ───── */}
      {showHashHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-[16px]">
          <div className="w-full max-w-[400px] rounded-[4px] border border-[#222] bg-[#fff] p-[20px]">
            <div className="flex items-center justify-between border-b border-[#222] pb-[10px]">
              <h3 className="m-[0px] flex items-center gap-[6px] text-[14px] font-[700] text-[#111]">
                <ShieldCheck className="h-[16px] w-[16px] text-[#3B73E8]" /> 명단 지문(해시)이란?
              </h3>
              <button
                type="button"
                onClick={() => setShowHashHelp(false)}
                className="border-0 bg-transparent p-[0px] text-[#999] hover:text-[#222] cursor-pointer"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="space-y-[8px] py-[14px] text-[12px] leading-[1.625] text-[#555]">
              <p className="m-[0px]">1. 응모 마감 순간 전체 제비 명단을 바탕으로 계산된 고유 지문입니다.</p>
              <p className="m-[0px]">2. 추첨 후에도 같은 지문이 유지되면 중간에 명단이 조작되지 않았음을 보증합니다.</p>
              <p className="m-[0px]">3. Fair Draw의 모든 참여자는 이 지문을 통해 추첨의 무결성을 검증할 수 있습니다.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowHashHelp(false)}
              className="[font-family:inherit] h-[40px] w-full rounded-[3px] border-0 bg-[#222] text-[13px] font-[700] text-[#fff] hover:bg-[#000] cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ───── 하단 상태 푸터 ───── */}
      <footer className="border-t border-[#e5e5e5]">
        <div className="mx-auto flex max-w-[480px] items-center justify-center gap-[8px] px-[16px] py-[14px] text-[11px] font-[500] text-[#1E9E63]">
          <span className="tl-pulse h-[8px] w-[8px] rounded-full bg-[#1E9E63]" />
          <span>Fair Draw 공정 추첨 플랫폼 · 내 응모 관리</span>
        </div>
      </footer>
    </div>
  );
}