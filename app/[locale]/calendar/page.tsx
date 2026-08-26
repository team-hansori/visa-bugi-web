import type { Metadata } from "next";
import { CalendarPage } from "@/features/calendar/calendar-page";

export const metadata: Metadata = { title: "내 일정" };

export default function CalendarRoutePage() {
  return <CalendarPage />;
}
