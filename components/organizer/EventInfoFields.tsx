'use client';
// 공연 기본 정보 및 포스터 이미지 입력 (관계자용 정중한 존댓말 적용)
import { useState } from 'react';
import { useFormContext, type FieldError } from 'react-hook-form';
import type { EventFormValues } from '@/lib/eventSchema';

export const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-xs outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 aria-[invalid=true]:border-rose-500';

export const toNumber = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));

export function Field({ label, error, children, hint }: { label: string; error?: FieldError; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="block text-xs font-medium text-rose-600">
          {error.message}
        </span>
      ) : hint ? (
        <span className="block text-xs text-stone-500">{hint}</span>
      ) : null}
    </label>
  );
}

const PRESET_POSTERS = [
  { label: '록 콘서트', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80' },
  { label: '오케스트라', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80' },
  { label: '페스티벌', url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&auto=format&fit=crop&q=80' },
  { label: '뮤지컬·연극', url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=80' },
];

export function EventInfoFields() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<EventFormValues>();

  const posterUrl = watch('posterUrl');
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileError('이미지 파일(JPG, PNG, WebP)만 첨부하실 수 있습니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('이미지 파일 용량은 5MB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setValue('posterUrl', dataUrl, { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  }

  const date = (name: 'entryStartAt' | 'entryEndAt' | 'paymentDeadlineAt' | 'eventAt', label: string) => (
    <Field label={label} error={errors[name]}>
      <input type="datetime-local" className={inputCls} aria-invalid={!!errors[name]} {...register(name)} />
    </Field>
  );
  const number = (name: 'price' | 'ballotsPerUser' | 'maxTeamSize', label: string, hint?: string) => (
    <Field label={label} error={errors[name]} hint={hint}>
      <input type="number" inputMode="numeric" className={inputCls} aria-invalid={!!errors[name]} {...register(name, { setValueAs: toNumber })} />
    </Field>
  );

  return (
    <div className="space-y-6">
      {/* 1. 포스터 이미지 등록 영역 */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:p-5">
        <span className="block text-xs font-semibold uppercase tracking-wider text-stone-700">공연 대표 포스터</span>
        <p className="mt-0.5 text-xs text-stone-500">관객 목록과 예매 상세 페이지에 노출될 대표 이미지입니다.</p>

        <div className="mt-3.5 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-xs sm:w-32">
            {posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posterUrl} alt="포스터 미리보기" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-stone-400">
                <svg className="h-8 w-8 stroke-stone-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                <span className="mt-1 text-[11px] font-medium">등록된 사진 없음</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800">
                <span>사진 파일 선택</span>
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
              {posterUrl && (
                <button
                  type="button"
                  onClick={() => setValue('posterUrl', undefined, { shouldDirty: true })}
                  className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  사진 삭제
                </button>
              )}
            </div>

            {fileError && <p role="alert" className="text-xs font-medium text-rose-600">{fileError}</p>}

            <div>
              <span className="block text-[11px] font-medium text-stone-500">추천 샘플 포스터 즉시 선택:</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PRESET_POSTERS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setValue('posterUrl', preset.url, { shouldDirty: true })}
                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-2xs hover:border-stone-400 hover:bg-stone-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <input
                type="url"
                placeholder="포스터 이미지 외부 웹 주소(URL)를 직접 입력하실 수도 있습니다."
                className={inputCls}
                {...register('posterUrl')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 기본 정보 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="공연 제목" error={errors.title}>
          <input className={inputCls} aria-invalid={!!errors.title} placeholder="예) 2026 청춘 밴드 페스티벌" {...register('title')} />
        </Field>
        <Field label="공연 장소" error={errors.venue}>
          <input className={inputCls} aria-invalid={!!errors.venue} placeholder="예) 국립극장 해오름극장" {...register('venue')} />
        </Field>
      </div>

      {/* 3. 일정 */}
      <fieldset className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-700">
          공연 및 응모 일정 (자동 검증)
        </legend>
        <p className="mb-3 px-1 text-xs text-stone-500">
          안내: <strong>응모 시작 &lt; 응모 마감 &lt; 결제 마감 &lt; 공연 일시</strong> 순서로 입력해 주셔야 정상 등록됩니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {date('entryStartAt', '1. 응모 시작 일시')}
          {date('entryEndAt', '2. 응모 마감 일시')}
          {date('paymentDeadlineAt', '3. 당첨자 결제 마감 일시')}
          {date('eventAt', '4. 실제 공연 일시')}
        </div>
      </fieldset>

      {/* 4. 가격 및 추첨 옵션 */}
      <div className="grid gap-4 sm:grid-cols-3">
        {number('price', '기본 티켓 가격 (원)', '구역별 가격 미지정 시 기본가 적용')}
        {number('ballotsPerUser', '1인당 부여 제비 수', '공정 추첨 기본값: 3장')}
        {number('maxTeamSize', '최대 연석 팀 인원', '동반 신청 인원 제한 (기본 2인)')}
      </div>
    </div>
  );
}
