"use server";

import type { ProfileInsert } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema, toIdEmail } from "./schema";

export type AuthActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

const GENERIC_ERROR =
  "일시적인 오류로 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const CREDENTIALS_ERROR = "아이디 또는 비밀번호가 올바르지 않습니다.";
const DUPLICATE_ERROR = "이미 사용 중인 아이디입니다.";

function firstIssueMessage(issues: { message: string }[]): string {
  return issues[0]?.message ?? "입력값을 다시 확인해 주세요.";
}

/**
 * 가입: auth.signUp → profiles upsert(username·name·locale).
 * Supabase Confirm Email 비활성 전제라 signUp 직후 세션이 생긴다.
 * 비밀번호는 auth.users에만 저장되며 profiles에는 넣지 않는다.
 */
export async function signUpWithId(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? ""),
    locale: String(formData.get("locale") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", message: firstIssueMessage(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: toIdEmail(parsed.data.username),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    // Supabase는 이미 가입된 이메일에 "User already registered"(422)를 준다.
    if (error && (error.status === 422 || /already registered/i.test(error.message))) {
      return { status: "error", message: DUPLICATE_ERROR };
    }
    return { status: "error", message: GENERIC_ERROR };
  }

  // Confirm Email이 켜진 프로젝트에서는 user는 있지만 session이 없어 쿠키가
  // 세팅되지 않는다. 이 경우 success로 돌리면 홈↔온보딩 리다이렉트 루프가 되므로
  // 명시적으로 오류를 낸다(운영 전제는 Confirm Email 비활성).
  if (!data.session) {
    return { status: "error", message: GENERIC_ERROR };
  }

  const profileRow: Pick<
    ProfileInsert,
    "user_id" | "locale" | "username" | "name"
  > = {
    user_id: data.user.id,
    locale: parsed.data.locale,
    username: parsed.data.username,
    name: parsed.data.name,
  };
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profileRow, { onConflict: "user_id" });
  if (profileError) {
    return { status: "error", message: GENERIC_ERROR };
  }

  return { status: "success" };
}

/**
 * 로그인: auth.signInWithPassword.
 * 아이디 없음·비밀번호 틀림·형식 오류를 모두 같은 문구로 응답해 계정 존재 여부를 노출하지 않는다.
 */
export async function signInWithId(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", message: CREDENTIALS_ERROR };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toIdEmail(parsed.data.username),
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return { status: "error", message: CREDENTIALS_ERROR };
  }

  return { status: "success" };
}
