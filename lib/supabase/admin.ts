import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 service-role 클라이언트. 채팅 저장 테이블(RLS deny-all) 접근에만 쓴다.
 * env 미설정이면 null — 호출부는 no-op 로거로 폴백한다.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
