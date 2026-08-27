import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRouteError } from "@/lib/api/errors";

const getCurrentUserTargetVisa = vi.fn();
vi.mock("@/features/profile/server/target-visa", () => ({
  getCurrentUserTargetVisa: (...args: unknown[]) =>
    getCurrentUserTargetVisa(...args),
}));

const { GET } = await import("./route");

beforeEach(() => vi.clearAllMocks());

describe("GET /api/profile/target-visa", () => {
  it("no-store로 목표 비자를 반환한다", async () => {
    getCurrentUserTargetVisa.mockResolvedValue({ targetVisaCode: "D-2" });
    const res = await GET(new Request("https://x/api/profile/target-visa"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ targetVisaCode: "D-2" });
  });

  it("세션 없음은 공통 오류 계약으로 401", async () => {
    getCurrentUserTargetVisa.mockRejectedValue(
      new ApiRouteError(401, "AUTH_REQUIRED", "로그인이 필요합니다."),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(new Request("https://x/api/profile/target-visa"));
    expect(res.status).toBe(401);
    const body = (await res.json()) as {
      error: { code: string; requestId: string };
    };
    expect(body.error.code).toBe("AUTH_REQUIRED");
    expect(typeof body.error.requestId).toBe("string");
  });
});
