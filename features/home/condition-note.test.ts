import { describe, expect, it } from "vitest";
import { splitConditionNote } from "./condition-note";

describe("splitConditionNote", () => {
  it("강한 구분자(— · / ; 줄바꿈)로 나눈다", () => {
    expect(
      splitConditionNote(
        "본인이 직접 신청하면 제출 불필요 — 대리신청(부득이한 경우, 행정사 등)일 때 필요",
      ),
    ).toEqual([
      "본인이 직접 신청하면 제출 불필요",
      "대리신청(부득이한 경우, 행정사 등)일 때 필요",
    ]);
  });

  it("괄호·절 안의 일반 쉼표는 나누지 않는다", () => {
    expect(
      splitConditionNote("가족관계기록사항에 관한 증명서(혼인관계증명서, 가족관계증명서 등)"),
    ).toEqual(["가족관계기록사항에 관한 증명서(혼인관계증명서, 가족관계증명서 등)"]);
  });

  it("여러 구분자와 줄바꿈이 섞여도 처리한다", () => {
    expect(
      splitConditionNote("항목 A · 항목 B\n항목 C; 항목 D / 항목 E"),
    ).toEqual(["항목 A", "항목 B", "항목 C", "항목 D", "항목 E"]);
  });

  it("가운뎃점 접두사와 앞뒤 공백을 정리한다", () => {
    expect(splitConditionNote("  · 첫 항목  —  둘째 항목 ")).toEqual([
      "첫 항목",
      "둘째 항목",
    ]);
  });

  it("구분자가 없으면 한 항목으로 반환한다", () => {
    expect(splitConditionNote("단일 조건 설명")).toEqual(["단일 조건 설명"]);
  });

  it("빈 값·공백·null-빈문자열은 빈 배열", () => {
    expect(splitConditionNote("")).toEqual([]);
    expect(splitConditionNote("   ")).toEqual([]);
    expect(splitConditionNote(null)).toEqual([]);
  });

  it("구분자만 반복돼도 빈 조각은 버린다", () => {
    expect(splitConditionNote("A —— · — B")).toEqual(["A", "B"]);
  });
});
