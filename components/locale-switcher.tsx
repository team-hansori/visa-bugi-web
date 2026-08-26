"use client";

import { hasLocale, useLocale, useTranslations } from "next-intl";
import type { ChangeEvent } from "react";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeFlags, localeNames, routing } from "@/i18n/routing";

const containerClassByVariant = {
  compact: "flex min-h-8 items-center gap-1 rounded-full border border-[#dfe5e1] bg-white px-2.5 text-[0.7rem] font-bold text-[#52615b]",
  full: "flex min-h-12 w-full items-center gap-2 rounded-xl border border-[#d4ddd8] bg-white px-4 text-sm font-bold text-[#40534b]",
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
      <select
        aria-label={t("label")}
        aria-busy={isPending}
        value={locale}
        onChange={onChange}
        className={`flex-1 bg-transparent focus-visible:outline-none ${isPending ? "opacity-60" : ""}`}
      >
        {routing.locales.map((code) => (
          <option key={code} value={code}>
            {localeFlags[code]} {localeNames[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
