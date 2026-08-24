import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatResponse, ChatResponseKind } from "./types";

export type TurnLogEntry = {
  sessionHash: string;
  route: ChatResponseKind;
  riskCategory: string | null;
  toolCalls: string[];
  rowIds: string[];
  model: string | null;
  latencyMs: number;
  verbatimViolationCount: number;
};

export type ChatLogger = {
  /** 세션이 없으면 만들고 session_id를 반환. 실패 시 null(저장 없이 진행). */
  ensureSession(anonKey: string, locale: string): Promise<string | null>;
  saveTurn(sessionId: string | null, userText: string, assistant: ChatResponse): Promise<void>;
  logTurn(entry: TurnLogEntry): Promise<void>;
  deleteSession(anonKey: string): Promise<void>;
};

export function hashSessionKey(anonKey: string): string {
  return createHash("sha256").update(anonKey).digest("hex");
}

export function createChatLogger(client: SupabaseClient): ChatLogger {
  return {
    async ensureSession(anonKey, locale) {
      const { error: upsertError } = await client
        .from("chat_sessions")
        .upsert({ anon_key: anonKey, locale }, { onConflict: "anon_key", ignoreDuplicates: true });
      if (upsertError) throw new Error(`chat session upsert failed: ${upsertError.message}`);

      const { data, error } = await client.from("chat_sessions").select("id").eq("anon_key", anonKey).single();
      if (error || !data?.id) throw new Error(`chat session lookup failed: ${error?.message ?? "missing id"}`);
      return data.id as string;
    },
    async saveTurn(sessionId, userText, assistant) {
      if (!sessionId) return;
      await client.from("chat_messages").insert([
        { session_id: sessionId, role: "user", content: userText },
        { session_id: sessionId, role: "assistant", content: assistant.text, kind: assistant.kind },
      ]);
    },
    async logTurn(entry) {
      await client.from("chat_turn_logs").insert({
        session_hash: entry.sessionHash,
        route: entry.route,
        risk_category: entry.riskCategory,
        tool_calls: entry.toolCalls,
        row_ids: entry.rowIds,
        model: entry.model,
        latency_ms: entry.latencyMs,
        verbatim_violation_count: entry.verbatimViolationCount,
      });
    },
    async deleteSession(anonKey) {
      // 개인정보 삭제 경로는 실패를 조용히 삼키면 안 된다 — 호출부(API 라우트)가
      // 실패를 사용자에게 알릴 수 있도록 에러를 던진다.
      const { error } = await client.from("chat_sessions").delete().eq("anon_key", anonKey);
      if (error) throw new Error(`세션 삭제 실패: ${error.message}`);
    },
  };
}

/** SUPABASE_SECRET_KEY 미설정 시 폴백: 저장 없이 대화만 동작한다. */
export function createNoopLogger(): ChatLogger {
  return {
    ensureSession: async () => null,
    saveTurn: async () => undefined,
    logTurn: async () => undefined,
    deleteSession: async () => undefined,
  };
}
