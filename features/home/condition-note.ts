/**
 * `document_requirements.condition_note` 원문을 화면용 불릿 목록으로 나눈다.
 *
 * 공식 요건 텍스트를 재작성하지 않고 "나누기만" 한다(스펙: 요건 텍스트에 LLM을
 * 쓰지 않음). 구분자로 오해할 여지가 적은 것만 쓴다:
 *
 * - 줄바꿈
 * - 앞뒤에 공백이 있는 대시(` — `, ` – `) — 절 구분. 공백 없는 `6–12`(숫자 범위)는 건드리지 않음
 * - 세미콜론(`;`) — 한국어 산문에서는 거의 목록 구분자로만 쓰임
 *
 * 가운뎃점(`·`)은 `시·군·구청`처럼 명사 병렬에, 슬래시(`/`)는 `본인/대리인`처럼
 * 택일에 쓰이므로 분리 기준으로 삼지 않는다. 각 조각 앞의 불릿 기호(`·`, `•`, `-`, `*`)는
 * 지운다.
 *
 * 그리고 `condition_note`에는 사용자용 안내가 아니라 데이터 큐레이션 메모
 * (원문 인용, 해석 근거, `alternative_group=...` 같은 스키마 결정)가 섞여 들어오는
 * 경우가 있어, 아래 패턴에 걸리는 줄은 화면에서 제외한다. 근본 해결은 visa-data가
 * `condition_note`를 사용자용 문구만 남기고 내부 메모를 분리하는 것이다.
 */
const INTERNAL_ANNOTATION_PATTERNS: RegExp[] = [
  // 메타 접두사: "원문:", "출처:", "비고:", "참고:", "주:", "메모:", "해석:", "분류:"
  /^(원문|출처|비고|참고|주|메모|해석|분류)\s*[:：]/,
  // 스키마 토큰: alternative_group=LANGUAGE_PROOF, requirement_status=... 등
  /[A-Za-z][\w]*_(group|status|code|type|kind|id)\s*=/i,
  // 큐레이션 서술: "3개 대체 행으로 분리함", "행으로 분리하였음"
  /(행|줄)\s*으로\s*분리/,
  /분리(함|하였|했|한다)/,
];

function isInternalAnnotation(line: string): boolean {
  return INTERNAL_ANNOTATION_PATTERNS.some((pattern) => pattern.test(line));
}

export function splitConditionNote(note: string | null | undefined): string[] {
  if (!note) return [];

  return note
    .split(/[\r\n]+|\s+[—–]\s+|\s*;\s*/)
    .map((part) => part.replace(/^[·•\-*\s]+/, "").trim())
    .filter((part) => part.length > 0)
    .filter((part) => !isInternalAnnotation(part));
}
