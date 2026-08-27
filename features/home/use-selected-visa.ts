"use client";

import { useEffect, useState } from "react";
import { getOnboardingProfile } from "@/lib/onboarding/profile";
import type { HomeVisaPreparationCatalog } from "./preparation-model";

const UNRESOLVED_VISA_VALUES = new Set(["OTHER", "UNKNOWN"]);
const DEFAULT_VISA_CODE = "E-7-4R";

export function useSelectedVisa(catalog: HomeVisaPreparationCatalog) {
  const fallbackVisa =
    catalog.visas.find((visa) => visa.visaCode === DEFAULT_VISA_CODE) ??
    catalog.visas[0];
  const [selectedVisaCode, setSelectedVisaCode] = useState(
    fallbackVisa?.visaCode ?? DEFAULT_VISA_CODE,
  );

  useEffect(() => {
    const profile = getOnboardingProfile();
    const profileVisaCode =
      profile?.visa && !UNRESOLVED_VISA_VALUES.has(profile.visa)
        ? profile.visa
        : null;
    if (profileVisaCode && catalog.visas.some((visa) => visa.visaCode === profileVisaCode)) {
      // This mount-only browser storage read deliberately happens after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedVisaCode(profileVisaCode);
    }
  }, [catalog.visas]);

  return catalog.visas.find((visa) => visa.visaCode === selectedVisaCode) ?? fallbackVisa;
}

