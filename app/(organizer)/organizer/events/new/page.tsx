'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiFetch } from '@/lib/api';
import { toKstIso } from '@/lib/datetime';
import { newEventSchema, type NewEventFormValues } from '@/lib/eventSchema';
import { EventInfoFields, inputCls, toNumber } from '@/components/organizer/EventInfoFields';
import type { EventInput, EventItem, SectionInput } from '@/types/api';

function NewEventFormContent() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<NewEventFormValues>({
    resolver: zodResolver(newEventSchema),
    defaultValues: {
      ballotsPerUser: 3,
      maxTeamSize: 2,
      sections: [
        { name: 'VIP석', capacity: 50 },
        { name: '일반석', capacity: 150 },
      ],
    },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  // useFieldArray가 Suspense 경계 내부에서 안전하게 실행됩니다.
  const { fields, append, remove } = useFieldArray({ control, name: 'sections' });

  async function onSubmit({ sections, ...v }: NewEventFormValues) {
    setServerError(null);
    const body: EventInput = {
      ...v,
      eventAt: toKstIso(v.eventAt),
      entryStartAt: toKstIso(v.entryStartAt),
      entryEndAt: toKstIso(v.entryEndAt),
      paymentDeadlineAt: toKstIso(v.paymentDeadlineAt),
    };
    let created: EventItem | null = null;
    try {
      // 1) 공연 기본 정보 생성
      created = await apiFetch<EventItem>('/api/events', { method: 'POST', body: JSON.stringify(body) });
      // 2) 발급된 ID로 구역 등록
      for (const s of sections) {
        const section: SectionInput = { name: s.name, capacity: s.capacity, price: s.price ?? null };
        await apiFetch(`/api/events/${created.id}/sections`, { method: 'POST', body: JSON.stringify(section) });
      }
      router.push(`/organizer/events/${created.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
      setServerError(
        created
          ? `공연은 생성되었으나 구역 등록 중 오류가 발생하였습니다: ${msg} (공연 상세 화면에서 확인해 주시기 바랍니다.)`
          : msg,
      );
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">새 공연 등록</h1>
          <p className="mt-1 text-sm text-stone-500">
            공연 기본 정보와 구역별 정원을 등록해 주세요. 저장 시 &lsquo;준비 중&rsquo; 상태로 등록되며, 상세 관리 화면에서 최종 검토 후 [응모 개시]를 승인하실 수 있습니다.
          </p>
        </div>

        {/* 1. 공연 기본 정보 섹션 */}
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
          <h2 className="mb-4 text-base font-bold text-stone-900">공연 정보 및 대표 이미지</h2>
          <EventInfoFields />
        </section>

        {/* 2. 좌석 구역 등록 섹션 */}
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">좌석 구역 및 정원 설정</h2>
              <p className="text-xs text-stone-500">최소 1개 이상의 구역(예: VIP석, R석, 스탠딩)을 등록해 주셔야 합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => append({ name: '', capacity: undefined as unknown as number })}
              className="inline-flex items-center gap-1.5 self-start rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50"
            >
              <span>+ 구역 추가</span>
            </button>
          </div>

          <div className="hidden grid-cols-[1.2fr_1fr_1.2fr_auto] gap-3 px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-stone-500 sm:grid">
            <span>구역 명칭</span>
            <span>배정 정원 (석)</span>
            <span>구역별 티켓 가격 (비우면 기본가 적용)</span>
            <span className="w-12 text-center">관리</span>
          </div>

          <ul className="space-y-3">
            {fields.map((f, i) => {
              const err = errors.sections?.[i];
              return (
                <li key={f.id} className="grid gap-2.5 rounded-xl border border-stone-100 bg-stone-50/50 p-3 sm:grid-cols-[1.2fr_1fr_1.2fr_auto] sm:border-0 sm:bg-transparent sm:p-0">
                  <div>
                    <input
                      aria-label={`${i + 1}번 구역 명칭`}
                      placeholder="예) VIP석, 스탠딩 A"
                      className={inputCls}
                      aria-invalid={!!err?.name}
                      {...register(`sections.${i}.name`)}
                    />
                    {err?.name && <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{err.name.message}</p>}
                  </div>
                  <div>
                    <input
                      aria-label={`${i + 1}번 구역 정원`}
                      type="number"
                      placeholder="정원 (예: 100)"
                      className={inputCls}
                      aria-invalid={!!err?.capacity}
                      {...register(`sections.${i}.capacity`, { setValueAs: toNumber })}
                    />
                    {err?.capacity && <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{err.capacity.message}</p>}
                  </div>
                  <div>
                    <input
                      aria-label={`${i + 1}번 구역 가격`}
                      type="number"
                      placeholder="기본 가격 사용"
                      className={inputCls}
                      aria-invalid={!!err?.price}
                      {...register(`sections.${i}.price`, { setValueAs: toNumber })}
                    />
                    {err?.price && <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{err.price.message}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={fields.length === 1}
                    className="flex h-[42px] w-full items-center justify-center rounded-xl text-xs font-semibold text-stone-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 sm:w-12"
                    aria-label={`${i + 1}번 구역 삭제`}
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>

          {errors.sections?.root && (
            <p role="alert" className="mt-3 text-xs font-medium text-rose-600">{errors.sections.root.message}</p>
          )}
          {errors.sections?.message && (
            <p role="alert" className="mt-3 text-xs font-medium text-rose-600">{errors.sections.message}</p>
          )}
        </section>

        {serverError && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {serverError}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-200/60"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-stone-800 disabled:opacity-50"
          >
            {isSubmitting ? '공연 및 구역 정보를 저장하는 중입니다…' : '공연 등록 완료'}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

// Next.js 16 빌드 환경에서 정적 사전 렌더링 크래시를 방지하기 위해 Suspense로 래핑
export default function NewEventPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center rounded-2xl border border-stone-200 bg-white">
          <p className="text-sm font-semibold text-stone-400">공연 등록 화면을 불러오는 중입니다…</p>
        </div>
      }
    >
      <NewEventFormContent />
    </Suspense>
  );
}