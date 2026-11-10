'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiFetch } from '@/lib/api';
import { toKstIso, toLocalInput } from '@/lib/datetime';
import { eventSchema, type EventFormValues } from '@/lib/eventSchema';
import { EventInfoFields } from '@/components/organizer/EventInfoFields';
import type { EventInput, EventItem } from '@/types/api';

// 공연 정보 수정 (준비 중 상태일 때만 상세 화면에서 진입)
export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<EventFormValues>({ resolver: zodResolver(eventSchema) });

  useEffect(() => {
    apiFetch<EventItem>(`/api/events/${id}`)
      .then((ev) => {
        form.reset({
          title: ev.title,
          venue: ev.venue,
          posterUrl: ev.posterUrl,
          price: ev.price,
          ballotsPerUser: ev.ballotsPerUser,
          maxTeamSize: ev.maxTeamSize,
          eventAt: toLocalInput(ev.eventAt),
          entryStartAt: toLocalInput(ev.entryStartAt),
          entryEndAt: toLocalInput(ev.entryEndAt),
          paymentDeadlineAt: toLocalInput(ev.paymentDeadlineAt),
        });
        setLoaded(true);
      })
      .catch((e: Error) => setServerError(e.message));
  }, [id, form]);

  async function onSubmit(v: EventFormValues) {
    setServerError(null);
    const body: EventInput = {
      ...v,
      eventAt: toKstIso(v.eventAt),
      entryStartAt: toKstIso(v.entryStartAt),
      entryEndAt: toKstIso(v.entryEndAt),
      paymentDeadlineAt: toKstIso(v.paymentDeadlineAt),
    };
    try {
      await apiFetch(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      router.push(`/organizer/events/${id}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : '수정 사항 저장에 실패하였습니다.');
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">공연 정보 수정</h1>
          <p className="mt-1 text-sm text-stone-500">
            등록된 공연의 기본 정보 및 일정을 수정하실 수 있습니다. (응모 개시 전 준비 중인 공연만 수정 가능합니다.)
          </p>
        </div>

        {serverError && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {serverError}
          </div>
        )}

        {loaded ? (
          <>
            <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
              <EventInfoFields />
            </section>
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
                disabled={form.formState.isSubmitting}
                className="rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-stone-800 disabled:opacity-50"
              >
                {form.formState.isSubmitting ? '수정 사항을 저장하는 중입니다…' : '수정 내용 저장'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center rounded-2xl bg-white p-12 text-sm text-stone-400">
            공연 정보를 불러오는 중입니다…
          </div>
        )}
      </form>
    </FormProvider>
  );
}
