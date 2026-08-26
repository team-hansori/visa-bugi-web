import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createAdminClient: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/features/chat/logging", () => ({
  createChatLogger: () => ({ deleteSession: mocks.deleteSession }),
}));

import { DELETE } from "@/app/api/chat/session/route";

const cookieStore = {
  get: vi.fn(),
  delete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookies.mockResolvedValue(cookieStore);
  cookieStore.get.mockReturnValue({ value: "anon-1" });
});

describe("DELETE /api/chat/session", () => {
  it("keeps the cookie and returns a failure when the admin client is unavailable", async () => {
    mocks.createAdminClient.mockReturnValue(null);

    const response = await DELETE();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ deleted: false });
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });

  it("deletes the cookie only after the persisted session is deleted", async () => {
    mocks.createAdminClient.mockReturnValue({});
    mocks.deleteSession.mockResolvedValue(undefined);

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(mocks.deleteSession).toHaveBeenCalledWith("anon-1");
    expect(cookieStore.delete).toHaveBeenCalledWith("vb_chat_session");
  });
});
