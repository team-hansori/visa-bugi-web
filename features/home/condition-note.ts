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
 */
export function splitConditionNote(note: string | null | undefined): string[] {
  if (!note) return [];

  return note
    .split(/[\r\n]+|\s+[—–]\s+|\s*;\s*/)
    .map((part) => part.replace(/^[·•\-*\s]+/, "").trim())
    .filter((part) => part.length > 0);
}
