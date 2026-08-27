"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 목표 비자를 온보딩(PR #16/#22)이 실제로 저장하는 곳에서 읽는다.
 * `user_visa_profile.target_visa_code`는 로그인/익명 세션 공용 `user_id`
 * 기준으로 저장되므로, 게스트(익명 세션)와 로그인 사용자 모두 동일하게
 * 동작한다. 세션이 아직 없거나(온보딩을 거치지 않고 캘린더에 바로 진입)
 * 저장된 값이 없으면 null을 반환 — 이 경우 UI는 전체 비자 유형을 보여준다.
 */
export async function resolveTargetVisaId(): Promise<string | null> {
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
  if (error || !data) return null;

  return data.target_visa_code;
}

/**
 * profileVisaId starts null (matches the server, which has no browser session)
 * and is populated in an effect after mount — reading it directly during
 * render would return different values on the server vs. the client's
 * hydration render and cause a hydration mismatch.
 */
export function useTargetVisaIds(): { targetVisaIds: string[]; toggleVisaId: (visaId: string) => void; clearVisaIds: () => void } {
  const [profileVisaId, setProfileVisaId] = useState<string | null>(null);
  const [manualVisaIds, setManualVisaIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveTargetVisaId().then((visaId) => {
      if (!cancelled) setProfileVisaId(visaId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const targetVisaIds = manualVisaIds ?? (profileVisaId ? [profileVisaId] : []);

  function toggleVisaId(visaId: string) {
    setManualVisaIds((current) => {
      const selected = current ?? (profileVisaId ? [profileVisaId] : []);
      return selected.includes(visaId) ? selected.filter((id) => id !== visaId) : [...selected, visaId];
    });
  }

  return { targetVisaIds, toggleVisaId, clearVisaIds: () => setManualVisaIds([]) };
}
