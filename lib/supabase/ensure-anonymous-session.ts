import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionUser = { id: string };

/**
 * 로그인 화면 없이 Supabase 세션을 보장한다.
 * 이미 세션(익명이든 정식이든)이 있으면 그대로 두고, 없으면 조용히 익명 로그인을 발급한다.
 *
 * Supabase 대시보드에서 "Anonymous sign-ins"가 비활성화되어 있으면 error가 반환되므로
 * null을 돌려주고, 호출부는 이를 일반적인 저장 실패로 처리한다.
 */
export async function ensureAnonymousSession(
  supabase: SupabaseClient,
): Promise<SessionUser | null> {
  const { data: existing } = await supabase.auth.getUser();
  if (existing.user) return { id: existing.user.id };

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) return null;
  return { id: data.user.id };
}
