# 온보딩 진입 화면 개편 + 앱 셸 분리 설계

- 작성일: 2026-08-27
- 배경: 로그인 화면 없이 진행되는 현재 온보딩 진입 화면(`OnboardingWelcome`)을 hellobot류 모바일 로그인 화면 레퍼런스에 맞춰 다시 그리고, 온보딩 중에는 앱의 하단 탭·데스크톱 메뉴가 보이지 않도록 셸을 분리한다.
- 관련 PR: `feat/20260824_온보딩_퍼널_user_스키마` (PR #16) 위에서 작업. PR #22(스키마)는 이 작업으로 변경되지 않는다.
- 검증 환경: Next.js 16.3.1 App Router, next-intl 4.13.7, Tailwind 4

## 1. 현재 상태 재확인 (변경 불필요 항목)

브레인스토밍 중 코드를 직접 확인한 결과, 요청 중 일부는 이미 구현되어 있어 이번 작업 범위에서 제외한다.

- **레퍼런스 이미지**: `OnboardingWelcome`이 이미 `/brand/onboarding/visa-bugi-login-hero-v1.png`를 사용 중이며, 이 파일은 `main`과 이 브랜치 양쪽에 이미 존재한다.
- **레이아웃(수직 배치)**: 온보딩 스텝 화면(`onboarding-form.tsx`)의 그리드는 `lg:grid-cols-[0.8fr_1.2fr]`로, `lg`(1024px) 미만에서는 이미 1단(수직) 배치다. 데스크톱 폭에서만 2단이 되는 것은 의도된 반응형 동작이며 변경하지 않는다.
- **언어 선택 저장**: `public.profiles.locale`(NOT NULL) 컬럼이 PR #22 스키마에 이미 존재하고, `features/onboarding/actions.ts`가 이미 `locale: submission.locale`로 저장한다. 이번 작업에서 PR #22를 변경하지 않는다.

## 2. 라우트 구조 변경 — Route Group으로 앱 셸 분리

### 2.1 문제

`app/[locale]/layout.tsx`가 `<html>/<body>` 루트 레이아웃과 `<AppShell>`(상단 데스크톱 메뉴 + 하단 5탭 모바일 내비게이션 + `LocaleSwitcher`)을 동시에 담당한다. 이 레이아웃이 `[locale]` 세그먼트의 모든 하위 라우트(`onboarding` 포함)를 무조건 감싸기 때문에, 온보딩 진입 화면과 스텝 화면에서도 하단 5탭이 항상 노출된다. 레퍼런스처럼 몰입형으로 만들려면 온보딩 중에는 이 내비게이션이 보이지 않아야 한다.

### 2.2 결정

Next.js route group으로 "전체 앱 셸을 쓰는 라우트"와 "최소 셸을 쓰는 라우트"를 파일 트리 레벨에서 분리한다. Route group(`(app)`)은 URL 경로에 나타나지 않으므로 기존 링크(`href="/"`, `href="/my"` 등)는 변경할 필요가 없다.

```
app/[locale]/
  layout.tsx              # html/body + NextIntlClientProvider만 유지 (AppShell 제거)
  (app)/
    layout.tsx             # <AppShell>{children}</AppShell>
    page.tsx                (이동, 내용 변경 없음)
    not-found.tsx            (이동, 내용 변경 없음)
    [...rest]/page.tsx        (이동, 내용 변경 없음)
    calendar/                (이동)
    contact/                 (이동)
    map/                     (이동)
    my/                      (이동)
    ocr/                     (이동)
    privacy/                 (이동)
    terms/                   (이동)
  onboarding/
    layout.tsx              # 신규: <MinimalShell>{children}</MinimalShell>
    page.tsx                 (그대로, 위치 변경 없음)
```

`not-found.tsx`와 `[...rest]`도 `(app)`으로 옮긴다 — 존재하지 않는 경로에 접근한 사용자도 하단 탭으로 다른 화면으로 이동할 수 있어야 하므로, 온보딩의 최소 셸보다는 전체 앱 셸이 맞다.

이동하는 각 라우트 폴더는 내용(컴포넌트 로직, 테스트) 변경 없이 파일 위치만 바뀐다. `AppShell` 컴포넌트 자체도 변경하지 않는다 — 이미 갖고 있는 `mySubPagePaths` 같은 경로별 특수 처리 로직 그대로 유지.

### 2.3 신규 `MinimalShell` 컴포넌트

`components/minimal-shell.tsx`에 추가한다. `AppShell`과 마찬가지로 `NextIntlClientProvider` 하위에서 쓰이는 클라이언트 컴포넌트.

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

- 뒤로가기 아이콘은 신규 아이콘을 추가하지 않고 `AppShell`의 `HeaderTitle`이 이미 쓰는 `chevron-left`를 재사용한다 (동일한 시각 언어 유지).
- `A11y.backToHome` 번역 키를 신규 추가한다 (기존 `A11y.backToMy`와 동일한 패턴).
- 컨테이너 폭(`max-w-5xl`)을 온보딩 화면 본문의 `max-w-5xl`과 맞춰 헤더와 본문이 시각적으로 정렬되게 한다.

## 3. Google 로그인 — 미래 연동 대비 스텁

`features/onboarding/onboarding-welcome.tsx`의 클릭 핸들러를 별도 함수로 분리하고, 실제 연동 시 교체될 지점을 주석으로 명시한다. 클릭 시 동작(안내 문구 표시)은 바꾸지 않는다 — AGENTS.md의 "실제 동작을 연결하거나 준비 중 상태로 명확히 표시" 원칙을 그대로 따른다.

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

`onClick={() => setShowGoogleNotice(true)}`를 `onClick={handleGoogleLogin}`로 교체하는 것 외에 기존 state(`showGoogleNotice`)나 렌더링 구조는 바꾸지 않는다.

## 4. 약관 동의 문구

레퍼런스 UI 하단의 약관 동의 문구를 두 버튼 아래에 추가한다. `/terms`, `/privacy`는 아직 "준비 중" 플레이스홀더 콘텐츠지만, 링크 자체는 지금 걸어둔다 — 정책 원문이 채워지면 이 문구는 코드 변경 없이 자동으로 완성된다.

next-intl의 `t.rich()`로 링크 부분만 마크업한다:

```tsx
<p className="max-w-xs text-center text-xs leading-5 text-[#8a938e]">
  {t.rich("consentNotice", {
    terms: (chunks) => (
      <Link href="/terms" className="font-semibold text-[#52615b] underline underline-offset-2">
        {chunks}
      </Link>
    ),
    privacy: (chunks) => (
      <Link href="/privacy" className="font-semibold text-[#52615b] underline underline-offset-2">
        {chunks}
      </Link>
    ),
  })}
</p>
```

`messages/ko.json`(`Onboarding` 네임스페이스)에 원문 키 추가:

```json
"consentNotice": "계속 진행하면 <terms>이용약관</terms> 및 <privacy>개인정보처리방침</privacy>에 동의하는 것으로 간주합니다."
```

`vi`, `uz`, `ne`, `km`, `zh` 5개 언어 파일에도 동일 구조로 초벌 번역을 추가한다 (기존 `Onboarding` 네임스페이스 전체 번역과 동일한 관례 — AI 초벌 번역이며 네이티브 검수 전이라는 점을 이미 합의된 대로 유지).

## 5. 영향받는 테스트

- `features/onboarding/onboarding-welcome.test.tsx`: `handleGoogleLogin` 클릭 시 기존과 동일하게 안내 문구가 뜨는지, 약관 링크 2개(`/terms`, `/privacy`)가 렌더되는지 검증 추가.
- 라우트 이동에 따라 기존 `onboarding-form.test.tsx`, `actions.test.ts` 등은 import 경로 영향 없음(컴포넌트 자체는 이동하지 않음) — 회귀 확인만 필요.
- 신규: `MinimalShell` 렌더 테스트(뒤로가기 링크 href, `LocaleSwitcher` 존재) — `AppShell`에 대응하는 테스트가 없다면 최소 스모크 테스트만 추가.
- `npm run build`로 라우트 그룹 이동 후 모든 페이지가 정상적으로 라우팅되는지 확인(빌드 시 라우트 목록 출력으로 URL 경로가 이동 전과 동일한지 대조).

## 6. 범위 밖

- 실제 Google OAuth 연동(Supabase 프로바이더 설정, Google Cloud Console 앱 등록) — 스텁만 준비.
- `/terms`, `/privacy` 실제 정책 원문 작성.
- 앱 전체를 고정 모바일 폭 셸로 재설계하는 것(현재는 온보딩 레이아웃 자체는 변경 없음으로 결정됨).
