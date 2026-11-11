'use client';



import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatKst } from '@/lib/datetime';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Ticket,
  Users,
  Lock,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface Section {
  id: string;
  name: string;
  capacity: number;
  price: number;
  entryCount?: number;
}

interface OrganizerEventDetail {
  id: string;
  title: string;
  venue: string;
  eventAt: string;
  entryEndAt: string;
  status: 'draft' | 'open' | 'closed' | 'drawn' | 'done';
  ballotsPerPerson: number;
  sections: Section[];
  totalEntries?: number;
  rosterHash?: string;
  sealedAt?: string;
}

export default function OrganizerEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = (params?.id as string) || '';

  const [event, setEvent] = useState<OrganizerEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sealing, setSealing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchEventDetail() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<OrganizerEventDetail>(`/api/organizer/events/${eventId}`);
      setEvent(data);
    } catch (err: any) {
      setError(err.message || '공연 상세 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventId) {
      fetchEventDetail();
    }
  }, [eventId]);

  // 마감(명단 봉인) 요청
  const handleSealEvent = async () => {
    if (!window.confirm('정말 응모를 마감하고 명단을 봉인하시겠습니까?\n마감 이후에는 관객 응모 및 취소가 영구히 차단됩니다.')) {
      return;
    }

    try {
      setSealing(true);
      await apiFetch(`/api/organizer/events/${eventId}/seal`, {
        method: 'POST',
      });
      alert('응모가 정상적으로 마감되고 명단 지문(해시)이 생성되었습니다.');
      await fetchEventDetail();
    } catch (err: any) {
      alert(err.message || '마감 처리에 실패했습니다.');
    } finally {
      setSealing(false);
    }
  };

  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('해시 복사에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-stone-200 bg-white">
        <p className="text-sm font-semibold text-stone-500">공연 및 응모 현황을 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-600 mb-2" />
        <h2 className="text-base font-bold text-rose-900">{error || '공연 정보를 찾을 수 없습니다.'}</h2>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={fetchEventDetail}
            className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-stone-700 border border-stone-200 shadow-xs hover:bg-stone-50"
          >
            다시 시도
          </button>
          <Link
            href="/organizer/events"
            className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const isClosedOrDrawn = event.status === 'closed' || event.status === 'drawn' || event.status === 'done';

  return (
    <div className="space-y-6">
      {/* 상단 네비게이션 & 액션 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>주최 공연 목록으로</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchEventDetail}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>새로고침</span>
          </button>

          {/* 마감(봉인) 버튼 */}
          {!isClosedOrDrawn && (
            <button
              type="button"
              onClick={handleSealEvent}
              disabled={sealing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{sealing ? '봉인 처리 중...' : '응모 마감 (명단 봉인)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 공연 헤더 정보 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 mb-2">
          <StatusBadge status={event.status} />
          <span className="text-xs font-bold text-stone-400">ID: {event.id}</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
          {event.title}
        </h1>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-stone-100 pt-4 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-stone-400" />
            <span>공연일시: <strong>{formatKst(event.eventAt)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-stone-400" />
            <span>장소: <strong>{event.venue}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-stone-400" />
            <span>1인당 제비: <strong>최대 {event.ballotsPerPerson}장</strong></span>
          </div>
        </div>
      </div>

      {/* 봉인 완료 지문 상자 (closed 이상일 때) */}
      {isClosedOrDrawn && event.rosterHash && (
        <div className="rounded-2xl border-2 border-stone-800 bg-stone-900 p-6 text-white shadow-md">
          <div className="flex items-center justify-between border-b border-stone-700 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#3B73E8]" />
              <h2 className="text-sm font-black">명단 봉인(Seal) 완료 정보</h2>
            </div>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
              위변조 방지 암호화 적용됨
            </span>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-800/80 p-3.5 rounded-xl border border-stone-700">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xs font-bold text-stone-400 shrink-0">명단 지문 (SHA-256):</span>
              <code className="text-xs font-mono font-bold text-rose-400 bg-stone-950 px-2 py-1 rounded">
                {event.rosterHash.slice(0, 8)}...{event.rosterHash.slice(-4)}
              </code>
            </div>
            <button
              type="button"
              onClick={() => handleCopyHash(event.rosterHash!)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-bold hover:bg-stone-600 transition shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">전체 복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>해시 전체 복사</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 구역별 좌석 및 응모 현황 표 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-black text-stone-900 mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-[#3B73E8]" />
          <span>구역별 정원 및 응모 현황</span>
        </h2>
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">구역명</th>
                <th className="py-2.5 px-4 font-semibold">좌석 정원</th>
                <th className="py-2.5 px-4 font-semibold">가격</th>
                <th className="py-2.5 px-4 font-semibold">현재 응모 제비</th>
                <th className="py-2.5 px-4 font-semibold">경쟁률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {event.sections?.map((sec) => {
                const count = sec.entryCount || 0;
                const ratio = sec.capacity > 0 ? (count / sec.capacity).toFixed(2) : '0.00';

                return (
                  <tr key={sec.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-bold text-stone-900">{sec.name}</td>
                    <td className="py-3 px-4 text-stone-600">{sec.capacity.toLocaleString()}석</td>
                    <td className="py-3 px-4 text-stone-600">{sec.price > 0 ? `${sec.price.toLocaleString()}원` : '무료'}</td>
                    <td className="py-3 px-4 text-rose-600 font-bold">{count.toLocaleString()}장</td>
                    <td className="py-3 px-4 font-bold text-stone-900">{ratio} : 1</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
