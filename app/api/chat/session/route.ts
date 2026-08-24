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
      await createChatLogger(admin).deleteSession(anonKey);
    }
    cookieStore.delete(SESSION_COOKIE);
  }
  return Response.json({ deleted: true });
}
