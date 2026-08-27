import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
let row: unknown = null;
let queryError: unknown = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error: queryError }),
        }),
      }),
    }),
  }),
}));

const { getCurrentUserTargetVisa } = await import("./target-visa");

beforeEach(() => {
  vi.clearAllMocks();
  row = null;
  queryError = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
});

describe("getCurrentUserTargetVisa", () => {
  it("저장된 목표 비자 코드를 반환한다", async () => {
    row = { target_visa_code: "E-7-4R" };
    await expect(getCurrentUserTargetVisa()).resolves.toEqual({
      targetVisaCode: "E-7-4R",
    });
  });

  it("행이 없으면 null", async () => {
    await expect(getCurrentUserTargetVisa()).resolves.toEqual({
      targetVisaCode: null,
    });
  });

  it("유효하지 않은 코드는 null로 정규화한다", async () => {
    row = { target_visa_code: "ZZZ" };
    await expect(getCurrentUserTargetVisa()).resolves.toEqual({
      targetVisaCode: null,
    });
  });

  it("사용자 세션이 없으면 401 AUTH_REQUIRED", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(getCurrentUserTargetVisa()).rejects.toMatchObject({
      status: 401,
      code: "AUTH_REQUIRED",
    });
  });

  it("조회 오류면 502 PROFILE_QUERY_FAILED", async () => {
    queryError = { message: "boom" };
    await expect(getCurrentUserTargetVisa()).rejects.toMatchObject({
      status: 502,
      code: "PROFILE_QUERY_FAILED",
    });
  });

  it("env 미설정이면 503 PROFILE_NOT_CONFIGURED", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(getCurrentUserTargetVisa()).rejects.toMatchObject({
      status: 503,
      code: "PROFILE_NOT_CONFIGURED",
    });
  });
});
