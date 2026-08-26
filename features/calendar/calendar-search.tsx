"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";

export function CalendarSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTranslations("Calendar.search");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[#d6dfda] bg-white px-4 text-left text-sm font-semibold text-[#77837e] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
      >
        <Icon name="search" className="size-5" aria-hidden="true" />
        {t("open")}
      </button>
    );
  }

  return (
    <div className="flex min-h-14 items-center gap-2 rounded-2xl border border-[#2d6d5d] bg-white p-2 shadow-sm">
      <Icon name="search" className="ml-2 size-5 text-[#52615b]" aria-hidden="true" />
      <input
        autoFocus
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("ariaLabel")}
        className="min-h-10 min-w-0 flex-1 bg-transparent px-1 text-base text-[#30433b] outline-none placeholder:text-[#8a9691]"
      />
      <button
        type="button"
        onClick={() => { onChange(""); setOpen(false); }}
        className="min-h-10 rounded-xl px-3 text-sm font-extrabold text-[#52615b] hover:bg-[#f4f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
      >
        {t("close")}
      </button>
    </div>
  );
}
