"use client";

import { hasLocale, useLocale, useTranslations } from "next-intl";
import Image from "next/image";
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
      className="group flex min-h-11 items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2d6d5d]"
      aria-label={t("homeAriaLabel")}
    >
      <Image
        src="/brand/wordmark/visa-bugi-wordmark.svg"
        alt=""
        aria-hidden="true"
        width={704}
        height={160}
        unoptimized
        priority
        className="h-auto w-32 max-w-[45vw] transition-transform group-hover:-translate-y-0.5 sm:w-40 md:w-48"
      />
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
      <select
        aria-label={t("label")}
        aria-busy={isPending}
        value={locale}
        onChange={onChange}
        className={`bg-transparent focus-visible:outline-none ${isPending ? "opacity-60" : ""}`}
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
