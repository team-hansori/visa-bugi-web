import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: mocks.createClient,
}));

import {
  isTargetVisaCode,
  resolveStoredTargetVisaCode,
} from "@/lib/onboarding/target-visa";

function mockClient({
  userId = "user-1",
  targetVisaCode = "F-2-R",
  queryError = null,
}: {
  userId?: string | null;
  targetVisaCode?: unknown;
  queryError?: { message: string } | null;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: targetVisaCode === undefined
      ? null
      : { target_visa_code: targetVisaCode },
    error: queryError,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  mocks.createClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from,
  });
  return { from, select, eq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveStoredTargetVisaCode", () => {
  it("reads target_visa_code for the authenticated or anonymous user", async () => {
    const query = mockClient({ targetVisaCode: "E-7-4R" });

    await expect(resolveStoredTargetVisaCode()).resolves.toBe("E-7-4R");
    expect(query.from).toHaveBeenCalledWith("user_visa_profile");
    expect(query.select).toHaveBeenCalledWith("target_visa_code");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("returns null when no Supabase user session exists", async () => {
    const query = mockClient({ userId: null });

    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();
    expect(query.from).not.toHaveBeenCalled();
  });

  it("returns null for an empty, invalid, or unreadable profile value", async () => {
    mockClient({ targetVisaCode: null });
    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();

    mockClient({ targetVisaCode: "UNKNOWN" });
    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();

    mockClient({ queryError: { message: "permission denied" } });
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
