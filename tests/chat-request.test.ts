import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "@/app/api/chat/schema";

describe("chatRequestSchema", () => {
  it("정상 요청을 통과시킨다", () => {
    const ok = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: "F-2-R 요건 알려줘" }],
      locale: "ko",
    });
    expect(ok.success).toBe(true);
  });
  it("지원하지 않는 locale을 거부한다", () => {
    expect(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "hi" }], locale: "fr" }).success).toBe(false);
  });
  it("빈 messages, 4000자 초과 content, 20개 초과 messages를 거부한다", () => {
    expect(chatRequestSchema.safeParse({ messages: [], locale: "ko" }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "a".repeat(4001) }], locale: "ko" }).success).toBe(false);
    const many = Array.from({ length: 21 }, () => ({ role: "user" as const, content: "q" }));
    expect(chatRequestSchema.safeParse({ messages: many, locale: "ko" }).success).toBe(false);
  });
});
