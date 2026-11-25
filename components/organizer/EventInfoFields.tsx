'use client';

import { useState } from 'react';
import { useFormContext, type FieldError } from 'react-hook-form';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import type { EventFormValues } from '@/lib/eventSchema';

export const inputCls =
  'w-full rounded-md border border-[#D1D6DB] bg-white px-3 py-2 text-sm text-[#191F28] placeholder:text-[#8B95A1] transition-colors focus:border-[#1B64DA] focus:outline-none focus:ring-2 focus:ring-[#1B64DA]/15 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:ring-rose-500/15';

export const toNumber = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : Number(v);

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: FieldError;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-[#333D4B]">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="block text-xs font-medium text-rose-600">
          {error.message}
        </span>
      ) : hint ? (
        <span className="block text-xs text-[#6B7684]">{hint}</span>
      ) : null}
    </label>
  );
}

const PRESET_POSTERS = [
  {
    label: '록 콘서트',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: '오케스트라',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: '페스티벌',
    url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: '뮤지컬·연극',
    url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=80',
  },
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

  const date = (
    name: 'entryOpensAt' | 'entryClosesAt' | 'paymentDueAt' | 'startsAt',
    label: string,
  ) => (
    <Field label={label} error={errors[name]}>
      <input
        type="datetime-local"
        className={`${inputCls} tabular-nums`}
        aria-invalid={!!errors[name]}
        {...register(name)}
      />
    </Field>
  );

  const number = (
    name: 'price' | 'ballotsPerUser' | 'maxTeamSize',
    label: string,
    hint?: string,
  ) => (
    <Field label={label} error={errors[name]} hint={hint}>
      <input
        type="number"
        inputMode="numeric"
        className={`${inputCls} tabular-nums`}
        aria-invalid={!!errors[name]}
        {...register(name, { setValueAs: toNumber })}
      />
    </Field>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="공연 제목" error={errors.title}>
          <input
            className={inputCls}
            aria-invalid={!!errors.title}
            placeholder="예) 2026 청춘 밴드 페스티벌"
            {...register('title')}
          />
        </Field>
        <Field label="공연 장소" error={errors.venue}>
          <input
            className={inputCls}
            aria-invalid={!!errors.venue}
            placeholder="예) 국립극장 해오름극장"
            {...register('venue')}
          />
        </Field>
      </div>

      <div className="rounded-lg border border-[#E5E8EB] bg-[#F9FAFB] p-4">
        <div className="text-xs font-medium text-[#333D4B]">대표 포스터 이미지</div>
        <p className="mt-0.5 text-xs text-[#6B7684]">
          관객 공연 목록 및 예매 상세 페이지에 표시됩니다. (권장 비율 3:4, 최대 5MB)
        </p>

        <div className="mt-3.5 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-md border border-[#E5E8EB] bg-white">
            {posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt="포스터 미리보기"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-[#8B95A1]">
                <ImageIcon className="h-5 w-5" aria-hidden="true" />
                <span className="mt-1 text-[11px]">미등록</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#D1D6DB] bg-white px-3 py-1.5 text-xs font-medium text-[#191F28] transition-colors hover:bg-[#F2F4F6]">
                <Upload className="h-3.5 w-3.5 text-[#4E5968]" aria-hidden="true" />
                <span>파일 업로드</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              {posterUrl && (
                <button
                  type="button"
                  onClick={() => setValue('posterUrl', undefined, { shouldDirty: true })}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#E5E8EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#6B7684] transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>삭제</span>
                </button>
              )}
            </div>

            {fileError && (
              <p role="alert" className="text-xs font-medium text-rose-600">
                {fileError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[#6B7684]">샘플 이미지:</span>
              {PRESET_POSTERS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setValue('posterUrl', preset.url, { shouldDirty: true })}
                  className="cursor-pointer rounded border border-[#E5E8EB] bg-white px-2 py-0.5 text-[11px] font-medium text-[#4E5968] transition-colors hover:border-[#B0B8C1] hover:text-[#191F28]"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              type="url"
              placeholder="이미지 외부 URL 직접 입력…"
              className={inputCls}
              {...register('posterUrl')}
            />
          </div>
        </div>
      </div>

      <fieldset className="rounded-lg border border-[#E5E8EB] bg-[#F9FAFB] p-4">
        <legend className="px-1 text-xs font-semibold text-[#191F28]">
          일정 설정
        </legend>
        <p className="mb-3 px-1 text-xs text-[#6B7684]">
          <strong className="font-medium text-[#333D4B]">
            응모 시작 &lt; 응모 마감 &lt; 결제 마감 &lt; 공연 일시
          </strong>{' '}
          순서로 입력해야 정상 저장됩니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {date('entryOpensAt', '응모 시작 일시')}
          {date('entryClosesAt', '응모 마감 일시')}
          {date('paymentDueAt', '당첨자 결제 마감 일시')}
          {date('startsAt', '실제 공연 일시')}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        {number('price', '기본 티켓 가격 (원)', '구역별 가격 미입력 시 적용')}
        {number('ballotsPerUser', '1인당 부여 제비 수', '공정 추첨 기본값 3장')}
        {number('maxTeamSize', '최대 연석 팀 인원', '동반 응모 인원 제한 (기본 2명)')}
      </div>
    </div>
  );
}
