"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { CalendarGrid } from "./calendar-grid";
import { getDefaultChecklist } from "@/lib/visa-schedule/default-checklist";
import { useTargetVisaIds } from "./use-target-visa";
import { useToday } from "./use-today";
import { VisaPicker } from "./visa-picker";
import { CalendarSearch } from "./calendar-search";
import { buildChecklistEvents, findChecklistItemsForDate } from "./checklist-events";

type PersonalEvent = {
  id: string;
  title: string;
  category: string;
  date: string;
  time?: string;
  location?: string;
};

const DEFAULT_CATEGORIES = ["관공서 방문", "비자 인터뷰·서류 제출", "교육·상담 참석"];

function monthOf(dateIso: string): { year: number; month: number } {
  const [year, month] = dateIso.split("-").map(Number);
  return { year, month };
}

export function PersonalCalendar() {
  const { targetVisaIds, toggleVisaId } = useTargetVisaIds();
  const today = useToday();
  const [view, setView] = useState<{ year: number; month: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [referenceDate, setReferenceDate] = useState("");
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryOpen, setCustomCategoryOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Intentional: seeds the initial view/selection once `today` becomes
    // available on the client, avoiding a `new Date()` read during render.
    if (today && !view) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView({ year: today.year, month: today.month });
      setSelectedDate(today.date);
      setEventDate(today.date);
    }
  }, [today, view]);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const checklist = useMemo(
    () => targetVisaIds.flatMap(getDefaultChecklist).filter((item) => !normalizedQuery || [item.visaId, item.title].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))),
    [normalizedQuery, targetVisaIds],
  );
  const hasUnresolvedItems = checklist.some((item) => !item.startDate);

  const eventsByDate = useMemo(() => {
    const map = buildChecklistEvents(checklist, referenceDate || null);
    for (const event of events.filter((item) => !normalizedQuery || [item.title, item.category, item.location ?? ""].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)))) {
      map[event.date] = [...(map[event.date] ?? []), { id: event.id, label: event.title }];
    }
    return map;
  }, [checklist, referenceDate, events, normalizedQuery]);

  const selectedChecklistItems = findChecklistItemsForDate(checklist, referenceDate || null, selectedDate);
  const selectedPersonalEvents = events.filter((event) => event.date === selectedDate && (!normalizedQuery || [event.title, event.category, event.location ?? ""].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))));

  if (!today || !view) {
    return (
      <div role="status" className="rounded-[24px] border border-dashed border-[#d6dfda] p-8 text-center text-sm text-[#77837e]">
        불러오는 중…
      </div>
    );
  }

  function submitEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const title = eventTitle.trim();
    if (!title) {
      setFormError("일정 이름을 입력해 주세요. 공백만 입력할 수는 없습니다.");
      return;
    }
    if (!eventDate) {
      setFormError("날짜를 선택해 주세요.");
      return;
    }
    const finalCategory = customCategoryOpen ? customCategory.trim() : category;
    if (!finalCategory) {
      setFormError("카테고리를 선택하거나 입력해 주세요.");
      return;
    }
    setEvents((current) => [
      ...current,
      { id: `${Date.now()}`, title, category: finalCategory, date: eventDate, time: eventTime || undefined, location: eventLocation.trim() || undefined },
    ]);
    setSelectedDate(eventDate);
    setView(monthOf(eventDate));
    setEventTitle("");
    setEventTime("");
    setEventLocation("");
    setCustomCategory("");
    setCustomCategoryOpen(false);
    setFormError("");
    setFormOpen(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">개인 맞춤 캘린더</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">내 일정</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7974] sm:text-base">추가한 일정은 이 브라우저 탭을 새로고침하기 전까지만 유지됩니다.</p>
        </div>
        <button type="button" onClick={() => setFormOpen((current) => !current)} aria-expanded={formOpen} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] sm:w-fit">
          <Icon name="calendar" className="size-4" />
          {formOpen ? "입력 닫기" : "일정 추가"}
        </button>
      </header>

      <div className="grid gap-3">
        <CalendarSearch value={searchQuery} onChange={setSearchQuery} />
        <VisaPicker selectedVisaIds={targetVisaIds} onToggle={toggleVisaId} />
      </div>

      {hasUnresolvedItems ? (
        <div className="rounded-[24px] border border-[#dce5e0] bg-[#edf5f1] p-5">
          <label className="grid gap-2 text-sm font-extrabold text-[#34473f]" htmlFor="reference-date">
            기준일 입력 (개인 기준일 기반 절차 계산용)
            <input id="reference-date" type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} className="min-h-12 rounded-xl border border-[#cddbd4] bg-white px-4 text-base outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bcd9cd]" />
          </label>
        </div>
      ) : null}

      {formOpen ? (
        <form noValidate onSubmit={submitEvent} className="grid gap-4 rounded-[24px] border border-[#dce5e0] bg-[#edf5f1] p-5 sm:grid-cols-2" aria-label="일정 추가">
          <label className="grid gap-2 text-sm font-extrabold text-[#34473f]">
            일정 이름
            <input value={eventTitle} onChange={(event) => { setEventTitle(event.target.value); if (formError) setFormError(""); }} required maxLength={60} placeholder="예: 서류 확인" aria-invalid={Boolean(formError)} aria-describedby={formError ? "event-form-error" : undefined} className="min-h-12 rounded-xl border border-[#cddbd4] bg-white px-4 text-base outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bcd9cd]" />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-[#34473f]">
            날짜
            <input type="date" value={eventDate} onChange={(event) => { setEventDate(event.target.value); if (formError) setFormError(""); }} required className="min-h-12 rounded-xl border border-[#cddbd4] bg-white px-4 text-base outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bcd9cd]" />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-[#34473f]">
            시간 (선택)
            <input type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="min-h-12 rounded-xl border border-[#cddbd4] bg-white px-4 text-base outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bcd9cd]" />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-[#34473f]">
            위치 (선택)
            <input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} maxLength={80} placeholder="예: 청주시 고용노동부" className="min-h-12 rounded-xl border border-[#cddbd4] bg-white px-4 text-base outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bcd9cd]" />
          </label>
          <div className="grid gap-2 text-sm font-extrabold text-[#34473f] sm:col-span-2">
            카테고리
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CATEGORIES.map((option) => (
                <button key={option} type="button" onClick={() => { setCategory(option); setCustomCategoryOpen(false); }} aria-pressed={!customCategoryOpen && category === option} className={`min-h-11 rounded-full border px-4 text-sm font-extrabold ${!customCategoryOpen && category === option ? "border-[#2d6d5d] bg-[#e9f3ef] text-[#1f584a]" : "border-[#dce4df] bg-white text-[#33453e]"}`}>
                  {option}
                </button>
              ))}
              <button type="button" onClick={() => setCustomCategoryOpen(true)} aria-pressed={customCategoryOpen} className={`min-h-11 rounded-full border px-4 text-sm font-extrabold ${customCategoryOpen ? "border-[#2d6d5d] bg-[#e9f3ef] text-[#1f584a]" : "border-[#dce4df] bg-white text-[#33453e]"}`}>
                직접 입력
              </button>
            </div>
            {customCategoryOpen ? (
              <input value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} maxLength={30} placeholder="카테고리 이름" className="min-h-12 rounded-xl border border-[#cddbd4] bg-white px-4 text-base outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bcd9cd]" />
            ) : null}
          </div>
          {formError ? <span id="event-form-error" role="alert" className="text-xs leading-5 text-[#a0443d] sm:col-span-2">{formError}</span> : null}
          <button type="submit" className="min-h-12 rounded-xl bg-[#173f36] px-5 text-sm font-extrabold text-white sm:col-span-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f36]">추가하기</button>
        </form>
      ) : null}

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
        <aside className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-6" aria-labelledby="selected-date">
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">선택한 날짜</p>
          <h2 id="selected-date" className="mt-1 text-xl font-black tracking-[-0.035em]">{selectedDate}</h2>
          <div className="mt-5 space-y-3">
            {selectedChecklistItems.map((item) => (
              <div key={item.id} className="rounded-2xl bg-[#eef4f1] p-4">
                <p className="font-extrabold text-[#1f584a]">{item.title}</p>
                <p className="mt-1 text-xs text-[#5f8072]">비자 절차</p>
              </div>
            ))}
            {selectedPersonalEvents.map((event) => (
              <div key={event.id} className="rounded-2xl bg-[#f4f7f4] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-[#fff0d3] text-[#8a5910]"><Icon name="clock" className="size-4" /></span>
                  <div className="min-w-0">
                    <p className="break-words font-extrabold text-[#30433b]">{event.title}</p>
                    <p className="mt-1 text-xs text-[#7a8580]">{event.category}{event.time ? ` · ${event.time}` : ""}{event.location ? ` · ${event.location}` : ""}</p>
                  </div>
                </div>
              </div>
            ))}
            {!selectedChecklistItems.length && !selectedPersonalEvents.length ? (
              <div className="rounded-2xl border border-dashed border-[#d6dfda] p-5 text-center text-sm leading-6 text-[#77837e]">등록된 일정이 없습니다.<br />직접 추가하세요.</div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
