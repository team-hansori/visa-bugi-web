# MY 탭·설정·정책 화면 기본 구조 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 하단/데스크톱 내비게이션에 `MY` 탭을 추가하고, `/my`, `/settings`, `/contact`, `/terms`, `/privacy` 화면의 기본 구조(로그인 전 접근 가능, 실제 콘텐츠 없는 항목은 "준비 중")를 만든다.

**Architecture:** 저장소의 기존 패턴(`calendar`/`map`/`ocr`/`onboarding`)을 그대로 따른다 — `app/[locale]/<route>/page.tsx`는 metadata + 컴포넌트 렌더만 하는 얇은 서버 컴포넌트, 실제 UI는 `features/<domain>/<Component>.tsx`, 고정 문구는 `messages/*.json` 6개 로케일 파일에 동일한 값으로 추가한다(현재 6개 로케일 파일은 전부 한국어로 동일 — 실번역은 이번 범위 밖).

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, next-intl (App Router 통합)

**Spec:** `docs/superpowers/specs/2026-08-26-my-settings-policy-design.md`

## Global Constraints

- 실제 로그인/로그아웃, GPS 활성화, 이용약관·개인정보처리방침 원문, 문의 채널 연결은 이번 범위 밖 — 전부 "준비 중" 상태로만 표시한다.
- 가짜 사용자명·프로필을 표시하지 않는다.
- 푸시 알림 관련 UI/설정 행을 추가하지 않는다.
- 모든 신규 고정 문구는 `messages/*.json`을 통해 노출한다 (컴포넌트에 하드코딩 금지).
- `messages/ko.json`, `messages/zh.json`, `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json` 6개 파일은 현재 내용이 완전히 동일하다(전부 한국어). 새 키도 6개 파일에 **동일한 값**으로 추가해 이 상태를 유지한다. 실제 번역은 팀의 후속 작업.
- 이 저장소에는 자동화 테스트 프레임워크가 없다(`package.json`에 test 스크립트 없음, 기존 기능들도 테스트 파일 없음). 각 태스크의 검증은 `npm run typecheck` + 필요 시 dev 서버 수동 확인으로 한다. TDD의 "실패하는 테스트 작성" 단계는 이 저장소에 해당하지 않는다.
- 모든 신규 링크는 `@/i18n/navigation`의 `Link`(locale-aware)를 사용한다. `next/link`를 직접 쓰지 않는다.
- **메시지 파일에 네임스페이스를 이어붙이는 방법:** Task 4~8은 6개 메시지 파일 각각의 최상위 객체 끝에 새 네임스페이스(`My` → `Settings` → `Contact` → `Terms` → `Privacy` 순)를 하나씩 추가한다. 매번 "파일의 마지막 최상위 키의 닫는 `}`"를 `},`로 바꾸고 그 뒤에 새 네임스페이스 블록을 넣은 뒤, 그 블록으로 파일을 닫는다. 예를 들어 Task 4를 마치면 파일 끝이 다음과 같아야 한다(`Home`의 닫는 `}`가 `},`로 바뀌고 `My`가 마지막 키):

  ```json
    "Home": {
      ...
    },
    "My": {
      ...
    }
  }
  ```

  Task 5는 이 상태에서 `My`의 닫는 `}`를 `},`로 바꾸고 `Settings`를 그 뒤·파일 끝에 넣는 식으로 계속한다. 각 Task의 Step 1은 "직전 마지막 키의 닫는 `}`를 `},`로 바꾸고, 그 뒤에 아래 블록을 새 마지막 키로 추가"를 의미한다.
- 색상/타이포 토큰은 기존 화면(특히 `app/[locale]/page.tsx`, `features/map/agency-map-demo.tsx`)에서 이미 쓰인 값을 그대로 재사용한다(임의 색상 추가 금지): 배경 `#f7f8f4`, 본문 텍스트 `#20332c`, 포인트 그린 `#2d6d5d`/`#173f36`/`#1e5a4b`/`#215a4b`, 카드 테두리 `#e0e7e2`, 흐린 텍스트 `#6d7974`/`#76817c`, 비활성 배지 배경 `#eef1ef`/텍스트 `#929b97`, 카드 그림자 `shadow-[0_10px_32px_rgba(52,76,65,0.06)]`, 카드 라운드 `rounded-[24px]`.

---

### Task 1: `mail`, `settings` 아이콘 추가

**Files:**
- Modify: `components/ui/icon.tsx`

**Interfaces:**
- Produces: `IconName` 유니온에 `"mail"`, `"settings"` 추가. 이후 태스크에서 `<Icon name="mail" />`, `<Icon name="settings" />`로 사용.

- [ ] **Step 1: `IconName` 유니온에 두 값 추가**

`components/ui/icon.tsx`의 `IconName` 유니온을 알파벳 순서를 유지하며 아래와 같이 바꾼다 (`home`과 `map-pin` 사이에 `mail`을, `phone`과 `shield` 사이에 `settings`를 삽입):

```ts
export type IconName =
  | "arrow-right"
  | "calendar"
  | "camera"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "clock"
  | "document"
  | "globe"
  | "home"
  | "mail"
  | "map-pin"
  | "navigation"
  | "phone"
  | "settings"
  | "shield"
  | "upload"
  | "user";
```

- [ ] **Step 2: `paths` 객체에 두 아이콘의 SVG path 추가**

`home` 항목과 `"map-pin"` 항목 사이에 다음을 삽입한다:

```tsx
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
```

`phone` 항목과 `shield` 항목 사이에 다음을 삽입한다:

```tsx
  settings: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M3 12h3M18 12h3M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5M7.5 19.8 9 17.2M15 6.8l1.5-2.6" />
    </>
  ),
```

- [ ] **Step 3: 타입 체크로 확인**

Run: `npm run typecheck`
Expected: 에러 없이 통과 (아이콘 추가만으로는 다른 파일이 깨지지 않음)

- [ ] **Step 4: 커밋**

```bash
git add components/ui/icon.tsx
git commit -m "feat: mail·settings 아이콘 추가"
```

---

### Task 2: `LocaleSwitcher` 공용 컴포넌트로 분리

**Files:**
- Create: `components/locale-switcher.tsx`
- Modify: `components/app-shell.tsx`

**Interfaces:**
- Produces: `LocaleSwitcher({ variant?: "compact" | "full" })` — default export 아님, named export. `variant` 생략 시 `"compact"`.
- Consumes (Task 5에서): `import { LocaleSwitcher } from "@/components/locale-switcher";`

- [ ] **Step 1: `components/locale-switcher.tsx` 생성**

```tsx
"use client";

import { hasLocale, useLocale, useTranslations } from "next-intl";
import type { ChangeEvent } from "react";
import { useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing } from "@/i18n/routing";

const containerClassByVariant = {
  compact: "flex min-h-10 items-center gap-1.5 rounded-full border border-[#dfe5e1] bg-white px-3 text-xs font-bold text-[#52615b]",
  full: "flex min-h-12 w-full items-center gap-2 rounded-xl border border-[#d4ddd8] bg-white px-4 text-sm font-bold text-[#40534b]",
} as const;

const iconSizeByVariant = {
  compact: "size-4",
  full: "size-5",
} as const;

export function LocaleSwitcher({ variant = "compact" }: { variant?: "compact" | "full" }) {
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
    <label className={containerClassByVariant[variant]}>
      <Icon name="globe" className={iconSizeByVariant[variant]} aria-hidden="true" />
      <select
        aria-label={t("label")}
        aria-busy={isPending}
        value={locale}
        onChange={onChange}
        className={`flex-1 bg-transparent focus-visible:outline-none ${isPending ? "opacity-60" : ""}`}
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
```

- [ ] **Step 2: `app-shell.tsx`에서 기존 `LocaleSwitcher` 정의 제거하고 새 컴포넌트 import**

`components/app-shell.tsx` 상단 import 블록을 다음으로 교체한다:

```tsx
"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link, usePathname } from "@/i18n/navigation";
```

파일 내부에 있던 아래 함수 전체(기존 `LocaleSwitcher` 정의, `onChange` 포함)를 삭제한다:

```tsx
function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  ...
}
```

(이 함수가 사용하던 `hasLocale`, `useLocale`, `ChangeEvent`, `useTransition`, `useRouter`, `localeNames`, `routing`는 더 이상 `app-shell.tsx`에서 쓰이지 않으므로 import에서 이미 제거된 상태다.)

- [ ] **Step 3: 타입 체크·린트로 확인**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없이 통과 (미사용 import가 남아있으면 lint가 실패함 — 실패 시 위 import 목록과 실제 파일을 다시 대조)

- [ ] **Step 4: 커밋**

```bash
git add components/locale-switcher.tsx components/app-shell.tsx
git commit -m "refactor: LocaleSwitcher를 공용 컴포넌트로 분리"
```

---

### Task 3: 내비게이션에 `MY` 탭 추가

**Files:**
- Modify: `components/app-shell.tsx`
- Modify: `messages/ko.json`, `messages/zh.json`, `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`

**Interfaces:**
- Consumes: Task 1의 `IconName`에 있는 `"user"`(기존 아이콘, 신규 아님 — MY 탭 아이콘으로 재사용)
- Produces: `navItems`에 5번째 항목 `{ href: "/my", icon: "user", key: "my" }`. `Nav.my` 메시지 키.

- [ ] **Step 1: 6개 메시지 파일의 `Nav` 객체에 `my` 키 추가**

6개 파일(`messages/ko.json`, `messages/zh.json`, `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`) 모두 동일하게, `Nav` 객체의 `"ocr": "서류",` 다음 줄에 아래를 추가한다:

```json
    "my": "MY",
```

(즉 6개 파일 모두 `Nav` 블록이 다음과 같아진다)

```json
  "Nav": {
    "home": "홈",
    "calendar": "일정",
    "map": "기관",
    "ocr": "서류",
    "my": "MY",
    "mainMenuAriaLabel": "주요 메뉴",
    "mobileMenuAriaLabel": "모바일 주요 메뉴"
  },
```

- [ ] **Step 2: `app-shell.tsx`의 `NavItem` 타입과 `navItems`에 `my` 추가**

```ts
type NavItem = {
  href: string;
  icon: IconName;
  key: "home" | "calendar" | "map" | "ocr" | "my";
};

const navItems: NavItem[] = [
  { href: "/", icon: "home", key: "home" },
  { href: "/calendar", icon: "calendar", key: "calendar" },
  { href: "/map", icon: "map-pin", key: "map" },
  { href: "/ocr", icon: "document", key: "ocr" },
  { href: "/my", icon: "user", key: "my" },
];
```

- [ ] **Step 3: `MobileNavigation`의 그리드를 5열로 변경**

`MobileNavigation` 함수 안의

```tsx
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
```

를

```tsx
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
```

로 바꾼다. (`DesktopNavigation`은 `navItems`를 그대로 순회하므로 수정 불필요)

- [ ] **Step 4: 타입 체크로 확인**

Run: `npm run typecheck`
Expected: 통과

- [ ] **Step 5: dev 서버로 시각 확인**

Run: `npm run dev` (백그라운드 실행 후) 브라우저에서 `http://localhost:3000/ko`를 열고, 모바일 폭(360px)과 데스크톱 폭 양쪽에서 `MY` 탭이 5번째로 보이는지 확인한다. `/my` 자체는 아직 페이지가 없으므로 클릭하면 404가 뜨는 게 정상(Task 4에서 해결).

- [ ] **Step 6: 커밋**

```bash
git add components/app-shell.tsx messages/ko.json messages/zh.json messages/vi.json messages/uz.json messages/ne.json messages/km.json
git commit -m "feat: 내비게이션에 MY 탭 추가"
```

---

### Task 4: `/my` 허브 화면

**Files:**
- Create: `app/[locale]/my/page.tsx`
- Create: `features/my/my-hub.tsx`
- Modify: `messages/ko.json`, `messages/zh.json`, `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`

**Interfaces:**
- Consumes: Task 1의 `mail`/`settings` 아이콘, 기존 `document`/`shield`/`chevron-right` 아이콘. `@/i18n/navigation`의 `Link`.
- Produces: `MyHub` (named export, async server component, `features/my/my-hub.tsx`)

- [ ] **Step 1: 6개 메시지 파일에 `My` 네임스페이스 추가**

6개 파일 모두 동일하게, `Home` 객체가 끝나는 지점(파일의 마지막 최상위 키) 바로 뒤, 최종 닫는 `}` 앞에 아래 키를 추가한다. `"Home": { ... }` 뒤에 콤마를 붙이고 이어서 추가:

```json
  "My": {
    "eyebrow": "MY",
    "pageTitle": "마이",
    "linksAriaLabel": "마이 메뉴",
    "loginBanner": {
      "title": "로그인 준비 중입니다",
      "body": "로그인 기능이 추가되면 계정 정보와 진행 상황을 이 화면에서 확인할 수 있어요."
    },
    "links": {
      "settings": { "label": "설정", "description": "언어와 위치 기반 기능 상태를 확인해요" },
      "contact": { "label": "문의하기", "description": "궁금한 점을 남겨주세요" },
      "terms": { "label": "이용약관", "description": "서비스 이용 조건을 확인해요" },
      "privacy": { "label": "개인정보처리방침", "description": "개인정보 처리 방식을 확인해요" }
    }
  }
```

(다음 Task들에서 `Settings`, `Contact`, `Terms`, `Privacy`를 이 뒤에 이어 붙이게 되므로, 지금은 `My`가 파일의 마지막 키다 — `}`로 바로 닫는다.)

- [ ] **Step 2: `features/my/my-hub.tsx` 생성**

```tsx
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";

const links: { href: string; icon: IconName; key: "settings" | "contact" | "terms" | "privacy" }[] = [
  { href: "/settings", icon: "settings", key: "settings" },
  { href: "/contact", icon: "mail", key: "contact" },
  { href: "/terms", icon: "document", key: "terms" },
  { href: "/privacy", icon: "shield", key: "privacy" },
];

export async function MyHub() {
  const t = await getTranslations("My");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section aria-label={t("loginBanner.title")} className="rounded-[24px] border border-[#dce8e2] bg-[#edf6f2] p-5 sm:p-6">
        <p className="font-extrabold text-[#1d5748]">{t("loginBanner.title")}</p>
        <p className="mt-1 text-sm leading-6 text-[#5d7068]">{t("loginBanner.body")}</p>
      </section>

      <nav aria-label={t("linksAriaLabel")} className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-4 rounded-[20px] border border-[#e0e7e2] bg-white p-4 shadow-[0_10px_32px_rgba(52,76,65,0.06)] transition-colors hover:border-[#9bb9ac] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e8f3ee] text-[#215a4b]">
              <Icon name={link.icon} className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-extrabold text-[#2a3c35]">{t(`links.${link.key}.label`)}</span>
              <span className="mt-0.5 block truncate text-sm text-[#76817c]">{t(`links.${link.key}.description`)}</span>
            </span>
            <Icon name="chevron-right" className="ml-auto size-4 shrink-0 text-[#9aa6a0]" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: `app/[locale]/my/page.tsx` 생성**

```tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { MyHub } from "@/features/my/my-hub";

export const metadata: Metadata = { title: "마이" };

export default async function MyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MyHub />;
}
```

- [ ] **Step 4: 타입 체크로 확인**

Run: `npm run typecheck`
Expected: 통과

- [ ] **Step 5: dev 서버로 확인**

`http://localhost:3000/ko/my`에 접속해 로그인 준비 중 배너와 4개 카드(설정/문의하기/이용약관/개인정보처리방침)가 보이는지, 하단 내비게이션의 `MY` 탭을 눌러도 이 화면으로 이동하는지 확인한다. 카드 클릭 시 아직 대상 페이지가 없으므로 404가 뜨는 게 정상(Task 5~8에서 해결).

- [ ] **Step 6: 커밋**

```bash
git add app/\[locale\]/my/page.tsx features/my/my-hub.tsx messages/ko.json messages/zh.json messages/vi.json messages/uz.json messages/ne.json messages/km.json
git commit -m "feat: MY 허브 화면 추가"
```

---

### Task 5: `/settings` 화면

**Files:**
- Create: `app/[locale]/settings/page.tsx`
- Create: `features/settings/settings-page.tsx`
- Modify: `messages/ko.json`, `messages/zh.json`, `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`

**Interfaces:**
- Consumes: Task 2의 `LocaleSwitcher` (`variant="full"`)
- Produces: `SettingsView` (named export, client component, `features/settings/settings-page.tsx`)

- [ ] **Step 1: 6개 메시지 파일에 `Settings` 네임스페이스 추가**

Task 4에서 추가한 `"My": { ... }` 블록 뒤에 콤마를 붙이고 이어서 추가한다 (6개 파일 동일):

```json
  "Settings": {
    "eyebrow": "설정",
    "pageTitle": "설정",
    "language": {
      "eyebrow": "언어",
      "heading": "화면 언어",
      "description": "선택한 언어로 화면 문구가 바뀝니다."
    },
    "location": {
      "eyebrow": "위치 기반 기능",
      "heading": "위치 사용",
      "toggleLabel": "위치 기반 기관 추천",
      "statusPreparing": "준비 중",
      "description": "위치 기반 기능은 아직 준비 중입니다. 이 화면의 표시만으로는 브라우저나 기기에 이미 허용한 위치 권한이 해제되지 않아요. 위치 권한을 바꾸려면 브라우저 또는 기기 설정에서 직접 변경해 주세요.",
      "policyLinkLabel": "위치정보 이용약관",
      "policyLinkStatus": "준비 중"
    }
  }
```

- [ ] **Step 2: `features/settings/settings-page.tsx` 생성**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function SettingsView() {
  const t = useTranslations("Settings");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("language.eyebrow")}</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">{t("language.heading")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#6d7974]">{t("language.description")}</p>
        <div className="mt-4">
          <LocaleSwitcher variant="full" />
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("location.eyebrow")}</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">{t("location.heading")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#6d7974]">{t("location.description")}</p>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-[#f5f7f4] p-4">
          <span className="font-extrabold text-[#2a3c35]">{t("location.toggleLabel")}</span>
          <span aria-disabled="true" className="inline-flex min-h-8 cursor-not-allowed items-center rounded-full bg-[#eef1ef] px-3 text-xs font-extrabold text-[#929b97]">
            {t("location.statusPreparing")}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-[#e5ebe7] px-4 py-3">
          <span className="text-sm font-bold text-[#40534b]">{t("location.policyLinkLabel")}</span>
          <span aria-disabled="true" className="inline-flex min-h-8 cursor-not-allowed items-center rounded-full bg-[#eef1ef] px-3 text-xs font-extrabold text-[#929b97]">
            {t("location.policyLinkStatus")}
          </span>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: `app/[locale]/settings/page.tsx` 생성**

```tsx
import type { Metadata } from "next";
import { SettingsView } from "@/features/settings/settings-page";

export const metadata: Metadata = { title: "설정" };

export default function SettingsPage() {
  return <SettingsView />;
}
```

- [ ] **Step 4: 타입 체크로 확인**

Run: `npm run typecheck`
Expected: 통과

- [ ] **Step 5: dev 서버로 확인**

`http://localhost:3000/ko/settings`에서 언어 섹션의 드롭다운으로 언어를 바꿔보고(현재 6개 로케일이 모두 한국어 텍스트라 문구는 그대로지만 URL의 locale 세그먼트가 바뀌는지 확인), 위치 섹션의 두 항목이 "준비 중"으로 비활성 표시되는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add app/\[locale\]/settings/page.tsx features/settings/settings-page.tsx messages/ko.json messages/zh.json messages/vi.json messages/uz.json messages/ne.json messages/km.json
git commit -m "feat: 설정 화면 추가"
```

---

### Task 6: `/contact` 화면

**Files:**
- Create: `app/[locale]/contact/page.tsx`
- Create: `features/contact/contact-page.tsx`
- Modify: `messages/ko.json`, `messages/zh.json`, `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`

**Interfaces:**
- Consumes: Task 1의 `mail` 아이콘
- Produces: `ContactView` (named export, async server component, `features/contact/contact-page.tsx`)

- [ ] **Step 1: 6개 메시지 파일에 `Contact` 네임스페이스 추가**

Task 5에서 추가한 `"Settings": { ... }` 블록 뒤에 콤마를 붙이고 이어서 추가 (6개 파일 동일):

```json
  "Contact": {
    "eyebrow": "문의",
    "pageTitle": "문의하기",
    "heading": "문의 채널을 준비하고 있어요",
    "description": "확정된 문의 이메일이나 문의 폼이 아직 없습니다. 채널이 열리면 이 화면에서 바로 연결할 수 있도록 안내할게요.",
    "buttonLabel": "문의 준비 중"
  }
```

- [ ] **Step 2: `features/contact/contact-page.tsx` 생성**

```tsx
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";

export async function ContactView() {
  const t = await getTranslations("Contact");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#e8f3ee] text-[#215a4b]">
          <Icon name="mail" className="size-5" />
        </span>
        <h2 className="mt-4 text-xl font-black tracking-[-0.035em]">{t("heading")}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#6d7974]">{t("description")}</p>
        <span aria-disabled="true" className="mt-5 inline-flex min-h-11 cursor-not-allowed items-center gap-1.5 rounded-xl bg-[#eef1ef] px-4 text-sm font-extrabold text-[#929b97]">
          <Icon name="mail" className="size-4" />
          {t("buttonLabel")}
        </span>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: `app/[locale]/contact/page.tsx` 생성**

```tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ContactView } from "@/features/contact/contact-page";

export const metadata: Metadata = { title: "문의하기" };

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ContactView />;
}
```

- [ ] **Step 4: 타입 체크로 확인**

Run: `npm run typecheck`
Expected: 통과

- [ ] **Step 5: dev 서버로 확인**

`http://localhost:3000/ko/contact`에서 "문의 준비 중" 비활성 버튼이 보이는지 확인. MY 허브의 "문의하기" 카드를 눌러도 이 화면으로 이동하는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add app/\[locale\]/contact/page.tsx features/contact/contact-page.tsx messages/ko.json messages/zh.json messages/vi.json messages/uz.json messages/ne.json messages/km.json
git commit -m "feat: 문의하기 화면 추가"
```

---

### Task 7: `/terms` 화면

**Files:**
- Create: `app/[locale]/terms/page.tsx`
- Create: `features/legal/terms-page.tsx`
- Modify: `messages/ko.json`, `messages/zh.json`, `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`

**Interfaces:**
- Consumes: 기존 `document` 아이콘
- Produces: `TermsView` (named export, async server component, `features/legal/terms-page.tsx`)

- [ ] **Step 1: 6개 메시지 파일에 `Terms` 네임스페이스 추가**

Task 6에서 추가한 `"Contact": { ... }` 블록 뒤에 콤마를 붙이고 이어서 추가 (6개 파일 동일):

```json
  "Terms": {
    "eyebrow": "정책",
    "pageTitle": "이용약관",
    "heading": "이용약관을 준비하고 있어요",
    "description": "팀에서 확정한 이용약관 원문을 게시할 예정입니다. 아직 임의로 작성한 문구를 표시하지 않습니다.",
    "badge": "준비 중"
  }
```

- [ ] **Step 2: `features/legal/terms-page.tsx` 생성**

```tsx
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";

export async function TermsView() {
  const t = await getTranslations("Terms");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#fff1d4] text-[#8a5910]">
            <Icon name="document" className="size-5" />
          </span>
          <span className="rounded-full bg-[#fff1d4] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#8a5910]">{t("badge")}</span>
        </div>
        <h2 className="mt-4 text-xl font-black tracking-[-0.035em]">{t("heading")}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#6d7974]">{t("description")}</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: `app/[locale]/terms/page.tsx` 생성**

```tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { TermsView } from "@/features/legal/terms-page";

export const metadata: Metadata = { title: "이용약관" };

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsView />;
}
```

- [ ] **Step 4: 타입 체크로 확인**

Run: `npm run typecheck`
Expected: 통과

- [ ] **Step 5: dev 서버로 확인**

`http://localhost:3000/ko/terms`에서 "준비 중" 배지와 안내 문구가 보이는지 확인. MY 허브의 "이용약관" 카드로도 이동 확인.

- [ ] **Step 6: 커밋**

```bash
git add app/\[locale\]/terms/page.tsx features/legal/terms-page.tsx messages/ko.json messages/zh.json messages/vi.json messages/uz.json messages/ne.json messages/km.json
git commit -m "feat: 이용약관 화면 추가"
```

---

### Task 8: `/privacy` 화면

**Files:**
- Create: `app/[locale]/privacy/page.tsx`
- Create: `features/legal/privacy-page.tsx`
- Modify: `messages/ko.json`, `messages/zh.json`, `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`

**Interfaces:**
- Consumes: 기존 `shield` 아이콘
- Produces: `PrivacyView` (named export, async server component, `features/legal/privacy-page.tsx`)

- [ ] **Step 1: 6개 메시지 파일에 `Privacy` 네임스페이스 추가 (파일의 마지막 키)**

Task 7에서 추가한 `"Terms": { ... }` 블록 뒤에 콤마를 붙이고 이어서 추가하고, 이번엔 콤마 없이 그대로 파일을 닫는다 (6개 파일 동일):

```json
  "Privacy": {
    "eyebrow": "정책",
    "pageTitle": "개인정보처리방침",
    "heading": "개인정보처리방침을 준비하고 있어요",
    "description": "팀에서 확정한 개인정보처리방침 원문을 게시할 예정입니다. 아직 임의로 작성한 문구를 표시하지 않습니다.",
    "badge": "준비 중",
    "locationNotice": "위치정보 수집·이용에 대한 별도 처리방침은 위치정보 정책이 확정된 뒤 이 화면에 추가됩니다."
  }
```

이 블록이 파일의 마지막 최상위 키이므로, 이 뒤에는 콤마 없이 최종 `}`만 온다.

- [ ] **Step 2: `features/legal/privacy-page.tsx` 생성**

```tsx
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";

export async function PrivacyView() {
  const t = await getTranslations("Privacy");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#fff1d4] text-[#8a5910]">
            <Icon name="shield" className="size-5" />
          </span>
          <span className="rounded-full bg-[#fff1d4] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#8a5910]">{t("badge")}</span>
        </div>
        <h2 className="mt-4 text-xl font-black tracking-[-0.035em]">{t("heading")}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#6d7974]">{t("description")}</p>
        <p className="mt-4 max-w-xl rounded-2xl bg-[#f5f7f4] p-4 text-sm leading-6 text-[#5d6a63]">{t("locationNotice")}</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: `app/[locale]/privacy/page.tsx` 생성**

```tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PrivacyView } from "@/features/legal/privacy-page";

export const metadata: Metadata = { title: "개인정보처리방침" };

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyView />;
}
```

- [ ] **Step 4: 타입 체크로 확인**

Run: `npm run typecheck`
Expected: 통과

- [ ] **Step 5: dev 서버로 확인**

`http://localhost:3000/ko/privacy`에서 "준비 중" 배지, 안내 문구, 위치정보 안내 문단이 보이는지 확인. MY 허브의 "개인정보처리방침" 카드로도 이동 확인.

- [ ] **Step 6: 커밋**

```bash
git add app/\[locale\]/privacy/page.tsx features/legal/privacy-page.tsx messages/ko.json messages/zh.json messages/vi.json messages/uz.json messages/ne.json messages/km.json
git commit -m "feat: 개인정보처리방침 화면 추가"
```

---

### Task 9: 전체 검증

**Files:** (변경 없음 — 검증 전용 태스크)

- [ ] **Step 1: 전체 JSON 유효성 확인**

Run: `for f in ko zh vi uz ne km; do node -e "JSON.parse(require('fs').readFileSync('messages/'+process.argv[1]+'.json','utf8'))" "$f" || echo "INVALID: $f"; done`
Expected: `INVALID` 출력 없음 (6개 파일 모두 유효한 JSON)

- [ ] **Step 2: 6개 로케일 파일이 여전히 서로 동일한지 확인**

Run: `for f in zh vi uz ne km; do diff messages/ko.json messages/$f.json || echo "DIFF: $f"; done`
Expected: `DIFF` 출력 없음 (Global Constraints에 따라 6개 파일은 계속 동일해야 함)

- [ ] **Step 3: lint**

Run: `npm run lint`
Expected: 에러 없이 통과 (미사용 import, 미사용 변수 등 확인)

- [ ] **Step 4: typecheck**

Run: `npm run typecheck`
Expected: 에러 없이 통과

- [ ] **Step 5: build**

Run: `npm run build`
Expected: 빌드 성공 (6개 로케일 × 신규 5개 라우트가 정적으로 생성됨을 출력에서 확인)

- [ ] **Step 6: dev 서버에서 수동 확인 (360px)**

Run: `npm run dev` (백그라운드), 브라우저 창을 360px 폭으로 맞추고 `http://localhost:3000/ko`에서:
- 하단 내비게이션 5개 탭(홈/일정/기관/서류/MY)의 라벨과 터치 영역이 서로 겹치지 않는지 확인
- `MY` 탭 클릭 → `/ko/my`로 이동, 활성 탭 표시(`aria-current="page"`에 의한 스타일) 확인
- MY 화면에서 설정/문의하기/이용약관/개인정보처리방침 4개 카드 모두 클릭 시 해당 화면으로 이동하는지 확인
- 설정 화면에서 위치 관련 두 항목이 "준비 중"으로 비활성 표시되는지, 언어 드롭다운이 동작하는지 확인

- [ ] **Step 7: 데스크톱 폭에서 수동 확인**

브라우저 창을 1280px 이상으로 넓힌 뒤 헤더의 데스크톱 내비게이션에 `MY` 탭이 보이고 클릭 시 이동하는지 확인.

- [ ] **Step 8: 최종 커밋 (남은 변경사항이 있다면)**

```bash
git status
```

Expected: 변경사항 없음(clean) — 모든 변경은 Task 1~8에서 이미 커밋됨. 만약 Task 9 진행 중 코드 수정이 있었다면:

```bash
git add -A
git commit -m "fix: 검증 중 발견한 문제 수정"
```

---

## Acceptance Criteria 대조 (이슈 #18)

- [x] 모바일 하단에 `MY` 탭이 표시되고 활성 경로가 구분됨 — Task 3, 9
- [x] 360px 화면에서 5개 탭의 터치 영역과 라벨이 겹치지 않음 — Task 9 Step 6
- [x] `/[locale]/my`에서 설정·문의·정책 화면으로 이동 가능 — Task 4
- [x] 데스크톱에서도 MY 기능에 접근 가능 — Task 3 (DesktopNavigation 공유), Task 9 Step 7
- [x] 모든 신규 고정 문구가 언어별 메시지 파일을 통해 표시됨 — Task 3~8, Global Constraints
- [x] 미구현 기능은 비활성 또는 "준비 중" 상태로 표시됨 — Task 5(위치), 6(문의), 7(약관), 8(방침)
- [x] 푸시 알림 UI와 로직이 포함되지 않음 — 전체 태스크에 해당 항목 없음
- [x] `npm run lint`, `npm run typecheck`, `npm run build` 통과 — Task 9
