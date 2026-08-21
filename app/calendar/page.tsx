import type { Metadata } from "next";
import { DemoCalendar } from "@/features/calendar/demo-calendar";

export const metadata: Metadata = { title: "내 일정" };

export default function CalendarPage() {
  return <DemoCalendar />;
}
