import type { Metadata } from "next";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export const metadata: Metadata = { title: "내 정보 설정" };

export default function OnboardingPage() {
  return <OnboardingForm />;
}
