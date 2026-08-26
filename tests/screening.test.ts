import { describe, expect, it } from "vitest";
import { FALLBACK_SCREENING, screenMessage, screeningSchema } from "@/features/chat/screening";

describe("screeningSchema", () => {
  it("유효한 결과를 통과시킨다", () => {
    const ok = screeningSchema.safeParse({
      riskCategory: "WAGE_ARREARS", userType: "FOREIGN_WORKER",
      region: "청주", visaCode: "E-7-4R", inScope: true, language: "ko",
    });
    expect(ok.success).toBe(true);
  });
  it("enum 밖 값은 거부한다", () => {
    const bad = screeningSchema.safeParse({
      riskCategory: "SOMETHING_ELSE", userType: "FOREIGN_WORKER",
      region: null, visaCode: null, inScope: true, language: "ko",
    });
    expect(bad.success).toBe(false);
  });
});

describe("screenMessage", () => {
  it("주입된 generate 결과를 파싱해 반환한다", async () => {
    const r = await screenMessage("월급을 세 달째 못 받았어요", {
      generate: async () => ({
        riskCategory: "WAGE_ARREARS", userType: "FOREIGN_WORKER",
        region: null, visaCode: null, inScope: false, language: "ko",
      }),
    });
    expect(r.riskCategory).toBe("WAGE_ARREARS");
  });

  it("generate가 던지면 보수적 폴백(범위 밖)을 반환한다", async () => {
    const r = await screenMessage("아무거나", {
      generate: async () => { throw new Error("model down"); },
    });
    expect(r).toEqual(FALLBACK_SCREENING);
    expect(r.inScope).toBe(false);
    expect(r.riskCategory).toBe("NONE");
  });

  it("스키마에 안 맞는 결과도 폴백한다", async () => {
    const r = await screenMessage("아무거나", { generate: async () => ({ nonsense: true }) });
    expect(r).toEqual(FALLBACK_SCREENING);
  });
});
