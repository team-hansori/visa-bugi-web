import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChoiceStep } from "./choice-step";

const options = [
  { id: "VN", label: "베트남" },
  { id: "UZ", label: "우즈베키스탄" },
];

describe("ChoiceStep", () => {
  it("선택지를 모두 렌더링한다", () => {
    render(
      <ChoiceStep options={options} value={null} onChange={vi.fn()} legend="국적" />,
    );
    expect(screen.getByRole("button", { name: "베트남" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "우즈베키스탄" })).toBeInTheDocument();
  });

  it("선택된 항목만 aria-pressed가 true다", () => {
    render(
      <ChoiceStep options={options} value="VN" onChange={vi.fn()} legend="국적" />,
    );
    expect(screen.getByRole("button", { name: "베트남" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "우즈베키스탄" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("클릭하면 선택한 id로 onChange를 호출한다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChoiceStep options={options} value={null} onChange={onChange} legend="국적" />,
    );
    await user.click(screen.getByRole("button", { name: "우즈베키스탄" }));
    expect(onChange).toHaveBeenCalledWith("UZ");
  });

  it("그룹에 접근 가능한 이름을 부여한다", () => {
    render(
      <ChoiceStep options={options} value={null} onChange={vi.fn()} legend="국적" />,
    );
    expect(screen.getByRole("group", { name: "국적" })).toBeInTheDocument();
  });
});
