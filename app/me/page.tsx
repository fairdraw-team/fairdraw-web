'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { User, Copy, Check, LogOut, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  realName?: string;
  phone?: string;
  role?: string;
  [key: string]: any;
}

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
        const { data: { session } } = await supabase.auth.getSession();
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

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-xl border border-[#D5D8DC] overflow-hidden flex flex-col">
        {/* 상단 다크 헤더 */}
        <div className="bg-[#1C202B] px-5 py-3.5 flex items-center justify-between text-white border-b border-slate-700">
          <Link href="/" className="flex items-center gap-1 text-xs text-slate-300 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> 메인으로
          </Link>
          <div className="flex items-center gap-1">
            <span className="text-sm font-black tracking-tighter">
              ticket<span className="text-[#3B73E8]">LINK</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> 로그아웃
          </button>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="p-6">
          {/* 유저 아바타 및 헤더 정보 */}
          <div className="flex items-center gap-3 pb-5 border-b border-[#EAEAEA]">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#111] truncate">
                  {profile?.realName || (loading ? '불러오는 중...' : '미등록')}
                </h1>
                <span className="text-[10px] font-bold text-[#3B73E8] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                  {profile?.role || 'USER'}
                </span>
              </div>
              <p className="text-[11px] text-[#777] mt-0.5">본인확인 및 회원 정보가 연동되었습니다.</p>
            </div>
          </div>

          {/* 프로필 로딩/에러/정보 영역 */}
          {loading ? (
            <div className="py-12 text-center text-xs text-[#888]">
              백엔드 서버에서 내 정보를 조회하고 있습니다...
            </div>
          ) : errorMsg ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-8 h-8 text-[#E5372B] mb-2" />
              <p className="text-xs font-bold text-[#E5372B]">{errorMsg}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded cursor-pointer transition"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-1 text-xs">
              <div className="flex justify-between py-2.5 border-b border-slate-100">
                <span className="text-[#888]">이름 (실명)</span>
                <strong className="text-[#222] font-semibold">{profile?.realName || '-'}</strong>
              </div>
              <div className="flex justify-between py-2.5 border-b border-slate-100">
                <span className="text-[#888]">휴대폰 번호</span>
                <strong className="text-[#222] font-mono font-semibold">{profile?.phone || '-'}</strong>
              </div>
              <div className="flex justify-between py-2.5 border-b border-slate-100">
                <span className="text-[#888]">권한 및 역할</span>
                <strong className="text-[#222] font-semibold">{profile?.role || 'USER'}</strong>
              </div>
            </div>
          )}

          {/* 1주차 전용: 백엔드 Swagger 테스트용 토큰 복사 영역 */}
          <div className="mt-6 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-[#333] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#3B73E8]" /> 1주차 개발용 Bearer 토큰
              </span>
              <button
                type="button"
                onClick={handleCopyToken}
                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-[11px] font-semibold text-slate-700 transition cursor-pointer shadow-sm active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-700 font-bold">복사 완료</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>내 토큰 복사</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#777] leading-relaxed">
              백엔드 개발 담당자가 Swagger UI 상단 <code>Authorize</code> 버튼에 붙여넣어 API를 테스트할 수 있는 현재 세션 토큰입니다.
            </p>
          </div>
        </div>

        {/* 하단 상태 푸터 */}
        <div className="bg-[#FAFBFD] py-3 text-center border-t border-[#EAEAEA] text-[11px] text-emerald-600 font-medium flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>프론트엔드 ➔ Supabase ➔ 백엔드 3구간 정상 연결됨</span>
        </div>
      </div>
    </div>
  );
}