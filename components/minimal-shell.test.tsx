import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestTranslator } from "@/lib/test-utils/next-intl-mock";
import { MinimalShell } from "./minimal-shell";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => createTestTranslator(namespace),
}));

const back = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ back }),
}));

vi.mock("@/components/locale-switcher", () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}));

describe("MinimalShell", () => {
  it("뒤로가기 버튼을 누르면 브라우저 히스토리를 한 단계 되돌린다", async () => {
    const user = userEvent.setup();
    render(
      <MinimalShell>
        <p>내용</p>
      </MinimalShell>,
    );

    await user.click(screen.getByRole("button", { name: "뒤로 가기" }));

    expect(back).toHaveBeenCalledTimes(1);
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
