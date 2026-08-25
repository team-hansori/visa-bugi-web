"use client";

import { useId } from "react";
import { Icon } from "@/components/ui/icon";

export type KoreanCredential = "TOPIK" | "KIIP";

export type KoreanLevelValues = {
  credentials: KoreanCredential[];
  none: boolean;
  topikLevel: number | null;
  kiipLevel: number | null;
};

type Props = KoreanLevelValues & {
  onChange: (next: KoreanLevelValues) => void;
};

const CREDENTIAL_OPTIONS: { id: KoreanCredential; label: string; description: string }[] = [
  { id: "TOPIK", label: "TOPIK", description: "한국어능력시험 급수" },
  { id: "KIIP", label: "사회통합프로그램", description: "이수 단계" },
];

const LEVEL_SELECT_CLASS =
  "mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]";

/**
 * 한국어능력 스텝. TOPIK·사회통합프로그램을 동시에 가진 사용자가 있을 수
 * 있어 둘 다 복수 선택 가능하다. "아직 없어요"는 나머지와 배타적이다.
 */
export function KoreanLevelStep({ credentials, none, topikLevel, kiipLevel, onChange }: Props) {
  const topikSelectId = useId();
  const kiipSelectId = useId();

  function toggleCredential(id: KoreanCredential) {
    const isSelected = credentials.includes(id);
    const nextCredentials = isSelected
      ? credentials.filter((c) => c !== id)
      : [...credentials, id];
    onChange({
      credentials: nextCredentials,
      none: false,
      topikLevel: id === "TOPIK" && isSelected ? null : topikLevel,
      kiipLevel: id === "KIIP" && isSelected ? null : kiipLevel,
    });
  }

  function selectNone() {
    onChange({ credentials: [], none: true, topikLevel: null, kiipLevel: null });
  }

  function renderToggle(id: KoreanCredential | "NONE", label: string, description?: string) {
    const active = id === "NONE" ? none : credentials.includes(id);
    return (
      <button
        key={id}
        type="button"
        aria-pressed={active}
        onClick={id === "NONE" ? selectNone : () => toggleCredential(id)}
        className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left text-base font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${
          active
            ? "border-[#2d6d5d] bg-[#e9f3ef] text-[#1f584a]"
            : "border-[#dfe5e1] bg-white text-[#33453e] hover:border-[#9bb9ac] hover:bg-[#f7faf8]"
        }`}
      >
        <span>
          {label}
          {description ? (
            <span className="mt-1 block text-sm font-semibold text-[#6c7873]">
              {description}
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
  }

  return (
    <div className="grid gap-5">
      <div
        className="grid gap-3 sm:grid-cols-2"
        role="group"
        aria-label="한국어능력 유형(복수 선택 가능)"
      >
        {CREDENTIAL_OPTIONS.map((option) =>
          renderToggle(option.id, option.label, option.description),
        )}
        <div className="sm:col-span-2">{renderToggle("NONE", "아직 없어요")}</div>
      </div>

      {credentials.includes("TOPIK") ? (
        <div>
          <label htmlFor={topikSelectId} className="block text-sm font-extrabold text-[#33453e]">
            TOPIK 급수
          </label>
          <select
            id={topikSelectId}
            value={topikLevel ?? ""}
            onChange={(event) =>
              onChange({
                credentials,
                none: false,
                topikLevel: event.target.value === "" ? null : Number(event.target.value),
                kiipLevel,
              })
            }
            className={LEVEL_SELECT_CLASS}
          >
            <option value="">선택해 주세요</option>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <option key={level} value={level}>
                {level}급
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {credentials.includes("KIIP") ? (
        <div>
          <label htmlFor={kiipSelectId} className="block text-sm font-extrabold text-[#33453e]">
            사회통합프로그램 단계
          </label>
          <select
            id={kiipSelectId}
            value={kiipLevel ?? ""}
            onChange={(event) =>
              onChange({
                credentials,
                none: false,
                topikLevel,
                kiipLevel: event.target.value === "" ? null : Number(event.target.value),
              })
            }
            className={LEVEL_SELECT_CLASS}
          >
            <option value="">선택해 주세요</option>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <option key={level} value={level}>
                {level}단계
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
