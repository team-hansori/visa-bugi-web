"use client";

import { useEffect, useState } from "react";
import { getOnboardingProfile } from "@/lib/onboarding/profile";

// getDefaultChecklist()의 mock 데이터가 지원하는 visa_id와 정확히 일치해야 한다.
export const SUPPORTED_VISA_OPTIONS = [
  { id: "E-7-4R", label: "E-7-4R" },
  { id: "F-2-R", label: "F-2-R" },
] as const;

const UNRESOLVED_VISA_VALUES = new Set(["OTHER", "UNKNOWN"]);

function resolveProfileVisaId(): string | null {
  const profile = getOnboardingProfile();
  return profile?.visa && !UNRESOLVED_VISA_VALUES.has(profile.visa) ? profile.visa : null;
}

/**
 * profileVisaId starts null (matches the server, which has no sessionStorage)
 * and is populated in an effect after mount — reading getOnboardingProfile()
 * directly during render would return different values on the server vs. the
 * client's hydration render and cause a hydration mismatch.
 */
export function useTargetVisaId(): { targetVisaId: string | null; setManualVisaId: (visaId: string) => void } {
  const [profileVisaId, setProfileVisaId] = useState<string | null>(null);
  const [manualVisaId, setManualVisaId] = useState<string | null>(null);

  useEffect(() => {
    // Intentional: this is the mount-only sessionStorage read described
    // above, not state synchronized from an external system on every render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileVisaId(resolveProfileVisaId());
  }, []);

  return { targetVisaId: manualVisaId ?? profileVisaId, setManualVisaId };
}
