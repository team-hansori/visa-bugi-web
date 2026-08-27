import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestTranslator } from "@/lib/test-utils/next-intl-mock";
import { OnboardingWelcome } from "./onboarding-welcome";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => createTestTranslator(namespace),
}));

const push = vi.fn();
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/auth/auth-form", () => ({
  AuthForm: ({
    mode,
    onAuthenticated,
    onBack,
  }: {
    mode: string;
    onAuthenticated: () => void;
    onBack: () => void;
  }) => (
    <div data-testid="auth-form" data-mode={mode}>
      <button type="button" onClick={onAuthenticated}>
        mock-authenticate
      </button>
      <button type="button" onClick={onBack}>
        mock-back
      </button>
    </div>
  ),
}));

describe("OnboardingWelcome", () => {
  it("진입 시 회원가입/로그인/비회원 조회 3버튼을 보여준다 (폼·Google 버튼 없음)", () => {
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);
    expect(screen.getByRole("button", { name: "회원가입" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "비회원 조회" })).toBeInTheDocument();
    expect(screen.queryByTestId("auth-form")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
  });

  it("비회원 조회를 누르면 게스트 콜백이 호출된다", async () => {
    const user = userEvent.setup();
    const onContinueWithoutLogin = vi.fn();
    render(<OnboardingWelcome onContinueWithoutLogin={onContinueWithoutLogin} />);

    await user.click(screen.getByRole("button", { name: "비회원 조회" }));

    expect(onContinueWithoutLogin).toHaveBeenCalledTimes(1);
  });

  it("회원가입을 누르면 signUp 모드 폼으로 바뀐다", async () => {
    const user = userEvent.setup();
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(screen.getByTestId("auth-form")).toHaveAttribute("data-mode", "signUp");
    expect(screen.queryByRole("button", { name: "로그인" })).not.toBeInTheDocument();
  });

  it("로그인을 누르면 signIn 모드 폼으로 바뀐다", async () => {
    const user = userEvent.setup();
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(screen.getByTestId("auth-form")).toHaveAttribute("data-mode", "signIn");
  });

  it("폼에서 뒤로가면 3버튼 화면으로 돌아온다", async () => {
    const user = userEvent.setup();
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "로그인" }));
    await user.click(screen.getByRole("button", { name: "mock-back" }));

    expect(screen.getByRole("button", { name: "비회원 조회" })).toBeInTheDocument();
    expect(screen.queryByTestId("auth-form")).not.toBeInTheDocument();
  });

  it("인증에 성공하면 RSC를 새로고침하고 홈으로 이동한다", async () => {
    const user = userEvent.setup();
    push.mockClear();
    refresh.mockClear();
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "로그인" }));
    await user.click(screen.getByRole("button", { name: "mock-authenticate" }));

    expect(refresh).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });

  it("로고 이미지와 약관 링크를 보여준다", () => {
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute("href", "/privacy");
  });
});
