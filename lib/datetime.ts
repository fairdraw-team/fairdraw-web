// 날짜 유틸 — 백엔드는 시간대(+09:00)가 없으면 400을 돌려준다.

/** datetime-local 값 "2026-12-20T19:00" → "2026-12-20T19:00:00+09:00" (브라우저 시간대와 무관하게 KST 고정) */
export function toKstIso(local: string): string {
  return `${local.length === 16 ? `${local}:00` : local}+09:00`;
}

/** ISO 문자열 → datetime-local 입력값 "YYYY-MM-DDTHH:mm" (KST 기준, 수정 폼 기본값용) */
export function toLocalInput(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 16);
}

const kstFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatKst(iso: string): string {
  return kstFormat.format(new Date(iso));
}

/** 마감까지 남은 시간: D-3 / 5시간 남음 / 12분 남음 / 마감됨 */
export function timeLeft(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return '마감됨';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `D-${days}`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}시간 남음`;
  return `${Math.ceil(ms / 60_000)}분 남음`;
}
