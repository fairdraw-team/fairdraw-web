'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase'; // <-- 파일 위치에 맞는 상대 경로 또는 '@/lib/supabase'
import { ShieldCheck, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleKakaoLogin = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        alert(`로그인 오류: ${error.message}`);
        setLoading(false);
      }
    } catch (err: any) {
      alert('카카오 로그인 중 문제가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="[&_*]:box-border leading-[1.5] min-h-screen bg-[#fff] text-[#222] select-none font-['Pretendard','Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
      {/* ───── 상단 유틸 바 ───── */}
      <div className="bg-[#f4f4f4]">
        <div className="mx-auto flex h-[30px] max-w-[480px] items-center justify-between px-[16px] text-[11px] text-[#555]">
          <Link href="/" className="no-underline flex items-center gap-[2px] text-[11px] text-[#555] hover:text-[#111]">
            <ChevronLeft className="h-[14px] w-[14px]" /> 메인으로
          </Link>
          <span className="font-[900] tracking-[0.05em] text-[#E5372B]">FAIR DRAW</span>
        </div>
      </div>

      {/* ───── 로고 헤더 ───── */}
      <header className="border-b border-[#222]">
        <div className="mx-auto flex h-[60px] max-w-[480px] items-center px-[16px]">
          <div className="flex items-center gap-[10px]">
            <span className="text-[26px] leading-none tracking-[-0.025em] text-[#111]">
              ticket<span className="font-[900]">LINK</span>
            </span>
            <span className="text-[16px] font-[700] leading-none text-[#111]">로그인</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] px-[16px] pb-[64px] pt-[40px]">
        {/* 타이틀 */}
        <span className="inline-block rounded-full border border-[#2D8FD5] px-[10px] py-[2px] text-[11px] font-[600] text-[#2D8FD5]">
          1인 1계정
        </span>
        <h1 className="m-[0px] mt-[12px] border-b border-[#222] pb-[16px] text-[26px] font-[700] leading-[1.25] text-[#111]">
          간편 로그인
        </h1>

        <p className="m-[0px] mt-[20px] text-[14px] leading-[1.625] text-[#444]">
          암표 방지 및 공정한 추첨 응모를 위해
          <br />
          <b className="font-[700] text-[#111]">1인 1계정 본인인증</b> 로그인이 필요합니다.
        </p>

        {/* 카카오 공식 컬러(#FEE500) 로그인 버튼 */}
        <button
          type="button"
          onClick={handleKakaoLogin}
          disabled={loading}
          className="[font-family:inherit] mt-[28px] flex h-[52px] w-full items-center justify-center gap-[10px] rounded-[3px] border-0 bg-[#FEE500] text-[15px] font-[700] text-[#191919] transition hover:bg-[#FADA0A] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191919]"
        >
          {/* 카카오 심볼 SVG */}
          <svg className="h-[20px] w-[20px] fill-[#191919]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.315 6.055l-1.096 4.048c-.097.361.144.595.441.401l4.873-3.232c.48.048.97.073 1.467.073 4.97 0 9-3.186 9-7.115S16.97 3 12 3z" />
          </svg>
          <span>{loading ? '카카오 로그인 연결 중...' : '카카오로 시작하기'}</span>
        </button>

        {/* 안내 */}
        <div className="mt-[24px] flex items-start gap-[8px] border border-[#F3C6C2] bg-[#FDF3F2] px-[14px] py-[12px] text-[12px] leading-[1.5] text-[#D3342A]">
          <ShieldCheck className="mt-[2px] h-[14px] w-[14px] shrink-0 text-[#E5372B]" />
          <p className="m-[0px]">개인정보 보호 및 중복 계정 생성 방지를 위해 본인인증 로그인만 지원합니다.</p>
        </div>
      </main>

      {/* ───── 푸터 ───── */}
      <footer className="border-t border-[#e5e5e5]">
        <div className="mx-auto flex max-w-[480px] items-center justify-center gap-[6px] px-[16px] py-[14px] text-[11px] text-[#999]">
          <ShieldCheck className="h-[14px] w-[14px] text-[#3B73E8]" />
          공정 티케팅 플랫폼 · Fair Draw
        </div>
      </footer>
    </div>
  );
}