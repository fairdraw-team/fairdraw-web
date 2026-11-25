'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarRange,
  ExternalLink,
  LogOut,
  Plus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  {
    href: '/organizer/events',
    label: '공연 목록',
    icon: CalendarRange,
    match: (p: string) =>
      p === '/organizer/events' ||
      (p.startsWith('/organizer/events/') && p !== '/organizer/events/new'),
  },
  {
    href: '/organizer/events/new',
    label: '새 공연 등록',
    icon: Plus,
    match: (p: string) => p === '/organizer/events/new',
  },
];

function BreadcrumbTitle() {
  const pathname = usePathname();
  let current = '공연 목록';
  if (pathname === '/organizer/events/new') current = '새 공연 등록';
  else if (pathname.endsWith('/edit')) current = '공연 정보 수정';
  else if (pathname.startsWith('/organizer/events/')) current = '공연 상세 관리';

  return (
    <div className="flex items-center gap-2 text-xs text-[#6B7684]">
      <span className="font-medium text-[#8B95A1]">주최자 콘솔</span>
      <span aria-hidden="true">/</span>
      <span className="font-semibold text-[#191F28]">{current}</span>
    </div>
  );
}

function TopAction() {
  const pathname = usePathname();
  if (pathname === '/organizer/events' || pathname === '/organizer/events/new') {
    return null;
  }
  return (
    <Link
      href="/organizer/events/new"
      className="inline-flex items-center gap-1 rounded-md bg-[#1B64DA] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1554BD]"
    >
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      <span>새 공연 등록</span>
    </Link>
  );
}

function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="주최자 메인 메뉴" className="space-y-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors ${
              active
                ? 'bg-[#F2F4F6] font-semibold text-[#191F28]'
                : 'font-medium text-[#4E5968] hover:bg-[#F9FAFB] hover:text-[#191F28]'
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${active ? 'text-[#1B64DA]' : 'text-[#8B95A1]'}`}
              aria-hidden="true"
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="모바일 주최자 메뉴"
      className="flex items-center gap-1 overflow-x-auto border-b border-[#E5E8EB] bg-white px-4 py-2 lg:hidden"
    >
      {NAV_ITEMS.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs transition-colors ${
              active
                ? 'bg-[#191F28] font-semibold text-white'
                : 'font-medium text-[#4E5968] hover:bg-[#F2F4F6]'
            }`}
          >
            {label}
          </Link>
        );
      })}
      <Link
        href="/events"
        target="_blank"
        className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E5E8EB] px-2.5 py-1.5 text-xs font-medium text-[#4E5968]"
      >
        <span>관객 화면</span>
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
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
    <div className="min-h-screen bg-[#F7F8FA] text-[#191F28] antialiased font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      <div className="flex min-h-screen">
        {/* 좌측 고정 사이드바 (데스크톱) */}
        <aside className="hidden w-[228px] shrink-0 flex-col border-r border-[#E5E8EB] bg-white lg:flex">
          <div className="flex h-14 items-center gap-2 border-b border-[#E5E8EB] px-5">
            <Link href="/organizer/events" className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#191F28] text-xs font-bold text-white">
                F
              </span>
              <span className="text-[15px] font-bold tracking-tight text-[#191F28]">
                FairDraw
              </span>
              <span className="rounded border border-[#E5E8EB] bg-[#F7F8FA] px-1.5 py-0.5 text-[10px] font-medium text-[#4E5968]">
                Partner
              </span>
            </Link>
          </div>

          <div className="flex flex-1 flex-col justify-between px-3 py-4">
            <div className="space-y-5">
              <div>
                <div className="mb-1.5 px-3 text-[11px] font-medium text-[#8B95A1]">
                  공연 운영
                </div>
                <Suspense fallback={<div className="h-20 rounded-md bg-[#F2F4F6]" />}>
                  <SidebarNav />
                </Suspense>
              </div>

              <div className="border-t border-[#E5E8EB] pt-4">
                <div className="mb-1.5 px-3 text-[11px] font-medium text-[#8B95A1]">
                  바로가기
                </div>
                <Link
                  href="/events"
                  target="_blank"
                  className="flex items-center justify-between rounded-md px-3 py-2 text-[13px] font-medium text-[#4E5968] transition-colors hover:bg-[#F9FAFB] hover:text-[#191F28]"
                >
                  <span>관객 공개 화면</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[#8B95A1]" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="border-t border-[#E5E8EB] pt-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-[#4E5968] transition-colors hover:bg-[#F2F4F6] hover:text-[#191F28]"
              >
                <LogOut className="h-3.5 w-3.5 text-[#8B95A1]" aria-hidden="true" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </aside>

        {/* 우측 메인 영역 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E5E8EB] bg-white px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link href="/organizer/events" className="flex items-center gap-1.5 lg:hidden">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-[#191F28] text-xs font-bold text-white">
                  F
                </span>
                <span className="text-sm font-bold tracking-tight text-[#191F28]">
                  FairDraw
                </span>
              </Link>
              <div className="hidden lg:block">
                <Suspense fallback={<div className="h-4 w-36 rounded bg-[#F2F4F6]" />}>
                  <BreadcrumbTitle />
                </Suspense>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Suspense fallback={null}>
                <TopAction />
              </Suspense>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#D1D6DB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#4E5968] transition-colors hover:bg-[#F2F4F6] lg:hidden"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>로그아웃</span>
              </button>
            </div>
          </header>

          <Suspense fallback={null}>
            <MobileNav />
          </Suspense>

          <main className="mx-auto w-full max-w-[1160px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
