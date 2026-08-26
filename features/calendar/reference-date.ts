import type { ChecklistItem } from "@/lib/visa-schedule/default-checklist";

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * item에 이미 startDate(공고 회차형 절대 날짜)가 있으면 그대로 쓴다.
 * startDate가 없고 referenceEvent/offsetDays형이면, 사용자가 기준일을 입력했을 때만 계산한다.
 * 기준일이 없으면 null — 자동으로 날짜를 추정하지 않는다 (AGENTS.md 원칙).
 */
export function resolveChecklistDate(item: ChecklistItem, referenceDate: string | null): string | null {
  if (item.startDate) return item.startDate;
  if (referenceDate && typeof item.offsetDays === "number") {
    return addDays(referenceDate, item.offsetDays);
  }
  return null;
}
