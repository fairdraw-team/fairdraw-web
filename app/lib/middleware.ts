import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // 세션 정보 조회
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // 1. 비로그인 상태일 때: /login으로 리다이렉트
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // 2. 로그인 상태지만 전화번호가 없을 때: /verify-phone으로 리다이렉트
  if (!user.phone && path !== '/verify-phone') {
    const verifyUrl = request.nextUrl.clone();
    verifyUrl.pathname = '/verify-phone';
    return NextResponse.redirect(verifyUrl);
  }

  // 3. 이미 전화번호가 있는데 /verify-phone에 머물 경우 메인으로 이동
  if (user.phone && path === '/verify-phone') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

// 예외 경로 설정: /login, /auth/callback, 정적 파일 등은 가드 제외
export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 요청에 미들웨어 적용:
     * - /login
     * - /auth/callback
     * - /api (백엔드 자체 처리)
     * - _next/static, _next/image, favicon.ico 등 정적 리소스
     */
    '/((?!login|auth/callback|api|_next/static|_next/image|favicon.ico).*)',
  ],
};