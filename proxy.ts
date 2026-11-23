import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://svarsetejqotluqikbtm.supabase.co';

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_zBw9qTpBfW0RrcAMrWU8ng_VzUFwbUy';

  // 1. 요청 쿠키 기반의 Supabase 서버 클라이언트 생성
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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

  const { pathname, search } = request.nextUrl;
  const fullPath = `${pathname}${search}`;

  // 3. 비로그인 예외 경로 확인
  // /login, /auth/callback, /events(목록), /events/[id](상세), /events/[id]/verify(공개 추첨 검증)만 허용
  const isEventDetail = /^\/events\/[^/]+$/.test(pathname);
  const isEventVerify = /^\/events\/[^/]+\/verify$/.test(pathname);
  const isExcludedPath =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/callback') ||
    pathname === '/events' ||
    isEventDetail ||
    isEventVerify;

  if (isExcludedPath) {
    return response;
  }

  // 규칙 ①: 세션이 없으면 /login 으로 리다이렉트
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', fullPath);
    return NextResponse.redirect(loginUrl);
  }

  // 규칙 ②: 세션은 있지만 전화번호가 없으면 /verify-phone 으로 리다이렉트
  if (!user.phone && pathname !== '/verify-phone') {
    const verifyPhoneUrl = request.nextUrl.clone();
    verifyPhoneUrl.pathname = '/verify-phone';
    verifyPhoneUrl.search = '';
    verifyPhoneUrl.searchParams.set('next', fullPath);
    return NextResponse.redirect(verifyPhoneUrl);
  }

  // 규칙 ③: 이미 전화번호 인증을 마쳤는데 /verify-phone 에 접근하는 경우 복귀
  if (user.phone && pathname === '/verify-phone') {
    const nextParam = request.nextUrl.searchParams.get('next');
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.search = '';
    if (nextParam && nextParam.startsWith('/')) {
      const [nextPath, nextQuery] = nextParam.split('?');
      redirectUrl.pathname = nextPath;
      if (nextQuery) redirectUrl.search = `?${nextQuery}`;
    } else {
      redirectUrl.pathname = '/';
    }
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};