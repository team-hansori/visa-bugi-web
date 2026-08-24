import { describe, expect, it } from "vitest";
import { extractContactTokens, verbatimViolations } from "@/features/chat/verbatim";

describe("extractContactTokens", () => {
  it("하이픈 전화번호와 특수번호를 추출한다", () => {
    expect(extractContactTokens("고용노동부 1350 또는 043-840-4000, 공단 1588-0075"))
      .toEqual(["1350", "043-840-4000", "1588-0075"]);
  });
  it("연도(1900~2099)는 전화번호로 보지 않는다", () => {
    expect(extractContactTokens("2026년 공고 기준입니다")).toEqual([]);
  });
  it("URL을 추출한다", () => {
    expect(extractContactTokens("https://www.moel.go.kr/cheongju/ 참고"))
      .toEqual(["https://www.moel.go.kr/cheongju/"]);
  });
});

describe("verbatimViolations", () => {
  it("허용 목록의 번호는 위반이 아니다 (하이픈 유무 무시)", () => {
    expect(verbatimViolations("전화 1588-0075로 문의", ["1588-0075"])).toEqual([]);
    expect(verbatimViolations("전화 15880075로 문의", ["1588-0075"])).toEqual([]);
  });
  it("허용 목록에 없는 번호는 위반이다", () => {
    expect(verbatimViolations("043-230-6700으로 전화하세요", ["1350"])).toEqual(["043-230-6700"]);
  });
});
