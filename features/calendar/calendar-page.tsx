"use client";

import { useAuthState } from "@/lib/auth/use-auth-state";
import { GuestChecklistCalendar } from "./guest-checklist-calendar";
import { PersonalCalendar } from "./personal-calendar";

export function CalendarPage() {
  const auth = useAuthState();

  if (auth.status === "loading") {
    return (
      <div role="status" className="rounded-[24px] border border-dashed border-[#d6dfda] p-8 text-center text-sm text-[#77837e]">
        불러오는 중…
      </div>
    );
  }

  return auth.status === "authenticated" ? <PersonalCalendar /> : <GuestChecklistCalendar />;
}
