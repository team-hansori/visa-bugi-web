"use client";

import { useId } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function BirthdateStep({ value, onChange, error }: Props) {
  const inputId = useId();
  const errorId = useId();

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-extrabold text-[#33453e]">
        생년월일
      </label>
      <input
        id={inputId}
        type="date"
        value={value}
        max={new Date().toISOString().slice(0, 10)}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm font-semibold text-[#9f4038]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
