import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { staticFallback } from "@/features/chat/fallback";
import { createDefaultDeps, handleChatTurn } from "@/features/chat/orchestrate";
import { chatRateLimitKey, checkChatRateLimit } from "@/features/chat/rate-limit";
import { chatRequestSchema } from "./schema";

const SESSION_COOKIE = "vb_chat_session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { kind: "error", text: "요청 형식이 올바르지 않습니다.", sources: [] },
      { status: 400 },
    );
  }

  const rateLimit = checkChatRateLimit(chatRateLimitKey(request));
  if (!rateLimit.allowed) {
    return Response.json(
      { kind: "error", text: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", sources: [] },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const deps = await createDefaultDeps();
  if (!deps) {
    return Response.json(
      { kind: "error", text: staticFallback(parsed.data.locale), sources: [] },
      { status: 503 },
    );
  }

  const cookieStore = await cookies();
  let anonKey = cookieStore.get(SESSION_COOKIE)?.value;
  if (!anonKey) {
    anonKey = randomUUID();
    cookieStore.set(SESSION_COOKIE, anonKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 90, // 90일
      path: "/",
    });
  }

  const response = await handleChatTurn(
    { messages: parsed.data.messages, locale: parsed.data.locale, anonKey },
    deps,
  );
  return Response.json(response);
}
