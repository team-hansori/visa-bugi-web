import { describe, expect, it } from "vitest";
import { createChatLogger, createNoopLogger, hashSessionKey } from "@/features/chat/logging";
import type { SupabaseClient } from "@supabase/supabase-js";

/** insert/select/delete 호출을 기록하는 최소 목 (queries용 fake와 별개: 쓰기 경로 검증용) */
function writeRecordingClient(opts: { deleteError?: { message: string } | null } = {}) {
  const deleteError = opts.deleteError ?? null;
  const writes: { table: string; op: string; payload?: unknown }[] = [];
  function from(table: string) {
    const builder = {
      insert: (payload: unknown) => {
        writes.push({ table, op: "insert", payload });
        return {
          select: () => ({ single: async () => ({ data: { id: "s-1" }, error: null }) }),
          then: (r: (x: { error: null }) => unknown) => Promise.resolve({ error: null }).then(r),
        };
      },
      upsert: () => Promise.resolve({ error: null }),
      select: () => builder,
      eq: () => builder,
      single: async () => ({ data: null, error: { code: "PGRST116", message: "no rows" } }),
      delete: () => ({
        eq: (col: string, v: unknown) => {
          writes.push({ table, op: "delete", payload: `${col}=${String(v)}` });
          return Promise.resolve({ error: deleteError });
        },
      }),
    };
    return builder;
  }
  return { client: { from } as unknown as SupabaseClient, writes };
}

describe("hashSessionKey", () => {
  it("64자 hex를 반환하고 원문을 포함하지 않는다", () => {
    const h = hashSessionKey("my-secret-session");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("my-secret-session");
  });
});

describe("createChatLogger", () => {
  it("logTurn은 chat_turn_logs에 발화 원문 없이 기록한다", async () => {
    const { client, writes } = writeRecordingClient();
    const logger = createChatLogger(client);
    await logger.logTurn({
      sessionHash: "abc", route: "escalation", riskCategory: "WAGE_ARREARS",
      toolCalls: [], rowIds: ["r1"], model: "m", latencyMs: 120, verbatimViolationCount: 0,
    });
    const log = writes.find((w) => w.table === "chat_turn_logs");
    expect(log?.op).toBe("insert");
    expect(JSON.stringify(log?.payload)).not.toContain("월급");
  });

  it("deleteSession은 anon_key 기준으로 세션을 지운다 (messages는 cascade)", async () => {
    const { client, writes } = writeRecordingClient();
    const logger = createChatLogger(client);
    await logger.deleteSession("anon-1");
    expect(writes).toContainEqual({ table: "chat_sessions", op: "delete", payload: "anon_key=anon-1" });
  });

  it("deleteSession은 삭제 실패 시 조용히 넘어가지 않고 던진다 (개인정보 삭제 경로는 실패를 숨기면 안 됨)", async () => {
    const { client } = writeRecordingClient({ deleteError: { message: "connection reset" } });
    const logger = createChatLogger(client);
    await expect(logger.deleteSession("anon-1")).rejects.toThrow(/connection reset/);
  });
});

describe("createChatLogger concurrent sessions", () => {
  it("persists both conversations when requests share an anonymous session", async () => {
    const sessions = new Map<string, string>();
    const messages: Record<string, unknown>[] = [];
    const client = {
      from(table: string) {
        if (table === "chat_sessions") {
          return {
            upsert: async ({ anon_key }: { anon_key: string }) => {
              await Promise.resolve();
              if (!sessions.has(anon_key)) sessions.set(anon_key, "session-1");
              return { error: null };
            },
            select: () => ({
              eq: (_column: string, anonKey: string) => ({
                single: async () => ({ data: { id: sessions.get(anonKey) }, error: null }),
              }),
            }),
          };
        }
        if (table === "chat_messages") {
          return {
            insert: async (rows: Record<string, unknown>[]) => {
              messages.push(...rows);
              return { error: null };
            },
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    } as unknown as SupabaseClient;
    const logger = createChatLogger(client);
    const answer = { kind: "answer" as const, text: "answer", sources: [] };

    const [firstSession, secondSession] = await Promise.all([
      logger.ensureSession("anon-1", "ko"),
      logger.ensureSession("anon-1", "ko"),
    ]);
    await Promise.all([
      logger.saveTurn(firstSession, "first question", answer),
      logger.saveTurn(secondSession, "second question", answer),
    ]);

    expect(firstSession).toBe("session-1");
    expect(secondSession).toBe("session-1");
    expect(messages).toHaveLength(4);
    expect(messages.filter((message) => message.role === "user").map((message) => message.content))
      .toEqual(["first question", "second question"]);
  });
});

describe("createNoopLogger", () => {
  it("모든 메서드가 조용히 성공한다 (env 미설정 폴백)", async () => {
    const logger = createNoopLogger();
    await expect(logger.ensureSession("k", "ko")).resolves.toBeNull();
    await expect(logger.logTurn({
      sessionHash: "x", route: "answer", riskCategory: null,
      toolCalls: [], rowIds: [], model: null, latencyMs: 0, verbatimViolationCount: 0,
    })).resolves.toBeUndefined();
    await expect(logger.deleteSession("k")).resolves.toBeUndefined();
  });
});
