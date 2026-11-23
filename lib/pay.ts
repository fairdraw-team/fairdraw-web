import * as PortOne from '@portone/browser-sdk/v2';
import { apiFetch, ApiError } from '@/lib/api';
import type { PaymentPrepare, PaymentComplete } from '@/types/api';

export async function startPayment(bookingId: string, eventId: string) {
  // 1) 백엔드에서 결제 번호(paymentId)와 금액을 받는다
  const p = await apiFetch<PaymentPrepare>('/api/payments/prepare', {
    method: 'POST',
    body: JSON.stringify({ bookingId }),
  });

  // 휴대폰에서 결제가 실패해 돌아왔을 때 어느 공연으로 갈지 기억해 둔다
  try {
    sessionStorage.setItem('fd:lastEventId', eventId);
  } catch {}

  // 2) 포트원 V2 결제창을 연다
  const res = await PortOne.requestPayment({
    storeId: p.storeId,
    channelKey: p.channelKey,
    paymentId: p.paymentId,
    orderName: p.orderName,
    totalAmount: p.amount,
    currency: 'KRW',
    payMethod: 'CARD',
    redirectUrl: `${window.location.origin}/payments/redirect`,
  });

  // 휴대폰은 여기까지 오지 않고 redirectUrl로 이동한다. 아래는 PC에서만 실행된다
  if (!res) return { ok: false as const, message: '결제창이 닫혔습니다' };
  if (res.code !== undefined) {
    return { ok: false as const, message: res.message ?? '결제에 실패했습니다' };
  }

  // 3) 백엔드에 확인을 요청한다
  return confirmPayment(p.paymentId);
}

export async function confirmPayment(paymentId: string) {
  let lastMessage = '결제 확인에 실패했습니다';
  for (let i = 0; i < 3; i++) {
    try {
      const done = await apiFetch<PaymentComplete>('/api/payments/complete', {
        method: 'POST',
        body: JSON.stringify({ paymentId }),
      });
      return { ok: true as const, done };
    } catch (e) {
      if (e instanceof Error) lastMessage = e.message;
      // 포트원 반영이 늦어 아직 결제 전으로 보일 때만 2초 뒤에 다시 물어본다
      if (!(e instanceof ApiError) || e.code !== 'PAYMENT_NOT_PAID') break;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return { ok: false as const, message: lastMessage };
}