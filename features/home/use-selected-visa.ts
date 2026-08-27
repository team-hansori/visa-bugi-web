"use client";

import { useEffect, useState } from "react";
import { getOnboardingProfile } from "@/lib/onboarding/profile";
import { resolveStoredTargetVisaCode } from "@/lib/onboarding/target-visa";
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
    let cancelled = false;

    async function loadSelectedVisa() {
      const storedVisaCode = await resolveStoredTargetVisaCode();
      const profile = getOnboardingProfile();
      const browserFallbackCode =
        profile?.visa && !UNRESOLVED_VISA_VALUES.has(profile.visa)
          ? profile.visa
          : null;
      const nextVisaCode = storedVisaCode ?? browserFallbackCode;

      if (
        !cancelled &&
        nextVisaCode &&
        catalog.visas.some((visa) => visa.visaCode === nextVisaCode)
      ) {
        setSelectedVisaCode(nextVisaCode);
      }
    }

    void loadSelectedVisa();
    return () => {
      cancelled = true;
    };
  }, [catalog.visas]);

  return catalog.visas.find((visa) => visa.visaCode === selectedVisaCode) ?? fallbackVisa;
}
