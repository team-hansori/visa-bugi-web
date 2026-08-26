import type { ReactNode } from "react";
import { MinimalShell } from "@/components/minimal-shell";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <MinimalShell>{children}</MinimalShell>;
}
