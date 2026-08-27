import { describe, expect, it } from "vitest";
import { TARGET_VISA_CODES } from "./constants";
import {
  COMMON_STEP_IDS,
  getStepIndex,
  getStepSequence,
  STEP_FIELDS,
} from "./steps";

describe("getStepSequence", () => {
  it("목표비자를 아직 고르지 않으면 공통 스텝까지만 반환한다", () => {
    expect(getStepSequence(null)).toEqual([...COMMON_STEP_IDS]);
  });

  it("E-7-4R을 고르면 공통 스텝 뒤에 전용 스텝이 붙는다", () => {
    const sequence = getStepSequence("E-7-4R");
    expect(sequence.slice(0, COMMON_STEP_IDS.length)).toEqual([
      ...COMMON_STEP_IDS,
    ]);
    expect(sequence.at(-1)).toBe("e74rDetail");
  });

  it("F-4-R을 고르면 이주 유형 스텝이 붙는다", () => {
    expect(getStepSequence("F-4-R").at(-1)).toBe("f4rDetail");
  });

  it("F-2-R을 고르면 학력 스텝이 붙는다", () => {
    expect(getStepSequence("F-2-R").at(-1)).toBe("f2rDetail");
  });

  it("D-2를 고르면 학교 정보 스텝이 붙는다", () => {
    expect(getStepSequence("D-2").at(-1)).toBe("d2Detail");
  });

  it("모든 목표비자에서 스텝이 중복 없이 나온다", () => {
    for (const code of TARGET_VISA_CODES) {
      const sequence = getStepSequence(code);
      expect(new Set(sequence).size).toBe(sequence.length);
    }
  });

  it("모든 스텝에 검증할 필드 목록이 정의되어 있다", () => {
    for (const code of TARGET_VISA_CODES) {
      for (const step of getStepSequence(code)) {
        expect(STEP_FIELDS[step]).toBeDefined();
        expect(STEP_FIELDS[step].length).toBeGreaterThan(0);
      }
    }
  });

  it("목표비자를 고르면 공통 스텝보다 정확히 1개 많다", () => {
    for (const code of TARGET_VISA_CODES) {
      expect(getStepSequence(code).length).toBe(COMMON_STEP_IDS.length + 1);
    }
  });
});

describe("getStepIndex", () => {
  it("시퀀스에 있는 스텝의 위치를 반환한다", () => {
    expect(getStepIndex(["locale", "gender"], "gender")).toBe(1);
  });

  it("시퀀스에 없는 스텝은 0을 반환한다", () => {
    expect(getStepIndex(["locale", "gender"], "unknown-step")).toBe(0);
  });

  it("빈 문자열은 0을 반환한다", () => {
    expect(getStepIndex(["locale", "gender"], "")).toBe(0);
  });
});
