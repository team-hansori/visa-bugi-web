"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; userId: string };

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function toState(
  user: { id: string; is_anonymous?: boolean } | null | undefined,
): AuthState {
  if (user && user.is_anonymous !== true) {
    return { status: "authenticated", userId: user.id };
  }
  return { status: "guest" };
}

/**
 * 실제 Supabase 세션을 반영한다. 비익명 사용자만 authenticated,
 * 익명 세션·세션 없음·env 미설정은 guest로 본다.
 *
 * onAuthStateChange가 구독 즉시 INITIAL_SESSION을 발행하므로 별도의 getUser()
 * 호출은 두지 않는다 — 두 비동기 경로가 경쟁하면 늦게 도착한 과거 값이 최신
 * 상태를 덮어쓸 수 있다(예: 로그아웃 직후 뒤늦게 resolve된 getUser가 다시
 * authenticated로 되돌림).
 */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(
    hasSupabaseEnv() ? { status: "loading" } : { status: "guest" },
  );

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(toState(session?.user ?? null));
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}
