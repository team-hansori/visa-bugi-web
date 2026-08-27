"use client";

import { useTranslations } from "next-intl";
import type { ChangeEvent } from "react";
import { useState, useTransition } from "react";
import { updateTargetVisa } from "@/features/onboarding/actions";
import { TARGET_VISA_CODES, type TargetVisaCode } from "@/features/onboarding/constants";
import { useRouter } from "@/i18n/navigation";

/**
 * 홈 화면에서 목표 비자를 바로 바꾸는 드롭다운.
 * 예전에는 "내 정보 설정하기" 버튼이 온보딩 전체로 보냈는데, 목표 비자
 * 하나만 바꾸고 싶어도 8~9개 질문을 다시 거쳐야 했다. 이 컴포넌트는
 * `user_visa_profile.target_visa_code`만 바로 갱신한다.
 */
export function TargetVisaSelect({ value }: { value: TargetVisaCode }) {
  const t = useTranslations("Onboarding");
  const tHome = useTranslations("Home");
  const router = useRouter();
  const [selected, setSelected] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as TargetVisaCode;
    const previous = selected;
    setSelected(next);
    setError(null);
    startTransition(async () => {
      const result = await updateTargetVisa(next);
      if (result.status === "error") {
        setSelected(previous);
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        aria-label={tHome("progress.selectedVisaLabel")}
        aria-busy={isPending}
        value={selected}
        onChange={onChange}
        disabled={isPending}
        className={`rounded-lg border border-[#d4ddd8] bg-white px-2.5 py-1.5 text-sm font-extrabold text-[#20332c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${isPending ? "opacity-60" : ""}`}
      >
        {TARGET_VISA_CODES.map((code) => (
          <option key={code} value={code}>
            {t(`targetVisaOptions.${code}`)}
          </option>
        ))}
      </select>
      {error ? (
        <span role="alert" className="text-xs font-semibold text-[#9f4038]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
