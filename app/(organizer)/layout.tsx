'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 주최자 화면 공통 틀 (관계자용 정중한 존댓말 레이아웃)
export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isEvents = pathname === '/organizer/events';
  const isNew = pathname === '/organizer/events/new';
  const isTrash = pathname === '/organizer/trash';

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 antialiased">
      {/* 상단 통합 헤더 바 */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/organizer/events" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-900 text-sm font-black text-white shadow-xs">
                F
              </span>
              <span className="text-lg font-black tracking-tight text-stone-900">Fair Draw</span>
            </Link>
            <span className="hidden rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600 sm:inline">
              주최자 콘솔
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/events"
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-600 shadow-2xs transition hover:border-stone-400 hover:text-stone-900"
            >
              <span>관객 공개 화면 보기</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 본문 레이아웃 (좌측 메뉴 + 우측 컨텐츠) */}
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 md:flex-row">
        {/* 사이드바 메뉴 */}
        <aside className="md:w-56 md:shrink-0">
          <nav aria-label="주최자 메인 메뉴" className="flex flex-row flex-wrap gap-1.5 md:flex-col">
            <Link
              href="/organizer/events"
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isEvents
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:bg-white/60 hover:text-stone-900'
              }`}
            >
              <svg className="h-4 w-4 stroke-stone-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
              </svg>
              <span>주최 공연 관리</span>
            </Link>

            <Link
              href="/organizer/events/new"
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isNew
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:bg-white/60 hover:text-stone-900'
              }`}
            >
              <svg className="h-4 w-4 stroke-stone-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>새 공연 등록</span>
            </Link>

            <Link
              href="/organizer/trash"
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isTrash
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:bg-white/60 hover:text-stone-900'
              }`}
            >
              <svg className="h-4 w-4 stroke-stone-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              <span>휴지통</span>
            </Link>
          </nav>
        </aside>

        {/* 본문 메인 컨텐츠 영역 */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
