'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { apiFetch, ApiError } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import type { ScanResult, ScanSummary } from '@/types/api';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';

const SCANNER_CSS = `
#qr-reader { border: 0 !important; width: 100%; color: #E5E8EB; font-family: inherit; }
#qr-reader__scan_region { background: #111827; }
#qr-reader__scan_region img { margin: 0 auto; }
#qr-reader__dashboard { padding: 12px 8px !important; }
#qr-reader__dashboard_section_csr span { color: #D1D6DB; font-size: 12px; }
#qr-reader button {
  background: #333D4B; color: #fff; border: 0; border-radius: 6px;
  padding: 8px 14px; margin: 4px; font-size: 12px; font-weight: 500;
  font-family: inherit; cursor: pointer;
}
#qr-reader button:hover { background: #4E5968; }
#html5-qrcode-button-camera-permission,
#html5-qrcode-button-camera-start { background: #1B64DA !important; }
#html5-qrcode-button-camera-permission:hover,
#html5-qrcode-button-camera-start:hover { background: #1554BD !important; }
#qr-reader select {
  font-size: 12px; padding: 5px 8px; border-radius: 6px;
  border: 1px solid #D1D6DB; max-width: 100%; margin: 4px; color: #191F28;
}
#qr-reader a { color: #93C5FD; font-size: 12px; }
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
      const data = await apiFetch<ScanSummary>(
        `/api/events/${eventId}/scan/summary`,
      );
      setSummary(data);
      setNotStaff(false);
      setSummaryError(null);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 403 || err.code === 'NOT_STAFF')
      ) {
        setNotStaff(true);
      } else {
        setSummaryError(
          err instanceof Error
            ? err.message
            : '스캔 요약 정보를 불러오지 못했습니다.',
        );
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
        if (
          err instanceof ApiError &&
          (err.status === 403 || err.code === 'NOT_STAFF')
        ) {
          setNotStaff(true);
        } else {
          setScanResult({
            result: 'invalid',
            sectionName: null,
            scannedAt: new Date().toISOString(),
            holderName: null,
            message:
              err instanceof Error
                ? err.message
                : '스캔 판정 요청에 실패했습니다.',
          });
        }
      } finally {
        setScanning(false);
      }
    },
    [eventId, loadSummary],
  );

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
    <div className="min-h-screen bg-[#F7F8FA] text-[#191F28] antialiased select-none font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      <style>{SCANNER_CSS}</style>

      <header className="border-b border-[#E5E8EB] bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[#6B7684] transition-colors hover:text-[#191F28]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>이전</span>
            </button>
            <span className="h-3.5 w-px bg-[#E5E8EB]" aria-hidden="true" />
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[#191F28] text-[10px] font-bold text-white">
                F
              </span>
              <span className="text-sm font-semibold text-[#191F28]">
                입장 검표
              </span>
            </div>
          </div>
          <span className="rounded border border-[#E5E8EB] bg-[#F7F8FA] px-2 py-0.5 text-[11px] font-medium text-[#4E5968]">
            스태프 전용
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-5">
        {loadingSummary && (
          <div className="rounded-lg border border-[#E5E8EB] bg-white p-8 text-center text-xs text-[#6B7684]">
            스캔 권한 및 공연 요약 정보를 확인하는 중입니다…
          </div>
        )}

        {!loadingSummary && notStaff && (
          <section
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-center"
          >
            <AlertTriangle
              className="mx-auto h-7 w-7 text-rose-600"
              aria-hidden="true"
            />
            <p className="mt-2.5 text-sm font-semibold text-rose-900">
              이 공연의 스태프가 아닙니다. 주최자에게 휴대폰 번호 등록을 요청하세요
            </p>
            <p className="mt-1 text-xs text-rose-700">
              주최자가 등록한 휴대폰 번호로 본인 인증을 마친 계정으로 로그인해야 스캔할 수 있습니다.
            </p>
          </section>
        )}

        {!loadingSummary && !notStaff && summaryError && (
          <section
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
          >
            {summaryError}
          </section>
        )}

        {!loadingSummary && !notStaff && summary && (
          <>
            {/* 공연 요약 및 실시간 입장 카운터 */}
            <section className="rounded-lg border border-[#E5E8EB] bg-white p-4">
              <div className="truncate text-xs font-medium text-[#6B7684]">
                {summary.eventTitle}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#333D4B]">
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  {scanning ? '검표 판정 요청 중…' : '스캐너 대기 중'}
                </span>
                <div className="text-xs text-[#4E5968]">
                  입장{' '}
                  <strong className="text-base font-semibold tabular-nums text-[#1B64DA]">
                    {summary.entered.toLocaleString()}
                  </strong>{' '}
                  / 티켓{' '}
                  <strong className="font-semibold tabular-nums text-[#191F28]">
                    {summary.issued.toLocaleString()}
                  </strong>
                </div>
              </div>
            </section>

            {/* QR 카메라 영역 */}
            <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
              <div className="flex items-center justify-between border-b border-[#E5E8EB] px-4 py-3">
                <h2 className="flex items-center gap-1.5 text-xs font-semibold text-[#191F28]">
                  <Camera className="h-4 w-4 text-[#1B64DA]" aria-hidden="true" />
                  <span>QR 리더</span>
                </h2>
                <span className="text-[11px] text-[#8B95A1]">실시간 서버 검증</span>
              </div>

              <div className="p-3">
                <div className="overflow-hidden rounded-md bg-[#191F28] p-2">
                  <div className="overflow-hidden rounded bg-[#111827]">
                    <div id="qr-reader" className="w-full" />
                  </div>
                </div>
                <p className="mt-2.5 text-center text-xs text-[#6B7684]">
                  관객 모바일 티켓의 QR 코드를 카메라 영역 안에 맞춰 주세요.
                </p>
              </div>
            </section>

            {/* 판정 결과 패널 (ok: 초록 / duplicate: 주황 / invalid: 빨강) */}
            {scanResult && (
              <section
                role="status"
                aria-live="polite"
                className={`rounded-lg border p-4 ${
                  scanResult.result === 'ok'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                    : scanResult.result === 'duplicate'
                      ? 'border-amber-300 bg-amber-50 text-amber-950'
                      : 'border-rose-300 bg-rose-50 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {scanResult.result === 'ok' ? (
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : scanResult.result === 'duplicate' ? (
                    <AlertTriangle
                      className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
                      aria-hidden="true"
                    />
                  )}

                  <div className="flex-1">
                    {scanResult.result === 'ok' && (
                      <>
                        <p className="text-sm font-semibold text-emerald-800">
                          입장 확인
                        </p>
                        <dl className="mt-2.5 divide-y divide-[#E5E8EB] rounded-md border border-emerald-200 bg-white px-3 text-xs">
                          <div className="flex items-center justify-between py-2">
                            <dt className="text-[#6B7684]">구역</dt>
                            <dd className="font-semibold text-[#191F28]">
                              {scanResult.sectionName ?? '—'}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <dt className="text-[#6B7684]">이름</dt>
                            <dd className="flex items-center gap-1 font-semibold text-[#191F28]">
                              <UserCheck
                                className="h-3.5 w-3.5 text-emerald-600"
                                aria-hidden="true"
                              />
                              {scanResult.holderName ?? '—'}
                            </dd>
                          </div>
                        </dl>
                      </>
                    )}

                    {scanResult.result === 'duplicate' && (
                      <>
                        <p className="text-sm font-semibold text-amber-800">
                          이미 입장한 티켓
                        </p>
                        <p className="mt-1 text-xs font-medium tabular-nums text-amber-900">
                          첫 입장 시각: {formatKst(scanResult.scannedAt)}
                        </p>
                        {scanResult.sectionName && (
                          <p className="mt-0.5 text-xs text-amber-800">
                            구역: {scanResult.sectionName} / 이름:{' '}
                            {scanResult.holderName ?? '—'}
                          </p>
                        )}
                      </>
                    )}

                    {scanResult.result === 'invalid' && (
                      <p className="text-sm font-semibold text-rose-800">
                        {scanResult.message}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextScan}
                  className="mt-3.5 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#191F28] text-xs font-medium text-white transition-colors hover:bg-[#333D4B]"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>다음 스캔</span>
                </button>
              </section>
            )}

            {!scanResult && (
              <section className="rounded-lg border border-[#E5E8EB] bg-white p-4">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[#191F28]">
                  <ShieldCheck
                    className="h-4 w-4 text-[#1B64DA]"
                    aria-hidden="true"
                  />
                  <span>현장 검표 안내</span>
                </h3>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[#6B7684]">
                  <li>· 캡처 이미지(유효시간 경과 QR)는 자동으로 무효 판정됩니다.</li>
                  <li>· 판정 화면의 가린 이름(예: 홍*동)과 관객 신분증을 대조해 주세요.</li>
                  <li>· 확인 후 반드시 [다음 스캔] 버튼을 눌러 다음 관객을 검표하세요.</li>
                </ul>
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
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4 text-xs text-[#6B7684]">
          입장 스캔 화면을 불러오는 중입니다…
        </div>
      }
    >
      <StaffScannerContent />
    </Suspense>
  );
}
