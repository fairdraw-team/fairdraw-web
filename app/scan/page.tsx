'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as OTPAuth from 'otpauth';
import { CheckCircle2, XCircle, ChevronLeft, Camera, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react';

// html5-qrcode가 직접 그리는 버튼/선택창을 티켓링크 톤으로 맞추고, 상태 점 깜빡임을 정의합니다.
const SCANNER_CSS = `
@keyframes tlPulse { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
.tl-pulse { animation: tlPulse 2s ease-in-out infinite; }
#qr-reader { border: 0 !important; width: 100%; color: #ddd; font-family: inherit; }
#qr-reader__scan_region { background: #000; }
#qr-reader__scan_region img { margin: 0 auto; }
#qr-reader__dashboard { padding: 12px 8px !important; }
#qr-reader__dashboard_section_csr span { color: #ddd; font-size: 12px; }
#qr-reader button {
  background: #333; color: #fff; border: 0; border-radius: 3px;
  padding: 9px 16px; margin: 4px; font-size: 12px; font-weight: 700;
  font-family: inherit; cursor: pointer;
}
#qr-reader button:hover { background: #4a4a4a; }
#html5-qrcode-button-camera-permission,
#html5-qrcode-button-camera-start { background: #F0352A !important; }
#html5-qrcode-button-camera-permission:hover,
#html5-qrcode-button-camera-start:hover { background: #d92a20 !important; }
#qr-reader select {
  font-size: 12px; padding: 5px 8px; border-radius: 3px;
  border: 1px solid #ccc; max-width: 100%; margin: 4px;
}
#qr-reader a { color: #9DB8F5; font-size: 12px; }
`;

export default function TicketLinkStaffScannerPage() {
  const router = useRouter();

  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'fail' | null;
    message: string;
    details?: {
      ticketId: string;
      token: string;
      section: string;
      name: string;
      seatNumber: string;
    };
  }>({ status: null, message: '' });

  const [verifiedCount, setVerifiedCount] = useState<number>(142); // 입장 완료 모의 카운트
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // 티켓 비밀키 (관객 페이지의 secretKey와 동일한 값)
  const TICKET_SECRET = 'JBSWY3DPEHPK3PXP';

  useEffect(() => {
    // 1. html5-qrcode 스캐너 초기화
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      },
      false
    );
    scannerRef.current = scanner;

    // 2. QR 코드 인식 성공 시 처리
    const onScanSuccess = (decodedText: string) => {
      try {
        const parsed = JSON.parse(decodedText);
        const { ticketId, token } = parsed;

        if (!ticketId || !token) {
          throw new Error('유효하지 않은 티켓 형식입니다.');
        }

        // 3. TOTP 일치 여부 검증
        const totp = new OTPAuth.TOTP({
          issuer: 'TicketLink-FairDraw',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(TICKET_SECRET),
        });

        // 30초 시간 오차(window: 1) 허용 검증
        const delta = totp.validate({ token: token, window: 1 });

        if (delta !== null) {
          setScanResult({
            status: 'success',
            message: '정상 티켓 인증 완료 (입장 승인)',
            details: {
              ticketId,
              token,
              section: '1층 A구역 (스탠딩 중앙)',
              seatNumber: '입장번호 14번',
              name: '홍길동',
            },
          });
          setVerifiedCount((prev) => prev + 1);

          if (typeof window !== 'undefined' && window.navigator.vibrate) {
            window.navigator.vibrate(200);
          }
        } else {
          setScanResult({
            status: 'fail',
            message: '인증 실패: 유효시간이 만료되었거나 캡처된 가짜 코드입니다.',
          });
        }
      } catch (err) {
        setScanResult({
          status: 'fail',
          message: '지원하지 않는 QR 코드이거나 위조된 티켓입니다.',
        });
      }
    };

    scanner.render(onScanSuccess, () => {});

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  const handleReset = () => {
    setScanResult({ status: null, message: '' });
  };

  const isSuccess = scanResult.status === 'success';

  return (
    <div className="[&_*]:box-border leading-[1.5] min-h-screen bg-[#fff] text-[#222] select-none font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      <style>{SCANNER_CSS}</style>

      {/* ───── 상단 유틸 바 ───── */}
      <div className="bg-[#f4f4f4]">
        <div className="mx-auto flex h-[30px] max-w-[480px] items-center justify-between px-[16px] text-[11px] text-[#555]">
          <button
            type="button"
            onClick={() => router.push('/ticket')}
            className="bg-transparent border-0 p-[0px] [font-family:inherit] flex items-center gap-[2px] text-[11px] text-[#555] hover:text-[#111]"
          >
            <ChevronLeft className="h-[14px] w-[14px]" /> 내 티켓으로
          </button>
          <span className="tabular-nums">GATE 01</span>
        </div>
      </div>

      {/* ───── 로고 헤더 ───── */}
      <header className="border-b border-[#222]">
        <div className="mx-auto flex h-[60px] max-w-[480px] items-center justify-between px-[16px]">
          <div className="flex items-center gap-[10px]">
            <span className="text-[26px] leading-none tracking-[-0.025em] text-[#111]">
              ticket<span className="font-[900]">LINK</span>
            </span>
            <span className="text-[16px] font-[700] leading-none text-[#111]">검표</span>
          </div>
          <span className="rounded-full border border-[#E5372B] px-[10px] py-[2px] text-[11px] font-[700] text-[#E5372B]">
            STAFF GATE
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] px-[16px] pb-[48px]">
        {/* ───── 게이트 현황 ───── */}
        <div className="flex items-center justify-between border-b border-[#e5e5e5] py-[14px] text-[13px]">
          <span className="flex items-center gap-[8px] text-[#555]">
            <span className="tl-pulse h-[8px] w-[8px] rounded-full bg-[#1E9E63]" />
            스캐너 가동 중
          </span>
          <span className="text-[#555]">
            누적 입장 <b className="text-[18px] font-[700] tabular-nums text-[#E5372B]">{verifiedCount}</b>명
          </span>
        </div>

        {/* ───── QR 리더 ───── */}
        <section className="mt-[20px]">
          <div className="flex items-center justify-between border-b border-[#222] pb-[10px]">
            <h2 className="m-[0px] flex items-center gap-[6px] text-[14px] font-[700] text-[#111]">
              <Camera className="h-[16px] w-[16px] text-[#3B73E8]" /> QR 리더
            </h2>
            <span className="text-[11px] text-[#888]">30초 OTP 동적 검증</span>
          </div>

          <div className="mt-[12px] rounded-[6px] bg-[#1C202B] p-[12px]">
            <div className="overflow-hidden rounded-[4px] bg-[#000]">
              <div id="qr-reader" className="w-full" />
            </div>
          </div>

          <p className="m-[0px] mt-[10px] text-center text-[12px] text-[#777]">
            관객 모바일의 동적 QR 코드를 사각 영역 안에 비춰주세요.
          </p>
        </section>

        {/* ───── 검증 결과 ───── */}
        {scanResult.status && (
          <section
            role="status"
            aria-live="polite"
            className={`mt-[20px] rounded-[6px] border p-[16px] ${
              isSuccess ? 'border-[#BFE8D2] bg-[#EFFAF4]' : 'border-[#F3C6C2] bg-[#FDF3F2]'
            }`}
          >
            <div className="flex items-start gap-[10px]">
              {isSuccess ? (
                <CheckCircle2 className="mt-[2px] h-[24px] w-[24px] shrink-0 text-[#1E9E63]" />
              ) : (
                <XCircle className="mt-[2px] h-[24px] w-[24px] shrink-0 text-[#E5372B]" />
              )}

              <div className="flex-1">
                <p
                  className={`m-[0px] text-[14px] font-[700] leading-[1.4] ${
                    isSuccess ? 'text-[#14724A]' : 'text-[#D3342A]'
                  }`}
                >
                  {scanResult.message}
                </p>

                {scanResult.details && (
                  <dl className="m-[0px] mt-[12px] rounded-[4px] border border-[#D5EEDF] bg-[#fff] px-[12px] text-[12px]">
                    {[
                      ['예매 번호', scanResult.details.ticketId, 'text-[#222]'],
                      ['지정 구역', scanResult.details.section, 'text-[#3B73E8]'],
                      ['입장 번호', scanResult.details.seatNumber, 'text-[#E5372B]'],
                    ].map(([k, v, color]) => (
                      <div key={k} className="flex items-center justify-between border-b border-[#eee] py-[8px]">
                        <dt className="text-[#888]">{k}</dt>
                        <dd className={`m-[0px] font-[700] ${color}`}>{v}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-[8px]">
                      <dt className="text-[#888]">관람자 성명</dt>
                      <dd className="m-[0px] flex items-center gap-[4px] font-[700] text-[#222]">
                        <UserCheck className="h-[14px] w-[14px] text-[#1E9E63]" />
                        {scanResult.details.name} (신분증 일치 확인)
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className={`[font-family:inherit] mt-[14px] flex h-[44px] w-full items-center justify-center gap-[6px] rounded-[3px] border-0 text-[13px] font-[700] text-[#fff] transition ${
                isSuccess ? 'bg-[#111] hover:bg-[#333]' : 'bg-[#F0352A] hover:bg-[#d92a20]'
              }`}
            >
              <RefreshCw className="h-[14px] w-[14px]" /> 다음 관객 검표하기
            </button>
          </section>
        )}

        {/* ───── 현장 보안 수칙 ───── */}
        {!scanResult.status && (
          <section className="mt-[20px] border border-[#ddd] p-[16px]">
            <h3 className="m-[0px] flex items-center gap-[6px] text-[13px] font-[700] text-[#111]">
              <ShieldCheck className="h-[16px] w-[16px] text-[#3B73E8]" /> 현장 스태프 보안 수칙
            </h3>
            <div className="mt-[10px] space-y-[4px] text-[12px] leading-[1.625] text-[#555]">
              <p className="m-[0px]">* 캡처본(스크린샷) 제시 시 즉시 입장이 불허됩니다.</p>
              <p className="m-[0px]">* 실시간 타이머 게이지가 작동 중인 스마트티켓 화면만 유효합니다.</p>
              <p className="m-[0px]">* 예매자 본인 실명 신분증과 화면의 이름을 반드시 대조해 주세요.</p>
            </div>
          </section>
        )}
      </main>

      {/* ───── 푸터 ───── */}
      <footer className="border-t border-[#e5e5e5]">
        <div className="mx-auto flex max-w-[480px] items-center justify-between px-[16px] py-[12px] text-[11px] text-[#999]">
          <span>Ticketlink Entry Verification</span>
          <span className="tabular-nums">v1.0.4-live</span>
        </div>
      </footer>
    </div>
  );
}