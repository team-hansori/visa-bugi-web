import "server-only";

const requestWindowMs = 60_000;
const maxRequestsPerWindow = 6;
const maxTrackedClients = 1_000;

type RequestWindow = {
  count: number;
  resetAt: number;
};

const requestWindows = new Map<string, RequestWindow>();

export function takeOcrRequestSlot(request: Request) {
  const now = Date.now();
  const clientKey = getClientKey(request);
  const current = requestWindows.get(clientKey);

  if (!current || current.resetAt <= now) {
    requestWindows.set(clientKey, { count: 1, resetAt: now + requestWindowMs });
    pruneRequestWindows(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= maxRequestsPerWindow) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "local-client";
}

function pruneRequestWindows(now: number) {
  if (requestWindows.size <= maxTrackedClients) return;

  for (const [key, window] of requestWindows) {
    if (window.resetAt <= now) requestWindows.delete(key);
  }

  while (requestWindows.size > maxTrackedClients) {
    const oldestKey = requestWindows.keys().next().value;
    if (!oldestKey) break;
    requestWindows.delete(oldestKey);
  }
}
