import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ensureAnonymousSession } from "./ensure-anonymous-session";

function mockClient(overrides: {
  getUser: ReturnType<typeof vi.fn>;
  signInAnonymously: ReturnType<typeof vi.fn>;
}) {
  return { auth: overrides } as unknown as SupabaseClient;
}

describe("ensureAnonymousSession", () => {
  it("이미 세션이 있으면 익명 로그인을 시도하지 않는다", async () => {
    const signInAnonymously = vi.fn();
    const client = mockClient({
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      signInAnonymously,
    });

    const result = await ensureAnonymousSession(client);

    expect(result).toEqual({ id: "user-1" });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("세션이 없으면 익명 로그인을 발급한다", async () => {
    const client = mockClient({
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInAnonymously: vi.fn().mockResolvedValue({
        data: { user: { id: "anon-1" } },
        error: null,
      }),
    });

    const result = await ensureAnonymousSession(client);

    expect(result).toEqual({ id: "anon-1" });
  });

  it("익명 로그인이 실패하면 null을 반환한다", async () => {
    const client = mockClient({
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInAnonymously: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Anonymous sign-ins are disabled" },
      }),
    });

    const result = await ensureAnonymousSession(client);

    expect(result).toBeNull();
  });
});
