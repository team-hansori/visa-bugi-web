# i18n 라우팅 인프라 구축 (next-intl) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `next-intl`을 사용해 `[locale]` 세그먼트 기반 라우팅, locale 감지·리다이렉트, 메시지 로드 구조, 쿠키 기반 언어 선택 UI를 구축한다. 콘텐츠 번역(비자 요건 등)은 범위 밖이며, 1차는 `ko` 원문 + 나머지 5개 언어는 `ko` 복사본 fallback으로 인프라만 검증한다.

**Architecture:** `next-intl`의 `defineRouting` + `createNavigation`으로 라우팅/네비게이션을 중앙화하고, 루트의 `proxy.ts`(Next.js 16 컨벤션, `middleware.ts` 아님)에서 `createMiddleware(routing)`으로 locale 감지·리다이렉트를 처리한다. 기존 `app/*`는 `app/[locale]/*`로 이동하고, `app/api/health`는 세그먼트 밖에 유지한다. 선택 언어는 `next-intl`이 기본 제공하는 쿠키에 저장한다.

**Tech Stack:** Next.js 16.3.1 (App Router), TypeScript, next-intl 4.13.7, React 19.

**Spec:** https://github.com/team-hansori/visa-bugi-web/issues/4

## Global Constraints

- 지원 locale은 정확히 6개, 이 순서로: `ko`(기본), `zh`, `vi`, `uz`, `ne`, `km`.
- 콘텐츠 번역(비자 요건·기관 정보 등 마스터 데이터 의존 문구)은 범위 밖. `zh`/`vi`/`uz`/`ne`/`km` 메시지 파일은 `ko.json`의 완전한 복사본으로 시작한다.
- `app/api/health`는 `[locale]` 세그먼트 밖에 유지한다 (API 응답에 i18n 불필요).
- `proxy.ts`는 레포 루트(`./proxy.ts`)에 위치한다. `src/` 디렉터리가 없는 이 레포 구조상 이것이 Next.js 16 공식 컨벤션이다 — 이슈 댓글의 `app/proxy.ts` 표기는 오기이므로 따르지 않는다. (근거: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` "Create a proxy.ts file in the project root, or inside src if applicable, so that it is located at the same level as pages or app.")
- 이 레포에는 테스트 프레임워크가 없다 (AGENTS.md 기준 검증 루프는 `npm run lint`/`npm run typecheck`/`npm run build`). 각 태스크의 검증은 이 명령들과, 라우팅 동작 확인이 필요한 경우 `npm run dev` + `curl`로 대체한다.
- 파일 경로에 `app/[locale]/...`처럼 대괄호가 포함되면 zsh가 이를 glob 패턴으로 해석해 "no matches found" 오류를 낼 수 있다. 이런 경로는 항상 큰따옴표로 감싼다. (예: `"app/[locale]/page.tsx"`)
- 새 의존성 설치(`npm install`)는 네트워크가 필요하므로 샌드박스에서 실패하면 `dangerouslyDisableSandbox: true`로 재시도한다.
- 변경 후 항상 `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다 (AGENTS.md).

---

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `proxy.ts` (루트) | 생성 | locale 감지·리다이렉트 (Next.js 16 proxy 컨벤션) |
| `next.config.ts` | 수정 | `createNextIntlPlugin`으로 래핑 |
| `i18n/routing.ts` | 생성 | `defineRouting` 설정 + `localeNames` (언어 선택 UI용 네이티브 표기) |
| `i18n/navigation.ts` | 생성 | locale-aware `Link`/`usePathname`/`useRouter`/`redirect` 래퍼 |
| `i18n/request.ts` | 생성 | `getRequestConfig`로 locale별 메시지 로드 |
| `messages/ko.json` | 생성 | 기본 언어 메시지 (현재 랜딩 페이지·AppShell 문구 기준) |
| `messages/zh.json` `messages/vi.json` `messages/uz.json` `messages/ne.json` `messages/km.json` | 생성 | `ko.json` 복사본 (fallback, 인프라 검증용) |
| `app/[locale]/layout.tsx` | 생성 (구 `app/layout.tsx`에서 이동) | `NextIntlClientProvider`, locale 검증, `generateStaticParams`, 번역 기반 metadata |
| `app/[locale]/page.tsx` | 생성 (구 `app/page.tsx`에서 이동) | 랜딩 페이지, `useTranslations`로 문구 연결 |
| `app/[locale]/calendar/page.tsx` `app/[locale]/map/page.tsx` `app/[locale]/ocr/page.tsx` `app/[locale]/onboarding/page.tsx` | 이동만 (내용 불변) | 기존 페이지를 locale 세그먼트 아래로 재배치 |
| `app/api/health/route.ts` | 불변 | 세그먼트 밖 유지 |
| `components/app-shell.tsx` | 수정 | `next/link`/`next/navigation` → `@/i18n/navigation`, nav 라벨 번역, 언어 선택 UI(6개 언어, 쿠키 저장) |
| `features/onboarding/onboarding-form.tsx` | 수정 | `useRouter` import를 `@/i18n/navigation`으로 교체 (locale 프리픽스 유지) |
| `package.json` | 수정 | `next-intl` 의존성 추가 |

---

### Task 1: next-intl 설치 및 Next.js 플러그인 연결

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: `next-intl` 패키지가 `dependencies`에 존재. `next.config.ts`의 default export가 `withNextIntl(nextConfig)`로 감싸진 상태 — 이후 태스크가 이 위에 `i18n/request.ts`를 얹는다.

- [ ] **Step 1: next-intl 설치**

```bash
npm install next-intl@^4.13.7
```

- [ ] **Step 2: 설치 확인**

```bash
node -e "console.log(require('./package.json').dependencies['next-intl'])"
```
Expected: `^4.13.7` (또는 npm이 기록한 실제 semver 범위) 출력.

- [ ] **Step 3: `next.config.ts`를 next-intl 플러그인으로 래핑**

`next.config.ts` 전체를 다음으로 교체:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
```

- [ ] **Step 4: 타입체크로 회귀 확인**

Run: `npm run typecheck`
Expected: 기존과 동일하게 에러 없이 통과 (아직 `i18n/request.ts`가 없어도 플러그인 자체는 타입 에러를 내지 않는다).

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "chore: next-intl 설치 및 Next.js 플러그인 연결"
```

---

### Task 2: 라우팅 설정, 네비게이션 래퍼, 요청 설정 작성

**Files:**
- Create: `i18n/routing.ts`
- Create: `i18n/navigation.ts`
- Create: `i18n/request.ts`

**Interfaces:**
- Consumes: `next-intl/routing`의 `defineRouting`, `next-intl/navigation`의 `createNavigation`, `next-intl/server`의 `getRequestConfig`, `next-intl`의 `hasLocale`.
- Produces:
  - `routing.locales: readonly ["ko","zh","vi","uz","ne","km"]`, `routing.defaultLocale: "ko"` — Task 3(메시지), Task 4(proxy), Task 5(layout)가 사용.
  - `localeNames: Record<Locale, string>` — Task 7(언어 선택 UI)이 사용.
  - `{ Link, redirect, usePathname, useRouter, getPathname }` from `i18n/navigation.ts` — Task 7, 8이 사용.
  - `i18n/request.ts`의 default export(`getRequestConfig` 결과) — next-intl 플러그인이 자동으로 로드.

- [ ] **Step 1: `i18n/routing.ts` 작성**

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "zh", "vi", "uz", "ne", "km"],
  defaultLocale: "ko",
});

export const localeNames: Record<(typeof routing.locales)[number], string> = {
  ko: "한국어",
  zh: "中文",
  vi: "Tiếng Việt",
  uz: "Oʻzbekcha",
  ne: "नेपाली",
  km: "ខ្មែរ",
};
```

- [ ] **Step 2: `i18n/navigation.ts` 작성**

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 3: `i18n/request.ts` 작성**

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: 타입체크 확인**

Run: `npm run typecheck`
Expected: 에러 없이 통과 (아직 `messages/*.json`이 없어 런타임 import는 실패하지만, 타입체크는 정적 경로 리터럴만 검사하므로 통과한다).

- [ ] **Step 5: 커밋**

```bash
git add i18n
git commit -m "feat: next-intl 라우팅·네비게이션·요청 설정 추가"
```

---

### Task 3: 메시지 파일 작성 (`ko.json` + 5개 언어 fallback)

**Files:**
- Create: `messages/ko.json`
- Create: `messages/zh.json`
- Create: `messages/vi.json`
- Create: `messages/uz.json`
- Create: `messages/ne.json`
- Create: `messages/km.json`

**Interfaces:**
- Produces: 네임스페이스 `Metadata`, `A11y`, `Brand`, `Nav`, `LocaleSwitcher`, `Home`(하위 `progress`, `journey`, `tasks`, `agencies`) — Task 5(layout metadata), Task 6(landing page), Task 7(AppShell)이 정확히 이 키들을 사용한다.

- [ ] **Step 1: `messages/ko.json` 작성 (현재 `app/layout.tsx`, `app/page.tsx`, `components/app-shell.tsx`의 실제 한국어 문구를 그대로 옮김)**

```json
{
  "Metadata": {
    "title": "비자부기",
    "titleTemplate": "%s | 비자부기",
    "description": "내 비자 요건과 다음 단계를 추적하는 AI 서비스"
  },
  "A11y": {
    "skipToContent": "본문으로 바로가기"
  },
  "Brand": {
    "name": "비자부기",
    "tagline": "내 비자 여정의 동반자",
    "homeAriaLabel": "비자부기 홈"
  },
  "Nav": {
    "home": "홈",
    "calendar": "일정",
    "map": "기관",
    "ocr": "서류",
    "mainMenuAriaLabel": "주요 메뉴",
    "mobileMenuAriaLabel": "모바일 주요 메뉴"
  },
  "LocaleSwitcher": {
    "label": "언어 선택"
  },
  "Home": {
    "demoBadge": "로그인 없이 둘러보는 데모",
    "heroTitle": "오늘 준비할 일을 한눈에 확인하세요",
    "heroDescription": "현재 화면은 반응형 UI 확인용 예시입니다. 공식 비자 요건과 사용자 진행상황은 검수된 데이터 연결 후 표시됩니다.",
    "heroCta": "내 정보 설정하기",
    "progress": {
      "sectionAriaLabel": "비자 진행 현황",
      "ariaLabel": "전체 요건 충족률 예시 68퍼센트",
      "caption": "예시 진행률",
      "eyebrow": "전체 요건 충족률",
      "heading": "준비 현황",
      "demoTag": "DEMO",
      "selectedVisaLabel": "선택 비자",
      "selectedVisaValue": "E-7-4R 예시",
      "baseDateLabel": "기준일",
      "baseDateValue": "아직 설정되지 않음"
    },
    "journey": {
      "eyebrow": "비자 여정",
      "heading": "현재 단계",
      "stepIndicator": "2단계 · 서류 준비",
      "stagesAriaLabel": "비자 진행 단계 예시",
      "stageDone": "완료",
      "stageCurrent": "진행 중",
      "stageUpcoming": "예정",
      "stages": {
        "requirementCheck": "요건 확인",
        "documentPrep": "서류 준비",
        "agencyVisit": "기관 방문",
        "resultCheck": "결과 확인"
      },
      "noticeTitle": "상대 일정은 자동으로 추정하지 않아요",
      "noticeBody": "기준일이 정해지면 캘린더에 직접 추가할 수 있습니다.",
      "viewSchedule": "일정 보기"
    },
    "tasks": {
      "eyebrow": "다음 할 일",
      "heading": "서류 준비 체크",
      "items": {
        "passport": { "label": "여권 사본 상태 확인", "meta": "서류 준비 · 예시 항목" },
        "schedule": { "label": "방문 일정 직접 추가", "meta": "캘린더 · 날짜 미정" },
        "agency": { "label": "가까운 지원기관 확인", "meta": "기관 지도 · 위치 사용 선택" }
      }
    },
    "agencies": {
      "eyebrow": "주변 기관",
      "heading": "도움받을 곳을 찾아보세요",
      "description": "GPS는 저장하지 않으며, 위치를 허용하지 않아도 지역을 직접 선택할 수 있습니다.",
      "cta": "기관 지도 열기"
    }
  }
}
```

- [ ] **Step 2: 나머지 5개 언어를 `ko.json`의 완전한 복사본으로 생성 (1차 fallback)**

```bash
cp messages/ko.json messages/zh.json
cp messages/ko.json messages/vi.json
cp messages/ko.json messages/uz.json
cp messages/ko.json messages/ne.json
cp messages/ko.json messages/km.json
```

- [ ] **Step 3: JSON 유효성 확인**

```bash
for f in messages/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('$f OK')"; done
```
Expected: 6개 파일 모두 `OK` 출력.

- [ ] **Step 4: 커밋**

```bash
git add messages
git commit -m "feat: 메시지 ko.json 작성 및 5개 언어 fallback 복사본 생성"
```

---

### Task 4: 루트 `proxy.ts` 추가 (locale 감지·리다이렉트)

**Files:**
- Create: `proxy.ts` (레포 루트, `app/` 밖 — Global Constraints 참조)

**Interfaces:**
- Consumes: `i18n/routing.ts`의 `routing`.
- Produces: 모든 요청에 대해 locale 프리픽스가 없으면 `Accept-Language` 기반으로 감지된 locale로 리다이렉트. `/api`, `/_next`, 정적 파일 경로는 제외.

- [ ] **Step 1: `proxy.ts` 작성**

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: 타입체크 확인**

Run: `npm run typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 3: 커밋**

```bash
git add proxy.ts
git commit -m "feat: locale 감지·리다이렉트 proxy 추가"
```

---

### Task 5: `app/` 를 `app/[locale]/` 아래로 재구성

**Files:**
- Move: `app/layout.tsx` → `"app/[locale]/layout.tsx"` (내용 수정)
- Move: `app/page.tsx` → `"app/[locale]/page.tsx"` (이동만, 내용은 Task 6에서 수정)
- Move: `app/calendar/page.tsx` → `"app/[locale]/calendar/page.tsx"` (이동만)
- Move: `app/map/page.tsx` → `"app/[locale]/map/page.tsx"` (이동만)
- Move: `app/ocr/page.tsx` → `"app/[locale]/ocr/page.tsx"` (이동만)
- Move: `app/onboarding/page.tsx` → `"app/[locale]/onboarding/page.tsx"` (이동만)
- 불변: `app/api/health/route.ts`, `app/globals.css`, `app/favicon.ico` (모두 `[locale]` 세그먼트 밖에 유지)

**Interfaces:**
- Consumes: `@/i18n/routing`의 `routing`, `next-intl`의 `hasLocale`/`NextIntlClientProvider`, `next-intl/server`의 `getTranslations`/`setRequestLocale`.
- Produces: `app/[locale]/layout.tsx`가 `NextIntlClientProvider`로 `children`을 감싸 하위 Client Component(`AppShell`)에서 `useTranslations` 사용 가능. 지원하지 않는 locale은 `notFound()` — `generateMetadata`는 layout 렌더링보다 먼저 실행될 수 있으므로 `generateMetadata`와 컴포넌트 본문 양쪽에서 각각 `hasLocale` 검증 후 `notFound()`를 호출한다 (Codex 리뷰 반영: metadata만 검증하지 않으면 잘못된 locale에서 500이 날 수 있음).

- [ ] **Step 1: 대상 디렉터리 생성 및 파일 이동**

```bash
mkdir -p "app/[locale]/calendar" "app/[locale]/map" "app/[locale]/ocr" "app/[locale]/onboarding"
git mv app/layout.tsx "app/[locale]/layout.tsx"
git mv app/page.tsx "app/[locale]/page.tsx"
git mv app/calendar/page.tsx "app/[locale]/calendar/page.tsx"
git mv app/map/page.tsx "app/[locale]/map/page.tsx"
git mv app/ocr/page.tsx "app/[locale]/ocr/page.tsx"
git mv app/onboarding/page.tsx "app/[locale]/onboarding/page.tsx"
rmdir app/calendar app/map app/ocr app/onboarding
```

- [ ] **Step 2: `"app/[locale]/layout.tsx"` 전체 내용을 교체**

```tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { routing } from "@/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LayoutParams = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<LayoutParams>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f8f4",
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<LayoutParams>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full">
        <NextIntlClientProvider>
          <AppShell>{children}</AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 타입체크로 이동·경로 오류 확인**

Run: `npm run typecheck`
Expected: 에러 없이 통과. (Task 6 이전이므로 `"app/[locale]/page.tsx"`는 아직 구버전 콘텐츠 그대로지만 문법적으로는 유효해야 한다.)

- [ ] **Step 4: 커밋**

```bash
git add app
git commit -m "feat: app 라우트를 [locale] 세그먼트 아래로 재구성"
```

---

### Task 6: 랜딩 페이지(`"app/[locale]/page.tsx"`)에 번역 연결

**Files:**
- Modify: `"app/[locale]/page.tsx"`

**Interfaces:**
- Consumes: `next-intl/server`의 `getTranslations`/`setRequestLocale`, `messages/*.json`의 `Home.*` 네임스페이스 (Task 3에서 정의).
- Produces: 서버 컴포넌트로서 `params.locale`을 받아 렌더링. 이후 태스크에 영향 없음 (leaf page).

- [ ] **Step 1: `"app/[locale]/page.tsx"` 전체 내용을 교체**

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";

const stages = [
  { id: "requirementCheck", state: "done" },
  { id: "documentPrep", state: "current" },
  { id: "agencyVisit", state: "upcoming" },
  { id: "resultCheck", state: "upcoming" },
] as const;

const sampleTasks = ["passport", "schedule", "agency"] as const;

function ProgressRing({
  ariaLabel,
  caption,
}: {
  ariaLabel: string;
  caption: string;
}) {
  return (
    <div className="relative grid size-36 shrink-0 place-items-center sm:size-40" role="img" aria-label={ariaLabel}>
      <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="51" fill="none" stroke="#e5ebe7" strokeWidth="10" />
        <circle cx="60" cy="60" r="51" fill="none" pathLength="100" stroke="#2d6d5d" strokeDasharray="68 32" strokeLinecap="round" strokeWidth="10" />
      </svg>
      <div className="absolute text-center">
        <strong className="block text-3xl font-black tracking-[-0.06em] text-[#173f36] sm:text-4xl">68%</strong>
        <span className="mt-1 block text-xs font-semibold text-[#73807b]">{caption}</span>
      </div>
    </div>
  );
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-col gap-5 rounded-[28px] bg-[#173f36] px-5 py-7 text-white shadow-[0_18px_50px_rgba(23,63,54,0.18)] sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div className="max-w-2xl">
          <span className="inline-flex min-h-8 items-center rounded-full bg-white/12 px-3 text-xs font-bold text-[#d9eee5]">{t("demoBadge")}</span>
          <h1 className="mt-4 text-[clamp(1.75rem,7vw,3.25rem)] font-black leading-[1.12] tracking-[-0.055em]">
            {t("heroTitle")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#d1dfda] sm:text-base sm:leading-7">
            {t("heroDescription")}
          </p>
        </div>
        <Link href="/onboarding" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffca68] px-5 text-sm font-extrabold text-[#173f36] shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-fit">
          {t("heroCta")}
          <Icon name="arrow-right" className="size-4" />
        </Link>
      </section>

      <section className="grid gap-5 xl:grid-cols-12" aria-label={t("progress.sectionAriaLabel")}>
        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 xl:col-span-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("progress.eyebrow")}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#20332c]">{t("progress.heading")}</h2>
            </div>
            <span className="rounded-full bg-[#fff1d4] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#8a5910]">{t("progress.demoTag")}</span>
          </div>
          <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center xl:flex-col">
            <ProgressRing ariaLabel={t("progress.ariaLabel")} caption={t("progress.caption")} />
            <div className="w-full rounded-2xl bg-[#f5f7f4] p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-[#64716c]">{t("progress.selectedVisaLabel")}</span>
                <strong className="text-[#20332c]">{t("progress.selectedVisaValue")}</strong>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-[#64716c]">{t("progress.baseDateLabel")}</span>
                <strong className="text-[#8a5910]">{t("progress.baseDateValue")}</strong>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 xl:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("journey.eyebrow")}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">{t("journey.heading")}</h2>
            </div>
            <span className="text-sm font-bold text-[#2d6d5d]">{t("journey.stepIndicator")}</span>
          </div>

          <ol className="relative mt-7 grid gap-0 md:grid-cols-4" aria-label={t("journey.stagesAriaLabel")}>
            {stages.map((stage, index) => {
              const done = stage.state === "done";
              const current = stage.state === "current";
              const statusLabel = done
                ? t("journey.stageDone")
                : current
                  ? t("journey.stageCurrent")
                  : t("journey.stageUpcoming");
              return (
                <li key={stage.id} className="relative flex min-h-[76px] gap-3 pb-4 last:pb-0 md:block md:min-h-0 md:pb-0 md:text-center">
                  {index < stages.length - 1 ? (
                    <span aria-hidden="true" className={`absolute left-[18px] top-9 h-[calc(100%-1rem)] w-0.5 md:left-1/2 md:top-[18px] md:h-0.5 md:w-full ${done ? "bg-[#2d6d5d]" : "bg-[#dce4df]"}`} />
                  ) : null}
                  <span className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 text-xs font-black md:mx-auto ${done ? "border-[#2d6d5d] bg-[#2d6d5d] text-white" : current ? "border-[#2d6d5d] bg-[#e5f1ec] text-[#245d4f]" : "border-[#dce4df] bg-white text-[#87908c]"}`}>
                    {done ? <Icon name="check" className="size-4" /> : index + 1}
                  </span>
                  <div className="pt-1 md:mt-3 md:pt-0">
                    <span className={`block text-sm font-extrabold ${current ? "text-[#205848]" : done ? "text-[#354b43]" : "text-[#7d8883]"}`}>{t(`journey.stages.${stage.id}`)}</span>
                    <span className="mt-1 block text-xs text-[#8a938f]">{statusLabel}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 rounded-2xl border border-[#dce8e2] bg-[#edf6f2] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="font-extrabold text-[#1d5748]">{t("journey.noticeTitle")}</p>
              <p className="mt-1 text-sm leading-6 text-[#5d7068]">{t("journey.noticeBody")}</p>
            </div>
            <Link href="/calendar" className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-extrabold text-[#205848] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] sm:mt-0">
              {t("journey.viewSchedule")}
              <Icon name="chevron-right" className="size-4" />
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 lg:col-span-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("tasks.eyebrow")}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">{t("tasks.heading")}</h2>
            </div>
            <Icon name="document" className="size-6 text-[#2d6d5d]" />
          </div>
          <ul className="mt-5 divide-y divide-[#edf0ee]">
            {sampleTasks.map((taskId, index) => (
              <li key={taskId} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${index === 0 ? "bg-[#fff0cf] text-[#8a5910]" : "bg-[#edf2ef] text-[#65716c]"}`}>{index + 1}</span>
                <div className="min-w-0">
                  <p className="font-extrabold text-[#2a3c35]">{t(`tasks.items.${taskId}.label`)}</p>
                  <p className="mt-1 text-sm text-[#76817c]">{t(`tasks.items.${taskId}.meta`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="overflow-hidden rounded-[24px] bg-[#f1e8d7] lg:col-span-2">
          <div className="p-5 sm:p-7">
            <span className="grid size-11 place-items-center rounded-2xl bg-white text-[#2d6d5d] shadow-sm"><Icon name="map-pin" className="size-5" /></span>
            <p className="mt-5 text-xs font-extrabold tracking-[0.08em] text-[#76582d]">{t("agencies.eyebrow")}</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#352d22]">{t("agencies.heading")}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6f6454]">{t("agencies.description")}</p>
            <Link href="/map" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#352d22] px-4 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#352d22]">
              {t("agencies.cta")}
              <Icon name="arrow-right" className="size-4" />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
```

> **참고 (Codex 리뷰 반영):** 이 페이지의 `/onboarding`, `/calendar`, `/map` 링크는 `next/link`가 아니라 `@/i18n/navigation`의 `Link`를 사용한다. `next/link`를 쓰면 locale 프리픽스가 안 붙어 쿠키가 없거나 비활성화된 환경에서 현재 locale이 깨질 수 있으므로, "locale-aware 라우팅 인프라 구축"이라는 이슈 목표상 페이지 본문 링크도 `@/i18n/navigation`의 `Link`로 통일한다. `createNavigation`의 `Link`는 Server Component에서도 그대로 사용 가능하다.

- [ ] **Step 2: 타입체크 확인**

Run: `npm run typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 3: 커밋**

```bash
git add "app/[locale]/page.tsx"
git commit -m "feat: 랜딩 페이지에 next-intl 번역 연결"
```

---

### Task 7: `AppShell` locale 대응 — 네비게이션, 라벨, 언어 선택 UI

**Files:**
- Modify: `components/app-shell.tsx`

**Interfaces:**
- Consumes: `@/i18n/navigation`의 `Link`/`usePathname`/`useRouter`, `@/i18n/routing`의 `routing`/`localeNames`, `next-intl`의 `useLocale`/`useTranslations`/`hasLocale`.
- Produces: 헤더의 정적 "한국어" 표시를 실제 동작하는 6개 언어 선택 `<select>`로 교체. 선택 시 `next-intl`이 쿠키에 저장하고 현재 경로를 유지한 채 locale만 전환. `<select>`의 `event.target.value`는 원시 `string`이라 `hasLocale`로 검증 후에만 `router.replace`에 넘긴다 (Codex 리뷰 반영: 검증 없이 넘기면 타입이 좁혀지지 않음).

- [ ] **Step 1: `components/app-shell.tsx` 전체 내용을 교체**

```tsx
"use client";

import { hasLocale, useLocale, useTranslations } from "next-intl";
import type { ChangeEvent, ReactNode } from "react";
import { useTransition } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing } from "@/i18n/routing";

type NavItem = {
  href: string;
  icon: IconName;
  key: "home" | "calendar" | "map" | "ocr";
};

const navItems: NavItem[] = [
  { href: "/", icon: "home", key: "home" },
  { href: "/calendar", icon: "calendar", key: "calendar" },
  { href: "/map", icon: "map-pin", key: "map" },
  { href: "/ocr", icon: "document", key: "ocr" },
];

function isCurrentPath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

function Brand() {
  const t = useTranslations("Brand");

  return (
    <Link
      href="/"
      className="group flex min-h-11 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2d6d5d]"
      aria-label={t("homeAriaLabel")}
    >
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-[14px] bg-[#ffca68] text-[#173f36] shadow-[0_6px_18px_rgba(86,64,21,0.14)] transition-transform group-hover:-translate-y-0.5"
      >
        <svg viewBox="0 0 32 32" className="size-7" fill="none">
          <path
            d="M8.5 13.5a7.5 7.5 0 0 1 15 0v4a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6v-4Z"
            fill="currentColor"
          />
          <path d="M12 16h8M16 12v8" stroke="#ffca68" strokeWidth="2" strokeLinecap="round" />
          <circle cx="6" cy="17" r="2" fill="currentColor" />
          <circle cx="26" cy="17" r="2" fill="currentColor" />
        </svg>
      </span>
      <span>
        <span className="block text-[1.05rem] font-extrabold tracking-[-0.035em] text-[#173f36]">
          {t("name")}
        </span>
        <span className="hidden text-[0.7rem] font-medium tracking-[-0.01em] text-[#73807b] sm:block">
          {t("tagline")}
        </span>
      </span>
    </Link>
  );
}

function DesktopNavigation({ pathname }: { pathname: string }) {
  const t = useTranslations("Nav");

  return (
    <nav aria-label={t("mainMenuAriaLabel")} className="hidden items-center gap-1 md:flex">
      {navItems.map((item) => {
        const current = isCurrentPath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={`flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${
              current
                ? "bg-[#e6f1ec] text-[#1e5a4b]"
                : "text-[#66736e] hover:bg-[#f2f5f2] hover:text-[#27443b]"
            }`}
          >
            <Icon name={item.icon} className="size-[1.15rem]" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNavigation({ pathname }: { pathname: string }) {
  const t = useTranslations("Nav");

  return (
    <nav
      aria-label={t("mobileMenuAriaLabel")}
      className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-[#dfe6e1] bg-white/95 px-3 pt-2 shadow-[0_-8px_28px_rgba(34,54,46,0.08)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {navItems.map((item) => {
          const current = isCurrentPath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[0.7rem] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2d6d5d] ${
                current ? "bg-[#e6f1ec] text-[#1e5a4b]" : "text-[#77817d]"
              }`}
            >
              <Icon name={item.icon} className="size-5" />
              {t(item.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    if (!hasLocale(routing.locales, nextLocale)) {
      return;
    }
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <label className="flex min-h-10 items-center gap-1.5 rounded-full border border-[#dfe5e1] bg-white px-3 text-xs font-bold text-[#52615b]">
      <Icon name="globe" className="size-4" aria-hidden="true" />
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        value={locale}
        onChange={onChange}
        disabled={isPending}
        className="bg-transparent focus-visible:outline-none disabled:opacity-60"
      >
        {routing.locales.map((code) => (
          <option key={code} value={code}>
            {localeNames[code]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("A11y");

  return (
    <div className="min-h-dvh bg-[#f7f8f4] text-[#20332c]">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-[#173f36] px-4 py-3 text-sm font-bold text-white transition-transform focus:translate-y-0"
      >
        {t("skipToContent")}
      </a>

      <header className="sticky top-0 z-40 border-b border-[#e2e7e3] bg-[#f7f8f4]/94 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Brand />
          <DesktopNavigation pathname={pathname} />
          <LocaleSwitcher />
        </div>
      </header>

      <main id="main-content" className="app-main mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {children}
      </main>

      <MobileNavigation pathname={pathname} />
    </div>
  );
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `npm run typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 3: 커밋**

```bash
git add components/app-shell.tsx
git commit -m "feat: AppShell에 locale 네비게이션과 언어 선택 UI 연결"
```

---

### Task 8: 온보딩 폼의 라우터 import를 locale-aware 버전으로 교체

**Files:**
- Modify: `features/onboarding/onboarding-form.tsx:3`

**Interfaces:**
- Consumes: `@/i18n/navigation`의 `useRouter`.
- Produces: `router.push("/")` 호출 시 현재 locale 프리픽스가 유지된 채 이동 (기존 `next/navigation`의 `useRouter`는 locale을 모르므로 프리픽스가 사라지는 회귀가 있었음).

- [ ] **Step 1: import 교체**

`features/onboarding/onboarding-form.tsx:3`의:

```ts
import { useRouter } from "next/navigation";
```

를 다음으로 교체:

```ts
import { useRouter } from "@/i18n/navigation";
```

- [ ] **Step 2: 타입체크 확인**

Run: `npm run typecheck`
Expected: 에러 없이 통과. (`router.push("/")` 시그니처는 두 `useRouter` 모두 `string` 인자를 받으므로 나머지 코드는 무수정으로 컴파일된다.)

- [ ] **Step 3: 커밋**

```bash
git add features/onboarding/onboarding-form.tsx
git commit -m "fix: 온보딩 폼 라우터를 locale-aware 네비게이션으로 교체"
```

---

### Task 9: 전체 검증 (lint / typecheck / build / 라우팅 동작)

**Files:** 없음 (검증 전용 태스크)

**Interfaces:** 없음.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 에러 없이 통과.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 에러 없이 통과.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: 빌드 성공. 출력에 `/[locale]`, `/[locale]/calendar`, `/[locale]/map`, `/[locale]/ocr`, `/[locale]/onboarding`, `/api/health` 라우트가 나열되는지 확인.

- [ ] **Step 4: 개발 서버로 6개 locale 랜딩 페이지 렌더링 확인**

```bash
npm run dev &
DEV_PID=$!
sleep 3
for locale in ko zh vi uz ne km; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/$locale")
  echo "$locale: $code"
done
kill "$DEV_PID"
```
Expected: 6개 모두 `200`. (Codex 리뷰 반영: `kill %1`은 비대화형 셸에서 job spec이 불안정할 수 있어 `$!`로 PID를 직접 저장해 종료한다.)

- [ ] **Step 5: locale 없이 `/` 접속 시 리다이렉트 확인**

```bash
npm run dev &
DEV_PID=$!
sleep 3
curl -s -o /dev/null -D - "http://localhost:3000/" -H "Accept-Language: zh-CN,zh;q=0.9" | grep -i "^location\|^HTTP"
curl -s -o /dev/null -D - "http://localhost:3000/" | grep -i "^location\|^HTTP"
kill "$DEV_PID"
```
Expected: 첫 번째 요청은 `location: /zh`(또는 유사) 포함한 30x, 두 번째(Accept-Language 없음)는 `location: /ko`로 리다이렉트.

- [ ] **Step 6: 브라우저에서 수동 확인 (자동화 불가 항목)**

`npm run dev` 실행 후 브라우저로 다음을 확인:
- `/ko`, `/zh`, `/vi`, `/uz`, `/ne`, `/km` 각 경로에서 랜딩 페이지가 깨지지 않고 렌더링되는지
- 헤더의 언어 선택 `<select>`에서 언어를 바꾸면 URL이 해당 locale 프리픽스로 바뀌고, 새로고침해도 선택한 언어가 쿠키로 유지되는지
- 모바일 너비에서 하단 네비게이션 라벨이 정상 표시되는지

- [ ] **Step 7: 알려진 한계 기록 (커밋 없음, PR 설명용 메모)**

다음을 PR 설명에 남긴다:
- `zh`/`vi`/`uz`/`ne`/`km`는 현재 `ko.json`과 동일한 한국어 텍스트를 보여준다 (의도된 fallback, 콘텐츠 번역은 별도 이슈).
- `app/[locale]/calendar`, `map`, `ocr`, `onboarding`의 페이지 콘텐츠(각 `features/*.tsx`)는 이번 이슈 범위 밖이라 번역이 연결되지 않았다 — 랜딩 페이지(`app/[locale]/page.tsx`)와 `AppShell`만 연결됨.

---

## Self-Review 결과

**Spec coverage:**
- `[locale]` 세그먼트 라우팅 → Task 5
- locale 감지·리다이렉트 → Task 4
- 번역 메시지 로드 구조 → Task 2, 3
- 언어 선택 UI + 선택값 유지(쿠키) → Task 7 (next-intl 기본 쿠키 저장 사용)
- `next-intl` 채택 → Task 1
- `proxy.ts` (Next.js 16 컨벤션) → Task 4, 위치는 이슈 문구와 달리 공식 문서 기준 루트로 수정
- 쿠키 기반 저장 → Task 7 (`router.replace(pathname, {locale})`이 next-intl 기본 쿠키 로직을 트리거)
- `messages/ko.json` + 5개 fallback → Task 3
- 언어 선택 UI 6개 언어 노출 → Task 7
- `app/api/health` 세그먼트 밖 유지 → Task 5 (불변으로 명시)
- 검증 체크리스트(lint/typecheck/build/6 locale 렌더링/redirect) → Task 9

**Placeholder scan:** 없음 — 모든 스텝에 실행 가능한 전체 코드/명령 포함.

**Type consistency:** `routing.locales`(Task 2) → `messages/*.json` 파일명(Task 3), `proxy.ts`(Task 4), `layout.tsx`의 `hasLocale`/`generateStaticParams`(Task 5), `LocaleSwitcher`의 `routing.locales.map`(Task 7)에서 동일하게 사용. 메시지 네임스페이스 키(`Home.journey.stages.*`, `Home.tasks.items.*` 등)는 Task 3의 JSON 구조와 Task 6의 `t(...)` 호출 경로가 정확히 일치함을 확인함.

**Codex 리뷰 반영 사항 (2026-08-23):** `codex exec`로 별도 검토를 받아 계획을 85~90% 정확하다는 평가와 함께 3가지 수정을 반영함 —
1. `generateMetadata`에 `hasLocale` 검증 누락 → Task 5에 추가 (metadata가 layout보다 먼저 실행되어 잘못된 locale에서 500 위험).
2. `LocaleSwitcher`의 `event.target.value`가 `string`으로만 추론되는 문제 → Task 7에 `hasLocale` 가드 추가.
3. 랜딩 페이지 내부 링크가 `next/link`라 locale-aware 라우팅 목표와 불일치 → Task 6에서 `@/i18n/navigation`의 `Link`로 교체.
4. (사소) Task 9의 `kill %1` → `$!` 기반으로 변경 (비대화형 셸 안정성).
그 외 next-intl API 사용법, `proxy.ts` 위치, 메시지 키 일치, 파일 이동/quoting은 Codex도 정확하다고 확인함.
