import { generateText, stepCountIs } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { staticFallback } from "./fallback";
import { createChatLogger, createNoopLogger, hashSessionKey, type ChatLogger } from "./logging";
import { buildAnswerSystemPrompt, buildEscalationTranslationPrompt } from "./prompts";
import { createChatQueries, type ChatQueries } from "./queries";
import { buildEscalation, resolveRiskRoute } from "./risk-routing";
import { screenMessage } from "./screening";
import { createChatTools, type ChatTools } from "./tools";
import type { AgencyContactRow, ChatMessage, ChatResponse, ScreeningResult, SourceRef } from "./types";
import { redactViolations, verbatimViolations } from "./verbatim";

type ToolCallRecord = { toolName: string; output: { table: string; rows: unknown[] } };

export type OrchestratorDeps = {
  queries: ChatQueries;
  logger: ChatLogger;
  screen: (text: string) => Promise<ScreeningResult>;
  generateAnswer: (args: { system: string; messages: ChatMessage[]; tools: ChatTools }) => Promise<{ text: string; toolCalls: ToolCallRecord[] }>;
  translate: (prompt: string) => Promise<string>;
  answerModel: string | null;
};

const DEFAULT_ANSWER_MODEL = "anthropic/claude-sonnet-5";
const ANSWER_TIMEOUT_MS = 45_000;
const TRANSLATION_TIMEOUT_MS = 10_000;

function collectSources(toolCalls: ToolCallRecord[]): SourceRef[] {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  for (const call of toolCalls) {
    for (const row of call.output.rows) {
      const r = row as Record<string, unknown>;
      const key = `${call.output.table}:${String(r.source_document ?? "")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({
        table: call.output.table,
        sourceDocument: (r.source_document as string | null) ?? null,
        lastVerifiedAt: (r.last_verified_at as string | null) ?? null,
      });
    }
  }
  return sources;
}

function collectRowIds(toolCalls: ToolCallRecord[]): string[] {
  const ids: string[] = [];
  for (const call of toolCalls) {
    for (const row of call.output.rows) {
      const r = row as Record<string, unknown>;
      const id = r.visa_id ?? r.criterion_id ?? r.stage_id ?? r.document_requirement_id ?? r.quota_status_id ?? r.agency_id ?? r.routing_id;
      if (typeof id === "string") ids.push(id);
    }
  }
  return ids;
}

function collectAllowedContacts(toolCalls: ToolCallRecord[]): string[] {
  const allowed: string[] = [];
  for (const call of toolCalls) {
    for (const row of call.output.rows) {
      const r = row as Record<string, unknown>;
      for (const field of ["phone", "url", "external_phone", "external_url"]) {
        if (typeof r[field] === "string" && r[field]) allowed.push(r[field] as string);
      }
    }
  }
  return allowed;
}

export async function handleChatTurn(
  input: { messages: ChatMessage[]; locale: string; anonKey: string },
  deps: OrchestratorDeps,
): Promise<ChatResponse> {
  const started = Date.now();
  const userText = input.messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const sessionHash = hashSessionKey(input.anonKey);

  let response: ChatResponse;
  let screening: ScreeningResult | null = null;
  let toolCalls: ToolCallRecord[] = [];
  // 로깅용 근거 행 ID. Stage 2 tool 호출(toolCalls)뿐 아니라 escalation/out_of_scope
  // 경로에서 직접 조회한 risk_routing_table·agency_contacts 행도 감사 로그에 남긴다.
  let usedRowIds: string[] = [];

  try {
    screening = await deps.screen(userText);

    // ① 위험 신호 + risk 행 존재 → 결정론 escalation
    if (screening.screeningFailed && screening.riskCategory === "NONE") {
      const fallback = await outOfScopeResponse(input.locale, screening, deps);
      response = fallback.response;
      usedRowIds = fallback.rowIds;
    } else if (screening.riskCategory !== "NONE") {
      const route = await resolveRiskRoute(screening, deps.queries);
      if (route.matched) {
        usedRowIds = route.rows.map((r) => r.routing_id).concat(route.agencies.map((a) => a.agency_id));
        const escalation = buildEscalation(route);
        let text = escalation.template;
        if (screening.language !== "ko") {
          try {
            text = await deps.translate(
              buildEscalationTranslationPrompt(escalation.template, screening.language),
            );
          } catch {
            text = escalation.template; // 번역 실패 시 한국어 원문 (연락처 카드는 어차피 verbatim)
          }
        }
        response = { kind: "escalation", text, escalation, sources: [] };
      } else {
        // 위험 신호인데 검증된 행이 없으면 ③으로: 스코프 내 기관 안내
        const fallback = await outOfScopeResponse(input.locale, screening, deps);
        response = fallback.response;
        usedRowIds = fallback.rowIds;
      }
    } else {
      // ② 응답 LLM + tools
      const result = await deps.generateAnswer({
        system: buildAnswerSystemPrompt(input.locale),
        messages: input.messages,
        tools: createChatTools(deps.queries),
      });
      toolCalls = result.toolCalls;
      const totalRows = toolCalls.reduce((n, c) => n + c.output.rows.length, 0);

      if (toolCalls.length > 0 && totalRows === 0) {
        // ③ 조회했지만 전부 빈 결과 → out_of_scope + 범용 접점
        const fallback = await outOfScopeResponse(input.locale, screening, deps, result.text);
        response = fallback.response;
        usedRowIds = fallback.rowIds;
      } else {
        response = { kind: "answer", text: result.text, sources: collectSources(toolCalls) };
        usedRowIds = collectRowIds(toolCalls);
      }
    }
  } catch {
    response = { kind: "error", text: staticFallback(input.locale), sources: [] };
  }

  // verbatim 위반은 로그만 남기지 않고 최종 응답에서도 안전 표기로 치환한다(스펙 §5).
  const allowed = collectAllowedContacts(toolCalls).concat(
    response.escalation?.contacts.flatMap((c) => [c.phone ?? "", c.url ?? ""]) ?? [],
  );
  const violations = verbatimViolations(response.text, allowed);
  if (violations.length > 0) {
    response = { ...response, text: redactViolations(response.text, violations) };
  }

  // 로깅 (2층). 로깅 실패가 응답을 막으면 안 된다.
  try {
    const sessionId = await deps.logger.ensureSession(input.anonKey, input.locale);
    await deps.logger.saveTurn(sessionId, userText, response);
    await deps.logger.logTurn({
      sessionHash,
      route: response.kind,
      riskCategory: screening && screening.riskCategory !== "NONE" ? screening.riskCategory : null,
      toolCalls: toolCalls.map((c) => c.toolName),
      rowIds: usedRowIds,
      model: deps.answerModel,
      latencyMs: Date.now() - started,
      verbatimViolationCount: violations.length,
    });
  } catch {
    // no-op: 로깅 실패는 무시
  }

  return response;
}

/** ③/④: 스코프 내 기관 안내 → 없으면 범용 접점(지역 FOREIGN_SUPPORT_CENTER, 스펙 §4) */
async function outOfScopeResponse(
  locale: string,
  screening: ScreeningResult,
  deps: OrchestratorDeps,
  llmText?: string,
): Promise<{ response: ChatResponse; rowIds: string[] }> {
  let agencies = await deps.queries.findAgency({
    region: screening.region ?? undefined,
    categoryMinor: "FOREIGN_SUPPORT_CENTER",
  });
  if (agencies.length === 0) {
    agencies = await deps.queries.findAgency({ region: "충청북도" });
  }
  const picked: AgencyContactRow[] = agencies.slice(0, 3);
  const contacts = picked.map((a) => ({
    name: a.department_name ?? a.category_minor,
    phone: a.phone,
    url: a.url,
    regionScope: a.region,
    department: a.department_name,
    address: a.address,
  }));
  const response: ChatResponse = {
    kind: "out_of_scope",
    text: llmText ?? staticFallback(locale),
    escalation: contacts.length > 0
      ? { template: "", verifiedForUserType: true, contacts }
      : undefined,
    sources: picked.map((a) => ({
      table: "agency_contacts",
      sourceDocument: a.source_document,
      lastVerifiedAt: a.last_verified_at,
    })),
  };
  return { response, rowIds: picked.map((a) => a.agency_id) };
}

/** 실제 운영 의존성 조립. env 미설정이면 null — 라우트가 503으로 응답한다. */
export async function createDefaultDeps(): Promise<OrchestratorDeps | null> {
  if (!process.env.AI_GATEWAY_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const supabase = await createClient();
  const admin = createAdminClient();
  const answerModel = process.env.CHAT_ANSWER_MODEL ?? DEFAULT_ANSWER_MODEL;

  return {
    queries: createChatQueries(supabase),
    logger: admin ? createChatLogger(admin) : createNoopLogger(),
    screen: (text) => screenMessage(text),
    generateAnswer: async ({ system, messages, tools }) => {
      const result = await generateText({
        model: answerModel,
        system,
        messages,
        tools,
        stopWhen: stepCountIs(5),
        timeout: { totalMs: ANSWER_TIMEOUT_MS },
      });
      const toolCalls: ToolCallRecord[] = [];
      for (const step of result.steps) {
        for (const tr of step.toolResults) {
          toolCalls.push({
            toolName: tr.toolName,
            output: tr.output as { table: string; rows: unknown[] },
          });
        }
      }
      return { text: result.text, toolCalls };
    },
    translate: async (prompt) => {
      const result = await generateText({
        model: process.env.CHAT_SCREENING_MODEL ?? "anthropic/claude-haiku-4.5",
        prompt,
        timeout: { totalMs: TRANSLATION_TIMEOUT_MS },
      });
      return result.text;
    },
    answerModel,
  };
}
