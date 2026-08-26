"use client";

import { useMemo, useState } from "react";
import { getOnboardingProfile } from "@/lib/onboarding/profile";

// getDefaultChecklist()의 mock 데이터가 지원하는 visa_id와 정확히 일치해야 한다.
export const SUPPORTED_VISA_OPTIONS = [
  { id: "E-7-4R", label: "E-7-4R" },
  { id: "F-2-R", label: "F-2-R" },
] as const;

const UNRESOLVED_VISA_VALUES = new Set(["OTHER", "UNKNOWN"]);

export function useTargetVisaId(): { targetVisaId: string | null; setManualVisaId: (visaId: string) => void } {
  const profile = useMemo(() => getOnboardingProfile(), []);
  const [manualVisaId, setManualVisaId] = useState<string | null>(null);
  const profileVisaId = profile?.visa && !UNRESOLVED_VISA_VALUES.has(profile.visa) ? profile.visa : null;
  return { targetVisaId: manualVisaId ?? profileVisaId, setManualVisaId };
}
