import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasCompletedOnboarding } from "./completion";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

function mockSupabase(
  user: { id: string } | null,
  queryResult: { data: { user_id: string } | null; error: { message: string } | null },
) {
  const maybeSingle = vi.fn().mockResolvedValue(queryResult);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from,
  });

  return { from, eq };
}

describe("hasCompletedOnboarding", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    createClient.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Supabase 환경변수가 없으면 게이트를 걸지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    expect(await hasCompletedOnboarding()).toBe(true);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("세션이 없으면 미완료로 판단한다", async () => {
    mockSupabase(null, { data: null, error: null });

    expect(await hasCompletedOnboarding()).toBe(false);
  });

  it("user_visa_profile 행이 있으면 완료로 판단한다", async () => {
    const { from, eq } = mockSupabase(
      { id: "user-1" },
      { data: { user_id: "user-1" }, error: null },
    );

    expect(await hasCompletedOnboarding()).toBe(true);
    expect(from).toHaveBeenCalledWith("user_visa_profile");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("세션은 있지만 행이 없으면 미완료로 판단한다", async () => {
    mockSupabase({ id: "user-1" }, { data: null, error: null });

    expect(await hasCompletedOnboarding()).toBe(false);
  });

  it("조회 오류가 나면 사용자를 가두지 않는다", async () => {
    mockSupabase({ id: "user-1" }, { data: null, error: { message: "network error" } });

    expect(await hasCompletedOnboarding()).toBe(true);
  });
});
