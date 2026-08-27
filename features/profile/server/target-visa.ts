import "server-only";
import { ApiRouteError } from "@/lib/api/errors";
import { isTargetVisaCode } from "@/lib/onboarding/target-visa";
import { createClient } from "@/lib/supabase/server";

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/**
 * 현재 로그인 사용자의 목표 비자 코드를 조회한다.
 * 익명 사용자와 로그인 사용자 모두 auth.users의 user_id를 쓰므로 동일한 조회 흐름을 탄다.
 * 행/값이 없으면 null, 세션이 없으면 401.
 */
export async function getCurrentUserTargetVisa(): Promise<{
  targetVisaCode: string | null;
}> {
  if (!hasSupabaseEnv()) {
    throw new ApiRouteError(
      503,
      "PROFILE_NOT_CONFIGURED",
      "프로필 저장소가 아직 연결되지 않았습니다.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new ApiRouteError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  }

  const { data, error } = await supabase
    .from("user_visa_profile")
    .select("target_visa_code")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    throw new ApiRouteError(
      502,
      "PROFILE_QUERY_FAILED",
      "프로필을 불러오지 못했습니다.",
    );
  }

  const code = data?.target_visa_code;
  return { targetVisaCode: isTargetVisaCode(code) ? code : null };
}
