import { render, screen } from "@testing-library/react";
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
});
