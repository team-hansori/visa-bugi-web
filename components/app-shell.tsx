"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

type NavItem = {
  href: string;
  icon: IconName;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", icon: "home", label: "홈" },
  { href: "/calendar", icon: "calendar", label: "일정" },
  { href: "/map", icon: "map-pin", label: "기관" },
  { href: "/ocr", icon: "document", label: "서류" },
];

function isCurrentPath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

function Brand() {
  return (
    <Link
      href="/"
      className="group flex min-h-11 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2d6d5d]"
      aria-label="비자부기 홈"
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
          비자부기
        </span>
        <span className="hidden text-[0.7rem] font-medium tracking-[-0.01em] text-[#73807b] sm:block">
          내 비자 여정의 동반자
        </span>
      </span>
    </Link>
  );
}
function DesktopNavigation({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNavigation({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="모바일 주요 메뉴"
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
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-[#f7f8f4] text-[#20332c]">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-[#173f36] px-4 py-3 text-sm font-bold text-white transition-transform focus:translate-y-0"
      >
        본문으로 바로가기
      </a>

      <header className="sticky top-0 z-40 border-b border-[#e2e7e3] bg-[#f7f8f4]/94 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Brand />
          <DesktopNavigation pathname={pathname} />
          <span className="flex min-h-10 items-center gap-1.5 rounded-full border border-[#dfe5e1] bg-white px-3 text-xs font-bold text-[#52615b]">
            <Icon name="globe" className="size-4" />
            한국어
          </span>
        </div>
      </header>

      <main id="main-content" className="app-main mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {children}
      </main>

      <MobileNavigation pathname={pathname} />
    </div>
  );
}
