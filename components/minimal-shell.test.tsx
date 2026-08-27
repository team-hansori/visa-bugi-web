import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MinimalShell } from "./minimal-shell";

vi.mock("@/components/locale-switcher", () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}));

describe("MinimalShell", () => {
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

  it("뒤로가기 버튼은 없다 — 스텝 이동은 OnboardingForm이 stepIndex 기준으로 직접 제어한다", () => {
    render(
      <MinimalShell>
        <p>내용</p>
      </MinimalShell>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
