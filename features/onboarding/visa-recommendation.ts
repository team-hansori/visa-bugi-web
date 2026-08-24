import {
  type CurrentVisaCode,
  TARGET_VISA_CODES,
  type TargetVisaCode,
} from "./constants";

/**
 * 현재 체류자격으로 목표 비자 후보를 좁힌다.
 *
 * 근거 (2026 외국인정책 지원사업 리플렛):
 * - p.11 채용장려금: D-2 유학생·D-10 구직자 → F-2-R 전환 경로
 * - p.7 광역형 비자: 도내 대학 재학·입학 유학생(D-2) 대상 특례
 * - p.3 E-7-4R 대상자: 최근 10년간 E-9·E-10·H-2로 2년 이상 체류
 * - p.3 F-4-R 대상자: 국내·외 외국국적동포
 * - p.3 F-2-R 자격변경 제한 대상: D-3·D-4·E-6-2·E-8·E-9·E-10·G-1·H-1
 *
 * 판정이 아니라 화면에 보여줄 후보를 좁히는 용도다. 최종 자격 여부는
 * 관할 출입국·외국인관서가 판단한다.
 */
export function recommendTargetVisas(
  currentVisaCode: CurrentVisaCode,
): TargetVisaCode[] {
  switch (currentVisaCode) {
    // 재학 중에는 광역형 D-2 특례, 졸업 후에는 F-2-R 전환이 가능하다.
    case "D-2":
      return ["D-2", "F-2-R"];
    case "D-10":
      return ["F-2-R"];
    // E-9·E-10·H-2는 E-7-4R 대상자 요건의 전제이자 F-2-R 제한 대상이다.
    case "E-9":
    case "E-10":
    case "H-2":
      return ["E-7-4R"];
    case "F-4":
      return ["F-4-R"];
    default:
      return [...TARGET_VISA_CODES];
  }
}
