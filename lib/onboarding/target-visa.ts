const TARGET_VISA_CODES = new Set(["F-2-R", "E-7-4R", "F-4-R", "D-2"]);

export function isTargetVisaCode(value: unknown): value is string {
  return typeof value === "string" && TARGET_VISA_CODES.has(value);
}

/**
 * 현재 사용자의 목표 비자를 공용 API에서 조회한다.
 * 브라우저에서 Supabase에 직접 접속하지 않는다(스펙 §3). 세션 없음(401)·오류·
 * 유효하지 않은 값은 모두 null로 정규화해, 호출부는 "목표 비자 미설정"으로 동일하게 처리한다.
 */
export async function resolveStoredTargetVisaCode(): Promise<string | null> {
  try {
    const response = await fetch("/api/profile/target-visa");
    if (!response.ok) return null;
    const body = (await response.json()) as { targetVisaCode?: unknown };
    return isTargetVisaCode(body.targetVisaCode) ? body.targetVisaCode : null;
  } catch {
    return null;
  }
}
