'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  AlertCircle,
  Search,
  ChevronDown,
  RefreshCw,
  Plus,
  Minus,
  X,
  Check,
} from 'lucide-react';

interface Section {
  id: string;
  label: string;
  desc: string;
  price: string;
  colorHex: string;
}

interface SectionLayoutConfig {
  rows: string[];
  cols: number[];
  occupied: Set<string>;
}

const SECTIONS: Section[] = [
  { id: 'A', label: 'A구역', desc: '스탠딩 중앙', price: '무료 (응모)', colorHex: '#4A72B8' },
  { id: 'B', label: 'B구역', desc: '스탠딩 좌측', price: '무료 (응모)', colorHex: '#52A374' },
  { id: 'C', label: 'C구역', desc: '지정석 중앙', price: '무료 (응모)', colorHex: '#E28A3B' },
  { id: 'D', label: 'D구역', desc: '지정석 측면', price: '무료 (응모)', colorHex: '#8C52B5' },
];

const SECTION_CONFIGS: Record<string, SectionLayoutConfig> = {
  A: {
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'],
    cols: Array.from({ length: 10 }, (_, i) => i + 1),
    occupied: new Set(['A3', 'A4', 'B7', 'C2', 'D5', 'F8', 'G9', 'J1', 'M10']),
  },
  B: {
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    cols: Array.from({ length: 8 }, (_, i) => i + 1),
    occupied: new Set(['A1', 'A2', 'C4', 'E6', 'H3']),
  },
  C: {
    rows: ['1', '2', '3', '4', '5', '6', '7', '8'],
    cols: Array.from({ length: 12 }, (_, i) => i + 1),
    occupied: new Set(['1-3', '1-4', '3-7', '5-5', '8-12']),
  },
  D: {
    rows: ['1', '2', '3', '4', '5', '6'],
    cols: Array.from({ length: 6 }, (_, i) => i + 1),
    occupied: new Set(['1-1', '2-3', '4-5']),
  },
};

const TOTAL_BALLOTS = 3;
const NAV_MAIN = ['뮤지컬', '콘서트', '연극', '클래식·무용', '아동·가족', '전시', '축제·레저', '공연장', '링크ON'];
const NAV_SUB = ['랭킹', '지역', '이벤트', '기획전', 'PAYCO VIP ZONE'];
const STEPS = ['날짜/회차선택', '구역선택 (추첨응모)', '권종/할인/매수선택', '배송선택/예매확인', '결제'];
const ACTIVE_STEP = 1;
const RED = '#E5372B';

export default function TicketLinkBookingPage() {
  const router = useRouter();

  const [allocated, setAllocated] = useState<Record<string, number>>({
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  });

  const [selectedSeatsBySection, setSelectedSeatsBySection] = useState<Record<string, string[]>>({
    A: [],
    B: [],
    C: [],
    D: [],
  });

  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [isSeatModalOpen, setIsSeatModalOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 총 선택된 좌석 수 계산
  const totalSeatsCount = Object.values(selectedSeatsBySection).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const usedBallots = Math.max(
    Object.values(allocated).reduce((a, b) => a + b, 0),
    totalSeatsCount
  );
  const remainingBallots = TOTAL_BALLOTS - usedBallots;

  const handleOpenSeatModal = (secId: string) => {
    setSelectedSection(secId);
    setIsSeatModalOpen(true);
  };

  // 좌석 토글 핸들러: 클릭 즉시 allocated 상태까지 동기화
  const handleSeatToggle = (secId: string, seatId: string) => {
    const config = SECTION_CONFIGS[secId];
    if (config?.occupied.has(seatId)) return;

    const currentSeats = selectedSeatsBySection[secId] || [];
    const isAlreadySelected = currentSeats.includes(seatId);

    let updatedSectionSeats: string[];

    if (isAlreadySelected) {
      updatedSectionSeats = currentSeats.filter((s) => s !== seatId);
    } else {
      if (totalSeatsCount >= TOTAL_BALLOTS) {
        alert(`1인당 최대 ${TOTAL_BALLOTS}장까지만 좌석을 선택할 수 있습니다.`);
        return;
      }
      updatedSectionSeats = [...currentSeats, seatId];
    }

    const nextSelected = {
      ...selectedSeatsBySection,
      [secId]: updatedSectionSeats,
    };

    setSelectedSeatsBySection(nextSelected);
    // allocated 상태 즉시 반영
    setAllocated({
      A: nextSelected.A.length,
      B: nextSelected.B.length,
      C: nextSelected.C.length,
      D: nextSelected.D.length,
    });
  };

  const handleConfirmSeats = () => {
    setAllocated({
      A: selectedSeatsBySection.A.length,
      B: selectedSeatsBySection.B.length,
      C: selectedSeatsBySection.C.length,
      D: selectedSeatsBySection.D.length,
    });
    setIsSeatModalOpen(false);
  };

  const handleCloseModal = () => {
    // 닫기(X) 클릭 시에도 현재 선택된 좌석 수를 수량에 반영
    setAllocated({
      A: selectedSeatsBySection.A.length,
      B: selectedSeatsBySection.B.length,
      C: selectedSeatsBySection.C.length,
      D: selectedSeatsBySection.D.length,
    });
    setIsSeatModalOpen(false);
  };

  const handleResetAll = () => {
    setAllocated({ A: 0, B: 0, C: 0, D: 0 });
    setSelectedSeatsBySection({ A: [], B: [], C: [], D: [] });
  };

  const handleNext = () => {
    if (usedBallots === 0) {
      alert('최소 1장 이상의 제비를 배분해주세요.');
      return;
    }
    const query = new URLSearchParams(Object.entries(allocated).map(([id, n]) => [id, String(n)]));
    router.push(`/confirm?${query.toString()}`);
  };

  const activeSectionInfo = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];
  const activeLayout = SECTION_CONFIGS[selectedSection] || SECTION_CONFIGS.A;
  const currentModalSelectedSeats = selectedSeatsBySection[selectedSection] || [];

  return (
    <div className="min-h-screen bg-[#fff] text-[#222] select-none font-sans">
      {/* 상단 유틸 바 */}
      <div className="bg-[#f4f4f4]">
        <div className="mx-auto flex h-[26px] max-w-[1000px] items-center justify-between px-[16px] text-[11px] text-[#555]">
          <span className="flex items-center gap-[6px]">
            <span className="h-[12px] w-[12px] rounded-full border border-[#ccc] bg-[linear-gradient(#fff_0%,#fff_30%,#E5372B_30%,#E5372B_55%,#2A4FD6_55%,#2A4FD6_100%)]" />
            한국어
            <ChevronDown className="h-[12px] w-[12px] text-[#888]" />
          </span>
          <ul className="m-0 p-0 list-none flex items-center divide-x divide-[#ccc]">
            <li className="px-[10px]">로그인</li>
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

      {/* 로고 / 검색 */}
      <header className="mx-auto flex h-[66px] max-w-[1000px] items-center justify-between px-[16px]">
        <div className="flex items-center gap-[24px]">
          <span className="text-[34px] leading-none tracking-[-0.025em] text-[#111]">
            ticket<span className="font-[900]">LINK</span>
          </span>
          <nav className="flex items-center gap-[16px] text-[20px] font-[700] leading-none">
            <span className="text-[#111]">공연/전시</span>
            <span className="text-[#b5b5b5]">스포츠</span>
          </nav>
        </div>
        <label className="hidden h-[40px] w-[250px] items-center justify-between rounded-full bg-[#f3f3f3] px-[20px] text-[12px] text-[#888] min-[640px]:flex">
          <input
            className="border-0 p-0 w-full bg-transparent outline-none placeholder:text-[#999]"
            placeholder="검색어를 입력해 주세요."
          />
          <Search className="h-[18px] w-[18px] text-[#222]" />
        </label>
      </header>

      {/* 카테고리 메뉴 */}
      <nav className="border-y border-t-[#e5e5e5] border-b-[#222]">
        <ul className="m-0 p-0 list-none mx-auto flex min-h-[44px] max-w-[1000px] flex-wrap items-center gap-x-[24px] gap-y-[4px] px-[16px] py-[8px] text-[14px] font-[700]">
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
        {/* 진행 단계 */}
        <ol className="m-0 p-0 list-none mt-[24px] flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-[12px]">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-[8px]">
              {i > 0 && <span className="text-[#ccc]">›</span>}
              <span className={i === ACTIVE_STEP ? 'font-[700] text-[#111]' : 'text-[#aaa]'}>
                {i === ACTIVE_STEP && (
                  <span className="mr-[6px] font-[400]" style={{ color: RED }}>
                    STEP2
                  </span>
                )}
                {label}
              </span>
            </li>
          ))}
        </ol>

        {/* 공연 정보 헤더 */}
        <div className="mt-[16px] flex items-center justify-between border-b border-[#222] pb-[16px]">
          <div>
            <h1 className="m-0 text-[24px] font-[700] leading-[1.25] text-[#111]">
              2026 가을 대동제 아티스트 특별 콘서트
            </h1>
            <p className="m-0 mt-[8px] text-[13px] text-[#666]">
              야외 특설 노천극장
              <span className="mx-[8px] text-[#ccc]">|</span>
              2026.11.06(금) 19:30
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-[4px] border border-[#ccc] px-[12px] py-[6px] text-[12px] font-[500] text-[#444] hover:bg-[#f6f6f6]"
          >
            회차변경
          </button>
        </div>

        {/* 메인 작업 영역 */}
        <section className="mt-[24px] overflow-hidden rounded-[6px] border border-[#ccc] min-[768px]:grid min-[768px]:h-[600px] min-[768px]:grid-cols-[1fr_300px]">
          {/* 좌측 캔버스 */}
          <div className="relative flex min-h-[460px] flex-col justify-between overflow-hidden bg-[#6D727B] p-[16px]">
            <div className="absolute right-[16px] top-[16px] z-20 flex flex-col gap-[4px]">
              {[
                ['전체화면', Maximize2],
                ['확대', ZoomIn],
                ['축소', ZoomOut],
                ['초기화', RotateCw],
              ].map(([title, Icon]) => {
                const I = Icon as typeof Maximize2;
                return (
                  <button
                    key={title as string}
                    type="button"
                    title={title as string}
                    className="flex h-[32px] w-[32px] items-center justify-center rounded-[4px] border border-[rgba(255,255,255,0.25)] bg-[rgba(63,68,76,0.9)] p-0 text-[#fff] hover:bg-[#3D424B]"
                  >
                    <I className="h-[16px] w-[16px]" />
                  </button>
                );
              })}
            </div>

            <div className="mx-auto my-auto flex w-full max-w-[430px] flex-col items-center rounded-[16px] bg-[#fff] p-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
              <div className="mb-[24px] flex h-[40px] w-[224px] items-center justify-center rounded-[12px] bg-[#333] text-[14px] font-[900] tracking-[0.1em] text-[#fff]">
                STAGE
              </div>

              {/* A, B, C, D 4개 구역 버튼 */}
              <div className="mb-[8px] grid w-full grid-cols-2 gap-[12px]">
                {SECTIONS.map((sec) => {
                  const isSelected = selectedSection === sec.id;
                  const count = allocated[sec.id];
                  const seats = selectedSeatsBySection[sec.id] || [];

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleOpenSeatModal(sec.id)}
                      style={isSelected ? { borderColor: sec.colorHex } : undefined}
                      className={`relative flex flex-col items-center justify-center rounded-[10px] border-2 p-[12px] transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#f7f8fa] shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                          : 'border-[#e3e5e8] bg-[#fff] hover:border-[#bbb]'
                      }`}
                    >
                      {count > 0 && (
                        <span className="absolute right-[6px] top-[6px] rounded-full bg-[#E5372B] px-[8px] py-[2px] text-[10px] font-[700] text-[#fff]">
                          {count}석
                        </span>
                      )}

                      <span className="absolute left-[6px] top-[6px] rounded bg-slate-800 px-[5px] py-[1.5px] text-[9px] font-[700] text-[#fff]">
                        좌석선택
                      </span>

                      <span className="mb-[4px] h-[12px] w-[12px] rounded-full" style={{ backgroundColor: sec.colorHex }} />
                      <span className="text-[13px] font-[700] text-[#333]">{sec.label}</span>
                      <span className="text-[10px] text-[#777]">{sec.desc}</span>

                      {seats.length > 0 ? (
                        <span className="mt-[6px] text-[10px] font-bold text-[#E5372B] line-clamp-1">
                          {seats.join(', ')}
                        </span>
                      ) : (
                        <span className="mt-[8px] grid grid-cols-6 gap-[2px] opacity-40">
                          {Array.from({ length: 18 }).map((_, i) => (
                            <span
                              key={i}
                              className="h-[6px] w-[6px] rounded-[1px]"
                              style={{ backgroundColor: sec.colorHex }}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="m-0 mt-[8px] text-center text-[11px] text-[#999]">
                * 원하는 구역을 클릭하면 해당 구역의 <strong>개별 좌석 배치도</strong>가 열립니다.
              </p>
            </div>

            <div className="flex items-center gap-[6px] rounded-[4px] bg-[rgba(82,87,96,0.8)] px-[12px] py-[6px] text-[12px] text-[rgba(255,255,255,0.9)]">
              <span className="text-[#FCD34D]">▲</span>
              직접선택으로 예매 진행이 가능합니다. 구역을 클릭해 좌석을 선택해 주세요.
            </div>
          </div>

          {/* 우측 배분 사이드바 */}
          <aside className="flex flex-col border-t border-[#ccc] bg-[#fff] min-[768px]:min-h-0 min-[768px]:border-l min-[768px]:border-t-0">
            <div className="flex-1 overflow-y-auto p-[16px]">
              <div className="relative mb-[16px] flex h-[128px] items-center justify-center overflow-hidden rounded-[4px] bg-[#5B6069]">
                <div className="flex h-[96px] w-[96px] flex-col items-center justify-center rounded-[8px] bg-[#fff] p-[4px]">
                  <div className="mb-[4px] flex h-[10px] w-[48px] items-center justify-center rounded-[2px] bg-[#333] text-[6px] font-[700] text-[#fff]">
                    STAGE
                  </div>
                  <div className="grid grid-cols-5 gap-[2px] opacity-40">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className="h-[6px] w-[6px] rounded-[1px] bg-[#94a3b8]" />
                    ))}
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-[8px] rounded-[2px] border-2 border-dashed border-[#E5372B]" />
              </div>

              <div className="flex items-center justify-between border-b border-[#222] pb-[8px]">
                <h2 className="m-0 text-[13px] font-[700] text-[#111]">
                  <span className="mr-[6px] font-[400]" style={{ color: RED }}>
                    STEP2
                  </span>
                  구역 선택 및 배분
                </h2>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="flex items-center gap-[4px] rounded-[4px] border border-[#ccc] px-[8px] py-[2px] text-[11px] text-[#666] hover:text-[#111]"
                >
                  <RefreshCw className="h-[10px] w-[10px]" /> 초기화
                </button>
              </div>

              <div className="my-[12px] flex items-center justify-between rounded-[4px] bg-[#f5f5f5] px-[12px] py-[8px] text-[12px]">
                <span className="text-[#666]">남은 제비</span>
                <span className="text-[16px] font-[700] text-[#E5372B]">
                  {remainingBallots} <span className="text-[12px] font-[400] text-[#888]">/ {TOTAL_BALLOTS}장</span>
                </span>
              </div>

              {/* 구역 리스트 */}
              <div className="space-y-[6px]">
                {SECTIONS.map((sec) => {
                  const seats = selectedSeatsBySection[sec.id] || [];

                  return (
                    <div
                      key={sec.id}
                      onClick={() => handleOpenSeatModal(sec.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-[4px] border p-[8px] text-[12px] transition ${
                        selectedSection === sec.id ? 'border-[#111] bg-[#f7f7f7]' : 'border-[#e5e5e5] hover:border-[#bbb]'
                      }`}
                    >
                      <div className="flex items-center gap-[8px]">
                        <span className="h-[12px] w-[12px] rounded-[2px]" style={{ backgroundColor: sec.colorHex }} />
                        <div>
                          <div className="font-[700] text-[#333] flex items-center gap-1.5">
                            {sec.label}
                            <span className="text-[10px] font-normal text-[#3B73E8] underline">
                              (좌석선택)
                            </span>
                          </div>
                          <div className="text-[10px] text-[#888]">
                            {seats.length > 0 ? seats.join(', ') : sec.desc}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-[6px]">
                        <span className="font-bold text-[#E5372B] text-sm tabular-nums">
                          {allocated[sec.id]}석
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-[16px] border-t border-[#eee] pt-[12px]">
                <button
                  type="button"
                  className="flex items-center gap-[4px] text-[11px] text-[#777] hover:underline"
                >
                  <AlertCircle className="h-[14px] w-[14px] text-[#999]" />
                  <span>좌석선정 및 자동배정 안내</span>
                </button>
              </div>
            </div>

            {/* 이전단계 / 다음단계 버튼 바 */}
            <div className="grid grid-cols-2 gap-[8px] border-t border-[#ddd] bg-[#fafafa] p-[12px]">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="h-[44px] rounded-[3px] border border-[#222] bg-[#fff] text-[13px] font-[700] text-[#222] hover:bg-[#f6f6f6]"
              >
                이전단계
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={usedBallots === 0}
                className="h-[44px] rounded-[3px] border-0 bg-[#F0352A] text-[13px] font-[700] text-[#fff] transition hover:bg-[#d92a20] disabled:cursor-not-allowed disabled:bg-[#ccc] cursor-pointer"
              >
                다음단계 ({usedBallots}석 선택됨)
              </button>
            </div>
          </aside>
        </section>
      </main>

      {/* ───── [구역별 동적 좌석 선택 모달] ───── */}
      {mounted && isSeatModalOpen && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '780px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid #D5D8DC',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflow: 'hidden'
            }}
          >
            {/* 팝업 헤더 */}
            <div className="bg-[#1C202B] text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <span 
                  className="text-[10px] font-black px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: activeSectionInfo.colorHex }}
                >
                  {activeSectionInfo.label}
                </span>
                <h3 className="text-sm font-bold tracking-tight">
                  {activeSectionInfo.desc} 좌석 선택 (총 {activeLayout.rows.length * activeLayout.cols.length}석)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 좌석 배치도 본문 */}
            <div className="flex-1 overflow-y-auto p-5 bg-[#525760] flex flex-col items-center">
              <div className="w-64 h-9 bg-[#222] text-white rounded-lg flex items-center justify-center text-xs font-black tracking-widest shadow-inner mb-6 shrink-0">
                STAGE (무대)
              </div>

              {/* 범례 */}
              <div className="bg-white/95 px-4 py-2 rounded-full border border-slate-300 text-[11px] flex items-center gap-5 mb-5 shadow-sm shrink-0">
                <div className="flex items-center gap-1.5">
                  <span 
                    className="w-3.5 h-3.5 rounded-[3px]"
                    style={{ backgroundColor: activeSectionInfo.colorHex }}
                  />
                  <span className="text-slate-700 font-medium">선택가능</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-[3px] bg-[#E5372B] text-white flex items-center justify-center text-[9px] font-bold">
                    ✓
                  </span>
                  <span className="text-slate-700 font-bold">선택좌석</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-[3px] bg-[#CBD5E1]"></span>
                  <span className="text-slate-400">선택불가</span>
                </div>
              </div>

              {/* 동적 좌석 그리드 보드 */}
              <div className="bg-white p-5 rounded-xl shadow-lg border border-slate-300 flex flex-col gap-1.5 overflow-x-auto max-w-full">
                {activeLayout.rows.map((row) => (
                  <div key={row} className="flex items-center gap-1.5 justify-center">
                    <span className="w-6 text-center font-bold text-xs text-slate-500 font-mono">
                      {row}열
                    </span>

                    <div className="flex items-center gap-1.5">
                      {activeLayout.cols.map((col) => {
                        const isAlphabetRow = isNaN(Number(row));
                        const seatId = isAlphabetRow ? `${row}${col}` : `${row}-${col}`;
                        const isOccupied = activeLayout.occupied.has(seatId);
                        const isSelected = currentModalSelectedSeats.includes(seatId);

                        return (
                          <button
                            key={seatId}
                            type="button"
                            disabled={isOccupied}
                            onClick={() => handleSeatToggle(selectedSection, seatId)}
                            title={isOccupied ? `${seatId} (예매불가)` : `${seatId}번 좌석`}
                            className={`w-7 h-7 rounded-[4px] text-[10px] font-bold transition flex items-center justify-center cursor-pointer ${
                              isSelected
                                ? 'bg-[#E5372B] text-white shadow ring-2 ring-red-400'
                                : isOccupied
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'text-white hover:opacity-90 active:scale-95'
                            }`}
                            style={!isSelected && !isOccupied ? { backgroundColor: activeSectionInfo.colorHex } : undefined}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : col}
                          </button>
                        );
                      })}
                    </div>

                    <span className="w-6 text-center font-bold text-xs text-slate-500 font-mono">
                      {row}열
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 하단 제어 바 */}
            <div className="bg-[#FAFBFD] px-5 py-3.5 border-t border-[#D5D8DC] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-700 flex items-center gap-2">
                <span>현재 구역 선택 좌석:</span>
                {currentModalSelectedSeats.length === 0 ? (
                  <span className="text-slate-400 font-medium">선택된 좌석 없음</span>
                ) : (
                  <div className="flex items-center gap-1 flex-wrap">
                    {currentModalSelectedSeats.map((s) => (
                      <span
                        key={s}
                        className="bg-red-50 text-[#E5372B] border border-red-200 px-2 py-0.5 rounded font-bold"
                      >
                        {s}
                      </span>
                    ))}
                    <span className="font-bold text-[#111] ml-1">
                      (해당 구역 {currentModalSelectedSeats.length}석 / 전체 최대 3석)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const nextSelected = {
                      ...selectedSeatsBySection,
                      [selectedSection]: [],
                    };
                    setSelectedSeatsBySection(nextSelected);
                    setAllocated((prev) => ({ ...prev, [selectedSection]: 0 }));
                  }}
                  className="px-3 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  현재 구역 초기화
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSeats}
                  className="flex-1 sm:flex-none px-6 py-2 bg-[#1C202B] hover:bg-black text-white text-xs font-bold rounded transition shadow cursor-pointer"
                >
                  선택 완료
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}