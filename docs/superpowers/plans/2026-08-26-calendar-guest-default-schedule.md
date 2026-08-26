# 캘린더 게스트 기본 일정 + 로그인 개인 일정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캘린더 페이지를 인증 상태로 분기해, 비로그인 사용자에게는 비자 유형별 기본 절차 캘린더를, 로그인 사용자에게는 기준일 계산 + 카테고리/위치/시간을 포함한 개인 일정 등록 기능을 제공한다.

**Architecture:** `useAuthState()` mock 훅으로 한 페이지 안에서 게스트/로그인 뷰를 분기한다. 비자 절차 데이터는 `getDefaultChecklist()` 뒤에 정적 mock으로 숨기고, upstream(`visa_process_stages`) 원본 shape과 프론트 내부 타입(`ChecklistItem`)을 매핑 함수 한 곳에서만 변환해 스키마 변경 영향을 격리한다. 월 그리드는 `CalendarGrid` 공용 컴포넌트로 게스트/로그인 뷰가 공유한다.

**Tech Stack:** Next.js 16.3.1 (App Router), TypeScript 5, React 19, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-08-26-calendar-guest-default-schedule-design.md`

## Global Constraints

- 이 레포에는 자동 테스트 프레임워크가 없다. 각 태스크의 검증은 `npm run typecheck` / `npm run lint`, 순수 함수는 코드에 적어둔 기대값을 직접 손으로 검산, UI는 마지막 태스크에서 `npm run dev` + 브라우저로 확인한다 (`AGENTS.md` 검증 루프 기준).
- `visa_process_stages`의 원본 컬럼(`stage_id`, `stage_start_date` 등)은 `lib/visa-schedule/default-checklist.ts` 밖으로 절대 export하지 않는다. 컴포넌트는 `ChecklistItem` 내부 타입만 본다 (스펙 "데이터 모델" 절).
- mock 비자 절차 데이터의 `source_document`는 항상 `"mock-data"`로 표시한다. `visa-data`의 실제 CSV/PDF 원문을 이 레포에 복사하지 않는다 (`AGENTS.md` 데이터 경계 원칙).
- 사용자가 누르는 버튼은 실제 동작을 연결하거나 `준비 중`으로 명확히 표시한다 (`AGENTS.md`). 게스트 뷰의 로그인 버튼은 `disabled` + "Google로 로그인 (준비 중)" 문구로 표시한다.
- "세션 로컬 저장"은 브라우저 탭 안에서만 유지되는 상태를 뜻하며 git/브랜치 push 여부와 무관하다. 개인 일정(`PersonalEvent[]`)은 이번 스코프에서 서버에 저장하지 않는다.
- 상대 일정은 기준일과 offset이 모두 있을 때만 날짜를 계산한다. 기준일이 없으면 절대 날짜를 추정하지 않는다 (`AGENTS.md`).
- 경로에 `[locale]`처럼 대괄호가 들어가면 셸이 glob으로 해석할 수 있으므로 항상 큰따옴표로 감싼다 (예: `"app/[locale]/calendar/page.tsx"`).
- import는 `@/*` 경로 별칭을 쓴다 (`tsconfig.json`의 `paths: { "@/*": ["./*"] }`).
- 변경 후 항상 `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다 (`AGENTS.md`).

---

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `lib/onboarding/profile.ts` | 생성 | 온보딩이 `sessionStorage`에 저장한 프로필을 안전하게 읽는 함수 |
| `lib/auth/use-auth-state.ts` | 생성 | 인증 상태 mock 훅 (나중에 Supabase Auth로 내부만 교체) |
| `lib/visa-schedule/default-checklist.ts` | 생성 | upstream 원본 shape, `ChecklistItem` 내부 타입, mock 데이터, `getDefaultChecklist()` |
| `features/calendar/reference-date.ts` | 생성 | 기준일 + offset → 실제 날짜 계산 순수 함수 |
| `features/calendar/calendar-grid.tsx` | 생성 | 게스트/로그인 뷰가 공유하는 월 그리드 (실제 월 이동 포함) |
| `features/calendar/use-target-visa.ts` | 생성 | 온보딩 프로필 또는 수동 선택에서 "목표 비자"를 결정하는 훅 |
| `features/calendar/guest-checklist-calendar.tsx` | 생성 | 비로그인 뷰 |
| `features/calendar/personal-calendar.tsx` | 생성 (기존 `demo-calendar.tsx` 대체) | 로그인 뷰: 기준일 입력 + 개인 일정 등록 폼 |
| `features/calendar/demo-calendar.tsx` | 삭제 | `personal-calendar.tsx`로 대체됨 |
| `features/calendar/calendar-page.tsx` | 생성 | `useAuthState()`로 게스트/로그인 뷰 분기 |
| `app/[locale]/calendar/page.tsx` | 수정 | `CalendarPage` 렌더링으로 축소 |

---

### Task 1: 온보딩 프로필 리더

**Files:**
- Create: `lib/onboarding/profile.ts`

**Interfaces:**
- Consumes: 없음 (브라우저 `sessionStorage`만 사용).
- Produces: `OnboardingProfile` 타입, `getOnboardingProfile(): OnboardingProfile | null` — Task 6(`use-target-visa.ts`)이 사용.

- [ ] **Step 1: `lib/onboarding/profile.ts` 작성**

```ts
export type OnboardingProfile = {
  version: number;
  locale?: string;
  nationality?: string;
  region?: string;
  visa?: string;
};

const STORAGE_KEY = "visa-bugi-demo-profile";

export function getOnboardingProfile(): OnboardingProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || typeof (parsed as { version: unknown }).version !== "number") {
      return null;
    }
    return parsed as OnboardingProfile;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: 저장 키가 온보딩 폼과 정확히 일치하는지 확인**

`features/onboarding/onboarding-form.tsx:61`을 열어 `window.sessionStorage.setItem("visa-bugi-demo-profile", JSON.stringify({ version: 1, ...answers }))`와 `answers`가 `{ locale, nationality, region, visa }` 키를 쓰는지 확인한다. `STORAGE_KEY`와 `OnboardingProfile` 필드명이 정확히 같아야 한다.

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 4: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add lib/onboarding/profile.ts
git commit -m "feat: 온보딩 프로필 세션스토리지 리더 추가"
```

---

### Task 2: 인증 상태 mock 훅

**Files:**
- Create: `lib/auth/use-auth-state.ts`

**Interfaces:**
- Consumes: 없음.
- Produces: `AuthState` 타입(`{status:"loading"} | {status:"guest"} | {status:"authenticated"; userId:string}`), `useAuthState(): AuthState` — Task 9(`calendar-page.tsx`)가 사용.

- [ ] **Step 1: `lib/auth/use-auth-state.ts` 작성**

```ts
"use client";

export type AuthState = { status: "loading" } | { status: "guest" } | { status: "authenticated"; userId: string };

/**
 * Google 로그인이 아직 없어 항상 게스트로 고정된 mock 구현.
 * 실제 로그인이 붙으면(https://github.com/team-hansori/visa-bugi-web/issues/10)
 * 이 함수 본문만 supabase.auth.getSession()/onAuthStateChange로 교체한다.
 * 반환 타입(AuthState)과 훅 시그니처는 유지해 호출부를 건드리지 않는다.
 */
export function useAuthState(): AuthState {
  return { status: "guest" };
}
```

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add lib/auth/use-auth-state.ts
git commit -m "feat: 인증 상태 mock 훅 추가"
```

---

### Task 3: 비자 절차 mock 데이터 모듈

**Files:**
- Create: `lib/visa-schedule/default-checklist.ts`

**Interfaces:**
- Consumes: 없음.
- Produces: `ChecklistItem` 타입(`{ id, order, title, startDate?, endDate?, noticeRound?, referenceEvent?, offsetDays?, source }`), `getDefaultChecklist(targetVisaId: string): ChecklistItem[]` — Task 4, 7, 8이 사용.

- [ ] **Step 1: `lib/visa-schedule/default-checklist.ts` 작성**

```ts
// upstream 원본 shape (visa-data의 visa_process_stages 검수 전 초안 컬럼).
// 이 타입은 이 파일 밖으로 export하지 않는다 — 컬럼명이 바뀌면 여기와 toChecklistItem만 고친다.
type VisaProcessStageRow = {
  stage_id: string;
  visa_id: string;
  stage_order: number;
  stage_name_kr: string;
  stage_start_date: string | null;
  stage_end_date: string | null;
  notice_round: number | null;
  source_document: string;
};

export type ChecklistItem = {
  id: string;
  order: number;
  title: string;
  startDate?: string;
  endDate?: string;
  noticeRound?: number;
  referenceEvent?: string;
  offsetDays?: number;
  source: string;
};

// 실제 visa-data 원문을 복사하지 않은 합성 mock 데이터. source_document는 항상 "mock-data".
const MOCK_STAGE_ROWS: VisaProcessStageRow[] = [
  {
    stage_id: "mock-e74r-1",
    visa_id: "E-7-4R",
    stage_order: 1,
    stage_name_kr: "고용노동부 특정활동 확인서 발급",
    stage_start_date: "2026-08-01",
    stage_end_date: "2026-08-31",
    notice_round: 1,
    source_document: "mock-data",
  },
  {
    stage_id: "mock-e74r-2",
    visa_id: "E-7-4R",
    stage_order: 2,
    stage_name_kr: "체류자격 변경허가 신청",
    stage_start_date: "2026-09-01",
    stage_end_date: "2026-09-30",
    notice_round: 1,
    source_document: "mock-data",
  },
  {
    stage_id: "mock-f2r-1",
    visa_id: "F-2-R",
    stage_order: 1,
    stage_name_kr: "거주자격 점수제 서류 제출",
    stage_start_date: "2026-09-10",
    stage_end_date: "2026-09-25",
    notice_round: 3,
    source_document: "mock-data",
  },
];

function toChecklistItem(row: VisaProcessStageRow): ChecklistItem {
  return {
    id: row.stage_id,
    order: row.stage_order,
    title: row.stage_name_kr,
    startDate: row.stage_start_date ?? undefined,
    endDate: row.stage_end_date ?? undefined,
    noticeRound: row.notice_round ?? undefined,
    source: row.source_document,
  };
}

export function getDefaultChecklist(targetVisaId: string): ChecklistItem[] {
  return MOCK_STAGE_ROWS.filter((row) => row.visa_id === targetVisaId)
    .sort((a, b) => a.stage_order - b.stage_order)
    .map(toChecklistItem);
}
```

- [ ] **Step 2: 손으로 검산**

`getDefaultChecklist("E-7-4R")`는 길이 2, `order` 1(`고용노동부 특정활동 확인서 발급`, `startDate` "2026-08-01")과 2(`체류자격 변경허가 신청`, `startDate` "2026-09-01")를 이 순서로 반환해야 한다. `getDefaultChecklist("F-2-R")`는 길이 1. `getDefaultChecklist("UNKNOWN")`는 길이 0. 코드를 다시 읽고 이 결과와 일치하는지 확인한다.

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음. (`VisaProcessStageRow`가 export되지 않았는데도 다른 파일에서 참조하려 하면 여기서 에러가 나야 한다 — 지금은 참조하는 곳이 없으므로 통과.)

- [ ] **Step 4: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add lib/visa-schedule/default-checklist.ts
git commit -m "feat: 비자 절차 mock 데이터와 getDefaultChecklist 추가"
```

---

### Task 4: 기준일 계산 순수 함수

**Files:**
- Create: `features/calendar/reference-date.ts`

**Interfaces:**
- Consumes: `ChecklistItem` from `@/lib/visa-schedule/default-checklist`.
- Produces: `addDays(isoDate: string, days: number): string`, `resolveChecklistDate(item: ChecklistItem, referenceDate: string | null): string | null` — Task 8(`personal-calendar.tsx`)이 사용.

- [ ] **Step 1: `features/calendar/reference-date.ts` 작성**

```ts
import type { ChecklistItem } from "@/lib/visa-schedule/default-checklist";

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * item에 이미 startDate(공고 회차형 절대 날짜)가 있으면 그대로 쓴다.
 * startDate가 없고 referenceEvent/offsetDays형이면, 사용자가 기준일을 입력했을 때만 계산한다.
 * 기준일이 없으면 null — 자동으로 날짜를 추정하지 않는다 (AGENTS.md 원칙).
 */
export function resolveChecklistDate(item: ChecklistItem, referenceDate: string | null): string | null {
  if (item.startDate) return item.startDate;
  if (referenceDate && typeof item.offsetDays === "number") {
    return addDays(referenceDate, item.offsetDays);
  }
  return null;
}
```

- [ ] **Step 2: 손으로 검산**

`addDays("2026-01-01", 90)`는 "2026-04-01"이어야 한다 (1월 31 + 2월 28 + 3월 31 = 90일 후 4월 1일). `resolveChecklistDate({ startDate: "2026-08-01", ... } as ChecklistItem, null)`은 "2026-08-01"을 반환해야 한다(기준일 무시). `resolveChecklistDate({ offsetDays: 90, ... } as ChecklistItem, null)`(startDate 없음)은 `null`이어야 한다. `resolveChecklistDate({ offsetDays: 90, ... } as ChecklistItem, "2026-01-01")`은 "2026-04-01"이어야 한다. 코드를 다시 읽고 이 네 결과와 일치하는지 확인한다.

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 4: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add features/calendar/reference-date.ts
git commit -m "feat: 기준일+offset 날짜 계산 함수 추가"
```

---

### Task 5: 공용 월 그리드 컴포넌트

**Files:**
- Create: `features/calendar/calendar-grid.tsx`

**Interfaces:**
- Consumes: `Icon` from `@/components/ui/icon` (기존 컴포넌트, `IconName`에 `calendar`/`chevron-left`/`chevron-right`/`clock` 포함 확인됨).
- Produces: `CalendarGridEvent` 타입(`{ id: string; label: string }`), `CalendarGridProps`, `CalendarGrid` 컴포넌트 — Task 7, 8이 사용.

- [ ] **Step 1: `features/calendar/calendar-grid.tsx` 작성**

```tsx
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
              <span className={`grid size-7 place-items-center rounded-full ${isToday ? "bg-[#2d6d5d] text-white" : ""}`}>{cell.day}</span>
              {dayEvents.length ? (
                <span className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 overflow-hidden whitespace-nowrap rounded-full bg-[#e59b37] text-[0px] sm:static sm:mt-2 sm:block sm:size-auto sm:translate-x-0 sm:truncate sm:rounded-md sm:bg-[#fff0d3] sm:px-1.5 sm:py-1 sm:text-[0.65rem] sm:text-[#80561d]">
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
```

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add features/calendar/calendar-grid.tsx
git commit -m "feat: 실제 월 이동을 지원하는 공용 캘린더 그리드 추가"
```

---

### Task 6: 목표 비자 결정 훅

**Files:**
- Create: `features/calendar/use-target-visa.ts`

**Interfaces:**
- Consumes: `getOnboardingProfile` from `@/lib/onboarding/profile`.
- Produces: `SUPPORTED_VISA_OPTIONS: readonly { id: string; label: string }[]`, `useTargetVisaId(): { targetVisaId: string | null; setManualVisaId: (visaId: string) => void }` — Task 7, 8이 사용.

- [ ] **Step 1: `features/calendar/use-target-visa.ts` 작성**

```ts
"use client";

import { useMemo, useState } from "react";
import { getOnboardingProfile } from "@/lib/onboarding/profile";

// getDefaultChecklist()의 mock 데이터가 지원하는 visa_id와 정확히 일치해야 한다.
export const SUPPORTED_VISA_OPTIONS = [
  { id: "E-7-4R", label: "E-7-4R" },
  { id: "F-2-R", label: "F-2-R" },
] as const;

const UNRESOLVED_VISA_VALUES = new Set(["OTHER", "UNKNOWN"]);

export function useTargetVisaId(): { targetVisaId: string | null; setManualVisaId: (visaId: string) => void } {
  const profile = useMemo(() => getOnboardingProfile(), []);
  const [manualVisaId, setManualVisaId] = useState<string | null>(null);
  const profileVisaId = profile?.visa && !UNRESOLVED_VISA_VALUES.has(profile.visa) ? profile.visa : null;
  return { targetVisaId: manualVisaId ?? profileVisaId, setManualVisaId };
}
```

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add features/calendar/use-target-visa.ts
git commit -m "feat: 온보딩 프로필/수동 선택 기반 목표 비자 훅 추가"
```

---

### Task 7: 게스트 체크리스트 캘린더 뷰

**Files:**
- Create: `features/calendar/guest-checklist-calendar.tsx`

**Interfaces:**
- Consumes: `CalendarGrid`, `CalendarGridEvent` (Task 5), `getDefaultChecklist`, `ChecklistItem` (Task 3), `SUPPORTED_VISA_OPTIONS`, `useTargetVisaId` (Task 6).
- Produces: `GuestChecklistCalendar` 컴포넌트 — Task 9(`calendar-page.tsx`)가 사용.

- [ ] **Step 1: `features/calendar/guest-checklist-calendar.tsx` 작성**

```tsx
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
```

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add features/calendar/guest-checklist-calendar.tsx
git commit -m "feat: 게스트 비자 절차 체크리스트 캘린더 뷰 추가"
```

---

### Task 8: 로그인 개인 캘린더 뷰 (기존 데모 대체)

**Files:**
- Create: `features/calendar/personal-calendar.tsx`
- Delete: `features/calendar/demo-calendar.tsx`

**Interfaces:**
- Consumes: `CalendarGrid`, `CalendarGridEvent` (Task 5), `getDefaultChecklist` (Task 3), `resolveChecklistDate` (Task 4), `SUPPORTED_VISA_OPTIONS`, `useTargetVisaId` (Task 6), `Icon` from `@/components/ui/icon`.
- Produces: `PersonalCalendar` 컴포넌트 — Task 9(`calendar-page.tsx`)가 사용.

- [ ] **Step 1: `features/calendar/personal-calendar.tsx` 작성**

```tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { CalendarGrid, type CalendarGridEvent } from "./calendar-grid";
import { getDefaultChecklist } from "@/lib/visa-schedule/default-checklist";
import { resolveChecklistDate } from "./reference-date";
import { SUPPORTED_VISA_OPTIONS, useTargetVisaId } from "./use-target-visa";

type PersonalEvent = {
  id: string;
  title: string;
  category: string;
  date: string;
  time?: string;
  location?: string;
};

const DEFAULT_CATEGORIES = ["관공서 방문", "비자 인터뷰·서류 제출", "교육·상담 참석"];

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function PersonalCalendar() {
  const { targetVisaId, setManualVisaId } = useTargetVisaId();
  const today = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, date: todayIso() };
  }, []);
  const [view, setView] = useState({ year: today.year, month: today.month });
  const [selectedDate, setSelectedDate] = useState<string>(today.date);
  const [referenceDate, setReferenceDate] = useState("");
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(today.date);
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryOpen, setCustomCategoryOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const checklist = targetVisaId ? getDefaultChecklist(targetVisaId) : [];
  const resolvedChecklist = useMemo(
    () => checklist.map((item) => ({ item, resolvedDate: resolveChecklistDate(item, referenceDate || null) })),
    [checklist, referenceDate],
  );
  const hasUnresolvedItems = checklist.some((item) => !item.startDate);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarGridEvent[]> = {};
    function push(date: string, event: CalendarGridEvent) {
      map[date] = [...(map[date] ?? []), event];
    }
    for (const { item, resolvedDate } of resolvedChecklist) {
      if (resolvedDate) push(resolvedDate, { id: item.id, label: item.title });
    }
    for (const event of events) {
      push(event.date, { id: event.id, label: event.title });
    }
    return map;
  }, [resolvedChecklist, events]);

  const selectedPersonalEvents = events.filter((event) => event.date === selectedDate);
  const selectedChecklistItems = resolvedChecklist.filter(({ resolvedDate }) => resolvedDate === selectedDate);

  function submitEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const title = eventTitle.trim();
    if (!title) {
      setFormError("일정 이름을 입력해 주세요. 공백만 입력할 수는 없습니다.");
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
      ) : null}

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
            <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required className="min-h-12 rounded-xl border border-[#cddbd4] bg-white px-4 text-base outline-none focus:border-[#2d6d5d] focus:ring-2 focus:ring-[#bcd9cd]" />
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
            {selectedChecklistItems.map(({ item }) => (
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
```

- [ ] **Step 2: 기존 데모 파일 삭제**

```bash
git rm features/calendar/demo-calendar.tsx
```

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: `app/[locale]/calendar/page.tsx`가 아직 `demo-calendar`를 import하고 있어 에러가 날 수 있다 — Task 9에서 그 파일을 고치므로 지금은 `personal-calendar.tsx` 자체에 타입 에러가 없는지만 확인한다(다른 파일의 import 에러는 무시하고 넘어간다).

- [ ] **Step 4: 린트**

Run: `npm run lint`
Expected: `personal-calendar.tsx`에 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add features/calendar/personal-calendar.tsx
git commit -m "feat: 기준일 계산+개인 일정 등록 폼을 포함한 로그인 캘린더 뷰 추가"
```

---

### Task 9: 페이지 분기 컴포넌트 + 라우트 연결

**Files:**
- Create: `features/calendar/calendar-page.tsx`
- Modify: `app/[locale]/calendar/page.tsx`

**Interfaces:**
- Consumes: `useAuthState` (Task 2), `GuestChecklistCalendar` (Task 7), `PersonalCalendar` (Task 8).
- Produces: `CalendarPage` 컴포넌트 (default export 아님, named export) — `app/[locale]/calendar/page.tsx`가 사용.

- [ ] **Step 1: `features/calendar/calendar-page.tsx` 작성**

```tsx
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
```

- [ ] **Step 2: `app/[locale]/calendar/page.tsx`를 `CalendarPage` 렌더링으로 교체**

`"app/[locale]/calendar/page.tsx"` 전체를 다음으로 교체:

```tsx
import type { Metadata } from "next";
import { CalendarPage } from "@/features/calendar/calendar-page";

export const metadata: Metadata = { title: "내 일정" };

export default function CalendarRoutePage() {
  return <CalendarPage />;
}
```

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음 (Task 8에서 남겨둔 `demo-calendar` import 에러도 이제 해결됨).

- [ ] **Step 4: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add features/calendar/calendar-page.tsx "app/[locale]/calendar/page.tsx"
git commit -m "feat: 캘린더 페이지를 인증 상태로 분기하도록 연결"
```

---

### Task 10: 전체 빌드 + 수동 동작 확인

**Files:**
- 없음 (검증 전용 태스크)

**Interfaces:**
- Consumes: 전체 캘린더 기능.
- Produces: 없음.

- [ ] **Step 1: 전체 빌드**

Run: `npm run build`
Expected: 에러 없이 빌드 성공.

- [ ] **Step 2: 개발 서버 기동**

Run: `npm run dev`

- [ ] **Step 3: 게스트 뷰 확인 (브라우저)**

`http://localhost:3000/ko/calendar` 접속.
- 온보딩을 거치지 않은 상태(=sessionStorage 비어있음)라면 "확인할 비자 유형을 선택해 주세요"가 보이는지 확인. `E-7-4R` 클릭.
- 캘린더 그리드에 2026년 8월 1일과 8월 31일, 9월 1일과 9월 30일에 이벤트 표시가 보이는지 확인 (이전/다음 달 버튼으로 이동).
- "Google로 로그인 (준비 중)" 버튼이 `disabled` 상태인지 확인.
- 사이드 패널 체크리스트에 두 절차가 날짜와 함께 나열되는지 확인.

- [ ] **Step 4: 온보딩 → 게스트 뷰 연동 확인**

`http://localhost:3000/ko/onboarding`에서 비자 단계까지 진행해 `F-2-R`을 선택하고 완료. `/ko/calendar`로 돌아가서 비자 유형 선택 UI 없이 바로 `F-2-R` 체크리스트(9월 10일~25일)가 보이는지 확인.

- [ ] **Step 5: 로그인 상태(mock) 확인**

`lib/auth/use-auth-state.ts`의 반환값을 임시로 `{ status: "authenticated", userId: "dev" }`로 바꾸고 개발 서버를 새로고침(hot reload)한다.
- "일정 추가" 버튼으로 폼을 열고, 카테고리 기본값 선택 + "직접 입력"으로 커스텀 카테고리 입력이 모두 되는지 확인.
- 위치·시간을 채워 일정을 추가하고 그리드/사이드 패널에 반영되는지 확인.
- 새로고침하면 추가한 일정이 사라지는지 확인 (세션 로컬 저장 의도대로 동작).
- 확인 후 `lib/auth/use-auth-state.ts`의 임시 변경을 되돌린다 (`git diff`로 원래 `{ status: "guest" }`만 남았는지 확인).

- [ ] **Step 6: 최종 린트·타입체크 재확인**

Run: `npm run lint && npm run typecheck`
Expected: 둘 다 에러 없음.

- [ ] **Step 7: 커밋 (변경 사항이 있다면)**

Step 5에서 되돌린 것 외에 남은 변경이 없어야 한다. `git status`가 clean이면 커밋할 것이 없다 — 이 태스크는 검증 전용이므로 보통 커밋이 발생하지 않는다.
