'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase'; // <-- 파일 위치에 맞는 상대 경로 또는 '@/lib/supabase'
import { Ticket, ShieldCheck, ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4 font-sans select-none">
      {/* 티켓링크 스타일 컨테이너 카드 */}
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-xl border border-[#D5D8DC] overflow-hidden flex flex-col">
        
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
          <span className="text-[11px] text-[#E5372B] font-bold">FAIR DRAW</span>
        </div>

        {/* 본문 안내 */}
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-red-50 text-[#E5372B] rounded-2xl flex items-center justify-center mb-4 border border-red-100">
            <Ticket className="w-7 h-7" />
          </div>

          <h1 className="text-xl font-bold text-[#111]">간편 로그인</h1>
          <p className="text-xs text-[#666] mt-1.5 leading-relaxed">
            암표 방지 및 공정한 추첨 응모를 위해<br />
            <strong>1인 1계정 본인인증</strong> 로그인이 필요합니다.
          </p>

          {/* 카카오 공식 컬러(#FEE500) 로그인 버튼 */}
          <button
            type="button"
            onClick={handleKakaoLogin}
            disabled={loading}
            className="w-full mt-8 py-3.5 px-4 bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] font-bold text-sm rounded-xl flex items-center justify-center gap-2.5 transition shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {/* 카카오 심볼 SVG */}
            <svg className="w-5 h-5 fill-[#191919]" viewBox="0 0 24 24">
              <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.315 6.055l-1.096 4.048c-.097.361.144.595.441.401l4.873-3.232c.48.048.97.073 1.467.073 4.97 0 9-3.186 9-7.115S16.97 3 12 3z" />
            </svg>
            <span>{loading ? '카카오 로그인 연결 중...' : '카카오로 시작하기'}</span>
          </button>

          {/* 하단 약관 안내 */}
          <div className="mt-6 flex items-center gap-1.5 text-[11px] text-[#888]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3B73E8]" />
            <span>개인정보 보호 및 중복 계정 생성 방지</span>
          </div>
        </div>

        {/* 푸터 */}
        <div className="bg-[#FAFBFD] py-3 text-center border-t border-[#EAEAEA] text-[11px] text-[#999]">
          공정 티케팅 플랫폼 · Fair Draw
        </div>

      </div>
    </div>
  );
}