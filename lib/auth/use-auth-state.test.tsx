import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const onAuthStateChange = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { onAuthStateChange } }),
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

let emit: (event: string, session: unknown) => void;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
  emit = () => {};
  onAuthStateChange.mockImplementation(
    (cb: (event: string, session: unknown) => void) => {
      emit = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  );
});

it("INITIAL_SESSION의 비익명 사용자는 authenticated", async () => {
  render(<Probe />);
  emit("INITIAL_SESSION", { user: { id: "u1", is_anonymous: false } });
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("auth:u1"),
  );
});

it("익명 세션은 guest", async () => {
  render(<Probe />);
  emit("INITIAL_SESSION", { user: { id: "anon", is_anonymous: true } });
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("guest"),
  );
});

it("세션 없음은 guest", async () => {
  render(<Probe />);
  emit("INITIAL_SESSION", null);
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("guest"),
  );
});

it("env 미설정이면 구독 없이 guest", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  render(<Probe />);
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("guest"),
  );
  expect(onAuthStateChange).not.toHaveBeenCalled();
});

it("SIGNED_IN·SIGNED_OUT 이벤트로 상태가 갱신된다", async () => {
  render(<Probe />);
  emit("INITIAL_SESSION", null);
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("guest"),
  );

  emit("SIGNED_IN", { user: { id: "u9", is_anonymous: false } });
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("auth:u9"),
  );

  emit("SIGNED_OUT", null);
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("guest"),
  );
});
