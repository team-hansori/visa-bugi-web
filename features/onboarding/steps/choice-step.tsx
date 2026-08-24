"use client";

import { Icon } from "@/components/ui/icon";

export type ChoiceOption = { id: string; label: string; description?: string };

type Props = {
  options: ChoiceOption[];
  value: string | null;
  onChange: (id: string) => void;
  legend: string;
};

export function ChoiceStep({ options, value, onChange, legend }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label={legend}>
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left text-base font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${
              active
                ? "border-[#2d6d5d] bg-[#e9f3ef] text-[#1f584a]"
                : "border-[#dfe5e1] bg-white text-[#33453e] hover:border-[#9bb9ac] hover:bg-[#f7faf8]"
            }`}
          >
            <span>
              {option.label}
              {option.description ? (
                <span className="mt-1 block text-sm font-semibold text-[#6c7873]">
                  {option.description}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden="true"
              className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                active
                  ? "border-[#2d6d5d] bg-[#2d6d5d] text-white"
                  : "border-[#cbd5cf] text-transparent"
              }`}
            >
              <Icon name="check" className="size-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
