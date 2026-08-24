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
      const existing = await client.from("chat_sessions").select("id").eq("anon_key", anonKey).single();
      if (existing.data?.id) return existing.data.id as string;
      const inserted = await client
        .from("chat_sessions")
        .insert({ anon_key: anonKey, locale })
        .select()
        .single();
      return (inserted.data?.id as string | undefined) ?? null;
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
      await client.from("chat_sessions").delete().eq("anon_key", anonKey);
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
