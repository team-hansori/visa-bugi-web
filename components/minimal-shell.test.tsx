import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTestTranslator } from "@/lib/test-utils/next-intl-mock";
import { MinimalShell } from "./minimal-shell";

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

vi.mock("@/components/locale-switcher", () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}));

describe("MinimalShell", () => {
  it("홈으로 돌아가는 링크를 보여준다", () => {
    render(
      <MinimalShell>
        <p>내용</p>
      </MinimalShell>,
    );
    expect(screen.getByRole("link", { name: "홈으로 돌아가기" })).toHaveAttribute("href", "/");
  });

  it("LocaleSwitcher를 보여준다", () => {
    render(
      <MinimalShell>
        <p>내용</p>
      </MinimalShell>,
    );
    expect(screen.getByTestId("locale-switcher")).toBeInTheDocument();
  });

  it("children을 렌더링한다", () => {
    render(
      <MinimalShell>
        <p>테스트 콘텐츠</p>
      </MinimalShell>,
    );
    expect(screen.getByText("테스트 콘텐츠")).toBeInTheDocument();
  });
});
