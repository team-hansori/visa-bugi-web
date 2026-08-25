import { describe, expect, it } from "vitest";
import { extractContactTokens, redactViolations, verbatimViolations } from "@/features/chat/verbatim";

describe("extractContactTokens", () => {
  it("하이픈 전화번호와 특수번호를 추출한다", () => {
    expect(extractContactTokens("고용노동부 전화 1350 또는 043-840-4000, 공단 1588-0075"))
      .toEqual(["1350", "043-840-4000", "1588-0075"]);
  });
  it("연락처 문맥이 없는 4자리 쿼터 값은 추출하지 않는다", () => {
    expect(extractContactTokens("잔여 인원은 1350명이고 쿼터는 1200명입니다")).toEqual([]);
    expect(verbatimViolations("쿼터는 1350명입니다", [])).toEqual([]);
  });
  it("연락처 문맥이 있는 4자리 특수번호는 추출한다", () => {
    expect(extractContactTokens("☎ 1350, 전화: 1200, tel 1588"))
      .toEqual(["1350", "1200", "1588"]);
  });
  it("연도(1900~2099)는 전화번호로 보지 않는다", () => {
    expect(extractContactTokens("2026년 공고 기준입니다")).toEqual([]);
  });
  it("URL을 추출한다", () => {
    expect(extractContactTokens("https://www.moel.go.kr/cheongju/ 참고"))
      .toEqual(["https://www.moel.go.kr/cheongju/"]);
  });
  it("URL 뒤에 공백 없이 조사가 붙어도 조사는 캡처하지 않는다", () => {
    expect(extractContactTokens("https://www.moel.go.kr/cheongju/를 참고하세요"))
      .toEqual(["https://www.moel.go.kr/cheongju/"]);
  });
  it("하이픈 없이 붙어 쓴 전화번호도 탐지한다", () => {
    expect(extractContactTokens("전화번호는 0432306700 입니다")).toEqual(["0432306700"]);
    expect(extractContactTokens("휴대폰 01012345678로 연락주세요")).toEqual(["01012345678"]);
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

describe("redactViolations", () => {
  it("위반 토큰을 안전 표기로 치환한다", () => {
    expect(redactViolations("043-230-6700으로 전화하세요", ["043-230-6700"]))
      .toBe("[확인 필요]으로 전화하세요");
  });
  it("URL처럼 정규식 특수문자가 섞인 위반도 안전하게 치환한다", () => {
    expect(redactViolations("https://fake.example.com/x 참고", ["https://fake.example.com/x"]))
      .toBe("[확인 필요] 참고");
  });
  it("위반이 없으면 원문을 그대로 반환한다", () => {
    expect(redactViolations("1350으로 전화하세요", [])).toBe("1350으로 전화하세요");
  });
});
