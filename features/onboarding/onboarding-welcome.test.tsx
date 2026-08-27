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
  AuthForm: ({ onAuthenticated }: { onAuthenticated: () => void }) => (
    <div>
      <label htmlFor="mock-username">아이디</label>
      <input id="mock-username" />
      <button type="button" onClick={onAuthenticated}>
        mock-authenticate
      </button>
    </div>
  ),
}));

describe("OnboardingWelcome", () => {
  it("아이디/비밀번호 폼을 보여주고 미구현 Google 버튼은 없다", () => {
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);
    expect(screen.getByLabelText("아이디")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
  });

  it("로그인 없이 시작하기를 누르면 콜백이 호출된다", async () => {
    const user = userEvent.setup();
    const onContinueWithoutLogin = vi.fn();
    render(<OnboardingWelcome onContinueWithoutLogin={onContinueWithoutLogin} />);

    await user.click(screen.getByRole("button", { name: "로그인 없이 시작하기" }));

    expect(onContinueWithoutLogin).toHaveBeenCalledTimes(1);
  });

  it("인증에 성공하면 RSC를 새로고침하고 홈으로 이동한다", async () => {
    const user = userEvent.setup();
    push.mockClear();
    refresh.mockClear();
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "mock-authenticate" }));

    expect(refresh).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });

  it("로고 이미지를 보여준다", () => {
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("이용약관과 개인정보처리방침 링크를 보여준다", () => {
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);

    expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });
});
