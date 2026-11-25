'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toKstIso } from '@/lib/datetime';
import { newEventSchema, type NewEventFormValues } from '@/lib/eventSchema';
import {
  EventInfoFields,
  inputCls,
  toNumber,
} from '@/components/organizer/EventInfoFields';
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'sections',
  });

  async function onSubmit({ sections, ...v }: NewEventFormValues) {
    setServerError(null);
    const body: EventInput = {
      ...v,
      startsAt: toKstIso(v.startsAt),
      entryOpensAt: toKstIso(v.entryOpensAt),
      entryClosesAt: toKstIso(v.entryClosesAt),
      paymentDueAt: toKstIso(v.paymentDueAt),
    };
    let created: EventItem | null = null;
    try {
      created = await apiFetch<EventItem>('/api/events', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      for (const s of sections) {
        const section: SectionInput = {
          name: s.name,
          capacity: s.capacity,
          price: s.price ?? null,
        };
        await apiFetch(`/api/events/${created.id}/sections`, {
          method: 'POST',
          body: JSON.stringify(section),
        });
      }
      router.push(`/organizer/events/${created.id}`);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
      setServerError(
        created
          ? `공연은 생성되었으나 구역 등록 중 오류가 발생하였습니다: ${msg} (공연 상세 화면에서 확인해 주시기 바랍니다.)`
          : msg,
      );
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mx-auto max-w-3xl space-y-5"
      >
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7684] transition-colors hover:text-[#191F28]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>주최 공연 목록</span>
        </Link>

        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#191F28]">
            새 공연 등록
          </h1>
          <p className="mt-1 text-xs text-[#6B7684]">
            저장 시 &lsquo;준비 중&rsquo; 상태로 생성되며, 상세 관리 화면에서 검토 후 응모를 열 수 있습니다.
          </p>
        </div>

        {/* 1. 기본 정보 */}
        <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
          <div className="border-b border-[#E5E8EB] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[#191F28]">
              공연 기본 정보 및 일정
            </h2>
          </div>
          <div className="p-5">
            <EventInfoFields />
          </div>
        </section>

        {/* 2. 좌석 구역 설정 */}
        <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E8EB] px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-[#191F28]">
                좌석 구역 및 정원
              </h2>
              <p className="mt-0.5 text-xs text-[#6B7684]">
                최소 1개 이상의 구역을 등록해야 합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                append({ name: '', capacity: undefined as unknown as number })
              }
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#D1D6DB] bg-white px-3 py-1.5 text-xs font-medium text-[#191F28] transition-colors hover:bg-[#F2F4F6]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>구역 추가</span>
            </button>
          </div>

          <div className="p-5">
            <div className="hidden grid-cols-[1.2fr_1fr_1.2fr_40px] gap-3 pb-2 text-[11px] font-medium text-[#6B7684] sm:grid">
              <span>구역명</span>
              <span>배정 정원 (석)</span>
              <span>구역별 가격 (미입력 시 기본가)</span>
              <span className="text-center">삭제</span>
            </div>

            <ul className="space-y-2.5">
              {fields.map((f, i) => {
                const err = errors.sections?.[i];
                return (
                  <li
                    key={f.id}
                    className="grid gap-2.5 rounded-md border border-[#E5E8EB] bg-[#F9FAFB] p-3 sm:grid-cols-[1.2fr_1fr_1.2fr_40px] sm:border-0 sm:bg-transparent sm:p-0"
                  >
                    <div>
                      <input
                        aria-label={`${i + 1}번 구역 명칭`}
                        placeholder="예) VIP석, 스탠딩 A"
                        className={inputCls}
                        aria-invalid={!!err?.name}
                        {...register(`sections.${i}.name`)}
                      />
                      {err?.name && (
                        <p
                          role="alert"
                          className="mt-1 text-xs font-medium text-rose-600"
                        >
                          {err.name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        aria-label={`${i + 1}번 구역 정원`}
                        type="number"
                        placeholder="정원 (예: 100)"
                        className={`${inputCls} tabular-nums`}
                        aria-invalid={!!err?.capacity}
                        {...register(`sections.${i}.capacity`, {
                          setValueAs: toNumber,
                        })}
                      />
                      {err?.capacity && (
                        <p
                          role="alert"
                          className="mt-1 text-xs font-medium text-rose-600"
                        >
                          {err.capacity.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        aria-label={`${i + 1}번 구역 가격`}
                        type="number"
                        placeholder="기본가 적용"
                        className={`${inputCls} tabular-nums`}
                        aria-invalid={!!err?.price}
                        {...register(`sections.${i}.price`, {
                          setValueAs: toNumber,
                        })}
                      />
                      {err?.price && (
                        <p
                          role="alert"
                          className="mt-1 text-xs font-medium text-rose-600"
                        >
                          {err.price.message}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      disabled={fields.length === 1}
                      className="flex h-[38px] w-full cursor-pointer items-center justify-center rounded-md border border-transparent text-[#8B95A1] transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 sm:w-10"
                      aria-label={`${i + 1}번 구역 삭제`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {errors.sections?.root && (
              <p
                role="alert"
                className="mt-3 text-xs font-medium text-rose-600"
              >
                {errors.sections.root.message}
              </p>
            )}
            {errors.sections?.message && (
              <p
                role="alert"
                className="mt-3 text-xs font-medium text-rose-600"
              >
                {errors.sections.message}
              </p>
            )}
          </div>
        </section>

        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
          >
            {serverError}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[#E5E8EB] pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="cursor-pointer rounded-md border border-[#D1D6DB] bg-white px-4 py-2 text-xs font-medium text-[#4E5968] transition-colors hover:bg-[#F2F4F6]"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-md bg-[#1B64DA] px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1554BD] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '저장 중…' : '공연 등록 완료'}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

export default function NewEventPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-[#E5E8EB] bg-white px-6 py-16 text-center text-xs text-[#6B7684]">
          공연 등록 화면을 불러오는 중입니다…
        </div>
      }
    >
      <NewEventFormContent />
    </Suspense>
  );
}
