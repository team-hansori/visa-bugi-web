// 하이픈 포함 국내 전화번호 형식과 하이픈 없이 붙여 쓴 0으로 시작하는 9~11자리.
const PHONE_RE = /\b\d{2,4}-\d{3,4}(?:-\d{4})?\b|\b0\d{8,10}\b/g;
// 4자리 특수번호는 연락처 문맥이 바로 앞에 있을 때만 추출한다.
const CONTEXTUAL_SHORT_PHONE_RE = /(?:\u260E|\uC804\uD654(?:\uBC88\uD638)?|\uC5F0\uB77D\uCC98|tel(?:ephone)?)\s*(?:\uC740|\uB294|:)?\s*(\d{4})(?![\d-])\b/gi;
const URL_RE = /https?:\/\/[^\s"')\]]+/g;
// URL 매칭 뒤에 붙는 한글 자모·완성형 음절과 흔한 문장부호를 잘라낸다.
// "...를 참고하세요"처럼 URL 뒤에 공백 없이 조사가 붙는 한국어 문장 패턴에서
// 도메인의 dot(.)까지 문자 집합에서 제외하면 URL 자체가 깨지므로, 후행 트리밍으로 처리한다.
const TRAILING_KOREAN_PUNCT_RE = /[.,!?;:ㄱ-ㆎ가-힣]+$/;

function trimTrailingKorean(url: string): string {
  return url.replace(TRAILING_KOREAN_PUNCT_RE, "");
}

function isYear(token: string): boolean {
  return /^\d{4}$/.test(token) && Number(token) >= 1900 && Number(token) <= 2099;
}

/** 응답 텍스트에서 전화번호형 토큰과 URL을 추출한다. 4자리 단독 숫자 중 연도는 제외. */
export function extractContactTokens(text: string): string[] {
  const phones = [
    ...Array.from(text.matchAll(PHONE_RE), (match) => ({ token: match[0], index: match.index ?? 0 })),
    ...Array.from(text.matchAll(CONTEXTUAL_SHORT_PHONE_RE), (match) => ({
      token: match[1],
      index: (match.index ?? 0) + match[0].lastIndexOf(match[1]),
    })),
  ]
    .filter(({ token }) => !isYear(token))
    .sort((a, b) => a.index - b.index)
    .map(({ token }) => token);
  const urls = (text.match(URL_RE) ?? []).map(trimTrailingKorean);
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

/**
 * 위반 토큰을 응답에서 안전 표기로 치환한다. verbatim 위반은 로그만 남기고 그대로
 * 내보내면 잘못된 연락처가 사용자에게 도달할 수 있으므로(스펙 §5 verbatim 원칙),
 * 감지 즉시 최종 응답에서도 제거한다. 정규식 특수문자를 피하기 위해 split/join을 쓴다.
 */
export function redactViolations(text: string, violations: string[]): string {
  let result = text;
  for (const v of violations) {
    if (!v) continue;
    result = result.split(v).join("[확인 필요]");
  }
  return result;
}
