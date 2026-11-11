'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

function OrganizerNav() {
  const pathname = usePathname();
  const isEvents = pathname === '/organizer/events';
  const isNew = pathname === '/organizer/events/new';

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-stone-600">
      <Link
        href="/organizer/events"
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
          isEvents
            ? 'bg-stone-100 text-stone-900 font-bold'
            : 'hover:bg-stone-50 hover:text-stone-900'
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>공연 관리</span>
      </Link>
      <Link
        href="/organizer/events/new"
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
          isNew
            ? 'bg-stone-100 text-stone-900 font-bold'
            : 'hover:bg-stone-50 hover:text-stone-900'
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>새 공연 개설</span>
      </Link>
    </nav>
  );
}

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      if (supabase?.auth) {
        await supabase.auth.signOut();
      }
    } catch {
      // 로그아웃 실패 무시
    } finally {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#222] font-sans antialiased">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/organizer/events" className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-stone-900">
                Fair<span className="text-[#3B73E8]">Draw</span>
              </span>
              <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                Organizer
              </span>
            </Link>

            <Suspense fallback={<div className="w-40 h-8 bg-stone-100 rounded animate-pulse" />}>
              <OrganizerNav />
            </Suspense>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 font-medium"
            >
              <span>관객 화면 바로가기</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <div className="h-4 w-px bg-stone-200 hidden sm:block" />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}