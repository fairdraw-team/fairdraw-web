'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { formatKST } from '../../lib/format';
import {
  Search,
  Share2,
  ChevronDown,
  Info,
  MapPin,
  Users,
  Ticket,
  Lock,
  Copy,
  Check,
  HelpCircle,
  ShieldCheck,
  X,
} from 'lucide-react';

interface SectionInfo {
  id: string;
  name: string;
  capacity: number;
  price: string;
  desc: string;
}

interface EventDetail {
  id: string;
  title: string;
  place: string;
  status: 'draft' | 'open' | 'closed' | 'drawn' | 'paying' | 'done';
  startAt: string; // UTC ISO 문자열
  endAt: string; // UTC ISO 문자열
  closeAt: string; // 응모 마감 시각 (UTC ISO 문자열)
  ballotsPerPerson: number; // 1인당 제비 수 (기본 3)
  sections: SectionInfo[];
}

interface SealInfo {
  sealedAt: string;
  totalBallots: number;
  rosterHash: string; // 64자 SHA-256 해시
}

// 2주차 모의 데이터 (백엔드 연동 전 기본값)
const MOCK_EVENT: EventDetail = {
  id: '1',
  title: '2026 가을 대동제 아티스트 특별 콘서트',
  place: '야외 특설 노천극장',
  status: 'open', // 상태 테스트: 'open' 또는 'closed'
  startAt: '2026-11-06T10:00:00Z',
  endAt: '2026-11-07T13:00:00Z',
  closeAt: '2026-11-05T09:00:00Z', // 마감 일시
  ballotsPerPerson: 3,
  sections: [
    { id: 'A', name: 'A구역', capacity: 130, price: '무료 (응모)', desc: '스탠딩 중앙' },
    { id: 'B', name: 'B구역', capacity: 80, price: '무료 (응모)', desc: '스탠딩 좌측' },
    { id: 'C', name: 'C구역', capacity: 96, price: '무료 (응모)', desc: '지정석 중앙' },
    { id: 'D', name: 'D구역', capacity: 36, price: '무료 (응모)', desc: '지정석 측면' },
  ],
};

const MOCK_SEAL: SealInfo = {
  sealedAt: '2026-11-05T09:00:00Z',
  totalBallots: 90,
  rosterHash: '3fa98e4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c21e',
};

const NAV_MAIN = ['뮤지컬', '콘서트', '연극', '클래식·무용', '아동·가족', '전시', '축제·레저', '공연장', '링크ON'];
const NAV_SUB = ['랭킹', '지역', '이벤트', '기획전', 'PAYCO VIP ZONE'];
const TABS = ['상세정보', '구역 및 제비 안내', '연석 팀 안내', '공지사항'];
const MONO = "font-['ui-monospace','SFMono-Regular','Menlo','Consolas',monospace]";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = (params?.id as string) || '1';

  const [event] = useState<EventDetail>(MOCK_EVENT);
  const [seal] = useState<SealInfo>(MOCK_SEAL);
  const [activeTab, setActiveTab] = useState<string>('상세정보');

  // 마감까지 남은 시간 (문자열)
  const [timeLeftText, setTimeLeftText] = useState<string>('');
  const [isPastClose, setIsPastClose] = useState<boolean>(false);

  // 해시 복사 및 지문 설명 모달
  const [copied, setCopied] = useState<boolean>(false);
  const [showHashHelp, setShowHashHelp] = useState<boolean>(false);

  // 1분(60초)마다 마감 시간 계산 갱신
  useEffect(() => {
    function calculateTimeLeft() {
      const now = new Date().getTime();
      const closeTime = new Date(event.closeAt).getTime();
      const diff = closeTime - now;

      if (diff <= 0) {
        setTimeLeftText('응모가 마감되었습니다.');
        setIsPastClose(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      setTimeLeftText(`${days}일 ${hours}시간 ${minutes}분 남음`);
      setIsPastClose(false);
    }

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [event.closeAt]);

  // 로그인 상태 검증 및 이동 처리
  const handleProceed = async (type: 'individual' | 'team') => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 로그인하지 않은 경우 ?next=/events/{id}를 붙여 /login으로 이동
    if (!user) {
      router.push(`/login?next=/events/${eventId}`);
      return;
    }

    if (type === 'individual') {
      router.push(`/events/${eventId}/enter`);
    } else {
      router.push(`/events/${eventId}/team`); // 프론트B 팀 화면으로 이동
    }
  };

  // 해시 복사 핸들러
  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(seal.rosterHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('해시 복사에 실패했습니다.');
    }
  };

  const isClosed = event.status !== 'open' || isPastClose;
  const isOpenNow = event.status === 'open' && !isPastClose;

  const metaRows: { label: string; node: React.ReactNode }[] = [
    {
      label: '장소',
      node: (
        <span className="flex items-center gap-[4px] font-[600]">
          <span className="underline underline-offset-2">{event.place}</span>
          <MapPin className="h-[14px] w-[14px] fill-[#E5372B] text-[#E5372B]" />
        </span>
      ),
    },
    { label: '공연일시', node: <span className="font-[600]">{formatKST(event.startAt)}</span> },
    { label: '응모 마감', node: <span className="font-[700] text-[#E5372B]">{formatKST(event.closeAt)}</span> },
    { label: '남은 시간', node: <span className="font-[600] text-[#3B73E8]">{timeLeftText}</span> },
    {
      label: '1인당 제비',
      node: (
        <span className="flex items-center gap-[4px] font-[700] text-[#111]">
          <Ticket className="h-[14px] w-[14px] text-[#E5372B]" />
          최대 {event.ballotsPerPerson}장 (구역 분할 가능)
        </span>
      ),
    },
  ];

  return (
    <div className="[&_*]:box-border leading-[1.5] min-h-screen bg-[#fff] text-[#222] select-none font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      {/* ───── 상단 유틸 바 ───── */}
      <div className="bg-[#f4f4f4]">
        <div className="mx-auto flex h-[26px] max-w-[1000px] items-center justify-between px-[16px] text-[11px] text-[#555]">
          <span className="flex items-center gap-[6px]">
            <span className="h-[12px] w-[12px] rounded-full border border-[#ccc] bg-[linear-gradient(#fff_0%,#fff_30%,#E5372B_30%,#E5372B_55%,#2A4FD6_55%,#2A4FD6_100%)]" />
            한국어
            <ChevronDown className="h-[12px] w-[12px] text-[#888]" />
          </span>
          <ul className="m-[0px] p-[0px] list-none flex items-center divide-x divide-[#ccc]">
            <li className="px-[10px]">
              <button
                type="button"
                onClick={() => router.push(`/login?next=/events/${eventId}`)}
                className="bg-transparent border-0 p-[0px] [font-family:inherit] text-[11px] text-inherit cursor-pointer hover:text-[#111]"
              >
                로그인
              </button>
            </li>
            <li className="px-[10px]">
              <button
                type="button"
                onClick={() => router.push(`/events/${eventId}/me`)}
                className="bg-transparent border-0 p-[0px] [font-family:inherit] text-[11px] font-[700] text-[#E5372B] cursor-pointer hover:text-[#b82a20]"
              >
                내 응모 확인
              </button>
            </li>
            <li className="px-[10px]">고객센터</li>
          </ul>
        </div>
      </div>

      {/* ───── 로고 / 검색 ───── */}
      <header className="mx-auto flex h-[66px] max-w-[1000px] items-center justify-between px-[16px]">
        <div className="flex items-center gap-[24px]">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="bg-transparent border-0 p-[0px] [font-family:inherit] cursor-pointer text-[34px] leading-none tracking-[-0.025em] text-[#111]"
          >
            Fair<span className="font-[900]">Draw</span>
          </button>
          <nav className="flex items-center gap-[16px] text-[20px] font-[700] leading-none">
            <span className="text-[#111]">공연/전시</span>
            <span className="text-[#b5b5b5]">스포츠</span>
          </nav>
        </div>
        <label className="hidden h-[40px] w-[250px] items-center justify-between rounded-full bg-[#f3f3f3] px-[20px] text-[12px] text-[#888] min-[640px]:flex">
          <input
            className="border-0 p-[0px] [font-family:inherit] w-full bg-transparent outline-none placeholder:text-[#999]"
            placeholder="공연 검색"
          />
          <Search className="h-[18px] w-[18px] text-[#222]" />
        </label>
      </header>

      {/* ───── 카테고리 메뉴 ───── */}
      <nav className="border-y border-t-[#e5e5e5] border-b-[#222]">
        <ul className="m-[0px] p-[0px] list-none mx-auto flex min-h-[44px] max-w-[1000px] flex-wrap items-center gap-x-[24px] gap-y-[4px] px-[16px] py-[8px] text-[14px] font-[700]">
          {NAV_MAIN.map((c) => (
            <li key={c} className="text-[#222]">
              {c}
            </li>
          ))}
          <li className="h-[12px] w-px bg-[#ccc]" aria-hidden />
          {NAV_SUB.map((c) => (
            <li key={c} className="relative text-[#777]">
              {c === '기획전' && (
                <span className="absolute -top-[22px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#E5372B] px-[8px] py-[2px] text-[9px] font-[700] text-[#fff] after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-x-[3px] after:border-t-[4px] after:border-x-transparent after:border-t-[#E5372B]">
                  추첨 응모 진행중
                </span>
              )}
              {c}
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto max-w-[1000px] px-[16px] pb-[96px]">
        {/* ───── 공연 요약 ───── */}
        <section className="mt-[48px] flex flex-col items-center gap-[32px] min-[768px]:flex-row min-[768px]:items-start">
          {/* 포스터 (3:4) */}
          <div
            className="relative aspect-[3/4] w-[260px] shrink-0 overflow-hidden rounded-[3px] shadow-[0_2px_8px_rgba(0,0,0,0.25)] min-[768px]:w-[320px]"
            style={{
              background:
                'radial-gradient(70% 16% at 50% 60%, rgba(200,24,24,0.8), transparent 72%), linear-gradient(180deg,#EFE4D0 0%,#DCCBAF 33%,#17100F 50%,#070506 100%)',
            }}
          >
            <div className="absolute inset-x-[0px] top-[6%] text-center text-[#3A2A1E]">
              <p className="m-[0px] text-[9px] tracking-[0.025em]">2026.11.06 FRI – 11.07 SAT</p>
              <p className="m-[0px] text-[9px]">{event.place}</p>
              <p className="m-[0px] mt-[12px] text-[10px] font-[600] tracking-[0.3em]">2026 AUTUMN CONCERT</p>
              <p className="m-[0px] text-[46px] font-[900] leading-none text-[#9C1B1B]">대동제</p>
            </div>
            <div className="absolute left-1/2 top-[37%] h-[14%] w-[4.5%] -translate-x-1/2 rounded-t-full bg-[#B31217]" />
            <div className="absolute left-1/2 top-[52%] h-[16%] w-[4.5%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(179,18,23,0.8),transparent)] blur-[2px]" />
            <p className="m-[0px] absolute inset-x-[0px] bottom-[5%] text-center text-[10px] text-[rgba(255,255,255,0.5)]">
              Fair Draw 투명 추첨제 적용
            </p>
          </div>

          {/* 공연 메타 정보 */}
          <div className="w-full flex-1">
            <div className="flex flex-wrap items-center gap-[8px]">
              <span className="rounded-full border border-[#2D8FD5] px-[10px] py-[2px] text-[11px] font-[600] text-[#2D8FD5]">
                추첨제 응모
              </span>
              <span
                className={`rounded-full border px-[10px] py-[2px] text-[11px] font-[600] ${
                  isOpenNow
                    ? 'border-[#1E9E63] text-[#1E9E63]'
                    : 'border-[#bbb] text-[#888]'
                }`}
              >
                {isOpenNow ? '응모 진행중' : '응모 마감'}
              </span>
            </div>

            <div className="mt-[16px] flex items-center justify-between border-b border-[#222] pb-[16px]">
              <h1 className="m-[0px] text-[24px] font-[700] leading-[1.25] text-[#111]">{event.title}</h1>
              <Share2 className="h-[18px] w-[18px] shrink-0 cursor-pointer text-[#666]" />
            </div>

            <dl className="m-[0px] grid grid-cols-1 gap-x-[32px] gap-y-[14px] border-b border-[#e5e5e5] py-[20px] text-[13px] min-[640px]:grid-cols-2">
              {metaRows.map((row) => (
                <div key={row.label} className="flex">
                  <dt className="w-[84px] shrink-0 text-[#222]">{row.label}</dt>
                  <dd className="m-[0px]">{row.node}</dd>
                </div>
              ))}
            </dl>

            {/* 구역별 정원 및 응모 정보 */}
            <div className="mt-[20px]">
              <h2 className="m-[0px] mb-[8px] text-[13px] font-[700] text-[#111]">구역별 정원 및 응모 정보</h2>
              <div className="overflow-x-auto rounded-[4px] border border-[#ddd]">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[#ddd] bg-[#f5f5f5] text-[#555]">
                      <th className="px-[12px] py-[8px] font-[600]">구역</th>
                      <th className="px-[12px] py-[8px] font-[600]">특징</th>
                      <th className="px-[12px] py-[8px] font-[600]">추첨 정원</th>
                      <th className="px-[12px] py-[8px] font-[600]">가격</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.sections.map((sec, i) => (
                      <tr
                        key={sec.id}
                        className={`hover:bg-[#fafafa] ${i < event.sections.length - 1 ? 'border-b border-[#eee]' : ''}`}
                      >
                        <td className="px-[12px] py-[8px] font-[700] text-[#111]">{sec.name}</td>
                        <td className="px-[12px] py-[8px] text-[#666]">{sec.desc}</td>
                        <td className="px-[12px] py-[8px] font-[600] tabular-nums">{sec.capacity}석</td>
                        <td className="px-[12px] py-[8px] font-[700] text-[#3B73E8]">{sec.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 응모하기 / 팀으로 응모하기 */}
            <div className="mt-[24px] flex flex-col gap-[8px] min-[640px]:flex-row">
              <button
                type="button"
                onClick={() => handleProceed('individual')}
                disabled={isClosed}
                className="border-0 [font-family:inherit] flex h-[56px] flex-1 items-center justify-center gap-[8px] rounded-[3px] bg-[#F0352A] px-[16px] text-[15px] font-[700] text-[#fff] transition hover:bg-[#d92a20] disabled:cursor-not-allowed disabled:bg-[#ccc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0352A]"
              >
                <Ticket className="h-[16px] w-[16px]" />
                {isClosed ? '응모가 마감되었습니다' : '응모하기 (개인 제비 배분)'}
              </button>

              <button
                type="button"
                onClick={() => handleProceed('team')}
                disabled={isClosed}
                className="bg-[#fff] [font-family:inherit] flex h-[56px] items-center justify-center gap-[8px] rounded-[3px] border border-[#222] px-[24px] text-[14px] font-[700] text-[#222] transition hover:bg-[#f6f6f6] disabled:cursor-not-allowed disabled:border-[#ccc] disabled:text-[#999] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#222]"
              >
                <Users className="h-[16px] w-[16px]" />
                팀으로 응모하기 (연석)
              </button>
            </div>
            {isClosed && (
              <p className="m-[0px] mt-[8px] text-[12px] font-[700] text-[#E5372B]">
                * 응모 마감 시각이 지나 신규 응모 및 팀 합류가 불가능합니다.
              </p>
            )}
          </div>
        </section>

        {/* ───── 명단 봉인 정보 (마감 이후 공개) ───── */}
        {isClosed && (
          <section className="mt-[40px] rounded-[6px] border border-[#ccc] p-[20px]">
            <div className="flex flex-col gap-[8px] border-b border-[#222] pb-[12px] min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
              <div className="flex flex-wrap items-center gap-[8px]">
                <Lock className="h-[18px] w-[18px] text-[#3B73E8]" />
                <h2 className="m-[0px] text-[15px] font-[700] text-[#111]">명단 봉인(Seal) 완료 정보</h2>
                <span className="rounded-[3px] bg-[#333] px-[8px] py-[1px] text-[10px] font-[700] text-[#fff]">
                  위변조 방지 지문
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHashHelp(true)}
                className="bg-transparent border-0 p-[0px] [font-family:inherit] flex items-center gap-[4px] self-start text-[12px] text-[#3B73E8] hover:underline min-[640px]:self-auto"
              >
                <HelpCircle className="h-[14px] w-[14px]" /> 이 지문은 무엇인가요?
              </button>
            </div>

            <div className="mt-[16px] grid grid-cols-1 gap-[12px] text-[12px] min-[640px]:grid-cols-3">
              {[
                ['응모 상태', '응모 마감됨', 'text-[#1E9E63]'],
                ['총 봉인 제비 수', `총 ${seal.totalBallots.toLocaleString()}장`, 'text-[#111]'],
                ['봉인 일시', formatKST(seal.sealedAt), 'text-[#111]'],
              ].map(([k, v, color]) => (
                <div key={k} className="rounded-[4px] border border-[#e5e5e5] px-[14px] py-[12px]">
                  <span className="block text-[#777]">{k}</span>
                  <b className={`mt-[2px] block text-[14px] font-[700] ${color}`}>{v}</b>
                </div>
              ))}
            </div>

            {/* 64자 해시 지문 (앞 8자리 + ... + 뒤 4자리 축약) */}
            <div className="mt-[12px] flex flex-col gap-[8px] rounded-[4px] bg-[#f5f5f5] px-[14px] py-[12px] min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
              <div className="flex items-center gap-[8px] overflow-hidden">
                <span className="shrink-0 text-[12px] font-[700] text-[#444]">명단 지문 (SHA-256)</span>
                <code
                  className={`rounded-[3px] bg-[#fdeeed] px-[8px] py-[2px] text-[12px] font-[700] text-[#E5372B] ${MONO}`}
                >
                  {seal.rosterHash.slice(0, 8)}...{seal.rosterHash.slice(-4)}
                </code>
              </div>
              <button
                type="button"
                onClick={handleCopyHash}
                className="bg-[#fff] [font-family:inherit] flex h-[32px] shrink-0 items-center justify-center gap-[4px] rounded-[3px] border border-[#222] px-[12px] text-[12px] font-[700] text-[#222] transition hover:bg-[#f6f6f6]"
              >
                {copied ? (
                  <>
                    <Check className="h-[14px] w-[14px] stroke-[3] text-[#1E9E63]" /> 전체 지문 복사됨
                  </>
                ) : (
                  <>
                    <Copy className="h-[14px] w-[14px]" /> 전체 복사
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* ───── 지문 설명 모달 ───── */}
        {showHashHelp && (
          <div
            className="fixed inset-[0px] z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-[16px]"
            onClick={() => setShowHashHelp(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="명단 지문(해시) 안내"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] rounded-[6px] bg-[#fff] p-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            >
              <div className="flex items-center justify-between border-b border-[#222] pb-[12px]">
                <h3 className="m-[0px] flex items-center gap-[6px] text-[14px] font-[700] text-[#111]">
                  <ShieldCheck className="h-[16px] w-[16px] text-[#3B73E8]" /> 명단 지문(해시) 안내
                </h3>
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => setShowHashHelp(false)}
                  className="bg-transparent border-0 p-[0px] flex text-[#999] hover:text-[#222]"
                >
                  <X className="h-[20px] w-[20px]" />
                </button>
              </div>
              <div className="space-y-[8px] py-[16px] text-[13px] leading-[1.625] text-[#444]">
                <p className="m-[0px]">1. 응모 마감 순간 생성된 전체 제비 명단의 고유 디지털 지문입니다.</p>
                <p className="m-[0px]">2. 추첨 후에도 같은 지문이 유지되면 명단이 중간에 바뀌지 않았음을 증명합니다.</p>
                <p className="m-[0px]">3. Fair Draw는 추첨 조작을 원천 방지하기 위해 이 지문을 대중에 사전 공개합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHashHelp(false)}
                className="border-0 [font-family:inherit] h-[44px] w-full rounded-[3px] bg-[#111] text-[13px] font-[700] text-[#fff] hover:bg-[#333]"
              >
                확인했습니다
              </button>
            </div>
          </div>
        )}

        {/* ───── 상세 탭 ───── */}
        <section className="mt-[48px]">
          <div role="tablist" className="grid grid-cols-4 border-b border-[#ccc]">
            {TABS.map((t) => {
              const on = activeTab === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActiveTab(t)}
                  className={`[font-family:inherit] h-[44px] border border-b-0 text-[13px] ${
                    on
                      ? '-mb-px border-[#ccc] border-t-2 border-t-[#111] bg-[#fff] font-[700] text-[#111]'
                      : 'border-[#ddd] bg-[#fafafa] text-[#666] hover:bg-[#f3f3f3]'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="pt-[32px] text-[13px] leading-[1.625] text-[#333]">
            {activeTab === '상세정보' && (
              <div>
                <h3 className="m-[0px] text-[15px] font-[700] text-[#111]">Fair Draw 공정 추첨 안내</h3>
                <p className="m-[0px] mt-[12px]">
                  본 공연은 암표와 매크로를 방지하기 위해 선착순 예매 대신 <b className="font-[700]">제비 추첨제</b>로
                  진행됩니다. 응모 마감 전까지 언제 신청하셔도 당첨 확률은 동일합니다.
                </p>
                <div className="mt-[16px] rounded-[4px] bg-[#f5f5f5] px-[14px] py-[12px] text-[12px] text-[#555]">
                  * 1인당 총 {event.ballotsPerPerson}장의 제비를 원하는 구역(A~D)에 자유롭게 배분하여 당첨 확률을 조율할 수
                  있습니다.
                </div>
              </div>
            )}

            {activeTab === '연석 팀 안내' && (
              <div>
                <h3 className="m-[0px] text-[15px] font-[700] text-[#111]">연석 팀(Team) 응모 규칙</h3>
                <div className="mt-[12px] space-y-[4px] text-[#555]">
                  <p className="m-[0px]">* 친구와 나란히 앉기를 원하시는 경우 &apos;팀으로 응모하기&apos;를 이용해주세요.</p>
                  <p className="m-[0px]">
                    * 팀은 <b className="font-[700] text-[#111]">단 하나의 구역에만</b> 제비를 모아서 응모해야 합니다.
                  </p>
                  <p className="m-[0px]">* 추첨 시 팀원 전원 당첨 또는 전원 탈락으로 함께 처리됩니다.</p>
                </div>
              </div>
            )}

            {activeTab === '공지사항' && (
              <div>
                <h3 className="m-[0px] text-[15px] font-[700] text-[#111]">공지사항</h3>
                <div className="mt-[12px] flex items-center justify-center gap-[8px] border border-[#F3C6C2] bg-[#FDF3F2] px-[16px] py-[12px] text-center text-[12px] font-[700] text-[#D3342A]">
                  <Info className="h-[14px] w-[14px] shrink-0" />
                  본인인증을 완료한 1인 1계정만 응모할 수 있으며 양도가 불가능합니다.
                </div>
                <div className="mt-[16px] space-y-[4px] text-[#555]">
                  <p className="m-[0px]">* 마감 이후에는 응모 취소나 팀원 변경이 불가능합니다.</p>
                  <p className="m-[0px]">
                    * 당첨자 발표 후 기한 내 결제가 완료되지 않으면 차순위자에게 기회가 넘어갑니다.
                  </p>
                </div>
              </div>
            )}

            {activeTab === '구역 및 제비 안내' && (
              <p className="m-[0px] py-[48px] text-center text-[12px] text-[#999]">
                상단의 구역별 정원 표를 참고하여 제비 {event.ballotsPerPerson}장을 전략적으로 배분해 주세요.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}