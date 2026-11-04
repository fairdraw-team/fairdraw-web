'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Smartphone, ShieldCheck, CheckCircle2, User } from 'lucide-react';

export default function VerifyPhonePage() {
  const router = useRouter();

  // 1. 휴대폰 번호 및 OTP 상태
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // 2. 가이드 6번: 실명 입력 상태
  const [realName, setRealName] = useState('');

  const [loading, setLoading] = useState(false);

  // 010-1234-5678 -> +821012345678 변환 (E.164 포맷)
  const formatToE164 = (raw: string): string => {
    const clean = raw.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      return `+82${clean.slice(1)}`;
    }
    if (clean.startsWith('82')) {
      return `+${clean}`;
    }
    return `+82${clean}`;
  };

  // 1. 인증번호 받기
  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      alert('휴대폰 번호를 입력해주세요.');
      return;
    }

    const formattedPhone = formatToE164(phoneNumber);

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        phone: formattedPhone,
      });

      if (error) {
        alert(`인증번호 발송 실패: ${error.message}`);
        return;
      }

      setIsOtpSent(true);
      alert('인증번호 요청이 완료되었습니다. (테스트 코드: 123456)');
    } catch (err: any) {
      alert('인증번호 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 2. 인증번호 확인
  const handleVerifyOtp = async () => {
    if (!otpToken.trim()) {
      alert('인증번호 6자리를 입력해주세요.');
      return;
    }

    const formattedPhone = formatToE164(phoneNumber);

    try {
      setLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpToken.trim(),
        type: 'phone_change',
      });

      if (error) {
        alert(`인증 실패: ${error.message}`);
        return;
      }

      setIsPhoneVerified(true);
      alert('휴대폰 번호 인증이 완료되었습니다. 이제 실명을 입력해주세요.');
    } catch (err: any) {
      alert('인증 확인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 3. 가이드 6번: 실명 저장 및 완료 (PATCH /api/me)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPhoneVerified) {
      alert('휴대폰 번호 인증을 먼저 완료해주세요.');
      return;
    }

    if (!realName.trim()) {
      alert('실명을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      // apiFetch를 사용해 { realName: '홍길동' } 형태로 전송
      await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ realName: realName.trim() }),
      });

      alert('실명 등록이 완료되었습니다! 내 정보 화면으로 이동합니다.');
      router.push('/me'); // 가이드 8번 내 정보 화면으로 이동
    } catch (err: any) {
      alert(err.message || '실명 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-[#D5D8DC] overflow-hidden flex flex-col">
        {/* 상단 다크 헤더 */}
        <div className="bg-[#1C202B] px-5 py-3.5 flex items-center justify-between text-white border-b border-slate-700">
          <div className="flex items-center gap-1">
            <span className="text-sm font-black tracking-tighter">
              ticket<span className="text-[#3B73E8]">LINK</span>
            </span>
          </div>
          <span className="text-[11px] text-[#E5372B] font-bold">본인확인 절차</span>
        </div>

        {/* 본문 폼 */}
        <form onSubmit={handleSaveProfile} className="p-6 flex flex-col gap-5">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-blue-50 text-[#3B73E8] rounded-xl flex items-center justify-center mb-2 border border-blue-100">
              <Smartphone className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-[#111]">본인인증 및 실명 등록</h1>
            <p className="text-xs text-[#666] mt-1 leading-relaxed">
              공정 추첨 관리를 위해 <strong>휴대폰 번호</strong>와 <strong>실명</strong>을 입력해주세요.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. 휴대폰 번호 입력 및 인증번호 받기 */}
            <div>
              <label className="block font-bold text-[#333] mb-1">
                휴대폰 번호 <span className="text-[#E5372B]">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="010-1234-5678"
                  value={phoneNumber}
                  disabled={loading || isPhoneVerified}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-[#D5D8DC] rounded-lg text-xs outline-none focus:border-[#3B73E8] disabled:bg-slate-100 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || isPhoneVerified}
                  className="px-3.5 py-2.5 bg-[#1C202B] hover:bg-black text-white font-bold rounded-lg transition disabled:bg-slate-300 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                >
                  {isOtpSent ? '재요청' : '인증번호 받기'}
                </button>
              </div>
            </div>

            {/* 2. 인증번호 확인 */}
            <div>
              <label className="block font-bold text-[#333] mb-1">
                인증번호 <span className="text-[#E5372B]">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder={isOtpSent ? '123456' : '인증번호를 요청해주세요'}
                  value={otpToken}
                  disabled={!isOtpSent || loading || isPhoneVerified}
                  onChange={(e) => setOtpToken(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-[#D5D8DC] rounded-lg text-xs font-mono tracking-widest outline-none focus:border-[#3B73E8] disabled:bg-slate-100 disabled:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={!isOtpSent || loading || isPhoneVerified}
                  className="px-4 py-2.5 bg-[#3B73E8] hover:bg-blue-600 text-white font-bold rounded-lg transition shrink-0 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  확인
                </button>
              </div>
              <p className="text-[11px] text-[#888] mt-1">
                * 1주차 테스트 환경: 등록된 테스트 번호 및 코드 <code>123456</code> 입력
              </p>
            </div>

            {/* 인증 완료 상태 배너 */}
            {isPhoneVerified && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 flex items-center gap-1.5 font-medium animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>휴대폰 번호 인증이 완료되었습니다.</span>
              </div>
            )}

            {/* 3. 실명 입력창 (가이드 6번 추가 항목) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block font-bold text-[#333] mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#3B73E8]" />
                실명 (이름) <span className="text-[#E5372B]">*</span>
              </label>
              <input
                type="text"
                placeholder="예: 홍길동"
                value={realName}
                disabled={loading}
                onChange={(e) => setRealName(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#D5D8DC] rounded-lg text-xs outline-none focus:border-[#3B73E8]"
              />
              <p className="text-[11px] text-[#888] mt-1">
                * 현장 본인확인 시 신분증 이름과 대조하므로 반드시 실명을 입력해주세요.
              </p>
            </div>
          </div>

          {/* 등록 완료 버튼 (PATCH /api/me 전송) */}
          <button
            type="submit"
            disabled={loading || !isPhoneVerified || !realName.trim()}
            className="w-full mt-2 py-3 bg-[#E5372B] hover:bg-[#d02430] text-white font-bold text-xs rounded-xl transition shadow disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? '저장 중...' : '실명 등록 완료하기'}
          </button>

          <div className="flex items-center justify-center gap-1 text-[11px] text-[#888]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3B73E8]" />
            <span>암표 방지 1인 1계정 본인인증 원칙 준수</span>
          </div>
        </form>
      </div>
    </div>
  );
}