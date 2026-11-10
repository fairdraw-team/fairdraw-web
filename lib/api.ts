// 백엔드 호출 공통 함수 (임시본)
// ⚠️ 원래 이 파일은 프론트A 담당(src/lib/api.ts)이다. 팀 저장소에 A 버전이 머지되면
//    이 파일은 버리고, 아래 "USE_MOCK 분기" 3줄만 A 버전 맨 앞에 합친다(가이드: mock은 프론트A와 같이 넣기).
import { mockFetch } from './mock';

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

// TODO(프론트A 머지 후): supabase.auth.getSession()의 access_token으로 교체
async function getToken(): Promise<string | null> {
  return null;
}

type ApiOptions = RequestInit & { auth?: boolean };

export async function apiFetch<T>(path: string, { auth = true, headers, ...init }: ApiOptions = {}): Promise<T> {
  // USE_MOCK 분기 — 백엔드 없이 화면 작업할 때
  if (USE_MOCK) {
    return mockFetch<T>(path, init.method ?? 'GET', typeof init.body === 'string' ? init.body : undefined);
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
    throw new ApiError(body?.code ?? 'UNKNOWN', body?.message ?? `요청 실패 (${res.status})`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
