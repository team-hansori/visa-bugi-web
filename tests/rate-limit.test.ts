import { afterEach, describe, expect, it } from "vitest";
import {
  chatRateLimitKey,
  checkChatRateLimit,
  resetChatRateLimitForTest,
} from "@/features/chat/rate-limit";

afterEach(() => resetChatRateLimitForTest());

describe("checkChatRateLimit", () => {
  it("allows ten requests per minute and then returns a retry delay", () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i += 1) {
      expect(checkChatRateLimit("session:test", now)).toEqual({ allowed: true });
    }

    expect(checkChatRateLimit("session:test", now)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("creates a fresh window after the previous window expires", () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i += 1) checkChatRateLimit("session:test", now);

    expect(checkChatRateLimit("session:test", now + 60_000)).toEqual({ allowed: true });
  });
});

describe("chatRateLimitKey", () => {
  it("prefers the anonymous session cookie over the client IP", () => {
    const request = new Request("https://example.test/api/chat", {
      headers: {
        cookie: "other=value; vb_chat_session=session-1",
        "x-forwarded-for": "203.0.113.1",
      },
    });

    expect(chatRateLimitKey(request)).toBe("session:session-1");
  });

  it("uses the first forwarded client IP when no session exists", () => {
    const request = new Request("https://example.test/api/chat", {
      headers: { "x-forwarded-for": "203.0.113.1, 198.51.100.1" },
    });

    expect(chatRateLimitKey(request)).toBe("ip:203.0.113.1");
  });
});
