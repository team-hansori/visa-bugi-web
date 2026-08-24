/**
 * Kakao Local API의 `region_2depth_name`을 앱에서 쓰는 시·군 단위로 정규화한다.
 * 광역시·특별시의 자치구까지 포함된 경우("청주시 흥덕구") 시 단위만 남긴다.
 */
export function normalizeSigungu(regionDepth2: string): string {
  const trimmed = regionDepth2.trim();
  if (trimmed === "") return "";
  return trimmed.split(/\s+/)[0];
}
