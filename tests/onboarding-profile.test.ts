import { afterEach, describe, expect, it, vi } from "vitest";
import { getOnboardingProfile } from "@/lib/onboarding/profile";

function setStoredProfile(value: unknown) {
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: () => JSON.stringify(value),
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getOnboardingProfile", () => {
  it("accepts a profile without a visa", () => {
    setStoredProfile({ version: 1, locale: "ko" });
    expect(getOnboardingProfile()).toEqual({ version: 1, locale: "ko" });
  });

  it("rejects a profile whose visa is not a string", () => {
    setStoredProfile({ version: 1, visa: ["F-4-R"] });
    expect(getOnboardingProfile()).toBeNull();
  });
});
