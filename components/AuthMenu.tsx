'use client';

// 헤더 오른쪽에 놓는 버튼. 로그인 전에는 "로그인", 로그인 후에는 "마이페이지"를 보여 준다
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const BUTTON =
  'whitespace-nowrap rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-stone-700';

export function AuthMenu() {
  // null = 아직 확인 중, true = 로그인됨, false = 로그인 안 됨
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // ① 화면이 처음 뜰 때 한 번 확인
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));

    // ② 로그인·로그아웃이 일어나면 바로 반영
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // 확인이 끝나기 전에는 아무것도 그리지 않는다 (버튼이 깜빡 바뀌는 것 방지)
  if (loggedIn === null) return null;

  return loggedIn ? (
    <Link href="/me" className={BUTTON}>
      마이페이지
    </Link>
  ) : (
    <Link href="/login" className={BUTTON}>
      로그인
    </Link>
  );
}