// 백엔드 호출 공통 함수
import { mockFetch } from './mock';
import { supabase } from './supabase';
import drawMeMock from '../mocks/draw-me.json';
import drawInfoMock from '../mocks/draw.json';
import drawBallotsMock from '../mocks/draw-ballots.json';
import drawResultsMock from '../mocks/draw-results.json';
import bookingMeMock from '../mocks/booking-me.json';
import paymentPrepareMock from '../mocks/payment-prepare.json';
import paymentStatsMock from '../mocks/payment-stats.json';
import bookingsMock from '../mocks/bookings.json';
import ticketsMeMock from '../mocks/tickets-me.json';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function getToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

type ApiOptions = RequestInit & { auth?: boolean };

export async function apiFetch<T>(
  path: string,
  { auth = true, headers, ...init }: ApiOptions = {},
): Promise<T> {
  // USE_MOCK 분기 — 백엔드 없이 화면 작업할 때
  if (USE_MOCK) {
    const method = (init.method ?? 'GET').toUpperCase();
    const [cleanPath, queryStr] = path.split('?');
    const query = new URLSearchParams(queryStr ?? '');

    // 3주차 추첨·검증 Mock 응답 분기
    if (/\/api\/events\/[^/]+\/draw\/me$/.test(cleanPath)) {
      return drawMeMock as unknown as T;
    }
    if (/\/api\/public\/events\/[^/]+\/draw\/ballots$/.test(cleanPath)) {
      return drawBallotsMock as unknown as T;
    }
    if (/\/api\/public\/events\/[^/]+\/draw$/.test(cleanPath)) {
      return drawInfoMock as unknown as T;
    }
    if (/\/api\/events\/[^/]+\/draw\/results$/.test(cleanPath) && method === 'GET') {
      const resultFilter = query.get('result');
      const filtered = resultFilter
        ? drawResultsMock.content.filter((r) => r.result === resultFilter)
        : drawResultsMock.content;
      return {
        ...drawResultsMock,
        content: filtered,
        totalElements: filtered.length,
        totalPages: 1,
      } as unknown as T;
    }

    // 4주차 예매·결제·티켓 Mock 응답 분기
    if (/\/api\/events\/[^/]+\/booking\/me$/.test(cleanPath)) {
      return bookingMeMock as unknown as T;
    }
    if (cleanPath === '/api/payments/prepare') {
      return paymentPrepareMock as unknown as T;
    }
    if (cleanPath === '/api/tickets/me') {
      return ticketsMeMock as unknown as T;
    }
    if (/\/api\/events\/[^/]+\/bookings$/.test(cleanPath) && method === 'GET') {
      const statusFilter = query.get('status');
      const filtered = statusFilter
        ? bookingsMock.content.filter((b) => b.status === statusFilter)
        : bookingsMock.content;
      return {
        ...bookingsMock,
        content: filtered,
        totalElements: filtered.length,
        totalPages: 1,
      } as unknown as T;
    }
    if (/\/api\/events\/[^/]+\/payment\/stats$/.test(cleanPath) && method === 'GET') {
      return mockFetch<T>(path, method, typeof init.body === 'string' ? init.body : undefined).catch(
        () => paymentStatsMock as unknown as T,
      );
    }

    return mockFetch<T>(
      path,
      method,
      typeof init.body === 'string' ? init.body : undefined,
    );
  }

  const token = auth ? await getToken() : null;
  const res = await fetch(API_BASE_URL + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (res.status === 401 && auth) {
    window.location.href = '/login';
    throw new ApiError('UNAUTHORIZED', '로그인이 필요해', 401);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body?.code ?? 'UNKNOWN',
      body?.message ?? `요청 실패 (${res.status})`,
      res.status,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
