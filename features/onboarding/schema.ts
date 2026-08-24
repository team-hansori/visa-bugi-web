import { z } from "zod";
import { CURRENT_VISA_OPTIONS } from "./constants";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` 문자열이 실제 달력에 존재하는 날짜인지 확인한다. */
function isRealCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** 과거(또는 오늘)의 실제 날짜만 통과시킨다. 스텝별 검증에서도 재사용한다. */
export const pastDateSchema = z
  .string()
  .min(1, "날짜를 입력해 주세요.")
  .refine(isRealCalendarDate, { message: "달력에 없는 날짜입니다." })
  .refine((value) => new Date(`${value}T00:00:00Z`) <= new Date(), {
    message: "미래 날짜는 입력할 수 없습니다.",
  });

/** 한국어능력 유형과 급수의 조합만 따로 검증한다 (koreanLevel 스텝용). */
export const koreanLevelPairSchema = z
  .object({
    koreanLevelType: z.enum(["TOPIK", "KIIP", "NONE"]),
    koreanLevelValue: z.number().int().min(1).max(6).nullable(),
  })
  .refine(
    (value) =>
      value.koreanLevelType === "NONE"
        ? value.koreanLevelValue === null
        : value.koreanLevelValue !== null,
    {
      message: "급수를 선택해 주세요.",
      path: ["koreanLevelValue"],
    },
  );

/** 모든 목표비자에서 공통으로 수집하는 1단계 답변 (스펙 §2.1). */
export const commonAnswersSchema = z
  .object({
    locale: z.enum(["ko", "zh", "vi", "uz", "ne", "km"]),
    gender: z.enum(["male", "female", "unspecified"]),
    birthdate: pastDateSchema,
    nationality: z
      .string()
      .regex(/^[A-Z]{2}$/, "국가 코드는 대문자 2자리입니다."),
    currentVisaCode: z.enum(CURRENT_VISA_OPTIONS),
    addressRoad: z.string().min(1, "주소를 선택해 주세요."),
    addressJibun: z.string().min(1),
    regionSigungu: z.string().min(1),
    // 대한민국 본토·제주를 넉넉히 감싸는 범위. 오입력·좌표계 혼동을 걸러낸다.
    lat: z.number().min(33).max(39),
    lng: z.number().min(124).max(132),
    koreanLevelType: z.enum(["TOPIK", "KIIP", "NONE"]),
    koreanLevelValue: z.number().int().min(1).max(6).nullable(),
  })
  .refine(
    (value) =>
      value.koreanLevelType === "NONE"
        ? value.koreanLevelValue === null
        : value.koreanLevelValue !== null,
    {
      message: "급수를 선택해 주세요.",
      path: ["koreanLevelValue"],
    },
  );

/** 목표비자별 2단계 답변 (스펙 §2.3). targetVisaCode로 판별한다. */
export const visaDetailSchema = z.discriminatedUnion("targetVisaCode", [
  z.object({
    targetVisaCode: z.literal("F-2-R"),
    educationLevel: z.enum(["ASSOCIATE_OR_ABOVE", "BELOW_ASSOCIATE"]),
  }),
  z.object({
    targetVisaCode: z.literal("E-7-4R"),
    e9E10H2ResidenceYears: z.number().int().min(0).max(10),
  }),
  z.object({
    targetVisaCode: z.literal("F-4-R"),
    migrationType: z.enum([
      "EXISTING_RESIDENT",
      "DOMESTIC_TRANSFER",
      "OVERSEAS_TRANSFER",
    ]),
  }),
  z.object({
    targetVisaCode: z.literal("D-2"),
    universityName: z.string().min(1, "대학명을 입력해 주세요."),
    departmentName: z.string().min(1, "학과명을 입력해 주세요."),
    academicStatus: z.enum([
      "LANGUAGE_COURSE",
      "ASSOCIATE",
      "BACHELOR_1_2",
      "BACHELOR_3_4",
      "GRADUATE",
    ]),
    programStartDate: pastDateSchema,
  }),
]);

/**
 * Server Action이 받는 최종 제출 스키마.
 * 공통 답변과 목표비자별 상세 답변을 모두 만족해야 통과한다.
 */
export const onboardingSubmissionSchema = z.intersection(
  commonAnswersSchema,
  visaDetailSchema,
);

export type OnboardingSubmission = z.infer<typeof onboardingSubmissionSchema>;
