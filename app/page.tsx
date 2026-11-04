'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Share2, ChevronLeft, ChevronRight, ChevronDown, Info, MapPin, Download } from 'lucide-react';

// 예매 가능한 회차 데이터
interface Session {
  id: string;
  time: string;
  roundName: string;
  totalSeats: number;
  cast: string;
}

const AVAILABLE_SESSIONS: Record<string, Session[]> = {
  '2026-11-06': [
    { id: 'S1', time: '17:00', roundName: '1회차 (오후 공연)', totalSeats: 800, cast: '인디밴드 라인업 A팀' },
    { id: 'S2', time: '19:30', roundName: '2회차 (메인 피날레)', totalSeats: 1200, cast: '대동제 초청 아티스트 특별 라이브' },
  ],
  '2026-11-07': [
    { id: 'S3', time: '18:00', roundName: '1회차 (토요 특별전)', totalSeats: 1000, cast: '동아리 연합 및 게스트 스테이지' },
  ],
};

// 날짜를 눌렀을 때 기본으로 선택되는 회차
const DEFAULT_SESSION: Record<string, string> = {
  '2026-11-06': 'S2',
  '2026-11-07': 'S3',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const NOV_DAYS = Array.from({ length: 30 }, (_, i) => i + 1); // 2026년 11월 1일은 일요일
const NEXT_MONTH_DAYS = [1, 2, 3, 4, 5]; // 5주 행을 채우는 다음 달 날짜
const dateKey = (d: number) => `2026-11-${String(d).padStart(2, '0')}`;

const NAV_MAIN = ['뮤지컬', '콘서트', '연극', '클래식·무용', '아동·가족', '전시', '축제·레저', '공연장', '링크ON'];
const NAV_SUB = ['랭킹', '지역', '이벤트', '기획전', 'PAYCO VIP ZONE'];

const CAST_LIST = [
  ['인디밴드 A', '1회차 라인업'],
  ['인디밴드 B', '1회차 라인업'],
  ['인디밴드 C', '1회차 라인업'],
  ['초청 아티스트', '메인 피날레'],
  ['동아리 연합', '토요 특별전'],
  ['게스트 1', '게스트 스테이지'],
  ['게스트 2', '게스트 스테이지'],
  ['MC', '진행'],
];
const TABS = ['상세정보', '관람후기', '기대평', '장소정보', '예매/취소안내'];

const RED = '#E5372B';

export default function DateSelectionPage() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>('2026-11-06');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('S2');
  const [activeTab, setActiveTab] = useState<string>('상세정보');

  const currentSessions = AVAILABLE_SESSIONS[selectedDate] || [];
  const selectedSession = currentSessions.find((s) => s.id === selectedSessionId);

  const handleSelectDate = (key: string) => {
    setSelectedDate(key);
    setSelectedSessionId(DEFAULT_SESSION[key]);
  };

  const handleNext = () => {
    if (!selectedSession) {
      alert('관람하실 회차를 선택해주세요.');
      return;
    }
    // 선택한 날짜/회차 정보를 가지고 2단계 구역 배분 페이지로 이동
    router.push('/apply');
  };

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
                onClick={() => router.push('/login')}
                className="bg-transparent border-0 p-[0px] [font-family:inherit] text-inherit cursor-pointer hover:text-[#111]"
              >
                로그인
              </button>
            </li>
            <li className="px-[10px]">회원가입</li>
            <li className="px-[10px]">예매확인/취소</li>
            <li className="px-[10px]">고객센터</li>
            <li className="px-[10px] font-[900] text-[#E5372B]">PAYCO</li>
            <li className="flex items-center gap-[2px] pl-[10px]">
              관계사 <ChevronDown className="h-[12px] w-[12px] text-[#888]" />
            </li>
          </ul>
        </div>
      </div>

      {/* ───── 로고 / 검색 ───── */}
      <header className="mx-auto flex h-[66px] max-w-[1000px] items-center justify-between px-[16px]">
        <div className="flex items-center gap-[24px]">
          <span className="text-[34px] leading-none tracking-[-0.025em] text-[#111]">
            Fair<span className="font-[900]">Draw</span>
          </span>

          <nav className="flex items-center gap-[16px] text-[20px] font-[700] leading-none">
            <span className="text-[#111]">공연/전시</span>
            <span className="text-[#b5b5b5]">스포츠</span>
          </nav>
        </div>
        <label className="hidden h-[40px] w-[250px] items-center justify-between rounded-full bg-[#f3f3f3] px-[20px] text-[12px] text-[#888] min-[640px]:flex">
          <input className="border-0 p-[0px] [font-family:inherit] w-full bg-transparent outline-none placeholder:text-[#999]" placeholder="검색어를 입력해 주세요." />
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
        {/* ───── 상품 요약 ───── */}
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
              <p className="m-[0px] text-[9px]">야외 특설 노천극장</p>
              <p className="m-[0px] mt-[12px] text-[10px] font-[600] tracking-[0.3em]">2026 AUTUMN</p>
              <p className="m-[0px] text-[46px] font-[900] leading-none text-[#9C1B1B]">대동제</p>
            </div>
            <div className="absolute left-1/2 top-[37%] h-[14%] w-[4.5%] -translate-x-1/2 rounded-t-full bg-[#B31217]" />
            <div className="absolute left-1/2 top-[52%] h-[16%] w-[4.5%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(179,18,23,0.8),transparent)] blur-[2px]" />
            <p className="m-[0px] absolute inset-x-[0px] bottom-[5%] text-center text-[10px] text-[rgba(255,255,255,0.5)]">
              아티스트 특별 콘서트
            </p>
          </div>

          {/* 정보 */}
          <div className="w-full flex-1">
            <span className="inline-block rounded-full border border-[#2D8FD5] px-[10px] py-[2px] text-[11px] font-[600] text-[#2D8FD5]">
              공정 추첨
            </span>

            <div className="mt-[16px] flex items-center justify-between border-b border-[#222] pb-[16px]">
              <h1 className="m-[0px] text-[24px] font-[700] leading-[1.25] text-[#111]">
                2026 가을 대동제 아티스트 특별 콘서트
              </h1>
              <Share2 className="h-[18px] w-[18px] shrink-0 text-[#666]" />
            </div>

            <dl className="m-[0px] grid grid-cols-1 gap-x-[32px] gap-y-[14px] border-b border-[#e5e5e5] py-[20px] text-[13px] min-[640px]:grid-cols-2">
              <div className="flex">
                <dt className="w-[72px] shrink-0 text-[#222]">장소</dt>
                <dd className="m-[0px] flex items-center gap-[4px] font-[600]">
                  <span className="underline underline-offset-2">야외 특설 노천극장</span>
                  <MapPin className="h-[14px] w-[14px] fill-[#E5372B] text-[#E5372B]" />
                </dd>
              </div>
              <div className="flex">
                <dt className="w-[72px] shrink-0 text-[#222]">관람시간</dt>
                <dd className="m-[0px] font-[600]">회차별 상이</dd>
              </div>
              <div className="flex">
                <dt className="w-[72px] shrink-0 text-[#222]">기간</dt>
                <dd className="m-[0px] flex items-center gap-[4px] font-[600]">
                  2026.11.06 ~ 2026.11.07
                  <Info className="h-[12px] w-[12px] text-[#999]" />
                </dd>
              </div>
              <div className="flex">
                <dt className="w-[72px] shrink-0 text-[#222]">관람등급</dt>
                <dd className="m-[0px] font-[600]">전체 관람가</dd>
              </div>
            </dl>

            <dl className="m-[0px] grid grid-cols-1 gap-x-[32px] gap-y-[16px] pt-[20px] text-[13px] min-[640px]:grid-cols-2">
              <div className="flex">
                <dt className="w-[72px] shrink-0 text-[#222]">응모권</dt>
                <dd>
                  <p>
                    1인 최대 <b>3장</b>
                  </p>
                  <button type="button" className="bg-transparent border-0 p-[0px] [font-family:inherit] mt-[12px] text-[12px] font-[500] underline underline-offset-2">
                    응모정보 더보기 <span className="text-[9px]">▼</span>
                  </button>
                </dd>
              </div>
              <div className="flex">
                <dt className="w-[72px] shrink-0 text-[#222]">당첨확률</dt>
                <dd>
                  <p>
                    마감 전 응모 시 <b>동일</b>
                  </p>
                  <button type="button" className="bg-transparent border-0 p-[0px] [font-family:inherit] mt-[12px] text-[12px] font-[500] underline underline-offset-2">
                    추첨정보 더보기 <span className="text-[9px]">▼</span>
                  </button>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* 안내서 버튼 */}
        <div className="flex justify-end">
          <button
            type="button"
            className="border-0 [font-family:inherit] mt-[12px] inline-flex h-[24px] items-center gap-[4px] rounded-[6px] bg-[#333] px-[12px] text-[11px] font-[700] text-[#fff] hover:bg-[#000]"
          >
            응모안내서 <Download className="h-[12px] w-[12px]" />
          </button>
        </div>

        {/* ───── 예매 패널 (STEP1 / STEP2 / 응모가능좌석) ───── */}
        <section className="mt-[8px] overflow-hidden rounded-[6px] border border-[#ccc] min-[768px]:grid min-[768px]:grid-cols-[40fr_36fr_24fr]">
          {/* STEP1 날짜 선택 */}
          <div className="flex gap-[20px] p-[20px] pl-[24px] min-[768px]:border-r min-[768px]:border-[#ddd]">
            <div className="w-[64px] shrink-0">
              <p className="m-[0px] text-[13px]" style={{ color: RED }}>
                STEP1
              </p>
              <p className="m-[0px] mt-[8px] text-[13px] font-[700] text-[#111]">날짜 선택</p>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <button type="button" aria-label="이전 달" className="bg-transparent border-0 p-[0px] [font-family:inherit] text-[#c4c4c4] hover:text-[#555]">
                  <ChevronLeft className="h-[16px] w-[16px]" />
                </button>
                <span className="text-[16px] font-[700] tabular-nums text-[#111]">2026.11</span>
                <button type="button" aria-label="다음 달" className="bg-transparent border-0 p-[0px] [font-family:inherit] text-[#c4c4c4] hover:text-[#555]">
                  <ChevronRight className="h-[16px] w-[16px]" />
                </button>
              </div>

              <div className="mt-[16px] grid grid-cols-7 text-center text-[10px] font-[700]">
                {WEEKDAYS.map((w, i) => (
                  <span key={w} style={i === 0 ? { color: RED } : undefined} className={i === 6 ? 'text-[#3B73E8]' : i === 0 ? '' : 'text-[#999]'}>
                    {w}
                  </span>
                ))}
              </div>

              <div className="mt-[8px] grid grid-cols-7 gap-y-[4px] text-center text-[12px]">
                {NOV_DAYS.map((d) => {
                  const key = dateKey(d);
                  const available = key in AVAILABLE_SESSIONS;
                  const selected = selectedDate === key;
                  const col = (d - 1) % 7;

                  if (!available) {
                    return (
                      <div key={d} className="mx-auto flex h-[36px] w-[36px] items-center justify-center text-[#b3b3b3]">
                        {d}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => handleSelectDate(key)}
                      style={!selected && col === 0 ? { color: RED } : undefined}
                      className={`border-0 p-[0px] [font-family:inherit] mx-auto flex h-[36px] w-[36px] items-center justify-center rounded-full font-[700] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B73E8] ${
                        selected
                          ? 'bg-[#111] text-[#fff]'
                          : col === 6
                          ? 'bg-transparent text-[#3B73E8] hover:bg-[#eef3ff]'
                          : col === 0
                          ? 'bg-transparent hover:bg-[#fdeeed]'
                          : 'bg-transparent text-[#111] hover:bg-[#eee]'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
                {NEXT_MONTH_DAYS.map((d) => (
                  <div key={`n${d}`} className="mx-auto flex h-[36px] w-[36px] items-center justify-center text-[#b3b3b3]">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STEP2 회차 선택 */}
          <div className="flex gap-[16px] border-t border-[#ddd] p-[20px] min-[768px]:border-r min-[768px]:border-t-0">
            <div className="w-[64px] shrink-0">
              <p className="m-[0px] text-[13px]" style={{ color: RED }}>
                STEP2
              </p>
              <p className="m-[0px] mt-[8px] text-[13px] font-[700] text-[#111]">회차 선택</p>
            </div>

            <div role="radiogroup" aria-label="회차" className="flex-1 space-y-[8px]">
              {currentSessions.map((session) => {
                const isSelected = selectedSessionId === session.id;
                return (
                  <button
                    key={session.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`bg-transparent [font-family:inherit] block w-full rounded-[4px] px-[14px] py-[10px] text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B73E8] ${
                      isSelected ? 'border-[1.5px] border-[#111]' : 'border border-[#ccc] hover:border-[#888]'
                    }`}
                  >
                    <p className="m-[0px] text-[15px] font-[700] tabular-nums text-[#111]">
                      {session.time}
                      <span className="ml-[8px] text-[11px] font-[400] text-[#888]">{session.roundName}</span>
                    </p>
                    <p className="m-[0px] mt-[4px] text-[11px] text-[#666]">
                      출연진 <b className="font-[600] text-[#222]">{session.cast}</b>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 응모가능좌석 */}
          <div className="border-t border-[#ddd] bg-[#f5f5f5] p-[20px] min-[768px]:border-t-0">
            <p className="m-[0px] text-[12px] font-[700] text-[#111]">응모가능좌석</p>
            <div className="mt-[16px] space-y-[12px] text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-[#777]">일자</span>
                <b className="tabular-nums text-[#111]">{selectedDate}</b>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#777]">추첨 좌석</span>
                <b className="tabular-nums text-[#111]">
                  {selectedSession ? `${selectedSession.totalSeats.toLocaleString()}석` : '-'}
                </b>
              </div>
            </div>
          </div>
        </section>

        {/* 예매 버튼 */}
        <div className="mt-[16px] flex flex-col justify-end gap-[8px] min-[640px]:flex-row">
          <a
            href="#notice"
            className="no-underline flex h-[56px] items-center justify-center rounded-[3px] border border-[#222] text-[14px] font-[700] text-[#222] hover:bg-[#f6f6f6] min-[640px]:w-[210px]"
          >
            응모 안내 보기
          </a>
          <button
            onClick={handleNext}
            disabled={!selectedSession}
            className="border-0 [font-family:inherit] h-[56px] rounded-[3px] bg-[#F0352A] text-[16px] font-[700] text-[#fff] transition hover:bg-[#d92a20] disabled:cursor-not-allowed disabled:bg-[#ccc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0352A] min-[640px]:w-[210px]"
          >
            예매하기
          </button>
        </div>

        {/* ───── 출연진 ───── */}
        <section className="mt-[48px]">
          <div className="flex items-center gap-[12px]">
            <h2 className="m-[0px] text-[15px] font-[700] text-[#111]">출연진</h2>
            <button type="button" className="bg-transparent [font-family:inherit] border border-[#bbb] px-[8px] py-[2px] text-[10px] text-[#555]">
              출연 정보 보기
            </button>
          </div>
          <ul className="m-[0px] p-[0px] list-none mt-[16px] flex gap-[24px] overflow-x-auto pb-[8px]">
            {CAST_LIST.map(([name, role]) => (
              <li key={name} className="flex w-[76px] shrink-0 flex-col items-center text-center">
                <span className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#eceef2] text-[17px] font-[700] text-[#8A93A6]">
                  {name.charAt(0)}
                </span>
                <span className="mt-[8px] text-[12px] font-[700] leading-[1.25] text-[#222]">{name}</span>
                <span className="mt-[2px] text-[10px] leading-[1.25] text-[#888]">{role}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ───── 탭 ───── */}
        <section className="mt-[48px]">
          <div role="tablist" className="grid grid-cols-5 border-b border-[#ccc]">
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
            {activeTab === '상세정보' ? (
              <>
                <h3 className="m-[0px] text-[15px] font-[700] text-[#111]">공연시간 정보</h3>
                <div className="mt-[12px] space-y-[4px]">
                  <p className="m-[0px] font-[700]">2026년 11월 06일(금) ~ 2026년 11월 07일(토)</p>
                  <p>금 17:00, 19:30 / 토 18:00</p>
                  <p className="m-[0px] pt-[8px] text-[#777]">회차별 출연진은 위 예매 패널에서 확인하실 수 있습니다.</p>
                </div>

                <h3 id="notice" className="m-[0px] mt-[48px] scroll-mt-[24px] text-[15px] font-[700] text-[#111]">
                  공지사항
                </h3>
                <div className="mt-[12px] flex items-center justify-center gap-[8px] border border-[#F3C6C2] bg-[#FDF3F2] px-[16px] py-[12px] text-center text-[12px] text-[#D3342A]">
                  <Info className="h-[14px] w-[14px] shrink-0" />
                  본 공연은 선착순이 아닌 추첨제로 진행됩니다. 마감 전까지 응모하셔도 당첨 확률은 동일합니다.
                </div>
                <div className="mt-[20px] space-y-[4px] text-[#555]">
                  <p>응모권은 1인 최대 3장까지 신청할 수 있습니다.</p>
                  <p>좌석은 구역 단위로 응모하며, 추첨 결과에 따라 배정됩니다.</p>
                  <p>공연 시간과 출연진은 현장 사정에 따라 변경될 수 있습니다.</p>
                </div>
              </>
            ) : (
              <p className="m-[0px] py-[64px] text-center text-[#999]">등록된 내용이 없습니다.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}