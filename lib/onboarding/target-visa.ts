import { createClient } from "@/lib/supabase/client";

const TARGET_VISA_CODES = new Set(["F-2-R", "E-7-4R", "F-4-R", "D-2"]);

export function isTargetVisaCode(value: unknown): value is string {
  return typeof value === "string" && TARGET_VISA_CODES.has(value);
}

/**
 * 온보딩이 저장한 현재 사용자의 목표 비자를 조회한다.
 * 익명 사용자와 로그인 사용자 모두 auth.users의 user_id를 사용하므로
 * 동일한 조회 흐름을 사용한다. 세션·행·값이 없으면 null을 반환한다.
 */
export async function resolveStoredTargetVisaCode(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_visa_profile")
      .select("target_visa_code")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !isTargetVisaCode(data?.target_visa_code)) return null;
    return data.target_visa_code;
  } catch {
    return null;
  }
}
