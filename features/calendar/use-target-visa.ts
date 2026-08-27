"use client";

import { useEffect, useState } from "react";
import { resolveStoredTargetVisaCode } from "@/lib/onboarding/target-visa";

/**
 * 목표 비자는 온보딩이 user_visa_profile에 저장한 값을 사용한다.
 * 아직 세션이나 저장된 값이 없으면 빈 배열로 시작해 전체 일정을 보여준다.
 */
export function useTargetVisaIds(): { targetVisaIds: string[]; toggleVisaId: (visaId: string) => void; clearVisaIds: () => void } {
  const [profileVisaId, setProfileVisaId] = useState<string | null>(null);
  const [manualVisaIds, setManualVisaIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveStoredTargetVisaCode().then((visaCode) => {
      if (!cancelled) setProfileVisaId(visaCode);
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
