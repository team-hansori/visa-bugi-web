import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KoreanLevelStep } from "./korean-level-step";

describe("KoreanLevelStep", () => {
  it("아무것도 선택 안 된 상태에서 TOPIK을 누르면 credentials에 TOPIK만 담긴다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KoreanLevelStep
        credentials={[]}
        none={false}
        topikLevel={null}
        kiipLevel={null}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^TOPIK/ }));

    expect(onChange).toHaveBeenCalledWith({
      credentials: ["TOPIK"],
      none: false,
      topikLevel: null,
      kiipLevel: null,
    });
  });

  it("TOPIK이 이미 선택된 상태에서 사회통합프로그램을 누르면 credentials에 둘 다 담긴다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KoreanLevelStep
        credentials={["TOPIK"]}
        none={false}
        topikLevel={3}
        kiipLevel={null}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /사회통합프로그램/ }));

    expect(onChange).toHaveBeenCalledWith({
      credentials: ["TOPIK", "KIIP"],
      none: false,
      topikLevel: 3,
      kiipLevel: null,
    });
  });

  it("둘 다 선택된 상태를 동시에 렌더링하면 두 토글 모두 눌린 상태로 보인다", () => {
    render(
      <KoreanLevelStep
        credentials={["TOPIK", "KIIP"]}
        none={false}
        topikLevel={3}
        kiipLevel={2}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^TOPIK/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: /사회통합프로그램/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("TOPIK을 선택하면 TOPIK 급수 선택창이 뜨고, 사회통합프로그램은 안 뜬다", () => {
    render(
      <KoreanLevelStep
        credentials={["TOPIK"]}
        none={false}
        topikLevel={null}
        kiipLevel={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("TOPIK 급수")).toBeInTheDocument();
    expect(screen.queryByLabelText("사회통합프로그램 단계")).not.toBeInTheDocument();
  });

  it("둘 다 선택하면 급수 선택창이 둘 다 뜬다", () => {
    render(
      <KoreanLevelStep
        credentials={["TOPIK", "KIIP"]}
        none={false}
        topikLevel={3}
        kiipLevel={2}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("TOPIK 급수")).toHaveValue("3");
    expect(screen.getByLabelText("사회통합프로그램 단계")).toHaveValue("2");
  });

  it("이미 선택된 유형을 다시 누르면 해제되고 급수도 초기화된다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KoreanLevelStep
        credentials={["TOPIK"]}
        none={false}
        topikLevel={3}
        kiipLevel={null}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^TOPIK/ }));

    expect(onChange).toHaveBeenCalledWith({
      credentials: [],
      none: false,
      topikLevel: null,
      kiipLevel: null,
    });
  });

  it("'아직 없어요'를 누르면 선택된 유형·급수가 모두 초기화된다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KoreanLevelStep
        credentials={["TOPIK", "KIIP"]}
        none={false}
        topikLevel={3}
        kiipLevel={2}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "아직 없어요" }));

    expect(onChange).toHaveBeenCalledWith({
      credentials: [],
      none: true,
      topikLevel: null,
      kiipLevel: null,
    });
  });

  it("'아직 없어요' 상태에서 TOPIK을 누르면 none이 해제된다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KoreanLevelStep
        credentials={[]}
        none={true}
        topikLevel={null}
        kiipLevel={null}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^TOPIK/ }));

    expect(onChange).toHaveBeenCalledWith({
      credentials: ["TOPIK"],
      none: false,
      topikLevel: null,
      kiipLevel: null,
    });
  });

  it("급수를 고르면 다른 credential의 값은 그대로 유지된다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KoreanLevelStep
        credentials={["TOPIK", "KIIP"]}
        none={false}
        topikLevel={null}
        kiipLevel={2}
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText("TOPIK 급수"), "4");

    expect(onChange).toHaveBeenCalledWith({
      credentials: ["TOPIK", "KIIP"],
      none: false,
      topikLevel: 4,
      kiipLevel: 2,
    });
  });
});
