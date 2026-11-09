// 공연 입력 유효성 검사 규칙 (zod) — 관계자용 정중한 존댓말 안내
import { z } from 'zod';

const num = (label: string, min: number) =>
  z
    .number({ message: `${label} 항목을 올바른 숫자로 입력해 주세요.` })
    .int(`${label} 항목은 정수 단위로만 입력 가능합니다.`)
    .min(min, `${label} 항목은 ${min} 이상이어야 합니다.`);

const dateField = (label: string) => z.string().min(1, `${label} 일시를 입력해 주세요.`);

export const sectionSchema = z.object({
  name: z.string().trim().min(1, '구역 명칭을 입력해 주세요.'),
  capacity: num('배정 정원', 1),
  price: num('구역 티켓 가격', 0).optional(),
});

const eventFields = z.object({
  title: z.string().trim().min(1, '공연 제목을 입력해 주세요.'),
  venue: z.string().trim().min(1, '공연 장소를 입력해 주세요.'),
  posterUrl: z.string().optional(),
  eventAt: dateField('공연 일시'),
  entryStartAt: dateField('응모 시작 일시'),
  entryEndAt: dateField('응모 마감 일시'),
  paymentDeadlineAt: dateField('결제 마감 일시'),
  price: num('기본 티켓 가격', 0),
  ballotsPerUser: num('1인당 제비 수', 1),
  maxTeamSize: num('최대 연석 인원', 1),
});

type DateKey = 'entryStartAt' | 'entryEndAt' | 'paymentDeadlineAt' | 'eventAt';
const ORDER: [DateKey, string][] = [
  ['entryStartAt', '응모 시작'],
  ['entryEndAt', '응모 마감'],
  ['paymentDeadlineAt', '당첨자 결제 마감'],
  ['eventAt', '실제 공연'],
];

function checkDateOrder(v: Record<DateKey, string>, ctx: z.RefinementCtx) {
  for (let i = 1; i < ORDER.length; i++) {
    const [prevKey, prevLabel] = ORDER[i - 1];
    const [key, label] = ORDER[i];
    if (v[prevKey] && v[key] && v[key] <= v[prevKey]) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: `${label} 일시는 ${prevLabel} 일시보다 이후여야 합니다.`,
      });
    }
  }
}

// 공연 정보 수정 화면용
export const eventSchema = eventFields.superRefine(checkDateOrder);

// 새 공연 등록 화면용: 기본 정보 + 최소 1개 구역 필수
export const newEventSchema = eventFields
  .extend({ sections: z.array(sectionSchema).min(1, '최소 1개 이상의 좌석 구역을 추가해 주세요.') })
  .superRefine(checkDateOrder)
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.sections.forEach((s, i) => {
      if (seen.has(s.name)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sections', i, 'name'],
          message: '중복된 구역 명칭이 존재합니다. 다른 이름을 지정해 주세요.',
        });
      }
      seen.add(s.name);
    });
  });

export type EventFormValues = z.infer<typeof eventSchema>;
export type NewEventFormValues = z.infer<typeof newEventSchema>;
