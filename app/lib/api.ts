import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // 1. supabase.auth.getSession()으로 토큰을 꺼냄
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  // 헤더 설정 (기본 application/json 및 Bearer 토큰 주입)
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 2. fetch(API_BASE_URL + path, { headers: ... })
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // 3. 응답이 401이면 /login으로 보냄
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
  }

  // 다른 에러면 백엔드가 준 message를 던짐
  if (!response.ok) {
    let errorMessage = '요청 처리 중 오류가 발생했습니다.';
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {
      // 응답 본문이 JSON 형태가 아닐 경우 기본 메시지 유지
    }
    throw new Error(errorMessage);
  }

  // 성공 응답 파싱 반환
  return response.json();
}