import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isTargetVisaCode,
  resolveStoredTargetVisaCode,
} from "@/lib/onboarding/target-visa";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveStoredTargetVisaCode", () => {
  it("공용 API가 유효한 코드를 주면 그 값을 반환한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ targetVisaCode: "E-7-4R" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveStoredTargetVisaCode()).resolves.toBe("E-7-4R");
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/profile/target-visa");
  });

  it("API가 null을 주면 null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ targetVisaCode: null })),
    );
    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();
  });

  it("세션 없음(401)이면 null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: {} }, 401)),
    );
    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();
  });

  it("유효하지 않은 코드면 null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ targetVisaCode: "UNKNOWN" })),
    );
    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();
  });

  it("네트워크 예외면 null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();
  });
});

describe("isTargetVisaCode", () => {
  it("accepts only visa codes supported by onboarding", () => {
    expect(isTargetVisaCode("F-2-R")).toBe(true);
    expect(isTargetVisaCode("D-2")).toBe(true);
    expect(isTargetVisaCode("UNKNOWN")).toBe(false);
    expect(isTargetVisaCode(null)).toBe(false);
  });
});
