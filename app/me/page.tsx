'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { User, Copy, Check, LogOut, ChevronLeft, Shield, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  realName?: string;
  phone?: string;
  role?: string;
  [key: string]: any;
}

// 상태 점 깜빡임 애니메이션
const PAGE_CSS = `
@keyframes tlPulse { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
.tl-pulse { animation: tlPulse 2s ease-in-out infinite; }
`;

export default function MyPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // 1. 세션에서 JWT 토큰 추출 (Swagger 테스트 복사용)
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          setToken(session.access_token);
        }

        // 2. 가이드 7번 공통 함수(apiFetch)로 백엔드 GET /api/me 호출
        const data = await apiFetch<UserProfile>('/api/me');
        setProfile(data);
      } catch (err: any) {
        setErrorMsg(err.message || '내 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // 1주차 전용: 내 토큰 복사 기능
  const handleCopyToken = async () => {
    if (!token) {
      alert('복사할 세션 토큰이 없습니다.');
      return;
    }

    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('토큰 복사에 실패했습니다.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const infoRows: [string, string][] = [
    ['이름 (실명)', profile?.realName || '-'],
    ['휴대폰 번호', profile?.phone || '-'],
    ['권한 및 역할', profile?.role || 'USER'],
  ];

  return (
    <div className="[&_*]:box-border leading-[1.5] min-h-screen bg-[#fff] text-[#222] select-none font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      <style>{PAGE_CSS}</style>

      {/* ───── 상단 유틸 바 ───── */}
      <div className="bg-[#f4f4f4]">
        <div className="mx-auto flex h-[30px] max-w-[480px] items-center justify-between px-[16px] text-[11px] text-[#555]">
          <Link href="/" className="no-underline flex items-center gap-[2px] text-[11px] text-[#555] hover:text-[#111]">
            <ChevronLeft className="h-[14px] w-[14px]" /> 메인으로
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="bg-transparent border-0 p-[0px] [font-family:inherit] flex items-center gap-[4px] text-[11px] text-[#555] hover:text-[#111]"
          >
            <LogOut className="h-[13px] w-[13px]" /> 로그아웃
          </button>
        </div>
      </div>

      {/* ───── 로고 헤더 ───── */}
      <header className="border-b border-[#222]">
        <div className="mx-auto flex h-[60px] max-w-[480px] items-center px-[16px]">
          <div className="flex items-center gap-[10px]">
            <span className="text-[26px] leading-none tracking-[-0.025em] text-[#111]">
              ticket<span className="font-[900]">LINK</span>
            </span>
            <span className="text-[16px] font-[700] leading-none text-[#111]">마이페이지</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] px-[16px] pb-[48px] pt-[28px]">
        {/* ───── 프로필 ───── */}
        <section className="flex items-center gap-[14px] border-b border-[#222] pb-[20px]">
          <span className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-[#eceef2] text-[#8A93A6]">
            <User className="h-[28px] w-[28px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[8px]">
              <h1 className="m-[0px] truncate text-[22px] font-[700] leading-[1.3] text-[#111]">
                {profile?.realName || (loading ? '불러오는 중...' : '미등록')}
              </h1>
              <span className="shrink-0 rounded-full border border-[#2D8FD5] px-[10px] py-[1px] text-[11px] font-[600] text-[#2D8FD5]">
                {profile?.role || 'USER'}
              </span>
            </div>
            <p className="m-[0px] mt-[4px] text-[12px] text-[#777]">본인확인 및 회원 정보가 연동되었습니다.</p>
          </div>
        </section>

        {/* ───── 내 정보 ───── */}
        {loading ? (
          <div className="py-[48px] text-center text-[13px] text-[#888]">
            백엔드 서버에서 내 정보를 조회하고 있습니다...
          </div>
        ) : errorMsg ? (
          <div className="mt-[20px] flex flex-col items-center border border-[#F3C6C2] bg-[#FDF3F2] px-[16px] py-[28px] text-center">
            <AlertCircle className="h-[32px] w-[32px] text-[#E5372B]" />
            <p className="m-[0px] mt-[10px] text-[13px] font-[700] text-[#D3342A]">{errorMsg}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="[font-family:inherit] mt-[14px] h-[36px] rounded-[3px] border border-[#222] bg-[#fff] px-[20px] text-[12px] font-[700] text-[#222] hover:bg-[#f6f6f6]"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <dl className="m-[0px]">
            {infoRows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-[#eee] py-[14px] text-[13px]">
                <dt className="text-[#777]">{k}</dt>
                <dd className="m-[0px] font-[700] tabular-nums text-[#222]">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* ───── 1주차 개발용 토큰 ───── */}
        <section className="mt-[32px]">
          <div className="flex items-center justify-between border-b border-[#222] pb-[10px]">
            <h2 className="m-[0px] flex items-center gap-[6px] text-[14px] font-[700] text-[#111]">
              <Shield className="h-[16px] w-[16px] text-[#3B73E8]" /> 1주차 개발용 Bearer 토큰
            </h2>
            <button
              type="button"
              onClick={handleCopyToken}
              className="[font-family:inherit] flex h-[28px] items-center gap-[4px] rounded-[3px] border border-[#222] bg-[#fff] px-[10px] text-[11px] font-[700] text-[#222] transition hover:bg-[#f6f6f6]"
            >
              {copied ? (
                <>
                  <Check className="h-[14px] w-[14px] stroke-[3] text-[#1E9E63]" />
                  <span className="text-[#14724A]">복사 완료</span>
                </>
              ) : (
                <>
                  <Copy className="h-[14px] w-[14px]" />
                  <span>내 토큰 복사</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-[12px] border border-dashed border-[#ccc] bg-[#f5f5f5] px-[14px] py-[12px]">
            <p className="m-[0px] text-[12px] leading-[1.625] text-[#666]">
              * 백엔드 개발 담당자가 Swagger UI 상단{' '}
              <code className="rounded-[2px] bg-[#e8e8e8] px-[4px] py-[1px] text-[11px] font-[600] text-[#333] font-['ui-monospace','SFMono-Regular','Menlo','Consolas',monospace]">
                Authorize
              </code>{' '}
              버튼에 붙여넣어 API를 테스트할 수 있는 현재 세션 토큰입니다.
            </p>
          </div>
        </section>
      </main>

      {/* ───── 하단 상태 푸터 ───── */}
      <footer className="border-t border-[#e5e5e5]">
        <div className="mx-auto flex max-w-[480px] items-center justify-center gap-[8px] px-[16px] py-[14px] text-[11px] font-[500] text-[#1E9E63]">
          <span className="tl-pulse h-[8px] w-[8px] rounded-full bg-[#1E9E63]" />
          <span>프론트엔드 ➔ Supabase ➔ 백엔드 3구간 정상 연결됨</span>
        </div>
      </footer>
    </div>
  );
}