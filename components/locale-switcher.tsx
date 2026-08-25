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
