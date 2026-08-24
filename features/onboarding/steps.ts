import type { TargetVisaCode } from "./constants";

export type StepId =
  | "locale"
  | "nationality"
  | "gender"
  | "birthdate"
  | "currentVisa"
  | "address"
  | "koreanLevel"
  | "targetVisa"
  | "f2rDetail"
  | "e74rDetail"
  | "f4rDetail"
  | "d2Detail";

/** 목표비자와 무관하게 모두가 거치는 1단계 스텝 (스펙 §9-1 순서). */
export const COMMON_STEP_IDS = [
  "locale",
  "nationality",
  "gender",
  "birthdate",
  "currentVisa",
  "address",
  "koreanLevel",
  "targetVisa",
] as const satisfies readonly StepId[];

const DETAIL_STEP_BY_VISA: Record<TargetVisaCode, StepId> = {
  "F-2-R": "f2rDetail",
  "E-7-4R": "e74rDetail",
  "F-4-R": "f4rDetail",
  "D-2": "d2Detail",
};

/** 각 스텝이 담당하는 폼 필드. 스텝별 검증 범위를 한곳에 모아 문서화한다. */
export const STEP_FIELDS: Record<StepId, string[]> = {
  locale: ["locale"],
  nationality: ["nationality"],
  gender: ["gender"],
  birthdate: ["birthdate"],
  currentVisa: ["currentVisaCode"],
  address: ["addressRoad", "addressJibun", "regionSigungu", "lat", "lng"],
  koreanLevel: ["koreanLevelType", "koreanLevelValue"],
  targetVisa: ["targetVisaCode"],
  f2rDetail: ["educationLevel"],
  e74rDetail: ["e9E10H2ResidenceYears"],
  f4rDetail: ["migrationType"],
  d2Detail: [
    "universityName",
    "departmentName",
    "academicStatus",
    "programStartDate",
  ],
};

/**
 * 목표비자에 따라 전체 스텝 순서를 만든다.
 * 목표비자를 아직 고르지 않았으면 공통 스텝까지만 반환한다.
 */
export function getStepSequence(
  targetVisaCode: TargetVisaCode | null,
): StepId[] {
  const common = [...COMMON_STEP_IDS];
  if (targetVisaCode === null) return common;
  return [...common, DETAIL_STEP_BY_VISA[targetVisaCode]];
}

/** URL의 `?step=` 값을 시퀀스 인덱스로 바꾼다. 모르는 값이면 첫 스텝으로 되돌린다. */
export function getStepIndex(sequence: StepId[], step: string): number {
  const index = sequence.indexOf(step as StepId);
  return index === -1 ? 0 : index;
}
