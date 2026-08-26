export type OnboardingProfile = {
  version: number;
  locale?: string;
  nationality?: string;
  region?: string;
  visa?: string;
};

const STORAGE_KEY = "visa-bugi-demo-profile";

export function getOnboardingProfile(): OnboardingProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || typeof (parsed as { version: unknown }).version !== "number") {
      return null;
    }
    return parsed as OnboardingProfile;
  } catch {
    return null;
  }
}
