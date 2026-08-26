import "server-only";

const requestWindowMs = 60_000;
const maxRequestsPerWindow = 6;
const maxHelpRequestsPerWindow = 6;
const maxTrackedClients = 1_000;

type RequestWindow = {
  count: number;
  resetAt: number;
};

const requestWindows = new Map<string, RequestWindow>();
const helpRequestWindows = new Map<string, RequestWindow>();

export function takeOcrRequestSlot(request: Request) {
  return takeRequestSlot(request, requestWindows, maxRequestsPerWindow);
}

export function takeOcrHelpRequestSlot(request: Request) {
  return takeRequestSlot(
    request,
    helpRequestWindows,
    maxHelpRequestsPerWindow,
  );
}

function takeRequestSlot(
  request: Request,
  windows: Map<string, RequestWindow>,
  maxRequests: number,
) {
  const now = Date.now();
  const clientKey = getClientKey(request);
  const current = windows.get(clientKey);

  if (!current || current.resetAt <= now) {
    windows.set(clientKey, { count: 1, resetAt: now + requestWindowMs });
    pruneRequestWindows(windows, now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= maxRequests) {
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

function pruneRequestWindows(windows: Map<string, RequestWindow>, now: number) {
  if (windows.size <= maxTrackedClients) return;

  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }

  while (windows.size > maxTrackedClients) {
    const oldestKey = windows.keys().next().value;
    if (!oldestKey) break;
    windows.delete(oldestKey);
  }
}
