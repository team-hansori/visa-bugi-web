import { describe, expect, it } from "vitest";
import { koreanLevelPairSchema, onboardingSubmissionSchema } from "./schema";

const validBase = {
  locale: "ko",
  gender: "unspecified",
  birthdate: "1998-04-12",
  nationality: "VN",
  currentVisaCode: "E-9",
  addressRoad: "충북 제천시 내토로 295",
  addressJibun: "충북 제천시 청전동 111",
  regionSigungu: "제천시",
  lat: 37.1326,
  lng: 128.1909,
  koreanLevelType: "TOPIK",
  koreanLevelValue: 3,
} as const;

describe("onboardingSubmissionSchema", () => {
  it("E-7-4R 제출값을 통과시킨다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(true);
  });

  it("F-4-R 제출값을 통과시킨다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      targetVisaCode: "F-4-R",
      migrationType: "EXISTING_RESIDENT",
    });
    expect(result.success).toBe(true);
  });

  it("F-2-R 제출값을 통과시킨다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      targetVisaCode: "F-2-R",
      educationLevel: "ASSOCIATE_OR_ABOVE",
    });
    expect(result.success).toBe(true);
  });

  it("D-2 제출값을 통과시킨다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      targetVisaCode: "D-2",
      universityName: "충북대학교",
      departmentName: "융합소프트웨어학과",
      academicStatus: "BACHELOR_3_4",
      programStartDate: "2024-03-02",
    });
    expect(result.success).toBe(true);
  });

  it("목표비자에 필요한 상세 필드가 없으면 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      targetVisaCode: "F-4-R",
    });
    expect(result.success).toBe(false);
  });

  it("한국어능력이 NONE이면 급수는 null이어야 한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      koreanLevelType: "NONE",
      koreanLevelValue: 3,
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("한국어능력이 TOPIK이면 급수가 있어야 한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      koreanLevelType: "TOPIK",
      koreanLevelValue: null,
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("미래 생년월일은 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      birthdate: "2999-01-01",
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("달력에 없는 날짜는 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      birthdate: "1998-02-30",
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("지원하지 않는 locale은 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      locale: "ja",
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("한국 밖의 좌표는 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      lat: 48.85,
      lng: 2.35,
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("국가 코드가 대문자 2자리가 아니면 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      nationality: "vnm",
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe("koreanLevelPairSchema는 제출 스키마와 같은 규칙을 쓴다", () => {
  const cases = [
    { koreanLevelType: "NONE", koreanLevelValue: null, valid: true },
    { koreanLevelType: "NONE", koreanLevelValue: 3, valid: false },
    { koreanLevelType: "TOPIK", koreanLevelValue: 3, valid: true },
    { koreanLevelType: "TOPIK", koreanLevelValue: null, valid: false },
    { koreanLevelType: "KIIP", koreanLevelValue: 2, valid: true },
  ] as const;

  it.each(cases)(
    "$koreanLevelType / $koreanLevelValue → $valid",
    ({ koreanLevelType, koreanLevelValue, valid }) => {
      const stepResult = koreanLevelPairSchema.safeParse({
        koreanLevelType,
        koreanLevelValue,
      });
      const submissionResult = onboardingSubmissionSchema.safeParse({
        ...validBase,
        koreanLevelType,
        koreanLevelValue,
        targetVisaCode: "E-7-4R",
        e9E10H2ResidenceYears: 3,
      });
      expect(stepResult.success).toBe(valid);
      // 스텝 검증과 제출 검증이 같은 판단을 해야 한다.
      expect(stepResult.success).toBe(submissionResult.success);
    },
  );
});
