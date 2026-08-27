"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { AddressSearchInput } from "@/components/address/address-search-input";
import type { AddressSuggestion } from "@/lib/address/normalize";
import { isPopulationDeclineRegion } from "../constants";

type Props = {
  value: AddressSuggestion | null;
  onSelect: (suggestion: AddressSuggestion) => void;
};

export function AddressStep({ value, onSelect }: Props) {
  const t = useTranslations("Onboarding");
  const [manualMode, setManualMode] = useState(false);
  const eligible = value !== null && isPopulationDeclineRegion(value.regionSigungu);

  return (
    <div className="grid gap-4">
      {manualMode ? (
        <ManualAddressForm
          onSubmit={onSelect}
          onCancel={() => setManualMode(false)}
        />
      ) : (
        <>
          <AddressSearchInput
            value={value}
            onSelect={onSelect}
            label={t("addressLabel")}
          />
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="justify-self-start text-sm font-extrabold text-[#2d6d5d] underline underline-offset-2"
          >
            {t("addressManualPrompt")}
          </button>
        </>
      )}

      {value === null ? null : eligible ? (
        <p className="rounded-xl bg-[#e9f3ef] px-4 py-3 text-sm font-semibold leading-6 text-[#1f584a]">
          {t("addressEligible", { region: value.regionSigungu })}
        </p>
      ) : (
        <p
          role="alert"
          className="rounded-xl bg-[#fff7ed] px-4 py-3 text-sm font-semibold leading-6 text-[#9a5b1d]"
        >
          {t("addressNotEligible", { region: value.regionSigungu })}
        </p>
      )}
    </div>
  );
}

type ManualAddressFormProps = {
  onSubmit: (suggestion: AddressSuggestion) => void;
  onCancel: () => void;
};

/**
 * Kakao 주소 검색이 준비되지 않았거나(API 키 미설정) 검색 결과가 없을 때
 * 쓰는 대체 경로. 좌표를 알 수 없으므로 lat/lng는 null로 저장한다.
 */
function ManualAddressForm({ onSubmit, onCancel }: ManualAddressFormProps) {
  const t = useTranslations("Onboarding");
  const [road, setRoad] = useState("");
  const [sigungu, setSigungu] = useState("");
  const roadId = useId();
  const sigunguId = useId();
  const canSubmit = road.trim() !== "" && sigungu.trim() !== "";

  return (
    <div className="grid gap-4">
      <div>
        <label htmlFor={roadId} className="block text-sm font-extrabold text-[#33453e]">
          {t("addressManualRoadLabel")}
        </label>
        <input
          id={roadId}
          value={road}
          onChange={(event) => setRoad(event.target.value)}
          placeholder={t("addressManualRoadPlaceholder")}
          className="mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        />
      </div>
      <div>
        <label htmlFor={sigunguId} className="block text-sm font-extrabold text-[#33453e]">
          {t("addressManualSigunguLabel")}
        </label>
        <input
          id={sigunguId}
          value={sigungu}
          onChange={(event) => setSigungu(event.target.value)}
          placeholder={t("addressManualSigunguPlaceholder")}
          className="mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-extrabold text-[#6c7873] underline underline-offset-2"
        >
          {t("addressManualBack")}
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              roadAddress: road.trim(),
              jibunAddress: road.trim(),
              regionSigungu: sigungu.trim(),
              lat: null,
              lng: null,
            })
          }
          className="ml-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2d6d5d] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#c7d1cc]"
        >
          {t("addressManualSubmit")}
        </button>
      </div>
    </div>
  );
}
