"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";

export type CalendarSearchResult = {
  id: string;
  label: string;
  meta: string;
  date: string | null;
};

export function CalendarSearch({ value, results, onChange, onSelectResult }: { value: string; results: CalendarSearchResult[]; onChange: (value: string) => void; onSelectResult: (result: CalendarSearchResult) => void }) {
  const t = useTranslations("Calendar.search");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[#d6dfda] bg-white px-4 text-left text-base font-semibold text-[#77837e] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
      >
        <Icon name="search" className="size-5" aria-hidden="true" />
        {t("open")}
      </button>
    );
  }

  const hasQuery = Boolean(value.trim());

  return (
    <div className="grid gap-2">
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
      {hasQuery ? (
        <div className="rounded-2xl border border-[#d6dfda] bg-white p-3 shadow-sm" aria-live="polite">
          <p className="px-1 text-xs font-extrabold text-[#607069]">{t("resultCount", { count: results.length })}</p>
          {results.length ? (
            <ul className="mt-2 grid gap-1">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    disabled={!result.date}
                    onClick={() => onSelectResult(result)}
                    className="flex min-h-12 w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left hover:bg-[#f4f7f4] disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-[#30433b]">{result.label}</span>
                      <span className="mt-0.5 block text-xs text-[#77837e]">{result.meta}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-[#2d6d5d]">{result.date ?? t("dateUndecided")}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 rounded-xl bg-[#f7f9f7] px-4 py-5 text-center text-sm font-semibold text-[#77837e]">{t("noResults")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
