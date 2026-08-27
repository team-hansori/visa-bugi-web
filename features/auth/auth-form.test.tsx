import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, expect, it, vi } from "vitest";
import messages from "@/messages/ko.json";

const signInWithId = vi.fn();
const signUpWithId = vi.fn();

vi.mock("./actions", () => ({
  signInWithId: (...args: unknown[]) => signInWithId(...args),
  signUpWithId: (...args: unknown[]) => signUpWithId(...args),
}));

const { AuthForm } = await import("./auth-form");

function renderForm(
  props: Partial<{
    mode: "signIn" | "signUp";
    onAuthenticated: () => void;
    onBack: () => void;
  }> = {},
) {
  const onAuthenticated = props.onAuthenticated ?? vi.fn();
  const onBack = props.onBack ?? vi.fn();
  render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <AuthForm
        mode={props.mode ?? "signIn"}
        onAuthenticated={onAuthenticated}
        onBack={onBack}
      />
    </NextIntlClientProvider>,
  );
  return { onAuthenticated, onBack };
}

beforeEach(() => {
  vi.clearAllMocks();
  signInWithId.mockResolvedValue({ status: "idle" });
  signUpWithId.mockResolvedValue({ status: "idle" });
});

it("signIn 모드는 아이디/비밀번호만 보여준다 (이름 필드 없음)", () => {
  renderForm({ mode: "signIn" });
  expect(screen.getByLabelText("아이디")).toBeInTheDocument();
  expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
  expect(screen.queryByLabelText("이름")).not.toBeInTheDocument();
});

it("signUp 모드는 아이디/이름/비밀번호를 보여준다", () => {
  renderForm({ mode: "signUp" });
  expect(screen.getByLabelText("아이디")).toBeInTheDocument();
  expect(screen.getByLabelText("이름")).toBeInTheDocument();
  expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
});

it("뒤로 버튼은 onBack을 호출한다", async () => {
  const { onBack } = renderForm({ mode: "signUp" });
  await userEvent.click(screen.getByRole("button", { name: "뒤로" }));
  expect(onBack).toHaveBeenCalled();
});

it("로그인 실패 메시지를 표시한다", async () => {
  signInWithId.mockResolvedValue({
    status: "error",
    message: "아이디 또는 비밀번호가 올바르지 않습니다.",
  });
  renderForm({ mode: "signIn" });
  await userEvent.type(screen.getByLabelText("아이디"), "visa_bugi");
  await userEvent.type(screen.getByLabelText("비밀번호"), "wrongpass");
  await userEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "아이디 또는 비밀번호가 올바르지 않습니다.",
  );
});

it("성공하면 onAuthenticated를 한 번 호출한다", async () => {
  const { onAuthenticated } = renderForm({ mode: "signIn" });
  signInWithId.mockResolvedValue({ status: "success" });
  await userEvent.type(screen.getByLabelText("아이디"), "visa_bugi");
  await userEvent.type(screen.getByLabelText("비밀번호"), "secret12");
  await userEvent.click(screen.getByRole("button", { name: "로그인" }));
  await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
});

it("locale hidden 필드를 현재 locale로 채운다", () => {
  renderForm({ mode: "signIn" });
  const hidden = document.querySelector(
    'input[name="locale"]',
  ) as HTMLInputElement;
  expect(hidden.value).toBe("ko");
});
