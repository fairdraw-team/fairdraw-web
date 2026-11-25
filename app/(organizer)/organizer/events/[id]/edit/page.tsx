'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toKstIso, toLocalInput } from '@/lib/datetime';
import { eventSchema, type EventFormValues } from '@/lib/eventSchema';
import { EventInfoFields } from '@/components/organizer/EventInfoFields';
import type { EventInput, EventItem } from '@/types/api';

function EditEventContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<EventFormValues>({ resolver: zodResolver(eventSchema) });

  useEffect(() => {
    if (!id) return;
    apiFetch<EventItem>(`/api/events/${id}`)
      .then((ev) => {
        form.reset({
          title: ev.title,
          venue: ev.venue,
          posterUrl: ev.posterUrl,
          price: ev.price,
          ballotsPerUser: ev.ballotsPerUser,
          maxTeamSize: ev.maxTeamSize,
          startsAt: toLocalInput(ev.startsAt),
          entryOpensAt: toLocalInput(ev.entryOpensAt),
          entryClosesAt: toLocalInput(ev.entryClosesAt),
          paymentDueAt: toLocalInput(ev.paymentDueAt),
        });
        setLoaded(true);
      })
      .catch((e: Error) => setServerError(e.message));
  }, [id, form]);

  async function onSubmit(v: EventFormValues) {
    setServerError(null);
    const body: EventInput = {
      ...v,
      startsAt: toKstIso(v.startsAt),
      entryOpensAt: toKstIso(v.entryOpensAt),
      entryClosesAt: toKstIso(v.entryClosesAt),
      paymentDueAt: toKstIso(v.paymentDueAt),
    };
    try {
      await apiFetch(`/api/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      router.push(`/organizer/events/${id}`);
    } catch (e) {
      setServerError(
        e instanceof Error ? e.message : '수정 사항 저장에 실패하였습니다.',
      );
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="mx-auto max-w-3xl space-y-5"
      >
        <Link
          href={`/organizer/events/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7684] transition-colors hover:text-[#191F28]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>공연 상세로 돌아가기</span>
        </Link>

        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#191F28]">
            공연 정보 수정
          </h1>
          <p className="mt-1 text-xs text-[#6B7684]">
            응모 개시 전 &lsquo;준비 중&rsquo; 상태의 공연만 기본 정보와 일정을 수정할 수 있습니다.
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
          >
            {serverError}
          </div>
        )}

        {loaded ? (
          <>
            <section className="overflow-hidden rounded-lg border border-[#E5E8EB] bg-white">
              <div className="border-b border-[#E5E8EB] px-5 py-3.5">
                <h2 className="text-sm font-semibold text-[#191F28]">
                  기본 정보 및 일정
                </h2>
              </div>
              <div className="p-5">
                <EventInfoFields />
              </div>
            </section>

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
                disabled={form.formState.isSubmitting}
                className="cursor-pointer rounded-md bg-[#1B64DA] px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1554BD] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {form.formState.isSubmitting ? '저장 중…' : '수정 내용 저장'}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-[#E5E8EB] bg-white px-6 py-16 text-center text-xs text-[#6B7684]">
            공연 정보를 불러오는 중입니다…
          </div>
        )}
      </form>
    </FormProvider>
  );
}

export default function EditEventPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-[#E5E8EB] bg-white px-6 py-16 text-center text-xs text-[#6B7684]">
          공연 수정 화면을 불러오는 중입니다…
        </div>
      }
    >
      <EditEventContent />
    </Suspense>
  );
}
