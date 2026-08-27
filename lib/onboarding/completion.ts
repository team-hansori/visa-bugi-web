import { createClient } from "@/lib/supabase/server";

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/**
 * 데모 진행을 위해 온보딩을 마치기 전까지는 홈 화면 대신 온보딩으로 보낸다
 * (`saveOnboarding`이 마지막에 upsert하는 `user_visa_profile` 행의 존재로 판단).
 *
 * Supabase가 설정되지 않은 환경(예: 환경변수 없이 정적 빌드)이나 조회 자체가
 * 실패한 경우에는 게이트를 걸지 않고 통과시킨다 — 온보딩이 애초에 동작하지
 * 않는 상황에서 사용자를 그 화면에 가두면 안 된다.
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return false;

    const { data, error } = await supabase
      .from("user_visa_profile")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return true;

    return Boolean(data);
  } catch {
    return true;
  }
}
