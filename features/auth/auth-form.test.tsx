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

function renderForm(onAuthenticated = vi.fn()) {
  render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <AuthForm onAuthenticated={onAuthenticated} />
    </NextIntlClientProvider>,
  );
  return { onAuthenticated };
}

beforeEach(() => {
  vi.clearAllMocks();
  signInWithId.mockResolvedValue({ status: "idle" });
  signUpWithId.mockResolvedValue({ status: "idle" });
});

it("기본은 로그인 탭이고 아이디/비밀번호 필드를 보여준다", () => {
  renderForm();
  expect(screen.getByLabelText("아이디")).toBeInTheDocument();
  expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
  expect(screen.queryByLabelText("이름")).not.toBeInTheDocument();
});

it("회원가입 모드로 바꾸면 이름 필드가 나타난다", async () => {
  renderForm();
  await userEvent.click(screen.getByRole("radio", { name: "회원가입" }));
  expect(screen.getByLabelText("이름")).toBeInTheDocument();
});

it("모드 전환은 radiogroup으로 노출된다", () => {
  renderForm();
  expect(screen.getByRole("radio", { name: "로그인" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "회원가입" })).not.toBeChecked();
});

it("로그인 실패 메시지를 표시한다", async () => {
  signInWithId.mockResolvedValue({
    status: "error",
    message: "아이디 또는 비밀번호가 올바르지 않습니다.",
  });
  renderForm();
  await userEvent.type(screen.getByLabelText("아이디"), "visa_bugi");
  await userEvent.type(screen.getByLabelText("비밀번호"), "wrongpass");
  await userEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "아이디 또는 비밀번호가 올바르지 않습니다.",
  );
});

it("성공하면 onAuthenticated를 호출한다", async () => {
  const { onAuthenticated } = renderForm();
  signInWithId.mockResolvedValue({ status: "success" });
  await userEvent.type(screen.getByLabelText("아이디"), "visa_bugi");
  await userEvent.type(screen.getByLabelText("비밀번호"), "secret12");
  await userEvent.click(screen.getByRole("button", { name: "로그인" }));
  await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
});

it("locale hidden 필드를 현재 locale로 채운다", () => {
  renderForm();
  const hidden = document.querySelector('input[name="locale"]') as HTMLInputElement;
  expect(hidden.value).toBe("ko");
});
