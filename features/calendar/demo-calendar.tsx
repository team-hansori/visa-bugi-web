"use client";

import { FormEvent, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";

type CalendarEvent = {
  id: number;
  day: number;
  title: string;
};

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
const calendarCells = [
  ...Array.from({ length: 6 }, () => null),
  ...Array.from({ length: 31 }, (_, index) => index + 1),
  ...Array.from({ length: 5 }, () => null),
];

const initialEvents: CalendarEvent[] = [
  { id: 1, day: 21, title: "반응형 화면 확인" },
  { id: 2, day: 27, title: "기관 방문 일정 예시" },
];

export function DemoCalendar() {
  const [selectedDay, setSelectedDay] = useState(21);
  const [events, setEvents] = useState(initialEvents);
  const [formOpen, setFormOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDay, setEventDay] = useState("21");
  const [formError, setFormError] = useState("");
  const selectedEvents = useMemo(() => events.filter((event) => event.day === selectedDay), [events, selectedDay]);

  function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const day = Number(eventDay);
    const title = eventTitle.trim();
    if (!title) {
      setFormError("일정 이름을 입력해 주세요. 공백만 입력할 수는 없습니다.");
      return;
    }
    if (day < 1 || day > 31) return;
    setEvents((current) => [...current, { id: Date.now(), day, title }]);
    setSelectedDay(day);
    setEventTitle("");
    setFormError("");
    setFormOpen(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">개인 맞춤 캘린더</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">내 일정</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d7974] sm:text-base">기준일이 확정된 일정만 직접 추가합니다. 현재 추가한 일정은 이 화면을 새로고침하기 전까지만 유지됩니다.</p>
        </div>
        <button type="button" onClick={() => setFormOpen((current) => !current)} aria-expanded={formOpen} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] sm:w-fit">
          <Icon name="calendar" className="size-4" />
          {formOpen ? "입력 닫기" : "일정 추가"}
        </button>
      </header>

      {formOpen ? (
        <form onSubmit={submitEvent} className="grid gap-4 rounded-[24px] border border-[#dce5e0] bg-[#edf5f1] p-5 sm:grid-cols-[1fr_160px_auto] sm:items-end" aria-label="일정 추가">
          <label className="grid gap-2 text-sm font-extrabold text-[#34473f]">
            일정 이름
            <input value={eventTitle} onChange={(event) => { setEventTitle(event.target.value); if (formError) setFormError(""); }} required maxLength={60} placeholder="예: 서류 확인" aria-invalid={Boolean(formError)} aria-describedby={formError ? "event-title-error" : undefined} className="min-h-12 rounded-xl border border-[#cddbd4] bg-white px-4 text-base outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bcd9cd]" />
            {formError ? <span id="event-title-error" role="alert" className="text-xs leading-5 text-[#a0443d]">{formError}</span> : null}
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-[#34473f]">
            8월 날짜
            <select value={eventDay} onChange={(event) => setEventDay(event.target.value)} className="min-h-12 rounded-xl border border-[#cddbd4] bg-white px-4 text-base outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bcd9cd]">
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}일</option>)}
            </select>
          </label>
          <button type="submit" className="min-h-12 rounded-xl bg-[#173f36] px-5 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f36]">추가하기</button>
        </form>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-[24px] border border-[#e0e7e2] bg-white shadow-[0_10px_32px_rgba(52,76,65,0.06)]" aria-labelledby="month-title">
          <div className="flex items-center justify-between border-b border-[#edf0ee] px-4 py-4 sm:px-6">
            <button type="button" disabled aria-label="이전 달, 데모에서는 사용할 수 없음" className="grid size-11 cursor-not-allowed place-items-center rounded-xl border border-[#e1e6e3] text-[#a0aaa5]"><Icon name="chevron-left" className="size-5" /></button>
            <div className="text-center">
              <h2 id="month-title" className="text-lg font-black tracking-[-0.03em]">2026년 8월</h2>
              <p className="text-xs font-semibold text-[#82908a]">화면 시연용 달력</p>
            </div>
            <button type="button" disabled aria-label="다음 달, 데모에서는 사용할 수 없음" className="grid size-11 cursor-not-allowed place-items-center rounded-xl border border-[#e1e6e3] text-[#a0aaa5]"><Icon name="chevron-right" className="size-5" /></button>
          </div>
          <div className="grid grid-cols-7 border-b border-[#edf0ee] bg-[#fafbf9] px-2 sm:px-4">
            {weekDays.map((day, index) => <div key={day} className={`py-3 text-center text-xs font-extrabold ${index === 0 ? "text-[#b65f56]" : index === 6 ? "text-[#5477a3]" : "text-[#74807b]"}`}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-[#edf0ee]">
            {calendarCells.map((day, index) => {
              const dayEvents = day ? events.filter((event) => event.day === day) : [];
              const selected = day === selectedDay;
              return day ? (
                <button key={`${day}-${index}`} type="button" onClick={() => setSelectedDay(day)} aria-pressed={selected} className={`relative min-h-14 bg-white p-1.5 text-left text-sm font-bold outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6d5d] sm:min-h-24 sm:p-2.5 ${selected ? "bg-[#edf6f2] text-[#1f584a]" : "text-[#45554f] hover:bg-[#f8faf8]"}`}>
                  <span className={`grid size-7 place-items-center rounded-full ${day === 21 ? "bg-[#2d6d5d] text-white" : ""}`}>{day}</span>
                  {dayEvents.length ? <span className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 overflow-hidden whitespace-nowrap rounded-full bg-[#e59b37] text-[0px] sm:static sm:mt-2 sm:block sm:size-auto sm:translate-x-0 sm:truncate sm:rounded-md sm:bg-[#fff0d3] sm:px-1.5 sm:py-1 sm:text-[0.65rem] sm:text-[#80561d]">{dayEvents[0].title}</span> : null}
                </button>
              ) : <div key={`empty-${index}`} className="min-h-14 bg-[#fafbf9] sm:min-h-24" aria-hidden="true" />;
            })}
          </div>
        </section>

        <aside className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-6" aria-labelledby="selected-date">
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">선택한 날짜</p>
          <h2 id="selected-date" className="mt-1 text-xl font-black tracking-[-0.035em]">8월 {selectedDay}일</h2>
          <div className="mt-5 space-y-3">
            {selectedEvents.length ? selectedEvents.map((event) => (
              <div key={event.id} className="rounded-2xl bg-[#f4f7f4] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-[#fff0d3] text-[#8a5910]"><Icon name="clock" className="size-4" /></span>
                  <div className="min-w-0"><p className="break-words font-extrabold text-[#30433b]">{event.title}</p><p className="mt-1 text-xs text-[#7a8580]">시간 미정 · 직접 추가 일정</p></div>
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-[#d6dfda] p-5 text-center text-sm leading-6 text-[#77837e]">등록된 일정이 없습니다.<br />날짜가 확정된 뒤 직접 추가하세요.</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
