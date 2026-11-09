'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../lib/api';
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
  HelpCircle,
  ShieldCheck,
  Ticket,
} from 'lucide-react';

interface Section {
  id: string;
  name: string;
  desc: string;
  capacity: number;
  price: string;
  colorHex: string;
}

const SECTIONS: Section[] = [
  { id: 'A', name: 'A구역', desc: '스탠딩 중앙', capacity: 130, price: '무료 (응모)', colorHex: '#4A72B8' },
  { id: 'B', name: 'B구역', desc: '스탠딩 좌측', capacity: 80, price: '무료 (응모)', colorHex: '#52A374' },
  { id: 'C', name: 'C구역', desc: '지정석 중앙', capacity: 96, price: '무료 (응모)', colorHex: '#E28A3B' },
  { id: 'D', name: 'D구역', desc: '지정석 측면', capacity: 36, price: '무료 (응모)', colorHex: '#8C52B5' },
];

const TOTAL_BALLOTS = 3;

const NAV_MAIN = ['뮤지컬', '콘서트', '연극', '클래식·무용', '아동·가족', '전시', '축제·레저', '공연장', '링크ON'];
const NAV_SUB = ['랭킹', '지역', '이벤트', '기획전', 'PAYCO VIP ZONE'];
const STEPS = ['날짜/회차선택', '구역선택 (추첨응모)', '권종/할인/매수선택', '배송선택/예매확인', '결제'];
const ACTIVE_STEP = 1;
const RED = '#E5372B';

export default function EventEnterPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = (params?.id as string) || '1';

  // 구역 id -> 제비 수 (가이드 4번: useState<Record<string, number>>)
  const [allocated, setAllocated] = useState<Record<string, number>>({
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  });

  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAlreadyEntered, setIsAlreadyEntered] = useState<boolean>(false);

  // 배분된 총 제비 수 및 잔여 제비 수
  const usedBallots = Object.values(allocated).reduce((a, b) => a + b, 0);
  const remainingBallots = TOTAL_BALLOTS - usedBallots;

  const handleAdd = (secId: string) => {
    if (usedBallots >= TOTAL_BALLOTS) return;
    setAllocated((prev) => ({
      ...prev,
      [secId]: (prev[secId] || 0) + 1,
    }));
    setErrorMessage('');
  };

  const handleSubtract = (secId: string) => {
    if ((allocated[secId] || 0) <= 0) return;
    setAllocated((prev) => ({
      ...prev,
      [secId]: prev[secId] - 1,
    }));
    setErrorMessage('');
  };

  // 배치도 구역 클릭: 선택 + 제비 1장 추가 (한도 내에서)
  const handleSectionClick = (secId: string) => {
    if (submitting) return;
    setSelectedSection(secId);
    if (usedBallots < TOTAL_BALLOTS) {
      handleAdd(secId);
    }
  };

  const handleResetAll = () => {
    setAllocated({ A: 0, B: 0, C: 0, D: 0 });
    setErrorMessage('');
    setIsAlreadyEntered(false);
  };

  // 응모하기 제출 (POST /api/events/{id}/entries)
  const handleSubmit = async () => {
    if (usedBallots === 0 || submitting) return;

    // 0인 구역을 제외하고 allocations 배열 생성
    const allocations = Object.entries(allocated)
      .filter(([_, count]) => count > 0)
      .map(([sectionId, count]) => ({
        sectionId,
        count,
      }));

    try {
      setSubmitting(true);
      setErrorMessage('');
      setIsAlreadyEntered(false);

      await apiFetch(`/api/events/${eventId}/entries`, {
        method: 'POST',
        body: JSON.stringify({ allocations }),
      });

      // 성공 시 /events/{id}/me 로 이동
      router.push(`/events/${eventId}/me`);
    } catch (err: any) {
      const msg = err.message || '';

      // ALREADY_ENTERED (409)
      if (msg.includes('ALREADY_ENTERED') || msg.includes('409') || msg.includes('이미 응모')) {
        setIsAlreadyEntered(true);
        setErrorMessage('이미 응모했습니다');
      }
      // PHONE_NOT_VERIFIED (403)
      else if (msg.includes('PHONE_NOT_VERIFIED') || msg.includes('403') || msg.includes('전화번호')) {
        alert('휴대폰 본인인증이 완료되지 않았습니다. 인증 화면으로 이동합니다.');
        router.push(`/verify-phone?next=/events/${eventId}/enter`);
      }
      // 기타 백엔드 에러 메시지
      else {
        setErrorMessage(msg || '응모 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff] text-[#222] select-none font-sans">
      {/* ───── 상단 유틸 바 ───── */}
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
            <li className="px-[10px]">
              <Link href={`/events/${eventId}/me`} className="text-inherit hover:underline">
                내 응모 확인
              </Link>
            </li>
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
          <span
            onClick={() => router.push('/')}
            className="text-[34px] leading-none tracking-[-0.025em] text-[#111] cursor-pointer"
          >
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

      {/* ───── 카테고리 메뉴 ───── */}
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
        {/* ───── 가이드 4번: 화면 위에 '남은 제비 2 / 3' 표시 보드 ───── */}
        <div className="mt-[20px] rounded-[8px] bg-gradient-to-r from-slate-900 to-slate-800 p-[16px] text-white shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-[#E5372B] border border-red-500/30">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-300 font-medium">1인당 제비 수량</span>
              <h2 className="text-sm font-bold text-white">원하는 구역에 제비를 나누어 응모하세요</h2>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
            <span className="text-xs text-slate-400 font-medium">남은 제비</span>
            <span className="text-2xl font-black text-[#E5372B] tabular-nums tracking-tight">
              {remainingBallots}
            </span>
            <span className="text-sm text-slate-400 font-bold">/ {TOTAL_BALLOTS}</span>
          </div>
        </div>

        {/* 진행 단계 */}
        <ol className="m-0 p-0 list-none mt-[16px] flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-[12px]">
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
            onClick={() => router.push(`/events/${eventId}`)}
            className="rounded-[4px] border border-[#ccc] px-[12px] py-[6px] text-[12px] font-[500] text-[#444] hover:bg-[#f6f6f6] cursor-pointer"
          >
            공연 상세
          </button>
        </div>

        {/* 메인 작업 영역 */}
        <section className="mt-[24px] overflow-hidden rounded-[6px] border border-[#ccc] min-[768px]:grid min-[768px]:h-[600px] min-[768px]:grid-cols-[1fr_300px]">
          {/* [좌측] 캔버스 영역 */}
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

              {/* A, B, C, D 4개 구역 카드 버튼 */}
              <div className="mb-[8px] grid w-full grid-cols-2 gap-[12px]">
                {SECTIONS.map((sec) => {
                  const isSelected = selectedSection === sec.id;
                  const count = allocated[sec.id] || 0;

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleSectionClick(sec.id)}
                      disabled={submitting}
                      style={isSelected ? { borderColor: sec.colorHex } : undefined}
                      className={`relative flex flex-col items-center justify-center rounded-[10px] border-2 p-[12px] transition cursor-pointer disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-[#f7f8fa] shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                          : 'border-[#e3e5e8] bg-[#fff] hover:border-[#bbb]'
                      }`}
                    >
                      {count > 0 && (
                        <span className="absolute right-[6px] top-[6px] rounded-full bg-[#E5372B] px-[8px] py-[2px] text-[10px] font-[700] text-[#fff]">
                          {count}장
                        </span>
                      )}

                      <span className="mb-[4px] h-[12px] w-[12px] rounded-full" style={{ backgroundColor: sec.colorHex }} />
                      <span className="text-[13px] font-[700] text-[#333]">{sec.name}</span>
                      <span className="text-[10px] text-[#777]">{sec.desc}</span>
                      <span className="mt-[2px] text-[10px] text-[#999]">정원 {sec.capacity}석</span>

                      <span className="mt-[8px] grid grid-cols-6 gap-[2px] opacity-40">
                        {Array.from({ length: 18 }).map((_, i) => (
                          <span
                            key={i}
                            className="h-[6px] w-[6px] rounded-[1px]"
                            style={{ backgroundColor: sec.colorHex }}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="m-0 mt-[8px] text-center text-[11px] text-[#999]">
                * 구역을 클릭하거나 우측 패널의 <strong>+ / - 버튼</strong>으로 제비를 넣으세요.
              </p>
            </div>

            <div className="flex items-center gap-[6px] rounded-[4px] bg-[rgba(82,87,96,0.8)] px-[12px] py-[6px] text-[12px] text-[rgba(255,255,255,0.9)]">
              <span className="text-[#FCD34D]">▲</span>
              총 {TOTAL_BALLOTS}장의 제비를 원하는 구역에 나누어 넣어 당첨 확률을 조율하세요.
            </div>
          </div>

          {/* [우측] 배분 컨트롤 패널 */}
          <aside className="flex flex-col border-t border-[#ccc] bg-[#fff] min-[768px]:min-h-0 min-[768px]:border-l min-[768px]:border-t-0">
            <div className="flex-1 overflow-y-auto p-[16px]">
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
                  disabled={submitting}
                  className="flex items-center gap-[4px] rounded-[4px] border border-[#ccc] px-[8px] py-[2px] text-[11px] text-[#666] hover:text-[#111] disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw className="h-[10px] w-[10px]" /> 초기화
                </button>
              </div>

              {/* 남은 제비 수 표시 바 */}
              <div className="my-[12px] flex items-center justify-between rounded-[4px] bg-[#f5f5f5] px-[12px] py-[8px] text-[12px]">
                <span className="text-[#666]">남은 제비</span>
                <span className="text-[16px] font-[700] text-[#E5372B]">
                  {remainingBallots} <span className="text-[12px] font-[400] text-[#888]">/ {TOTAL_BALLOTS}장</span>
                </span>
              </div>

              {/* 가이드 4번: 구역마다 한 줄 (이름, 정원, 가격, - 0 + 버튼) */}
              <div className="space-y-[6px]">
                {SECTIONS.map((sec) => {
                  const currentCount = allocated[sec.id] || 0;

                  return (
                    <div
                      key={sec.id}
                      onClick={() => setSelectedSection(sec.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-[4px] border p-[8px] text-[12px] transition ${
                        selectedSection === sec.id ? 'border-[#111] bg-[#f7f7f7]' : 'border-[#e5e5e5] hover:border-[#bbb]'
                      }`}
                    >
                      <div className="flex items-center gap-[8px]">
                        <span className="h-[12px] w-[12px] shrink-0 rounded-[2px]" style={{ backgroundColor: sec.colorHex }} />
                        <div>
                          <div className="font-[700] text-[#333]">{sec.name}</div>
                          <div className="text-[10px] text-[#888]">
                            정원 {sec.capacity}석 · {sec.price}
                          </div>
                        </div>
                      </div>

                      {/* - 0 + 조절부 */}
                      <div className="flex items-center gap-[6px]" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSubtract(sec.id)}
                          disabled={currentCount === 0 || submitting}
                          className="flex h-[22px] w-[22px] items-center justify-center rounded-[3px] border border-[#ccc] bg-[#fff] text-[#444] hover:bg-[#f2f2f2] disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                        >
                          <Minus className="h-[12px] w-[12px]" />
                        </button>
                        <span className="w-[16px] text-center text-sm font-bold tabular-nums text-[#E5372B]">
                          {currentCount}
                        </span>
                        {/* 합계가 3장에 도달하면 모든 + 버튼 비활성화 */}
                        <button
                          type="button"
                          onClick={() => handleAdd(sec.id)}
                          disabled={usedBallots >= TOTAL_BALLOTS || submitting}
                          className="flex h-[22px] w-[22px] items-center justify-center rounded-[3px] bg-[#222] text-[#fff] hover:bg-[#000] disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                        >
                          <Plus className="h-[12px] w-[12px]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 안내 설명 */}
              <div className="mt-[16px] border-t border-[#eee] pt-[12px] text-[11px] text-[#777] space-y-[4px]">
                <div className="flex items-center gap-[4px] font-[700] text-[#555]">
                  <HelpCircle className="h-[14px] w-[14px] text-[#999]" />
                  제비 배분 규칙
                </div>
                <p className="m-0">• 한 구역에 3장을 몰아서 응모하거나 여러 구역에 쪼갤 수 있습니다.</p>
                <p className="m-0">• 제비가 많은 구역일수록 당첨 확률이 올라갑니다.</p>
                <p className="m-0">• 응모 완료 후 '내 응모'에서 취소 및 재응모가 가능합니다.</p>
              </div>
            </div>

            {/* ───── 가이드 4번: 버튼 위 빨간 글씨 에러 노출 ───── */}
            {errorMessage && (
              <div className="mx-[12px] mb-[8px] flex items-center justify-between rounded-[4px] border border-red-200 bg-red-50 p-[8px] text-[11px] font-bold text-[#E5372B]">
                <div className="flex items-center gap-[6px]">
                  <AlertCircle className="h-[14px] w-[14px] shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                {isAlreadyEntered && (
                  <Link
                    href={`/events/${eventId}/me`}
                    className="ml-[8px] whitespace-nowrap underline underline-offset-2 hover:text-red-800"
                  >
                    내 응모 보기 →
                  </Link>
                )}
              </div>
            )}

            {/* ───── 가이드 4번: '응모하기' 버튼 및 제어 바 ───── */}
            <div className="border-t border-[#ddd] bg-[#fafafa] p-[12px]">
              <div className="grid grid-cols-2 gap-[8px]">
                <button
                  type="button"
                  onClick={() => router.push(`/events/${eventId}`)}
                  className="h-[44px] rounded-[3px] border border-[#222] bg-[#fff] text-[13px] font-[700] text-[#222] hover:bg-[#f6f6f6] cursor-pointer"
                >
                  이전단계
                </button>
                {/* 합계가 0이면 '응모하기' 비활성화, 요청 중에는 disabled={submitting} */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={usedBallots === 0 || submitting}
                  className="h-[44px] rounded-[3px] border-0 bg-[#F0352A] text-[13px] font-[700] text-[#fff] transition hover:bg-[#d92a20] disabled:cursor-not-allowed disabled:bg-[#ccc] cursor-pointer"
                >
                  {submitting
                    ? '응모 등록 중...'
                    : usedBallots === 0
                    ? '응모하기'
                    : `총 ${usedBallots}장 응모하기`}
                </button>
              </div>
              <div className="mt-[8px] flex items-center justify-center gap-[4px] text-[10px] text-[#aaa]">
                <ShieldCheck className="h-[12px] w-[12px] text-[#3B73E8]" />
                <span>Fair Draw 위변조 방지 봉인 프로토콜 적용</span>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}