'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPayment } from '@/lib/pay';
import { Loader2, AlertCircle } from 'lucide-react';

function PaymentRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paymentId = searchParams.get('paymentId');
  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message');

  const [status, setStatus] = useState<'verifying' | 'failed'>('verifying');
  const [message, setMessage] = useState<string>('');
  const [fallbackHref, setFallbackHref] = useState<string>('/events');

  useEffect(() => {
    // sessionStorage에서 직전 공연 ID 복구
    try {
      const savedEventId = sessionStorage.getItem('fd:lastEventId');
      if (savedEventId) {
        setFallbackHref(`/events/${savedEventId}/result`);
      }
    } catch {}

    // 1) 포트원 리디렉션 쿼리에 실패/취소 code가 포함된 경우
    if (errorCode || !paymentId) {
      setStatus('failed');
      setMessage(errorMessage ?? '결제가 취소되었거나 실패했습니다.');
      return;
    }

    // 2) 결제 성공 리디렉션인 경우 백엔드 결제 확인(confirmPayment) 호출
    let ignore = false;
    confirmPayment(paymentId).then((res) => {
      if (ignore) return;
      if (res.ok) {
        router.replace(`/events/${res.done.eventId}/result`);
      } else {
        setStatus('failed');
        setMessage(
          "결제 확인이 늦어지고 있습니다. 잠시 뒤 '내 결과'에서 확인해 주세요.",
        );
      }
    });

    return () => {
      ignore = true;
    };
  }, [paymentId, errorCode, errorMessage, router]);

  if (status === 'verifying') {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-xs">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <h1 className="mt-4 text-lg font-black text-stone-900">결제 확인 중...</h1>
          <p className="mt-1.5 text-xs text-stone-500">
            포트원 결제 내역을 검증하고 티켓을 발급하고 있습니다. 잠시만 기다려 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-200 bg-white p-10 text-center shadow-xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-black text-stone-900">
          결제가 완료되지 않았습니다
        </h1>
        <p className="mt-2 rounded-xl bg-stone-50 px-4 py-3 text-xs font-medium leading-relaxed text-stone-700">
          {message}
        </p>
        <Link
          href={fallbackHref}
          className="mt-6 inline-block w-full rounded-2xl bg-stone-900 py-3.5 text-xs font-bold text-white transition hover:bg-stone-800"
        >
          내 결과로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default function PaymentRedirectPage() {
  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 antialiased">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md px-4 py-20">
            <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white p-12 text-sm text-stone-400">
              결제 결과를 불러오는 중입니다…
            </div>
          </div>
        }
      >
        <PaymentRedirectContent />
      </Suspense>
    </div>
  );
}