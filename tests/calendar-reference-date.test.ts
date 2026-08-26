import { describe, expect, it } from "vitest";
import { addDays, resolveChecklistDate } from "@/features/calendar/reference-date";
import type { ChecklistItem } from "@/lib/visa-schedule/default-checklist";

const relativeItem: ChecklistItem = {
  id: "relative-item",
  visaId: "F-4-R",
  order: 1,
  title: "기준일 이후 절차",
  referenceEvent: "entry",
  offsetDays: 90,
  source: "mock-data",
};

describe("calendar reference dates", () => {
  it("adds days using UTC calendar dates", () => {
    expect(addDays("2026-01-01", 90)).toBe("2026-04-01");
  });

  it("resolves relative checklist dates from the reference date", () => {
    expect(resolveChecklistDate(relativeItem, "2026-01-01")).toBe("2026-04-01");
    expect(resolveChecklistDate(relativeItem, null)).toBeNull();
  });
});
