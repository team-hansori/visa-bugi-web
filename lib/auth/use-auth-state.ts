"use client";

export type AuthState = { status: "loading" } | { status: "guest" } | { status: "authenticated"; userId: string };

/**
 * Google 로그인이 아직 없어 항상 게스트로 고정된 mock 구현.
 * 실제 로그인이 붙으면(https://github.com/team-hansori/visa-bugi-web/issues/10)
 * 이 함수 본문만 supabase.auth.getSession()/onAuthStateChange로 교체한다.
 * 반환 타입(AuthState)과 훅 시그니처는 유지해 호출부를 건드리지 않는다.
 */
export function useAuthState(): AuthState {
  return { status: "guest" };
}
