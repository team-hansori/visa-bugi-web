import { describe, expect, it } from "vitest";
import { normalizeSigungu } from "./normalize";

describe("normalizeSigungu", () => {
  it("시 단위 이름은 그대로 반환한다", () => {
    expect(normalizeSigungu("제천시")).toBe("제천시");
  });

  it("군 단위 이름은 그대로 반환한다", () => {
    expect(normalizeSigungu("괴산군")).toBe("괴산군");
  });

  it("자치구가 붙은 이름은 시 단위까지만 남긴다", () => {
    expect(normalizeSigungu("청주시 흥덕구")).toBe("청주시");
  });

  it("빈 문자열은 빈 문자열을 반환한다", () => {
    expect(normalizeSigungu("")).toBe("");
  });

  it("앞뒤 공백을 제거한다", () => {
    expect(normalizeSigungu("  단양군  ")).toBe("단양군");
  });
});
