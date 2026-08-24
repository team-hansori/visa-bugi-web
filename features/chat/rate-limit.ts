const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

type Entry = { count: number; resetAt: number };

const entries = new Map<string, Entry>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Best-effort per-instance limiter for the public chat route. A shared store is
 * still required for a deployment-wide limit when the service scales out.
 */
export function checkChatRateLimit(key: string, now = Date.now()): RateLimitResult {
  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true };
}

/** Test-only reset to keep rate-limit cases independent. */
export function resetChatRateLimitForTest() {
  entries.clear();
}

export function chatRateLimitKey(request: Request): string {
  const sessionKey = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("vb_chat_session="))
    ?.slice("vb_chat_session=".length);

  if (sessionKey) return `session:${sessionKey}`;

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `ip:${forwardedFor || realIp || "unknown"}`;
}
