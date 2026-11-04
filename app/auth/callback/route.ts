import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 로그인 완료 후 이동할 경로 (기본값: '/')
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component 환경에서 쿠키 변경 무시
            }
          },
        },
      }
    );

    // 전달받은 인증 code를 Supabase 세션 쿠키로 교환
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 세션 교환 성공 시 메인 화면으로 리다이렉트
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 오류 발생 시 로그인 페이지로 실패 쿼리와 함께 이동
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}