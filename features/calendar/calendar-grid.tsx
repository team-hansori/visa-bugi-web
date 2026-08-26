"use client";

import { Icon } from "@/components/ui/icon";

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
const monthFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" });

export type CalendarGridEvent = { id: string; label: string };

export type CalendarGridProps = {
  year: number;
  month: number; // 1-12
  eventsByDate: Record<string, CalendarGridEvent[]>; // key: "YYYY-MM-DD"
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  todayDate: string; // "YYYY-MM-DD"
};

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildCells(year: number, month: number): Array<{ day: number; date: string } | null> {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number; date: string } | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, date: toIsoDate(year, month, day) });
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarGrid({ year, month, eventsByDate, selectedDate, onSelectDate, onMonthChange, todayDate }: CalendarGridProps) {
  const cells = buildCells(year, month);

  function goToPreviousMonth() {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }

  function goToNextMonth() {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e0e7e2] bg-white shadow-[0_10px_32px_rgba(52,76,65,0.06)]" aria-labelledby="month-title">
      <div className="flex items-center justify-between border-b border-[#edf0ee] px-4 py-4 sm:px-6">
        <button type="button" onClick={goToPreviousMonth} aria-label="이전 달" className="grid size-11 place-items-center rounded-xl border border-[#e1e6e3] text-[#45554f] hover:bg-[#f8faf8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]">
          <Icon name="chevron-left" className="size-5" />
        </button>
        <div className="text-center">
          <h2 id="month-title" className="text-lg font-black tracking-[-0.03em]">{monthFormatter.format(new Date(year, month - 1, 1))}</h2>
        </div>
        <button type="button" onClick={goToNextMonth} aria-label="다음 달" className="grid size-11 place-items-center rounded-xl border border-[#e1e6e3] text-[#45554f] hover:bg-[#f8faf8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]">
          <Icon name="chevron-right" className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-[#edf0ee] bg-[#fafbf9] px-2 sm:px-4">
        {weekDays.map((day, index) => (
          <div key={day} className={`py-3 text-center text-xs font-extrabold ${index === 0 ? "text-[#b65f56]" : index === 6 ? "text-[#5477a3]" : "text-[#74807b]"}`}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-[#edf0ee]">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} className="min-h-14 bg-[#fafbf9] sm:min-h-24" aria-hidden="true" />;
          const dayEvents = eventsByDate[cell.date] ?? [];
          const selected = cell.date === selectedDate;
          const isToday = cell.date === todayDate;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate(cell.date)}
              aria-pressed={selected}
              className={`relative min-h-14 bg-white p-1.5 text-left text-sm font-bold outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6d5d] sm:min-h-24 sm:p-2.5 ${selected ? "bg-[#edf6f2] text-[#1f584a]" : "text-[#45554f] hover:bg-[#f8faf8]"}`}
            >
              <span className={`absolute left-1.5 top-1.5 grid size-7 place-items-center rounded-full sm:left-2.5 sm:top-2.5 ${isToday ? "bg-[#2d6d5d] text-white" : ""}`}>{cell.day}</span>
              {dayEvents.length ? (
                <span className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 overflow-hidden whitespace-nowrap rounded-full bg-[#e59b37] text-[0px] sm:bottom-auto sm:left-2.5 sm:right-2.5 sm:top-11 sm:block sm:size-auto sm:translate-x-0 sm:truncate sm:rounded-md sm:bg-[#fff0d3] sm:px-1.5 sm:py-1 sm:text-[0.65rem] sm:text-[#80561d]">
                  {dayEvents[0].label}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
