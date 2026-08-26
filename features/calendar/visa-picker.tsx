"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { SUPPORTED_VISAS } from "@/lib/visa-schedule/supported-visas";

const VISA_CHIP_CLASSES: Record<string, string> = {
  "F-4-R": "border-[#164E63] bg-[#164E63] text-white",
  "E-7-4R": "border-[#0F766E] bg-[#0F766E] text-white",
  "F-2-R": "border-[#5BC0A8] bg-[#5BC0A8] text-[#17302F]",
  "D-2": "border-[#F4C95D] bg-[#F4C95D] text-[#17302F]",
};

export function VisaPicker({ selectedVisaIds, onToggle, onClear }: { selectedVisaIds: string[]; onToggle: (visaId: string) => void; onClear: () => void }) {
  const t = useTranslations("Calendar.visaPicker");
  const selectedVisas = SUPPORTED_VISAS.filter((visa) => selectedVisaIds.includes(visa.id));

  return (
    <div>
      <details className="group relative">
        <summary
          aria-label={t("label")}
          className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl border border-[#d6dfda] bg-white px-4 py-3 text-left shadow-sm marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] [&::-webkit-details-marker]:hidden"
        >
          <span className="min-w-0">
            {selectedVisas.length ? (
              <span className="flex flex-wrap gap-2 text-sm font-semibold text-[#30433b]">
                {selectedVisas.map((visa) => (
                  <span key={visa.id} className={`rounded-lg border px-2.5 py-1.5 ${VISA_CHIP_CLASSES[visa.id]}`}>
                    <strong>{visa.id}</strong> <span aria-hidden="true">|</span> {t(`visas.${visa.messageKey}`)}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-base font-semibold text-[#77837e]">{t("placeholder")}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-[#5d6d66]">
            {selectedVisas.length ? t("selectedCount", { count: selectedVisas.length }) : null}
            <Icon name="chevron-right" className="size-5 rotate-90 transition-transform group-open:-rotate-90" />
          </span>
        </summary>
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#d6dfda] bg-white p-2 shadow-[0_14px_36px_rgba(40,63,53,0.14)]" role="group" aria-label={t("optionsAriaLabel")}>
          {selectedVisaIds.length ? (
            <div className="mb-1 flex justify-end border-b border-[#edf0ee] px-1 pb-2">
              <button type="button" onClick={onClear} className="min-h-10 rounded-lg px-3 text-xs font-extrabold text-[#52615b] hover:bg-[#f4f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]">
                {t("clear")}
              </button>
            </div>
          ) : null}
          {SUPPORTED_VISAS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              aria-pressed={selectedVisaIds.includes(option.id)}
              className={`flex min-h-12 w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                selectedVisaIds.includes(option.id)
                  ? "bg-[#e9f3ef] text-[#1f584a]"
                  : "text-[#33453e] hover:bg-[#f4f7f4]"
              }`}
            >
              <span><strong>{option.id}</strong> <span aria-hidden="true">|</span> {t(`visas.${option.messageKey}`)}</span>
              <span className={`grid size-6 shrink-0 place-items-center rounded-md border ${selectedVisaIds.includes(option.id) ? "border-[#2d6d5d] bg-[#2d6d5d] text-white" : "border-[#cbd5cf] text-transparent"}`} aria-hidden="true">
                <Icon name="check" className="size-4" />
              </span>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
