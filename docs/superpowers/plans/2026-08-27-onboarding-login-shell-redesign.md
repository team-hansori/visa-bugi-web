# 온보딩 진입 화면 개편 + 앱 셸 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 온보딩 진입 화면(`OnboardingWelcome`)을 로그인 화면 레퍼런스에 맞춰 개편하고, 온보딩 중에는 앱의 하단 5탭·데스크톱 메뉴가 보이지 않는 최소 셸을 쓰도록 라우트 구조를 분리한다.

**Architecture:** Next.js route group(`(app)`)으로 "전체 앱 셸(`AppShell`)을 쓰는 라우트"와 "최소 셸(`MinimalShell`)을 쓰는 온보딩 라우트"를 파일 트리 레벨에서 분리한다. `OnboardingWelcome`에는 Google OAuth 연동 전 자리표시 핸들러와 약관 동의 링크(`t.rich()`)를 추가한다. 스키마·레이아웃 반응형 동작은 이미 요구사항을 충족하고 있어 변경하지 않는다.

**Tech Stack:** Next.js 16.3.1 App Router, next-intl 4.13.7, React 19.2.8, Tailwind 4, Vitest 4 + Testing Library

**Spec:** `docs/superpowers/specs/2026-08-27-onboarding-login-shell-redesign-design.md`

## Global Constraints

- 레퍼런스 이미지 경로(`/brand/onboarding/visa-bugi-login-hero-v1.png`)는 이미 존재 — 변경하지 않는다.
- 온보딩 스텝 화면의 반응형 레이아웃(`lg` 미만 1단, `lg` 이상 2단)은 이미 요구사항을 충족 — 변경하지 않는다.
- `public.profiles.locale` 컬럼과 `actions.ts`의 저장 로직은 이미 존재 — PR #22(스키마)는 이 플랜에서 건드리지 않는다.
- Google 로그인은 아직 실제 연동하지 않는다 — 클릭 시 동작은 "준비 중" 안내를 유지한다 (AGENTS.md: 버튼은 실제 동작을 연결하거나 준비 중 상태로 명확히 표시).
- `/terms`, `/privacy` 페이지의 실제 정책 원문 작성은 범위 밖이다.
- `messages/{vi,uz,ne,km,zh}.json`에 새로 추가하는 번역은 AI 초벌 번역이며 네이티브 검수 전이라는 기존 합의를 유지한다.
- 각 태스크 완료 후 최소 `npm run typecheck`로 회귀를 조기에 확인한다. 전체 `lint`/`build`/`test`는 마지막 태스크에서 종합 검증한다.

---

## Task 1: `A11y.backToHome` 번역 키 추가

**Files:**
- Modify: `messages/ko.json` (`A11y` 네임스페이스)
- Modify: `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`, `messages/zh.json` (`A11y` 네임스페이스)

**Interfaces:**
- Produces: `A11y.backToHome` 키 (문자열) — Task 2의 `MinimalShell`이 `useTranslations("A11y")`로 읽는다.

현재 `A11y` 네임스페이스는 6개 언어 파일 모두 동일한 한국어 값을 쓰는 플레이스홀더 네임스페이스다(`skipToContent`, `backToMy`, `openSettings`). 이번 키도 동일한 관례를 따라 6개 파일에 같은 한국어 문자열을 넣는다.

- [ ] **Step 1: `messages/ko.json`의 `A11y`에 키 추가**

`"openSettings": "설정 열기"` 다음 줄에 콤마를 추가하고 새 키를 넣는다:

```json
  "A11y": {
    "skipToContent": "본문으로 바로가기",
    "backToMy": "설정으로 돌아가기",
    "openSettings": "설정 열기",
    "backToHome": "홈으로 돌아가기"
  },
```

- [ ] **Step 2: 나머지 5개 파일에도 동일하게 추가**

`messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`, `messages/zh.json` 각각의 `A11y` 블록에 동일한 값을 추가한다:

```json
    "backToHome": "홈으로 돌아가기"
```

- [ ] **Step 3: JSON 유효성 확인**

Run:
```bash
for f in messages/ko.json messages/vi.json messages/uz.json messages/ne.json messages/km.json messages/zh.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f', 'utf-8')); console.log('$f OK')"
done
```
Expected: 6개 파일 모두 `OK` 출력.

- [ ] **Step 4: Commit**

```bash
git add messages/ko.json messages/vi.json messages/uz.json messages/ne.json messages/km.json messages/zh.json
git commit -m "feat: A11y.backToHome 번역 키 추가"
```

---

## Task 2: `MinimalShell` 컴포넌트 추가

**Files:**
- Create: `components/minimal-shell.tsx`
- Test: `components/minimal-shell.test.tsx`

**Interfaces:**
- Consumes: `A11y.backToHome`(Task 1), `Icon`(`@/components/ui/icon`, `name: "chevron-left"`), `LocaleSwitcher`(`@/components/locale-switcher`), `Link`(`@/i18n/navigation`)
- Produces: `export function MinimalShell({ children }: { children: ReactNode }): JSX.Element` — Task 3의 `app/[locale]/onboarding/layout.tsx`가 이 컴포넌트를 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`components/minimal-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTestTranslator } from "@/lib/test-utils/next-intl-mock";
import { MinimalShell } from "./minimal-shell";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => createTestTranslator(namespace),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/locale-switcher", () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}));

describe("MinimalShell", () => {
  it("홈으로 돌아가는 링크를 보여준다", () => {
    render(
      <MinimalShell>
        <p>내용</p>
      </MinimalShell>,
    );
    expect(screen.getByRole("link", { name: "홈으로 돌아가기" })).toHaveAttribute("href", "/");
  });

  it("LocaleSwitcher를 보여준다", () => {
    render(
      <MinimalShell>
        <p>내용</p>
      </MinimalShell>,
    );
    expect(screen.getByTestId("locale-switcher")).toBeInTheDocument();
  });

  it("children을 렌더링한다", () => {
    render(
      <MinimalShell>
        <p>테스트 콘텐츠</p>
      </MinimalShell>,
    );
    expect(screen.getByText("테스트 콘텐츠")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run components/minimal-shell.test.tsx`
Expected: FAIL — `Cannot find module './minimal-shell'` (아직 구현 파일이 없음)

- [ ] **Step 3: 최소 구현 작성**

`components/minimal-shell.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

export function MinimalShell({ children }: { children: ReactNode }) {
  const t = useTranslations("A11y");

  return (
    <div className="min-h-dvh bg-[#f7f8f4] text-[#20332c]">
      <header className="sticky top-0 z-40 border-b border-[#e2e7e3] bg-[#f7f8f4]/94 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label={t("backToHome")}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-[#3a4a44] hover:bg-[#f2f5f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          >
            <Icon name="chevron-left" className="size-5" />
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="app-main mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run components/minimal-shell.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/minimal-shell.tsx components/minimal-shell.test.tsx
git commit -m "feat: 온보딩용 MinimalShell 컴포넌트 추가"
```

---

## Task 3: Route Group으로 앱 셸 분리

**Files:**
- Modify: `app/[locale]/layout.tsx` (AppShell 제거, html/body/NextIntlClientProvider만 유지)
- Create: `app/[locale]/(app)/layout.tsx`
- Create: `app/[locale]/onboarding/layout.tsx`
- Move (내용 변경 없음): `app/[locale]/page.tsx` → `app/[locale]/(app)/page.tsx`
- Move: `app/[locale]/not-found.tsx` → `app/[locale]/(app)/not-found.tsx`
- Move: `app/[locale]/[...rest]/` → `app/[locale]/(app)/[...rest]/`
- Move: `app/[locale]/calendar/` → `app/[locale]/(app)/calendar/`
- Move: `app/[locale]/contact/` → `app/[locale]/(app)/contact/`
- Move: `app/[locale]/map/` → `app/[locale]/(app)/map/`
- Move: `app/[locale]/my/` → `app/[locale]/(app)/my/`
- Move: `app/[locale]/ocr/` → `app/[locale]/(app)/ocr/`
- Move: `app/[locale]/privacy/` → `app/[locale]/(app)/privacy/`
- Move: `app/[locale]/terms/` → `app/[locale]/(app)/terms/`

**Interfaces:**
- Consumes: `AppShell`(`@/components/app-shell`, 변경 없음), `MinimalShell`(Task 2)
- Produces: URL 경로는 이동 전과 완전히 동일 (route group은 URL에 나타나지 않음). `onboarding` 라우트만 `MinimalShell`을 쓰고, 나머지는 모두 `AppShell`을 쓴다.

이동하는 파일들은 전부 `@/` 절대 경로로 import하고 있어(상대 경로 import 없음, 사전 확인 완료) 내용 변경 없이 위치만 옮기면 된다.

- [ ] **Step 1: `(app)` 디렉터리를 만들고 라우트 폴더를 이동**

```bash
mkdir -p "app/[locale]/(app)"
git mv "app/[locale]/page.tsx" "app/[locale]/(app)/page.tsx"
git mv "app/[locale]/not-found.tsx" "app/[locale]/(app)/not-found.tsx"
git mv "app/[locale]/[...rest]" "app/[locale]/(app)/[...rest]"
git mv "app/[locale]/calendar" "app/[locale]/(app)/calendar"
git mv "app/[locale]/contact" "app/[locale]/(app)/contact"
git mv "app/[locale]/map" "app/[locale]/(app)/map"
git mv "app/[locale]/my" "app/[locale]/(app)/my"
git mv "app/[locale]/ocr" "app/[locale]/(app)/ocr"
git mv "app/[locale]/privacy" "app/[locale]/(app)/privacy"
git mv "app/[locale]/terms" "app/[locale]/(app)/terms"
```

- [ ] **Step 2: `(app)/layout.tsx` 작성**

`app/[locale]/(app)/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 3: `onboarding/layout.tsx` 작성**

`app/[locale]/onboarding/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { MinimalShell } from "@/components/minimal-shell";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <MinimalShell>{children}</MinimalShell>;
}
```

- [ ] **Step 4: 루트 `layout.tsx`에서 `AppShell` 제거**

`app/[locale]/layout.tsx`의 import와 반환 JSX를 수정한다. `import { AppShell } from "@/components/app-shell";` 줄을 삭제하고, `<AppShell>{children}</AppShell>`를 `{children}`으로 바꾼다. 나머지(`generateStaticParams`, `generateMetadata`, `viewport`, locale 검증)는 그대로 둔다:

```tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    icons: {
      icon: [
        { url: "/brand/app-icon/bugi-app-icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/brand/app-icon/bugi-app-icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/brand/app-icon/apple-touch-icon.png" }],
    },
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
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: 타입 체크로 이동 누락 확인**

Run: `npm run typecheck`
Expected: 에러 없음. 에러가 나면 `git status`로 이동이 빠진 파일이 있는지 확인.

- [ ] **Step 6: 빌드로 라우트 목록 확인**

Run: `npm run build`
Expected: 빌드 성공. 출력된 라우트 목록에 이동 전과 동일한 경로가 모두 나타나야 한다 — `/[locale]`, `/[locale]/calendar`, `/[locale]/contact`, `/[locale]/map`, `/[locale]/my`, `/[locale]/ocr`, `/[locale]/onboarding`, `/[locale]/privacy`, `/[locale]/terms`. `(app)`은 URL에 나타나지 않는다.

- [ ] **Step 7: 전체 테스트로 회귀 확인**

Run: `npm run test`
Expected: 기존 테스트 스위트 전부 PASS (이동한 파일들은 테스트가 없었으므로 이 스텝은 다른 코드에 영향이 없었는지 확인하는 용도).

- [ ] **Step 8: Commit**

```bash
git add "app/[locale]"
git commit -m "feat: route group으로 앱 셸(AppShell)과 온보딩 최소 셸(MinimalShell) 분리"
```

---

## Task 4: Google 로그인 핸들러를 연동 대비 함수로 분리

**Files:**
- Modify: `features/onboarding/onboarding-welcome.tsx`

**Interfaces:**
- Consumes: 없음 (기존 컴포넌트 내부 리팩터링)
- Produces: 없음 (외부에 노출되는 props/동작 변화 없음)

기존 `features/onboarding/onboarding-welcome.test.tsx`가 이미 "Google로 시작하기는 클릭해도 콜백을 호출하지 않고 준비 중 안내만 보여준다"를 검증하고 있으므로, 이 태스크는 그 테스트를 그대로 회귀 검증으로 사용한다(새 테스트 불필요 — 동작이 바뀌지 않기 때문).

- [ ] **Step 1: 기존 테스트가 통과 상태인지 확인 (리팩터 전 베이스라인)**

Run: `npx vitest run features/onboarding/onboarding-welcome.test.tsx`
Expected: PASS (4 tests) — 지금부터 이 상태를 유지하는 것이 목표.

- [ ] **Step 2: 클릭 핸들러를 `handleGoogleLogin` 함수로 분리**

`features/onboarding/onboarding-welcome.tsx`에서 아래 부분:

```tsx
        <button
          type="button"
          onClick={() => setShowGoogleNotice(true)}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#dfe5e1] bg-white px-5 text-sm font-extrabold text-[#33453e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        >
          {t("googleStart")}
        </button>
```

를 아래로 교체한다 (컴포넌트 함수 본문 상단, `const [showGoogleNotice, setShowGoogleNotice] = useState(false);` 다음 줄에 `handleGoogleLogin` 함수를 추가하고, 버튼의 `onClick`을 그 함수로 바꾼다):

```tsx
  function handleGoogleLogin() {
    // 실제 Google OAuth 연동 시 이 자리를 아래로 교체한다.
    // (Supabase에 Google 프로바이더 설정 + 아래 호출로 대체 — 익명 세션과
    //  동일하게 Supabase Auth를 쓰므로 별도 인증 라이브러리를 추가하지 않는다.)
    //
    //   await createClient().auth.signInWithOAuth({
    //     provider: "google",
    //     options: { redirectTo: `${window.location.origin}/auth/callback` },
    //   });
    setShowGoogleNotice(true);
  }
```

```tsx
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#dfe5e1] bg-white px-5 text-sm font-extrabold text-[#33453e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        >
          {t("googleStart")}
        </button>
```

- [ ] **Step 3: 테스트로 회귀 없음 확인**

Run: `npx vitest run features/onboarding/onboarding-welcome.test.tsx`
Expected: PASS (4 tests, Step 1과 동일한 결과)

- [ ] **Step 4: Commit**

```bash
git add features/onboarding/onboarding-welcome.tsx
git commit -m "refactor: Google 로그인 클릭 핸들러를 handleGoogleLogin으로 분리 (연동 지점 명시)"
```

---

## Task 5: 약관 동의 링크 추가 (`t.rich()` 테스트 목 확장 포함)

**Files:**
- Modify: `lib/test-utils/next-intl-mock.ts` (`t.rich()` 지원 추가)
- Modify: `messages/ko.json`, `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`, `messages/zh.json` (`Onboarding.consentNotice` 키 추가)
- Modify: `features/onboarding/onboarding-welcome.tsx`
- Modify: `features/onboarding/onboarding-welcome.test.tsx`

**Interfaces:**
- Consumes: `Onboarding.consentNotice`, `Link`(`@/i18n/navigation`)
- Produces: `createTestTranslator(namespace)`가 반환하는 함수에 `.rich(key, values)` 메서드 추가 — 이후 다른 컴포넌트 테스트도 이 메서드를 재사용할 수 있다.

next-intl의 실제 `useTranslations()` 반환값은 호출 가능한 함수이면서 `.rich()` 메서드도 갖는다. 현재 테스트 목(`createTestTranslator`)은 일반 `t(key, values)`만 흉내 내므로, `t.rich()`를 쓰는 컴포넌트를 테스트하려면 먼저 목을 확장해야 한다.

- [ ] **Step 1: 실패하는 테스트 작성 — 약관 링크**

`features/onboarding/onboarding-welcome.test.tsx` 상단에 `@/i18n/navigation` 목을 추가한다 (다른 `vi.mock` 호출들과 같은 위치):

```tsx
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
```

파일 맨 아래 `describe` 블록 안에 새 테스트를 추가한다:

```tsx
  it("이용약관과 개인정보처리방침 링크를 보여준다", () => {
    render(<OnboardingWelcome onContinueWithoutLogin={vi.fn()} />);

    expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run features/onboarding/onboarding-welcome.test.tsx`
Expected: FAIL — `t.rich is not a function` (아직 컴포넌트와 목 둘 다 구현 전)

- [ ] **Step 3: `createTestTranslator`에 `.rich()` 추가**

`lib/test-utils/next-intl-mock.ts` 전체를 아래로 교체한다:

```ts
import { createElement, Fragment, type ReactNode } from "react";
import koMessages from "@/messages/ko.json";

type MessageTree = { [key: string]: string | MessageTree };

const namespaces = koMessages as Record<string, MessageTree>;

function resolve(namespace: string, key: string): unknown {
  const root = namespaces[namespace];
  return key
    .split(".")
    .reduce<unknown>(
      (acc, part) => (acc && typeof acc === "object" ? (acc as MessageTree)[part] : undefined),
      root,
    );
}

/**
 * `vi.mock("next-intl", ...)` 안에서 쓰는 t() 대역. ko.json을 실제로 읽어
 * 응답하므로, 메시지 키를 추가할 때마다 목을 손으로 따라 갱신할 필요가 없다.
 */
export function createTestTranslator(namespace: string) {
  function t(key: string, values?: Record<string, unknown>) {
    const raw = resolve(namespace, key);
    if (typeof raw !== "string") return key;
    if (!values) return raw;
    return raw.replace(/\{(\w+)\}/g, (_match, name: string) => String(values[name] ?? ""));
  }

  t.rich = (
    key: string,
    values: Record<string, (chunks: ReactNode) => ReactNode>,
  ): ReactNode => {
    const raw = resolve(namespace, key);
    if (typeof raw !== "string") return key;

    const parts: ReactNode[] = [];
    const tagPattern = /<(\w+)>(.*?)<\/\1>/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let partIndex = 0;

    while ((match = tagPattern.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        parts.push(raw.slice(lastIndex, match.index));
      }
      const [, tagName, inner] = match;
      const render = values[tagName];
      parts.push(createElement(Fragment, { key: partIndex++ }, render ? render(inner) : inner));
      lastIndex = tagPattern.lastIndex;
    }
    if (lastIndex < raw.length) {
      parts.push(raw.slice(lastIndex));
    }
    return parts;
  };

  return t;
}
```

- [ ] **Step 4: 메시지 파일에 `consentNotice` 키 추가**

`messages/ko.json`의 `Onboarding` 네임스페이스에 (`saveError` 키 다음 줄에) 추가:

```json
    "consentNotice": "계속 진행하면 <terms>이용약관</terms> 및 <privacy>개인정보처리방침</privacy>에 동의하는 것으로 간주합니다.",
```

나머지 5개 파일의 `Onboarding` 네임스페이스에도 같은 위치에 추가:

```json
    "consentNotice": "Nếu tiếp tục, bạn đồng ý với <terms>Điều khoản sử dụng</terms> và <privacy>Chính sách bảo mật</privacy>.",
```
(`messages/vi.json`)

```json
    "consentNotice": "Davom etsangiz, <terms>Foydalanish shartlari</terms> va <privacy>Maxfiylik siyosati</privacy>ga rozilik bildirgan hisoblanasiz.",
```
(`messages/uz.json`)

```json
    "consentNotice": "जारी राख्नुभयो भने, तपाईं <terms>सेवा सर्तहरू</terms> र <privacy>गोपनीयता नीति</privacy>मा सहमत हुनुहुन्छ।",
```
(`messages/ne.json`)

```json
    "consentNotice": "ប្រសិនបើបន្ត អ្នកយល់ព្រមតាម<terms>លក្ខខណ្ឌប្រើប្រាស់</terms> និង<privacy>គោលការណ៍ភាពឯកជន</privacy>។",
```
(`messages/km.json`)

```json
    "consentNotice": "继续操作即表示您同意<terms>服务条款</terms>及<privacy>隐私政策</privacy>。",
```
(`messages/zh.json`)

- [ ] **Step 5: `OnboardingWelcome`에 약관 동의 문구 추가**

`features/onboarding/onboarding-welcome.tsx`의 import에 `Link`를 추가한다:

```tsx
import { Link } from "@/i18n/navigation";
```

`onContinueWithoutLogin` 버튼(`{t("continueWithoutLogin")}`) 바로 다음, `</div>` 앞에 추가한다:

```tsx
        <p className="mt-1 max-w-xs text-center text-xs leading-5 text-[#8a938e]">
          {t.rich("consentNotice", {
            terms: (chunks) => (
              <Link
                href="/terms"
                className="font-semibold text-[#52615b] underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link
                href="/privacy"
                className="font-semibold text-[#52615b] underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run features/onboarding/onboarding-welcome.test.tsx lib/test-utils`
Expected: PASS (`onboarding-welcome.test.tsx` 5개 테스트 전부 통과)

- [ ] **Step 7: JSON 유효성 재확인**

Run:
```bash
for f in messages/ko.json messages/vi.json messages/uz.json messages/ne.json messages/km.json messages/zh.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f', 'utf-8')); console.log('$f OK')"
done
```
Expected: 6개 파일 모두 `OK`.

- [ ] **Step 8: Commit**

```bash
git add lib/test-utils/next-intl-mock.ts messages/ko.json messages/vi.json messages/uz.json messages/ne.json messages/km.json messages/zh.json features/onboarding/onboarding-welcome.tsx features/onboarding/onboarding-welcome.test.tsx
git commit -m "feat: 온보딩 진입 화면에 약관 동의 링크 추가, t.rich() 테스트 목 지원"
```

---

## Task 6: 전체 검증

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 3: 전체 테스트**

Run: `npm run test`
Expected: 모든 테스트 PASS (Task 1~5에서 추가/수정한 테스트 포함).

- [ ] **Step 4: 빌드**

Run: `npm run build`
Expected: 빌드 성공. 라우트 목록에 `/[locale]/onboarding`이 여전히 존재하고, `(app)` 세그먼트가 URL에 나타나지 않는지 확인.

- [ ] **Step 5: 수동 확인 (선택, 로컬 개발 서버)**

Run: `npm run dev`
- `/ko/onboarding`에 접속해 상단에 뒤로가기 화살표 + 언어 전환기만 있고 하단 5탭 내비게이션이 없는지 확인.
- `/ko`(홈)에 접속해 기존처럼 상단 메뉴 + 하단 5탭이 그대로 있는지 확인.
- 온보딩 진입 화면에서 언어를 바꿔도 화면이 깨지지 않고, "이용약관"/"개인정보처리방침" 링크가 `/terms`, `/privacy`로 이동하는지 확인.

- [ ] **Step 6: 최종 커밋 (변경 사항이 남아있는 경우에만)**

```bash
git status
```
검증 과정에서 수정한 파일이 있다면 커밋한다. 없다면 이 스텝은 건너뛴다.
