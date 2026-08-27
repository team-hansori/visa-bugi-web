/** 이번 스코프의 목표 비자 4종. 값은 visa-data의 `visa_requirements.csv` visa_code와 일치한다. */
export const TARGET_VISA_CODES = ["F-2-R", "E-7-4R", "F-4-R", "D-2"] as const;
export type TargetVisaCode = (typeof TARGET_VISA_CODES)[number];

/**
 * 온보딩에서 고를 수 있는 현재 체류자격.
 * 추천 분기(리플렛 p.3, p.11)에 실제로 영향을 주는 코드만 선택지로 둔다.
 */
export const CURRENT_VISA_OPTIONS = [
  "D-2",
  "D-10",
  "E-9",
  "E-10",
  "H-2",
  "F-4",
  "OTHER",
  "UNKNOWN",
] as const;
export type CurrentVisaCode = (typeof CURRENT_VISA_OPTIONS)[number];

/**
 * F-2-R 자격변경 제한 대상 (리플렛 p.3).
 * 이 자격 보유자에게는 F-2-R을 추천하지 않는다.
 */
export const F2R_RESTRICTED_VISA_CODES = [
  "D-3",
  "D-4",
  "E-6-2",
  "E-8",
  "E-9",
  "E-10",
  "G-1",
  "H-1",
] as const;

/** 지역특화형 비자 사업 대상 인구감소지역 6곳 (리플렛 p.3). */
export const POPULATION_DECLINE_REGIONS = [
  "제천시",
  "보은군",
  "옥천군",
  "영동군",
  "괴산군",
  "단양군",
] as const;

export function isPopulationDeclineRegion(sigungu: string): boolean {
  return (POPULATION_DECLINE_REGIONS as readonly string[]).includes(sigungu);
}

/** 지역특화형 비자 3종 — 인구감소지역 거주(희망)가 공통 사업대상 조건이다. */
export const REGION_SPECIALIZED_VISA_CODES = [
  "F-2-R",
  "E-7-4R",
  "F-4-R",
] as const;
