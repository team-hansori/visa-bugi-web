"use client";

import { SUPPORTED_VISA_OPTIONS } from "./use-target-visa";

export function VisaPicker({ selectedVisaId, onSelect }: { selectedVisaId: string | null; onSelect: (visaId: string) => void }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#d6dfda] p-5" role="group" aria-label="비자 유형 선택">
      <p className="text-sm font-extrabold text-[#34473f]">확인할 비자 유형을 선택해 주세요</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUPPORTED_VISA_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            aria-pressed={selectedVisaId === option.id}
            className={`min-h-11 rounded-full border px-4 text-sm font-extrabold transition-colors ${
              selectedVisaId === option.id
                ? "border-[#2d6d5d] bg-[#e9f3ef] text-[#1f584a]"
                : "border-[#dce4df] bg-white text-[#33453e] hover:border-[#9bb9ac]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
