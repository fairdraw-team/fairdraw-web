import { supabase } from './supabase';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export interface ApiFetchOptions extends RequestInit {
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { auth = true, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }

  // 1. auth 옵션이 false가 아닐 때만 세션 토큰 주입
  if (auth) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // 2. 백엔드 API 호출
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  // 3. 인증 만료(401) 처리 (단, 공개 API 호출이 아닐 때만 로그인 페이지로 이동)
  if (response.status === 401 && auth) {
    if (typeof window !== 'undefined') {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
    }
    throw new ApiError('인증이 만료되었습니다. 다시 로그인해주세요.', 401, 'UNAUTHORIZED');
  }

  // 4. 기타 에러 응답 처리 (백엔드의 code와 message를 모두 보존)
  if (!response.ok) {
    let errorMessage = '요청 처리 중 오류가 발생했습니다.';
    let errorCode: string | undefined;

    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || errorJson.error || errorMessage;
      errorCode = errorJson.code;
    } catch {
      // 응답 본문이 JSON이 아닌 경우 기본 메시지 유지
    }

    // 403 PHONE_NOT_VERIFIED인 경우 휴대폰 인증 페이지로 안내 가능하도록 코드 전달
    throw new ApiError(errorMessage, response.status, errorCode);
  }

  // 5. 204 No Content 또는 빈 본문 응답 안전 처리 (DELETE 요청 등)
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}