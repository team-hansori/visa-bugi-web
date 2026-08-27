import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export const metadata: Metadata = { title: "내 정보 설정" };

export default function OnboardingPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[#6c7873]">불러오는 중...</p>}>
      <OnboardingForm />
    </Suspense>
  );
}
