import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  CHUNGBUK_REGIONS, RISK_CATEGORIES, USER_TYPES, type ScreeningResult,
} from "./types";

export const screeningSchema = z.object({
  riskCategory: z.enum([...RISK_CATEGORIES, "NONE"]),
  userType: z.enum(USER_TYPES),
  region: z.enum(CHUNGBUK_REGIONS).nullable(),
  visaCode: z.string().nullable(),
  inScope: z.boolean(),
  language: z.string(),
});

/** 스크리닝 실패 시 보수적 기본값: 위험 아님으로 두되 범위 밖 처리(스펙 §7). */
export const FALLBACK_SCREENING: ScreeningResult = {
  riskCategory: "NONE",
  userType: "UNKNOWN",
  region: null,
  visaCode: null,
  inScope: false,
  language: "ko",
};

const SCREENING_SYSTEM = `너는 충청북도 외국인 주민 비자 안내 서비스의 분류기다.
사용자 메시지를 읽고 다음을 판정해 JSON으로만 답한다.
- riskCategory: 임금체불(WAGE_ARREARS), 산업재해(INDUSTRIAL_ACCIDENT), 폭행/폭력 피해(ASSAULT),
  허가 범위 밖 취업(ILLEGAL_EMPLOYMENT), 지역특화비자 거주지 유지의무 위반(RESIDENCE_CONDITION_VIOLATION).
  완곡한 표현("월급이 안 들어와요", "일하다 다쳤어요")도 해당 카테고리로 분류한다. 해당 없으면 NONE.
- userType: 이주노동자면 FOREIGN_WORKER, 유학생이면 STUDENT, 불명확하면 UNKNOWN.
- region: 메시지에서 확인되는 충북 시군명. 없으면 null. 목록 밖 지역도 null.
- visaCode: 언급된 비자 코드(예: F-2-R, E-7-4R, F-4-R, D-2). 없으면 null.
- inScope: 비자 요건·절차·서류·쿼터·기관 안내 등 서비스 범위 질문이면 true.
- language: 메시지 언어의 BCP-47 태그 소문자(ko, zh, vi, uz, ne, km, en 등).
확신이 없으면 riskCategory=NONE, inScope=false로 보수적으로 판정한다.`;

export const DEFAULT_SCREENING_MODEL = "anthropic/claude-haiku-4.5";

type GenerateFn = (args: { system: string; prompt: string }) => Promise<unknown>;

async function defaultGenerate(args: { system: string; prompt: string }): Promise<unknown> {
  // generateObject는 ai SDK에서 deprecated — generateText + Output.object로 대체.
  const { output } = await generateText({
    model: process.env.CHAT_SCREENING_MODEL ?? DEFAULT_SCREENING_MODEL,
    output: Output.object({ schema: screeningSchema }),
    system: args.system,
    prompt: args.prompt,
  });
  return output;
}

export async function screenMessage(
  text: string,
  opts?: { generate?: GenerateFn },
): Promise<ScreeningResult> {
  const generate = opts?.generate ?? defaultGenerate;
  try {
    const raw = await generate({ system: SCREENING_SYSTEM, prompt: text });
    const parsed = screeningSchema.safeParse(raw);
    return parsed.success ? parsed.data : FALLBACK_SCREENING;
  } catch {
    return FALLBACK_SCREENING;
  }
}
