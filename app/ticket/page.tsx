'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth';
import { ChevronLeft, ShieldCheck, Clock, AlertTriangle, User, Share2 } from 'lucide-react';

// 상태 점 깜빡임 애니메이션
const PAGE_CSS = `
@keyframes tlPulse { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
.tl-pulse { animation: tlPulse 2s ease-in-out infinite; }
`;

export default function TicketLinkMobileTicketPage() {
  const router = useRouter();

  // 모의 티켓 데이터
  const ticketInfo = {
    eventName: '2026 가을 대동제 아티스트 특별 콘서트',
    round: '2회차 (메인 피날레)',
    dateTime: '2026.11.06(금) 19:30',
    venue: '노천극장 야외 특설무대',
    section: '1층 A구역 (스탠딩 중앙)',
    seatNumber: '입장번호 14번',
    userName: '홍길동',
    ticketId: 'TL-2026-89412',
    secretKey: 'JBSWY3DPEHPK3PXP', // TOTP 생성용 비밀키
  };

  const [token, setToken] = useState<string>('000000');
  const [timeLeft, setTimeLeft] = useState<number>(30);

  useEffect(() => {
    // 1. TOTP 인스턴스 생성 (30초 주기, 6자리 숫자)
    const totp = new OTPAuth.TOTP({
      issuer: 'TicketLink-FairDraw',
      label: ticketInfo.userName,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(ticketInfo.secretKey),
    });

    // 2. 1초마다 남은 시간 계산 및 30초마다 코드 갱신
    const updateToken = () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const remaining = 30 - (nowInSeconds % 30);

      setTimeLeft(remaining);
      setToken(totp.generate());
    };

    updateToken();
    const interval = setInterval(updateToken, 1000);

    return () => clearInterval(interval);
  }, [ticketInfo.secretKey, ticketInfo.userName]);

  // QR 데이터 (30초마다 토큰이 바뀔 때만 QR 코드 변경)
  const qrPayload = JSON.stringify({
    ticketId: ticketInfo.ticketId,
    token: token,
  });

  const urgent = timeLeft <= 5;

  const infoRows: [string, string, string][] = [
    ['공연일시', ticketInfo.dateTime, 'text-[#222]'],
    ['회차', ticketInfo.round, 'text-[#222]'],
    ['장소', ticketInfo.venue, 'text-[#222]'],
    ['구역', ticketInfo.section, 'text-[#E5372B]'],
    ['입장번호', ticketInfo.seatNumber, 'text-[#E5372B]'],
  ];

  return (
    <div className="[&_*]:box-border leading-[1.5] min-h-screen bg-[#f4f4f4] text-[#222] select-none font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      <style>{PAGE_CSS}</style>

      {/* ───── 상단 유틸 바 ───── */}
      <div className="bg-[#ebebeb]">
        <div className="mx-auto flex h-[30px] max-w-[480px] items-center justify-between px-[16px] text-[11px] text-[#555]">
          <button
            type="button"
            onClick={() => router.push('/apply')}
            className="bg-transparent border-0 p-[0px] [font-family:inherit] flex items-center gap-[2px] text-[11px] text-[#555] hover:text-[#111]"
          >
            <ChevronLeft className="h-[14px] w-[14px]" /> 이전으로
          </button>
          <button
            type="button"
            aria-label="공유"
            onClick={() => alert('본 티켓은 암표 방지를 위해 선물 및 양도가 제한됩니다.')}
            className="bg-transparent border-0 p-[0px] flex items-center text-[#555] hover:text-[#111]"
          >
            <Share2 className="h-[14px] w-[14px]" />
          </button>
        </div>
      </div>

      {/* ───── 로고 헤더 ───── */}
      <header className="border-b border-[#222] bg-[#fff]">
        <div className="mx-auto flex h-[60px] max-w-[480px] items-center px-[16px]">
          <div className="flex items-center gap-[10px]">
            <span className="text-[26px] leading-none tracking-[-0.025em] text-[#111]">
              ticket<span className="font-[900]">LINK</span>
            </span>
            <span className="text-[16px] font-[700] leading-none text-[#111]">스마트티켓</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] px-[16px] py-[20px]">
        <article className="rounded-[6px] border border-[#ccc] bg-[#fff] shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
          {/* 예매번호 / 상태 */}
          <div className="flex items-center justify-between border-b border-[#eee] px-[20px] py-[12px] text-[12px]">
            <span className="text-[#666]">
              예매번호 <b className="ml-[4px] font-[700] tabular-nums text-[#222]">{ticketInfo.ticketId}</b>
            </span>
            <span className="flex items-center gap-[6px] rounded-full border border-[#2D8FD5] px-[10px] py-[2px] text-[11px] font-[700] text-[#2D8FD5]">
              <span className="tl-pulse h-[6px] w-[6px] rounded-full bg-[#2D8FD5]" />
              입장 가능
            </span>
          </div>

          {/* 공연 / 좌석 정보 */}
          <div className="px-[20px] pb-[8px] pt-[20px]">
            <span className="inline-block rounded-[3px] bg-[#E5372B] px-[8px] py-[2px] text-[10px] font-[900] text-[#fff]">
              추첨 당첨 확정
            </span>
            <h1 className="m-[0px] mt-[10px] border-b border-[#222] pb-[14px] text-[20px] font-[700] leading-[1.35] text-[#111]">
              {ticketInfo.eventName}
            </h1>

            <dl className="m-[0px]">
              {infoRows.map(([k, v, color]) => (
                <div key={k} className="flex border-b border-[#eee] py-[10px] text-[13px]">
                  <dt className="w-[72px] shrink-0 text-[#777]">{k}</dt>
                  <dd className={`m-[0px] font-[700] ${color}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 절취선 */}
          <div className="relative my-[8px] h-[18px]">
            <span className="absolute -left-[1px] top-[0px] h-[18px] w-[9px] rounded-r-full border border-l-0 border-[#ccc] bg-[#f4f4f4]" />
            <span className="absolute -right-[1px] top-[0px] h-[18px] w-[9px] rounded-l-full border border-r-0 border-[#ccc] bg-[#f4f4f4]" />
            <div className="absolute inset-x-[16px] top-[9px] border-t-2 border-dashed border-[#ddd]" />
          </div>

          {/* 30초 동적 QR + OTP */}
          <div className="flex flex-col items-center px-[20px] pb-[20px] pt-[8px]">
            <div className="flex flex-col items-center rounded-[6px] border-2 border-[#111] bg-[#fff] p-[16px]">
              <QRCodeSVG value={qrPayload} size={180} level="H" includeMargin={false} />
              <div className="mt-[12px] font-['ui-monospace','SFMono-Regular','Menlo','Consolas',monospace] text-[26px] font-[900] tracking-[0.15em] text-[#111]">
                {token}
              </div>
            </div>

            {/* 카운트다운 */}
            <div className="mt-[16px] w-full max-w-[260px]">
              <div className="mb-[6px] flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-[4px] text-[#666]">
                  <Clock className="h-[14px] w-[14px] text-[#3B73E8]" /> QR 유효시간
                </span>
                <span
                  className={`font-[700] tabular-nums ${urgent ? 'text-[#E5372B]' : 'text-[#3B73E8]'}`}
                >
                  00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                </span>
              </div>
              <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#eaeaea]">
                <div
                  className={`h-full ${urgent ? 'bg-[#E5372B]' : 'bg-[#3B73E8]'}`}
                  style={{ width: `${(timeLeft / 30) * 100}%`, transition: 'width 1s linear' }}
                />
              </div>
            </div>

            {/* 관람자 확인 */}
            <div className="mt-[20px] flex w-full items-center justify-between rounded-[4px] border border-[#ddd] px-[12px] py-[10px] text-[12px]">
              <span className="flex items-center gap-[8px] text-[#444]">
                <User className="h-[16px] w-[16px] text-[#666]" />
                관람자 성명 <b className="font-[700] text-[#111]">{ticketInfo.userName}</b>
              </span>
              <span className="rounded-full border border-[#E5372B] px-[8px] py-[1px] text-[10px] font-[700] text-[#E5372B]">
                신분증 지참 필수
              </span>
            </div>

            {/* 캡처 방지 경고 */}
            <div className="mt-[12px] flex w-full items-start gap-[8px] border border-[#F3C6C2] bg-[#FDF3F2] px-[12px] py-[10px]">
              <AlertTriangle className="mt-[2px] h-[14px] w-[14px] shrink-0 text-[#E5372B]" />
              <p className="m-[0px] text-[12px] leading-[1.5] text-[#D3342A]">
                <b className="font-[700]">화면 캡처본 사용 불가:</b> 본 QR은 30초마다 새로 갱신됩니다. 스크린샷
                이미지로는 입장할 수 없으며 현장에서 모바일 웹을 켠 상태로 인증받아야 합니다.
              </p>
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-center gap-[6px] border-t border-[#eee] py-[12px] text-[11px] text-[#888]">
            <ShieldCheck className="h-[16px] w-[16px] text-[#3B73E8]" />
            <span>Fair Draw 공정 추첨 인증 티켓</span>
          </div>
        </article>
      </main>
    </div>
  );
}