'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { apiFetch, ApiError } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import type { ScanResult, ScanSummary } from '@/types/api';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';

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

function StaffScannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') ?? '';

  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [notStaff, setNotStaff] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lockedRef = useRef<boolean>(false);

  const loadSummary = useCallback(async () => {
    if (!eventId) {
      setLoadingSummary(false);
      setSummaryError('주소 뒤에 ?eventId=공연ID 값이 필요합니다.');
      return;
    }
    try {
      const data = await apiFetch<ScanSummary>(`/api/events/${eventId}/scan/summary`);
      setSummary(data);
      setNotStaff(false);
      setSummaryError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.code === 'NOT_STAFF')) {
        setNotStaff(true);
      } else {
        setSummaryError(err instanceof Error ? err.message : '스캔 요약 정보를 불러오지 못했습니다.');
      }
    } finally {
      setLoadingSummary(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const submitScanCode = useCallback(
    async (rawCode: string) => {
      if (!eventId || lockedRef.current) return;
      const code = rawCode.trim();
      if (!code) return;

      lockedRef.current = true;
      setScanning(true);
      try {
        const res = await apiFetch<ScanResult>('/api/tickets/scan', {
          method: 'POST',
          body: JSON.stringify({ eventId, code }),
        });
        setScanResult(res);
        if (res.result === 'ok') {
          await loadSummary();
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.code === 'NOT_STAFF')) {
          setNotStaff(true);
        } else {
          setScanResult({
            result: 'invalid',
            sectionName: null,
            scannedAt: new Date().toISOString(),
            holderName: null,
            message: err instanceof Error ? err.message : '스캔 판정 요청에 실패했습니다.',
          });
        }
      } finally {
        setScanning(false);
      }
    },
    [eventId, loadSummary],
  );

  // 권한이 확인된 경우에만 카메라를 켬
  useEffect(() => {
    if (loadingSummary || notStaff || !summary || !eventId) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      },
      false,
    );
    scannerRef.current = scanner;

    const onScanSuccess = (decodedText: string) => {
      // 요청 중이거나 이미 결과가 떠 있으면 새로 읽은 QR 무시 ('다음 스캔'을 눌러야 다시 읽음)
      if (lockedRef.current) return;
      submitScanCode(decodedText);
    };

    scanner.render(onScanSuccess, () => {});

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [loadingSummary, notStaff, Boolean(summary), eventId, submitScanCode]);

  const handleNextScan = () => {
    setScanResult(null);
    lockedRef.current = false;
  };

  return (
    <div className="[&_*]:box-border leading-[1.5] min-h-screen bg-[#fff] text-[#222] select-none font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      <style>{SCANNER_CSS}</style>

      {/* 상단 유틸 바 */}
      <div className="bg-[#f4f4f4]">
        <div className="mx-auto flex h-[30px] max-w-[480px] items-center justify-between px-[16px] text-[11px] text-[#555]">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-transparent border-0 p-[0px] [font-family:inherit] flex items-center gap-[2px] text-[11px] text-[#555] hover:text-[#111]"
          >
            <ChevronLeft className="h-[14px] w-[14px]" /> 이전 화면으로
          </button>
          <span className="tabular-nums">STAFF SCANNER</span>
        </div>
      </div>

      {/* 로고 헤더 */}
      <header className="border-b border-[#222]">
        <div className="mx-auto flex h-[60px] max-w-[480px] items-center justify-between px-[16px]">
          <div className="flex items-center gap-[10px]">
            <span className="text-[26px] leading-none tracking-[-0.025em] text-[#111]">
              Fair<span className="font-[900]">Draw</span>
            </span>
            <span className="text-[16px] font-[700] leading-none text-[#111]">입장 스캔</span>
          </div>
          <span className="rounded-full border border-[#E5372B] px-[10px] py-[2px] text-[11px] font-[700] text-[#E5372B]">
            STAFF GATE
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] px-[16px] pb-[48px]">
        {loadingSummary && (
          <div className="mt-[24px] rounded-[6px] border border-[#ddd] p-[24px] text-center text-[13px] text-[#666]">
            스캔 권한 및 공연 요약 정보를 확인하는 중입니다…
          </div>
        )}

        {/* 403 NOT_STAFF: 카메라를 켜지 않고 안내 문구 표시 */}
        {!loadingSummary && notStaff && (
          <section
            role="alert"
            className="mt-[24px] rounded-[8px] border-2 border-rose-300 bg-rose-50 p-[20px] text-center"
          >
            <AlertTriangle className="mx-auto h-[32px] w-[32px] text-rose-600" />
            <p className="m-[0px] mt-[10px] text-[15px] font-[700] text-rose-900">
              이 공연의 스태프가 아닙니다. 주최자에게 휴대폰 번호 등록을 요청하세요
            </p>
            <p className="m-[0px] mt-[6px] text-[12px] text-rose-700">
              주최자가 등록한 휴대폰 번호로 본인 인증을 마친 계정으로 로그인해야 스캔할 수 있습니다.
            </p>
          </section>
        )}

        {!loadingSummary && !notStaff && summaryError && (
          <section
            role="alert"
            className="mt-[24px] rounded-[8px] border border-rose-200 bg-rose-50 p-[16px] text-[13px] font-[600] text-rose-700"
          >
            {summaryError}
          </section>
        )}

        {!loadingSummary && !notStaff && summary && (
          <>
            {/* 공연 제목 및 입장 M / 티켓 N 요약 */}
            <div className="border-b border-[#e5e5e5] py-[14px]">
              <div className="text-[12px] font-[600] text-[#666]">{summary.eventTitle}</div>
              <div className="mt-[6px] flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-[8px] text-[#555]">
                  <span className="tl-pulse h-[8px] w-[8px] rounded-full bg-[#1E9E63]" />
                  {scanning ? '백엔드 판정 요청 중…' : '스캐너 가동 중'}
                </span>
                <span className="font-[700] text-[#222]">
                  입장{' '}
                  <b className="text-[18px] font-[800] tabular-nums text-[#E5372B]">
                    {summary.entered}
                  </b>{' '}
                  / 티켓 <b className="tabular-nums">{summary.issued}</b>
                </span>
              </div>
            </div>

            {/* QR 리더 카메라 영역 */}
            <section className="mt-[20px]">
              <div className="flex items-center justify-between border-b border-[#222] pb-[10px]">
                <h2 className="m-[0px] flex items-center gap-[6px] text-[14px] font-[700] text-[#111]">
                  <Camera className="h-[16px] w-[16px] text-[#3B73E8]" /> QR 리더
                </h2>
                <span className="text-[11px] text-[#888]">백엔드 실시간 검증</span>
              </div>

              <div className="mt-[12px] rounded-[6px] bg-[#1C202B] p-[12px]">
                <div className="overflow-hidden rounded-[4px] bg-[#000]">
                  <div id="qr-reader" className="w-full" />
                </div>
              </div>

              <p className="m-[0px] mt-[10px] text-center text-[12px] text-[#777]">
                관객 모바일의 QR 코드를 사각 영역 안에 비춰주세요.
              </p>
            </section>

            {/* FB-4: 판정 결과 (ok: 초록색 / duplicate: 주황색 / invalid: 빨간색) */}
            {scanResult && (
              <section
                role="status"
                aria-live="polite"
                className={`mt-[20px] rounded-[8px] border-2 p-[16px] ${
                  scanResult.result === 'ok'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
                    : scanResult.result === 'duplicate'
                      ? 'border-amber-400 bg-amber-50 text-amber-950'
                      : 'border-rose-400 bg-rose-50 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-[10px]">
                  {scanResult.result === 'ok' ? (
                    <CheckCircle2 className="mt-[2px] h-[24px] w-[24px] shrink-0 text-emerald-600" />
                  ) : scanResult.result === 'duplicate' ? (
                    <AlertTriangle className="mt-[2px] h-[24px] w-[24px] shrink-0 text-amber-600" />
                  ) : (
                    <XCircle className="mt-[2px] h-[24px] w-[24px] shrink-0 text-rose-600" />
                  )}

                  <div className="flex-1">
                    {scanResult.result === 'ok' && (
                      <>
                        <p className="m-[0px] text-[16px] font-[800] text-emerald-800">
                          입장 확인
                        </p>
                        <dl className="m-[0px] mt-[10px] rounded-[6px] border border-emerald-200 bg-white px-[12px] text-[13px]">
                          <div className="flex items-center justify-between border-b border-stone-100 py-[8px]">
                            <dt className="text-stone-500">구역</dt>
                            <dd className="m-[0px] font-[800] text-stone-900">
                              {scanResult.sectionName ?? '—'}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between py-[8px]">
                            <dt className="text-stone-500">이름</dt>
                            <dd className="m-[0px] flex items-center gap-[4px] font-[800] text-stone-900">
                              <UserCheck className="h-[14px] w-[14px] text-emerald-600" />
                              {scanResult.holderName ?? '—'}
                            </dd>
                          </div>
                        </dl>
                      </>
                    )}

                    {scanResult.result === 'duplicate' && (
                      <>
                        <p className="m-[0px] text-[16px] font-[800] text-amber-800">
                          이미 입장한 티켓
                        </p>
                        <p className="m-[0px] mt-[6px] text-[13px] font-[700] text-amber-900">
                          첫 입장 시각: {formatKst(scanResult.scannedAt)}
                        </p>
                        {scanResult.sectionName && (
                          <p className="m-[0px] mt-[4px] text-[12px] text-amber-800">
                            구역: {scanResult.sectionName} / 이름: {scanResult.holderName ?? '—'}
                          </p>
                        )}
                      </>
                    )}

                    {scanResult.result === 'invalid' && (
                      <p className="m-[0px] text-[15px] font-[800] text-rose-800">
                        {scanResult.message}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextScan}
                  className="[font-family:inherit] mt-[14px] flex h-[44px] w-full cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border-0 bg-[#111] text-[13px] font-[700] text-[#fff] transition hover:bg-[#333]"
                >
                  <RefreshCw className="h-[14px] w-[14px]" /> 다음 스캔
                </button>
              </section>
            )}

            {!scanResult && (
              <section className="mt-[20px] border border-[#ddd] p-[16px]">
                <h3 className="m-[0px] flex items-center gap-[6px] text-[13px] font-[700] text-[#111]">
                  <ShieldCheck className="h-[16px] w-[16px] text-[#3B73E8]" /> 현장 스태프 검표 안내
                </h3>
                <div className="mt-[10px] space-y-[4px] text-[12px] leading-[1.625] text-[#555]">
                  <p className="m-[0px]">* 캡처한 사진(시간이 지난 QR)은 자동으로 무효(빨간색) 판정됩니다.</p>
                  <p className="m-[0px]">* 스캔 결과에 표시되는 가린 이름(예: 홍*동)과 신분증을 대조해 주세요.</p>
                  <p className="m-[0px]">* 결과를 확인한 뒤 반드시 [다음 스캔] 버튼을 눌러 다음 관객을 검표하세요.</p>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function TicketLinkStaffScannerPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[480px] p-8 text-center text-sm text-stone-500">
          입장 스캔 화면을 불러오는 중입니다…
        </div>
      }
    >
      <StaffScannerContent />
    </Suspense>
  );
}
