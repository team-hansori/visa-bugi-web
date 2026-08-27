/**
 * `document_requirements.condition_note` 원문을 화면용 불릿 목록으로 나눈다.
 *
 * 공식 요건 텍스트를 재작성하지 않고 "나누기만" 한다(스펙: 요건 텍스트에 LLM을
 * 쓰지 않음). 강한 구분자 — 줄바꿈, 가운뎃점(·), 대시(— –), 슬래시(/), 세미콜론(;) —
 * 로만 분리하고, 일반 쉼표는 건드리지 않는다. 한국어는 절이나 괄호 안에서 쉼표를
 * 자주 쓰기 때문이다(예: "혼인관계증명서, 가족관계증명서 등").
 */
export function splitConditionNote(note: string | null | undefined): string[] {
  if (!note) return [];

  return note
    .split(/\s*(?:[\r\n]+|·|[—–]|\/|;)\s*/)
    .map((part) => part.replace(/^[·\s]+/, "").trim())
    .filter((part) => part.length > 0);
}
