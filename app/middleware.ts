import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://svarsetejqotluqikbtm.supabase.co';

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_zBw9qTpBfW0RrcAMrWU8ng_VzUFwbUy';

  // 1. 요청 쿠키 기반의 Supabase 서버 클라이언트 생성
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 2. 현재 로그인된 유저 세션 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 3. 예외 경로 확인 (/login, /auth/callback, /events)
  const isExcludedPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/events');

  if (isExcludedPath) {
    return response;
  }

  // 규칙 ①: 세션이 없으면 /login 으로 리다이렉트
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    // 로그인 완료 후 원래 접근하려던 페이지로 돌아올 수 있도록 쿼리 파라미터 보존
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 규칙 ②: 세션은 있지만 전화번호가 없으면 /verify-phone 으로 리다이렉트
  if (!user.phone && pathname !== '/verify-phone') {
    const verifyPhoneUrl = request.nextUrl.clone();
    verifyPhoneUrl.pathname = '/verify-phone';
    return NextResponse.redirect(verifyPhoneUrl);
  }

  // 규칙 ③: 이미 전화번호 인증을 마쳤는데 /verify-phone 에 접근하는 경우 메인(/)으로 리다이렉트
  if (user.phone && pathname === '/verify-phone') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

// 이미지 가이드 예외 경로 및 내부 정적 파일 필터링
export const config = {
  matcher: [
    /*
     * 아래 항목을 제외한 모든 요청 경로에 적용:
     * - _next/static (정적 스크립트/CSS)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico, 이미지 파일 확장자 (png, jpg, svg 등)
     * - /api (백엔드 자체 처리 경로)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};