"use client";

import { useMemo, useState } from "react";
import { CalendarGrid, type CalendarGridEvent } from "./calendar-grid";
import { getDefaultChecklist, type ChecklistItem } from "@/lib/visa-schedule/default-checklist";
import { SUPPORTED_VISA_OPTIONS, useTargetVisaId } from "./use-target-visa";

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function buildEventsByDate(checklist: ChecklistItem[]): Record<string, CalendarGridEvent[]> {
  const map: Record<string, CalendarGridEvent[]> = {};
  function push(date: string, event: CalendarGridEvent) {
    map[date] = [...(map[date] ?? []), event];
  }
  for (const item of checklist) {
    if (item.startDate) push(item.startDate, { id: `${item.id}-start`, label: `${item.title} 시작` });
    if (item.endDate && item.endDate !== item.startDate) push(item.endDate, { id: `${item.id}-end`, label: `${item.title} 마감` });
  }
  return map;
}

export function GuestChecklistCalendar() {
  const { targetVisaId, setManualVisaId } = useTargetVisaId();
  const today = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, date: todayIso() };
  }, []);
  const [view, setView] = useState({ year: today.year, month: today.month });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const checklist = targetVisaId ? getDefaultChecklist(targetVisaId) : [];
  const eventsByDate = useMemo(() => buildEventsByDate(checklist), [checklist]);
  const selectedItems = checklist.filter((item) => item.startDate === selectedDate || item.endDate === selectedDate);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">비자 유형 기본 일정</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">내 일정</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7974] sm:text-base">로그인하면 이 절차에 기준일을 입력하고, 직접 일정을 추가할 수 있습니다.</p>
        </div>
        <button type="button" disabled className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#c7d1cc] px-5 text-sm font-extrabold text-white sm:w-fit">
          Google로 로그인 (준비 중)
        </button>
      </header>

      {!targetVisaId ? (
        <div className="rounded-[24px] border border-dashed border-[#d6dfda] p-5" role="group" aria-label="비자 유형 선택">
          <p className="text-sm font-extrabold text-[#34473f]">확인할 비자 유형을 선택해 주세요</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUPPORTED_VISA_OPTIONS.map((option) => (
              <button key={option.id} type="button" onClick={() => setManualVisaId(option.id)} className="min-h-11 rounded-full border border-[#dce4df] bg-white px-4 text-sm font-extrabold text-[#33453e] hover:border-[#9bb9ac]">
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <CalendarGrid
            year={view.year}
            month={view.month}
            eventsByDate={eventsByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onMonthChange={(year, month) => setView({ year, month })}
            todayDate={today.date}
          />
          <aside className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-6" aria-labelledby="checklist-title">
            <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{targetVisaId} 비자 기본 절차</p>
            <h2 id="checklist-title" className="mt-1 text-xl font-black tracking-[-0.035em]">전체 체크리스트</h2>
            <ul className="mt-4 space-y-3">
              {checklist.map((item) => (
                <li key={item.id} className="rounded-2xl bg-[#f4f7f4] p-4">
                  <p className="font-extrabold text-[#30433b]">{item.title}</p>
                  <p className="mt-1 text-xs text-[#7a8580]">
                    {item.startDate ? `${item.startDate}${item.endDate && item.endDate !== item.startDate ? ` ~ ${item.endDate}` : ""}` : "날짜 미정 · 로그인 후 기준일 입력 시 계산"}
                  </p>
                </li>
              ))}
            </ul>
            {selectedDate && selectedItems.length ? (
              <div className="mt-5 rounded-2xl border border-[#dce5e0] bg-[#edf5f1] p-4">
                <p className="text-xs font-extrabold text-[#2d6d5d]">{selectedDate}</p>
                {selectedItems.map((item) => <p key={item.id} className="mt-1 text-sm font-bold text-[#1f584a]">{item.title}</p>)}
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
