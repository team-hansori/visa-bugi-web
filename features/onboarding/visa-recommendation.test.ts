import { describe, expect, it } from "vitest";
import { CURRENT_VISA_OPTIONS, TARGET_VISA_CODES } from "./constants";
import { recommendTargetVisas } from "./visa-recommendation";

describe("recommendTargetVisas", () => {
  it("D-2 유학생에게는 광역형 D-2와 졸업 후 F-2-R을 추천한다", () => {
    expect(recommendTargetVisas("D-2")).toEqual(["D-2", "F-2-R"]);
  });

  it("D-10 구직자에게는 F-2-R을 추천한다", () => {
    expect(recommendTargetVisas("D-10")).toEqual(["F-2-R"]);
  });

  it.each(["E-9", "E-10", "H-2"] as const)(
    "%s 보유자에게는 E-7-4R을 추천한다",
    (code) => {
      expect(recommendTargetVisas(code)).toEqual(["E-7-4R"]);
    },
  );

  it("외국국적동포(F-4)에게는 F-4-R을 추천한다", () => {
    expect(recommendTargetVisas("F-4")).toEqual(["F-4-R"]);
  });

  it("체류자격을 모르면 4개 비자를 모두 노출한다", () => {
    expect(recommendTargetVisas("UNKNOWN")).toEqual([...TARGET_VISA_CODES]);
  });

  it("기타 체류자격도 4개 비자를 모두 노출한다", () => {
    expect(recommendTargetVisas("OTHER")).toEqual([...TARGET_VISA_CODES]);
  });

  it("추천 결과는 항상 목표 비자 4종 안에서만 나온다", () => {
    for (const code of CURRENT_VISA_OPTIONS) {
      for (const recommended of recommendTargetVisas(code)) {
        expect(TARGET_VISA_CODES).toContain(recommended);
      }
    }
  });

  it("추천 결과는 비어 있지 않다", () => {
    for (const code of CURRENT_VISA_OPTIONS) {
      expect(recommendTargetVisas(code).length).toBeGreaterThan(0);
    }
  });

  it("F-2-R 자격변경 제한 대상에게는 F-2-R을 추천하지 않는다", () => {
    // E-9·E-10·H-2는 리플렛 p.3의 F-2-R 자격변경 제한 목록에 포함된다.
    for (const code of ["E-9", "E-10"] as const) {
      expect(recommendTargetVisas(code)).not.toContain("F-2-R");
    }
  });
});
