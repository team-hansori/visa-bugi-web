import { describe, expect, it } from "vitest";
import { splitConditionNote } from "./condition-note";

describe("splitConditionNote", () => {
  it("앞뒤 공백이 있는 대시로 절을 나눈다", () => {
    expect(
      splitConditionNote(
        "본인이 직접 신청하면 제출 불필요 — 대리신청(부득이한 경우, 행정사 등)일 때 필요",
      ),
    ).toEqual([
      "본인이 직접 신청하면 제출 불필요",
      "대리신청(부득이한 경우, 행정사 등)일 때 필요",
    ]);
  });

  it("줄바꿈과 세미콜론으로 나눈다", () => {
    expect(splitConditionNote("항목 A\n항목 B; 항목 C")).toEqual([
      "항목 A",
      "항목 B",
      "항목 C",
    ]);
  });

  it("괄호·절 안의 일반 쉼표는 나누지 않는다", () => {
    expect(
      splitConditionNote("가족관계기록사항에 관한 증명서(혼인관계증명서, 가족관계증명서 등)"),
    ).toEqual(["가족관계기록사항에 관한 증명서(혼인관계증명서, 가족관계증명서 등)"]);
  });

  it("가운뎃점 병렬(시·군·구청)은 나누지 않는다", () => {
    expect(splitConditionNote("시·군·구청에서 발급한 여권·외국인등록증 사본")).toEqual([
      "시·군·구청에서 발급한 여권·외국인등록증 사본",
    ]);
  });

  it("공백 없는 대시 숫자 범위(6–12개월)는 나누지 않는다", () => {
    expect(splitConditionNote("최근 6–12개월 이내 발급분")).toEqual([
      "최근 6–12개월 이내 발급분",
    ]);
  });

  it("슬래시 택일(본인/대리인)은 나누지 않는다", () => {
    expect(splitConditionNote("본인/대리인 신청 시 모두 필요")).toEqual([
      "본인/대리인 신청 시 모두 필요",
    ]);
  });

  it("각 조각 앞의 불릿 기호와 공백을 정리한다", () => {
    expect(splitConditionNote("  · 첫 항목  —  둘째 항목 ")).toEqual([
      "첫 항목",
      "둘째 항목",
    ]);
  });

  it("구분자가 없으면 한 항목으로 반환한다", () => {
    expect(splitConditionNote("단일 조건 설명")).toEqual(["단일 조건 설명"]);
  });

  it("빈 값·공백·null은 빈 배열", () => {
    expect(splitConditionNote("")).toEqual([]);
    expect(splitConditionNote("   ")).toEqual([]);
    expect(splitConditionNote(null)).toEqual([]);
  });

  it("구분자만 반복돼도 빈 조각은 버린다", () => {
    expect(splitConditionNote("A ;; ; B")).toEqual(["A", "B"]);
  });
});
