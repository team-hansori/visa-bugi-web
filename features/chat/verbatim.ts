const PHONE_RE = /\b\d{2,4}-\d{3,4}(?:-\d{4})?\b|\b\d{4}\b/g;
const URL_RE = /https?:\/\/[^\s"')\]]+/g;

function isYear(token: string): boolean {
  return /^\d{4}$/.test(token) && Number(token) >= 1900 && Number(token) <= 2099;
}

/** 응답 텍스트에서 전화번호형 토큰과 URL을 추출한다. 4자리 단독 숫자 중 연도는 제외. */
export function extractContactTokens(text: string): string[] {
  const phones = (text.match(PHONE_RE) ?? []).filter((t) => !isYear(t));
  const urls = text.match(URL_RE) ?? [];
  return [...phones, ...urls];
}

function normalize(token: string): string {
  return token.replace(/[-\s]/g, "").replace(/\/+$/, "");
}

/**
 * allowed(테이블에서 온 전화번호·URL 목록)에 없는 연락처 토큰을 반환한다.
 * 비어 있지 않으면 verbatim 원칙 위반 — 운영 로그에 기록하고 eval에서는 0건 게이트.
 */
export function verbatimViolations(text: string, allowed: string[]): string[] {
  const allowedSet = new Set(allowed.filter(Boolean).map(normalize));
  return extractContactTokens(text).filter((t) => !allowedSet.has(normalize(t)));
}
