'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Calendar, PlusCircle, LogOut, ExternalLink } from 'lucide-react';

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
        <Calendar className="h-4 w-4" />
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
        <PlusCircle className="h-4 w-4" />
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
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#222] font-sans antialiased">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-xs">
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

            {/* usePathname을 사용하는 컴포넌트를 Suspense로 감싸서 Prerender 에러 방지 */}
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
              <ExternalLink className="h-3 w-3" />
            </Link>
            <div className="h-4 w-px bg-stone-200 hidden sm:block" />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
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
