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
