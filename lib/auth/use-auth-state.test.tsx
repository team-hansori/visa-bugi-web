import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const getUser = vi.fn();
const onAuthStateChange = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser, onAuthStateChange } }),
}));

const { useAuthState } = await import("./use-auth-state");

function Probe() {
  const state = useAuthState();
  return (
    <output data-testid="state">
      {state.status === "authenticated" ? `auth:${state.userId}` : state.status}
    </output>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

it("비익명 사용자는 authenticated", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: false } } });
  render(<Probe />);
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("auth:u1"),
  );
});

it("익명 세션은 guest", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "anon", is_anonymous: true } } });
  render(<Probe />);
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("guest"),
  );
});

it("세션 없음은 guest", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  render(<Probe />);
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("guest"),
  );
});

it("env 미설정이면 조회 없이 guest", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  render(<Probe />);
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("guest"),
  );
  expect(getUser).not.toHaveBeenCalled();
});

it("onAuthStateChange로 상태가 갱신된다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  let listener: (event: string, session: unknown) => void = () => {};
  onAuthStateChange.mockImplementation((cb: typeof listener) => {
    listener = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  render(<Probe />);
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("guest"),
  );
  listener("SIGNED_IN", { user: { id: "u9", is_anonymous: false } });
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("auth:u9"),
  );
});
