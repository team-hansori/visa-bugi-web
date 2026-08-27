import { describe, expect, it } from "vitest";
import { onboardingSubmissionSchema } from "./schema";

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
  topikLevel: 3,
  kiipLevel: null,
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

  it("TOPIK·KIIP 둘 다 null이면(한국어능력 없음) 통과한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      topikLevel: null,
      kiipLevel: null,
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(true);
  });

  it("TOPIK·KIIP 둘 다 값이 있어도 통과한다 (중복 보유)", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      topikLevel: 4,
      kiipLevel: 2,
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(true);
  });

  it("TOPIK 급수가 범위를 벗어나면 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      topikLevel: 7,
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

  it("좌표가 null이어도 통과한다 (주소 직접 입력 경로)", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      lat: null,
      lng: null,
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(true);
  });
});
