import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createChatLogger } from "@/features/chat/logging";

const SESSION_COOKIE = "vb_chat_session";

export async function DELETE() {
  const cookieStore = await cookies();
  const anonKey = cookieStore.get(SESSION_COOKIE)?.value;

  if (anonKey) {
    const admin = createAdminClient();
    if (admin) {
      try {
        await createChatLogger(admin).deleteSession(anonKey);
      } catch {
        // 삭제 실패 시 쿠키를 지우지 않는다 — 같은 세션으로 재시도할 수 있게 유지.
        return Response.json({ deleted: false }, { status: 500 });
      }
    }
  }
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ deleted: true });
}
