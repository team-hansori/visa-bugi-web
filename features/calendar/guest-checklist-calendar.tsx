"use client";

import { useEffect, useState } from "react";
import { CalendarGrid } from "./calendar-grid";
import { getDefaultChecklist } from "@/lib/visa-schedule/default-checklist";
import { useTargetVisaIds } from "./use-target-visa";
import { useToday } from "./use-today";
import { VisaPicker } from "./visa-picker";
import { CalendarSearch, type CalendarSearchResult } from "./calendar-search";
import { buildChecklistEvents, findChecklistItemsForDate } from "./checklist-events";
import { SUPPORTED_VISAS } from "@/lib/visa-schedule/supported-visas";

export function GuestChecklistCalendar() {
  const { targetVisaIds, toggleVisaId, clearVisaIds } = useTargetVisaIds();
  const today = useToday();
  const [view, setView] = useState<{ year: number; month: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Intentional: seeds the initial view month once `today` becomes
    // available on the client, avoiding a `new Date()` read during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (today && !view) setView({ year: today.year, month: today.month });
  }, [today, view]);

  if (!today || !view) {
    return (
      <div role="status" className="rounded-[24px] border border-dashed border-[#d6dfda] p-8 text-center text-sm text-[#77837e]">
        불러오는 중…
      </div>
    );
  }

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const effectiveVisaIds = targetVisaIds.length ? targetVisaIds : SUPPORTED_VISAS.map((visa) => visa.id);
  const checklist = effectiveVisaIds
    .flatMap(getDefaultChecklist)
    .filter((item) => !normalizedQuery || [item.visaId, item.title].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)));
  const eventsByDate = buildChecklistEvents(checklist, null);
  const selectedItems = findChecklistItemsForDate(checklist, null, selectedDate);
  const searchResults: CalendarSearchResult[] = normalizedQuery
    ? checklist.map((item) => ({ id: item.id, label: item.title, meta: item.visaId, date: item.startDate ?? item.endDate ?? null }))
    : [];

  function selectSearchResult(result: CalendarSearchResult) {
    if (!result.date) return;
    const [year, month] = result.date.split("-").map(Number);
    setView({ year, month });
    setSelectedDate(result.date);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">내 일정</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7974] sm:text-base">로그인하면 이 절차에 기준일을 입력하고, 직접 일정을 추가할 수 있습니다.</p>
        </div>
        <button type="button" disabled className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#c7d1cc] px-5 text-sm font-extrabold text-white sm:w-fit">
          Google로 로그인 (준비 중)
        </button>
      </header>

      <div className="grid gap-3">
        <CalendarSearch value={searchQuery} results={searchResults} onChange={setSearchQuery} onSelectResult={selectSearchResult} />
        <VisaPicker selectedVisaIds={targetVisaIds} onToggle={toggleVisaId} onClear={clearVisaIds} />
      </div>

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
            <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{targetVisaIds.length ? `${targetVisaIds.join(", ")} 비자 기본 절차` : "전체 비자 기본 절차"}</p>
            <h2 id="checklist-title" className="mt-1 text-xl font-black tracking-[-0.035em]">전체 체크리스트</h2>
            {checklist.length ? (
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
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[#d6dfda] p-5 text-center text-sm leading-6 text-[#77837e]">
                {targetVisaIds.length ? "선택한 비자 유형의 기본 절차 데이터가 아직 없습니다." : "전체 비자 유형의 기본 절차 데이터가 아직 없습니다."}
              </div>
            )}
            {selectedDate && selectedItems.length ? (
              <div className="mt-5 rounded-2xl border border-[#dce5e0] bg-[#edf5f1] p-4">
                <p className="text-xs font-extrabold text-[#2d6d5d]">{selectedDate}</p>
                {selectedItems.map((item) => <p key={item.id} className="mt-1 text-sm font-bold text-[#1f584a]">{item.title}</p>)}
              </div>
            ) : null}
          </aside>
      </div>
    </div>
  );
}
