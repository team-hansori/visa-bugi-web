import type { ChecklistItem } from "@/lib/visa-schedule/default-checklist";
import type { CalendarGridEvent } from "./calendar-grid";
import { resolveChecklistDate } from "./reference-date";

/**
 * Builds calendar-grid events for a checklist, marking both the resolved
 * start date and (if present and different) the end date — shared by the
 * guest and logged-in views so the two stay in sync. referenceDate is only
 * relevant for offset-based items (see resolveChecklistDate); pass null for
 * the guest view, which never has a reference date.
 */
export function buildChecklistEvents(
  items: ChecklistItem[],
  referenceDate: string | null,
): Record<string, CalendarGridEvent[]> {
  const map: Record<string, CalendarGridEvent[]> = {};
  function push(date: string, event: CalendarGridEvent) {
    map[date] = [...(map[date] ?? []), event];
  }
  for (const item of items) {
    const startDate = resolveChecklistDate(item, referenceDate);
    if (startDate) push(startDate, { id: `${item.id}-start`, label: `${item.title} 시작` });
    if (item.endDate && item.endDate !== startDate) {
      push(item.endDate, { id: `${item.id}-end`, label: `${item.title} 마감` });
    }
  }
  return map;
}

export function findChecklistItemsForDate(
  items: ChecklistItem[],
  referenceDate: string | null,
  selectedDate: string | null,
): ChecklistItem[] {
  if (!selectedDate) return [];
  return items.filter((item) => {
    const startDate = resolveChecklistDate(item, referenceDate);
    return startDate === selectedDate || item.endDate === selectedDate;
  });
}
