import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddressStep } from "./address-step";

const inDecline = {
  roadAddress: "충북 제천시 내토로 295",
  jibunAddress: "충북 제천시 청전동 111",
  regionSigungu: "제천시",
  lat: 37.1326,
  lng: 128.1909,
};

const outsideDecline = { ...inDecline, regionSigungu: "청주시" };

describe("AddressStep", () => {
  it("주소를 아직 고르지 않았으면 안내를 표시하지 않는다", () => {
    render(<AddressStep value={null} onSelect={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("인구감소지역이면 대상 지역임을 알린다", () => {
    render(<AddressStep value={inDecline} onSelect={vi.fn()} />);
    expect(screen.getByText(/지역특화형 비자 대상 지역/)).toBeInTheDocument();
  });

  it("인구감소지역이 아니면 경고를 표시한다", () => {
    render(<AddressStep value={outsideDecline} onSelect={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /지역특화형 비자\(F-2-R·E-7-4R·F-4-R\) 대상 지역이 아닙니다/,
    );
  });

  it("경고에도 참고용 안내임을 함께 표시한다", () => {
    render(<AddressStep value={outsideDecline} onSelect={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/참고용/);
  });

  it("검색이 안 될 때 직접 입력으로 전환할 수 있다", async () => {
    const user = userEvent.setup();
    render(<AddressStep value={null} onSelect={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: /검색이 안 되나요\? 직접 입력할게요/ }),
    );

    expect(screen.getByLabelText("주소 (도로명 또는 지번)")).toBeInTheDocument();
    expect(screen.getByLabelText("사는 시/군")).toBeInTheDocument();
  });

  it("직접 입력 폼은 두 필드를 채우기 전까지 제출 버튼이 비활성화된다", async () => {
    const user = userEvent.setup();
    render(<AddressStep value={null} onSelect={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: /검색이 안 되나요\? 직접 입력할게요/ }),
    );
    expect(screen.getByRole("button", { name: "이 주소로 설정" })).toBeDisabled();

    await user.type(
      screen.getByLabelText("주소 (도로명 또는 지번)"),
      "충북 제천시 내토로 295",
    );
    expect(screen.getByRole("button", { name: "이 주소로 설정" })).toBeDisabled();

    await user.type(screen.getByLabelText("사는 시/군"), "제천시");
    expect(screen.getByRole("button", { name: "이 주소로 설정" })).toBeEnabled();
  });

  it("직접 입력을 제출하면 좌표 없이 onSelect를 호출한다", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<AddressStep value={null} onSelect={onSelect} />);

    await user.click(
      screen.getByRole("button", { name: /검색이 안 되나요\? 직접 입력할게요/ }),
    );
    await user.type(
      screen.getByLabelText("주소 (도로명 또는 지번)"),
      "충북 제천시 내토로 295",
    );
    await user.type(screen.getByLabelText("사는 시/군"), "제천시");
    await user.click(screen.getByRole("button", { name: "이 주소로 설정" }));

    expect(onSelect).toHaveBeenCalledWith({
      roadAddress: "충북 제천시 내토로 295",
      jibunAddress: "충북 제천시 내토로 295",
      regionSigungu: "제천시",
      lat: null,
      lng: null,
    });
  });

  it("직접 입력에서 검색으로 돌아갈 수 있다", async () => {
    const user = userEvent.setup();
    render(<AddressStep value={null} onSelect={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: /검색이 안 되나요\? 직접 입력할게요/ }),
    );
    await user.click(screen.getByRole("button", { name: "주소 검색으로 돌아가기" }));

    expect(screen.getByLabelText("거주(희망) 주소")).toBeInTheDocument();
  });

  it("직접 입력으로 채운 주소도 인구감소지역 판정을 받는다", () => {
    render(
      <AddressStep
        value={{
          roadAddress: "충북 제천시 내토로 295",
          jibunAddress: "충북 제천시 내토로 295",
          regionSigungu: "제천시",
          lat: null,
          lng: null,
        }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/지역특화형 비자 대상 지역/)).toBeInTheDocument();
  });
});
