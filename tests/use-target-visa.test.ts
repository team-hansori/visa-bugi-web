import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { resolveTargetVisaId } from "@/features/calendar/use-target-visa";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

type QueryResult = { data: { target_visa_code: string | null } | null; error: { message: string } | null };

function mockSupabase(userId: string | null, queryResult: QueryResult) {
  const maybeSingle = vi.fn().mockResolvedValue(queryResult);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const getUser = vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } });

  vi.mocked(createClient).mockReturnValue({
    auth: { getUser },
    from,
  } as unknown as ReturnType<typeof createClient>);

  return { from, select, eq, getUser };
}

describe("resolveTargetVisaId", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
  });

  it("세션이 없으면 null을 반환한다 (온보딩을 거치지 않고 캘린더에 바로 진입한 경우)", async () => {
    const { from } = mockSupabase(null, { data: null, error: null });

    expect(await resolveTargetVisaId()).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("user_visa_profile.target_visa_code 값을 그대로 반환한다", async () => {
    const { from, eq } = mockSupabase("user-1", { data: { target_visa_code: "F-2-R" }, error: null });

    expect(await resolveTargetVisaId()).toBe("F-2-R");
    expect(from).toHaveBeenCalledWith("user_visa_profile");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("세션은 있지만 저장된 행이 없으면 null을 반환한다", async () => {
    mockSupabase("user-1", { data: null, error: null });

    expect(await resolveTargetVisaId()).toBeNull();
  });

  it("조회 오류가 나면 null로 안전하게 폴백한다", async () => {
    mockSupabase("user-1", { data: null, error: { message: "network error" } });

    expect(await resolveTargetVisaId()).toBeNull();
  });
});
