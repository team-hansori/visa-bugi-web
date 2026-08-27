import { beforeEach, describe, expect, it, vi } from "vitest";

const signUp = vi.fn();
const signInWithPassword = vi.fn();
const upsertProfiles = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signUp, signInWithPassword },
    from: () => ({ upsert: upsertProfiles }),
  }),
}));

const { signInWithId, signUpWithId } = await import("./actions");

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  upsertProfiles.mockResolvedValue({ error: null });
});

describe("signUpWithId", () => {
  it("가상 이메일로 auth.signUp 후 profiles에 username/name/locale upsert", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const result = await signUpWithId(
      { status: "idle" },
      fd({ username: "Visa_Bugi", password: "secret12", name: "  홍길동 ", locale: "ko" }),
    );

    expect(signUp).toHaveBeenCalledWith({
      email: "visa_bugi@id.visabugi.internal",
      password: "secret12",
    });
    expect(upsertProfiles).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        username: "visa_bugi",
        name: "홍길동",
        locale: "ko",
      }),
      { onConflict: "user_id" },
    );
    expect(result).toEqual({ status: "success" });
  });

  it("입력이 규칙에 안 맞으면 검증 오류를 반환한다", async () => {
    const result = await signUpWithId(
      { status: "idle" },
      fd({ username: "AB", password: "secret12", name: "홍길동", locale: "ko" }),
    );

    expect(result.status).toBe("error");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("아이디 중복이면 안내 문구를 반환한다", async () => {
    signUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered", status: 422 },
    });

    const result = await signUpWithId(
      { status: "idle" },
      fd({ username: "visa_bugi", password: "secret12", name: "홍길동", locale: "ko" }),
    );

    expect(result).toEqual({ status: "error", message: "이미 사용 중인 아이디입니다." });
  });

  it("profiles upsert 실패는 일반 오류로 응답한다", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    upsertProfiles.mockResolvedValue({ error: { message: "boom" } });

    const result = await signUpWithId(
      { status: "idle" },
      fd({ username: "visa_bugi", password: "secret12", name: "홍길동", locale: "ko" }),
    );

    expect(result.status).toBe("error");
  });
});

describe("signInWithId", () => {
  it("가상 이메일로 signInWithPassword를 호출한다", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const result = await signInWithId(
      { status: "idle" },
      fd({ username: "Visa_Bugi", password: "secret12" }),
    );

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "visa_bugi@id.visabugi.internal",
      password: "secret12",
    });
    expect(result).toEqual({ status: "success" });
  });

  it("아이디 오류와 비밀번호 오류를 같은 문구로 응답한다", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials", status: 400 },
    });

    const result = await signInWithId(
      { status: "idle" },
      fd({ username: "visa_bugi", password: "wrongpass" }),
    );

    expect(result).toEqual({
      status: "error",
      message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    });
  });

  it("형식이 어긋난 입력도 같은 자격증명 오류로 응답한다", async () => {
    const result = await signInWithId(
      { status: "idle" },
      fd({ username: "", password: "" }),
    );

    expect(result).toEqual({
      status: "error",
      message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
