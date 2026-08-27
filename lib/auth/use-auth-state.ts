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
 */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(
    hasSupabaseEnv() ? { status: "loading" } : { status: "guest" },
  );

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setState(toState(data.user));
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState(toState(session?.user ?? null));
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
