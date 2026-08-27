"use client";

import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";

/**
 * 온보딩 전용 최소 셸. 앱 전체 내비게이션(AppShell)과 달리 언어 전환만
 * 제공한다. 스텝 사이 뒤로가기는 브라우저 히스토리에 의존하면 신뢰할 수
 * 없어서(홈 게이트 리다이렉트가 끼어있으면 히스토리가 예상과 달라질 수
 * 있음) 이 셸이 아니라 OnboardingForm이 stepIndex 기준으로 직접 제어한다.
 */
export function MinimalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f7f8f4] text-[#20332c]">
      <header className="sticky top-0 z-40 border-b border-[#e2e7e3] bg-[#f7f8f4]/94 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-end gap-4 px-4 sm:px-6 lg:px-8">
          <LocaleSwitcher />
        </div>
      </header>

      <main className="app-main mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
