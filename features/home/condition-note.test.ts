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

  describe("데이터 큐레이션 메모는 화면에서 제외한다", () => {
    it("'원문:' 인용 줄과 스키마 결정 메모 줄을 모두 버린다", () => {
      const note = [
        "원문: '한국어능력 입증을 TOPIK으로 할 경우만 점수표를 제출하고, 사회통합프로그램 이수나 사전평가 점수로 하는 경우 이수증이나 사전평가 성적표 제출 생략'",
        "문장 자체는 다소 모호하나, TOPIK 성적표 / 사회통합프로그램 이수증 / 사전평가 성적표 중 하나만 제출하면 된다는 취지로 해석하여 3개 대체(ALTERNATIVE) 행으로 분리함(alternative_group=LANGUAGE_PROOF).",
      ].join("\n");
      expect(splitConditionNote(note)).toEqual([]);
    });

    it("메타 접두사(출처:/비고:/참고:)를 버린다", () => {
      expect(
        splitConditionNote("본인 확인용 서류\n비고: 담당자 재량으로 생략 가능하도록 표기함"),
      ).toEqual(["본인 확인용 서류"]);
    });

    it("스키마 토큰(xxx_group=/xxx_status=)이 든 줄을 버린다", () => {
      expect(
        splitConditionNote("여권 사본 필요\nrequirement_status=CONDITIONAL 로 분류"),
      ).toEqual(["여권 사본 필요"]);
    });

    it("사용자용 문구는 그대로 유지한다", () => {
      expect(
        splitConditionNote("본인이 직접 신청하면 제출 불필요 — 대리신청일 때 필요"),
      ).toEqual([
        "본인이 직접 신청하면 제출 불필요",
        "대리신청일 때 필요",
      ]);
    });

    it("'분리' 글자가 들어가도 큐레이션 서술이 아니면 유지한다", () => {
      expect(splitConditionNote("가족관계증명서(분리세대 포함)")).toEqual([
        "가족관계증명서(분리세대 포함)",
      ]);
    });
  });
});
