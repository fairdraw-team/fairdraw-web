'use client';

import { Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Section {
  id: string;
  label: string; // 예: A구역
  desc: string; // 예: 스탠딩 중앙
  colorHex: string;
}

const SECTIONS: Section[] = [
  { id: 'A', label: 'A구역', desc: '스탠딩 중앙', colorHex: '#4A72B8' },
  { id: 'B', label: 'B구역', desc: '스탠딩 좌측', colorHex: '#52A374' },
  { id: 'C', label: 'C구역', desc: '지정석 중앙', colorHex: '#E28A3B' },
  { id: 'D', label: 'D구역', desc: '지정석 측면', colorHex: '#8C52B5' },
];

const TOTAL_BALLOTS = 3;

const NAV_MAIN = ['뮤지컬', '콘서트', '연극', '클래식·무용', '아동·가족', '전시', '축제·레저', '공연장', '링크ON'];
const NAV_SUB = ['랭킹', '지역', '이벤트', '기획전', 'PAYCO VIP ZONE'];
const STEPS = ['날짜/회차선택', '구역선택 (추첨응모)', '권종/할인/매수선택', '배송선택/예매확인', '결제'];
const ACTIVE_STEP = 3;
const RED = '#E5372B';

const SUMMARY: [string, string][] = [
  ['공연명', '2026 가을 대동제 아티스트 특별 콘서트'],
  ['공연일시', '2026.11.06(금) 19:30 (2회차 · 메인 피날레)'],
  ['장소', '야외 특설 노천극장'],
  ['응모번호', 'TL-2026-89412'],
  ['응모방식', '추첨제 (선착순 아님)'],
];

const NOTICES = [
  '본 공연은 선착순이 아닌 추첨제로 진행되며, 마감 전 응모 시 당첨 확률은 동일합니다.',
  '응모권은 1인 최대 3장까지 신청할 수 있습니다.',
  '구역은 응모 내역을 기준으로 추첨되며, 결과에 따라 배정됩니다.',
  '당첨 시 스마트티켓은 [내 티켓]에서 확인할 수 있습니다.',
];

function ConfirmContent() {
  const router = useRouter();
  const params = useSearchParams();

  // /confirm?A=2&C=1 처럼 넘어온 구역별 제비 장수를 읽습니다.
  const rows = SECTIONS.map((sec) => ({
    ...sec,
    count: Math.max(0, parseInt(params.get(sec.id) ?? '0', 10) || 0),
  })).filter((r) => r.count > 0);
  const total = rows.reduce((sum, r) => sum + r.count, 0);

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

      {/* ───── 로고 / 검색 ───── */}
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
            className="border-0 p-[0px] [font-family:inherit] w-full bg-transparent outline-none placeholder:text-[#999]"
            placeholder="검색어를 입력해 주세요."
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
        {/* ───── 진행 단계 ───── */}
        <ol className="m-[0px] p-[0px] list-none mt-[24px] flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-[12px]">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-[8px]" aria-current={i === ACTIVE_STEP ? 'step' : undefined}>
              {i > 0 && <span className="text-[#ccc]">›</span>}
              <span className={i === ACTIVE_STEP ? 'font-[700] text-[#111]' : 'text-[#aaa]'}>
                {i === ACTIVE_STEP && (
                  <span className="mr-[6px] font-[400]" style={{ color: RED }}>
                    STEP4
                  </span>
                )}
                {label}
              </span>
            </li>
          ))}
        </ol>

        {/* ───── 응모 완료 안내 ───── */}
        <section className="flex flex-col items-center border-b border-[#222] pb-[32px] pt-[40px] text-center">
          <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#E5372B] text-[#fff]">
            <Check className="h-[30px] w-[30px] stroke-[3]" />
          </span>
          <h1 className="m-[0px] mt-[16px] text-[28px] font-[700] leading-[1.25] text-[#111]">응모가 완료되었습니다</h1>
          <p className="m-[0px] mt-[8px] text-[13px] text-[#666]">
            추첨 결과는 응모 마감 후 안내되며, 당첨 시 스마트티켓이 발급됩니다.
          </p>
        </section>

        {/* ───── 응모 내역 + 안내 ───── */}
        <section className="mt-[24px] overflow-hidden rounded-[6px] border border-[#ccc] min-[768px]:grid min-[768px]:grid-cols-[1fr_300px]">
          {/* 좌: 응모 내역 */}
          <div className="p-[24px]">
            <h2 className="m-[0px] border-b border-[#222] pb-[10px] text-[14px] font-[700] text-[#111]">응모 내역</h2>
            <dl className="m-[0px]">
              {SUMMARY.map(([k, v]) => (
                <div key={k} className="flex border-b border-[#eee] py-[10px] text-[13px]">
                  <dt className="w-[80px] shrink-0 text-[#777]">{k}</dt>
                  <dd className="m-[0px] font-[700] text-[#222]">{v}</dd>
                </div>
              ))}
            </dl>

            <h2 className="m-[0px] mt-[28px] border-b border-[#222] pb-[10px] text-[14px] font-[700] text-[#111]">
              구역별 배분
            </h2>

            {rows.length > 0 ? (
              <>
                <div className="flex items-center justify-between border-b border-[#ddd] py-[8px] text-[11px] text-[#777]">
                  <span>구역</span>
                  <span>제비 장수</span>
                </div>
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-[#eee] py-[12px] text-[13px]">
                    <span className="flex items-center gap-[8px]">
                      <span className="h-[12px] w-[12px] rounded-[2px]" style={{ backgroundColor: r.colorHex }} />
                      <b className="font-[700] text-[#222]">{r.label}</b>
                      <span className="text-[11px] text-[#888]">{r.desc}</span>
                    </span>
                    <b className="font-[700] tabular-nums text-[#222]">{r.count}장</b>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-[#f5f5f5] px-[12px] py-[12px] text-[13px]">
                  <span className="text-[#666]">합계</span>
                  <span className="text-[16px] font-[700] tabular-nums text-[#E5372B]">
                    {total}
                    <span className="text-[12px] font-[400] text-[#888]"> / {TOTAL_BALLOTS}장</span>
                  </span>
                </div>
              </>
            ) : (
              <div className="py-[40px] text-center text-[13px] text-[#888]">
                <p className="m-[0px]">응모 내역이 없습니다.</p>
                <button
                  type="button"
                  onClick={() => router.push('/apply')}
                  className="bg-transparent border-0 p-[0px] [font-family:inherit] mt-[8px] text-[12px] font-[500] text-[#222] underline underline-offset-2"
                >
                  구역 선택으로 돌아가기
                </button>
              </div>
            )}
          </div>

          {/* 우: 안내 + 버튼 */}
          <aside className="flex flex-col justify-between border-t border-[#ccc] bg-[#f5f5f5] p-[24px] min-[768px]:border-l min-[768px]:border-t-0">
            <div>
              <h2 className="m-[0px] border-b border-[#222] pb-[10px] text-[14px] font-[700] text-[#111]">응모 안내</h2>
              <ul className="m-[0px] p-[0px] list-none mt-[12px] space-y-[8px] text-[12px] leading-[1.625] text-[#555]">
                {NOTICES.map((n) => (
                  <li key={n}>* {n}</li>
                ))}
              </ul>
            </div>

            <div className="mt-[24px] grid grid-cols-2 gap-[8px]">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="[font-family:inherit] h-[44px] rounded-[3px] border border-[#222] bg-[#fff] text-[13px] font-[700] text-[#222] hover:bg-[#f6f6f6]"
              >
                홈으로
              </button>
              <button
                type="button"
                onClick={() => router.push('/ticket')}
                className="[font-family:inherit] h-[44px] rounded-[3px] border-0 bg-[#F0352A] text-[13px] font-[700] text-[#fff] transition hover:bg-[#d92a20]"
              >
                내 티켓 보기
              </button>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

// useSearchParams는 Suspense 경계 안에서 사용해야 빌드 오류가 나지 않습니다.
export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  );
}