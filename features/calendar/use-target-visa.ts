"use client";

import { useEffect, useState } from "react";
import { getOnboardingProfile } from "@/lib/onboarding/profile";

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
