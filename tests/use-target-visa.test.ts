import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveTargetVisaId } from "@/features/calendar/use-target-visa";

// resolveTargetVisaId는 lib/onboarding/target-visa의 resolveStoredTargetVisaCode를
// 그대로 재수출한다. 상세 케이스는 tests/target-visa-profile.test.ts에 있고,
// 여기서는 캘린더가 쓰는 재수출 경로가 공용 API를 통해 동작하는지만 확인한다.

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("resolveTargetVisaId", () => {
  it("공용 API가 준 목표 비자 코드를 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ targetVisaCode: "F-2-R" })),
    );
    expect(await resolveTargetVisaId()).toBe("F-2-R");
  });

  it("세션 없음(401)이면 null로 폴백한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: {} }, 401)),
    );
    expect(await resolveTargetVisaId()).toBeNull();
  });
});
