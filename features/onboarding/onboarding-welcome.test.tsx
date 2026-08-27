import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestTranslator } from "@/lib/test-utils/next-intl-mock";
import { OnboardingWelcome } from "./onboarding-welcome";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => createTestTranslator(namespace),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("OnboardingWelcome", () => {
  it("로그인 없이 시작하기 버튼이 있다", () => {
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "로그인 없이 시작하기" }),
    ).toBeEnabled();
  });

  it("로그인 없이 시작하기를 누르면 콜백이 호출된다", async () => {
    const user = userEvent.setup();
    const onContinueWithoutLogin = vi.fn();
    render(<OnboardingWelcome onContinueWithoutLogin={onContinueWithoutLogin} />);

    await user.click(screen.getByRole("button", { name: "로그인 없이 시작하기" }));

    expect(onContinueWithoutLogin).toHaveBeenCalledTimes(1);
  });

  it("Google로 시작하기는 클릭해도 콜백을 호출하지 않고 준비 중 안내만 보여준다", async () => {
    const user = userEvent.setup();
    const onContinueWithoutLogin = vi.fn();
    render(<OnboardingWelcome onContinueWithoutLogin={onContinueWithoutLogin} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Google/ }));

    expect(onContinueWithoutLogin).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/준비 중/);
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
