import { createClient } from "@/lib/supabase/server";
import type { TargetVisaCode } from "./constants";

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/**
 * 홈 화면의 "선택 비자" 드롭다운이 읽는 현재 목표 비자.
 * `hasCompletedOnboarding`이 이미 행 존재를 확인한 뒤에만 호출되므로 보통
 * 값이 있지만, 조회 자체가 실패한 경우에도 예외를 던지지 않고 null을
 * 반환한다 — 호출부(Home)가 정적 안내로 대체한다.
 */
export async function getTargetVisaCode(): Promise<TargetVisaCode | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_visa_profile")
      .select("target_visa_code")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) return null;

    return data.target_visa_code;
  } catch {
    return null;
  }
}
