"use client";

import { useId } from "react";
import { ChoiceStep } from "./choice-step";

const TYPE_OPTIONS = [
  { id: "TOPIK", label: "TOPIK", description: "한국어능력시험 급수" },
  { id: "KIIP", label: "사회통합프로그램", description: "이수 단계" },
  { id: "NONE", label: "아직 없어요" },
];

type Props = {
  type: string | null;
  value: number | null;
  onChange: (next: { type: string; value: number | null }) => void;
  error?: string;
};

export function KoreanLevelStep({ type, value, onChange, error }: Props) {
  const selectId = useId();
  const errorId = useId();

  return (
    <div className="grid gap-5">
      <ChoiceStep
        options={TYPE_OPTIONS}
        value={type}
        onChange={(id) => onChange({ type: id, value: id === "NONE" ? null : value })}
        legend="한국어능력 유형"
      />

      {type !== null && type !== "NONE" ? (
        <div>
          <label
            htmlFor={selectId}
            className="block text-sm font-extrabold text-[#33453e]"
          >
            {type === "TOPIK" ? "TOPIK 급수" : "사회통합프로그램 단계"}
          </label>
          <select
            id={selectId}
            value={value ?? ""}
            aria-invalid={error !== undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) =>
              onChange({
                type,
                value: event.target.value === "" ? null : Number(event.target.value),
              })
            }
            className="mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          >
            <option value="">선택해 주세요</option>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <option key={level} value={level}>
                {level}
                {type === "TOPIK" ? "급" : "단계"}
              </option>
            ))}
          </select>
          {error ? (
            <p
              id={errorId}
              role="alert"
              className="mt-2 text-sm font-semibold text-[#9f4038]"
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
