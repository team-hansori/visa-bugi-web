"use client";

import { AddressSearchInput } from "@/components/address/address-search-input";
import type { AddressSuggestion } from "@/lib/address/normalize";
import { isPopulationDeclineRegion } from "../constants";

type Props = {
  value: AddressSuggestion | null;
  onSelect: (suggestion: AddressSuggestion) => void;
};

export function AddressStep({ value, onSelect }: Props) {
  const eligible = value !== null && isPopulationDeclineRegion(value.regionSigungu);

  return (
    <div className="grid gap-4">
      <AddressSearchInput
        value={value}
        onSelect={onSelect}
        label="거주(희망) 주소"
      />

      {value === null ? null : eligible ? (
        <p className="rounded-xl bg-[#e9f3ef] px-4 py-3 text-sm font-semibold leading-6 text-[#1f584a]">
          {value.regionSigungu}는 지역특화형 비자 대상 지역입니다.
        </p>
      ) : (
        <p
          role="alert"
          className="rounded-xl bg-[#fff7ed] px-4 py-3 text-sm font-semibold leading-6 text-[#9a5b1d]"
        >
          {value.regionSigungu}는 지역특화형 비자(F-2-R·E-7-4R·F-4-R) 대상 지역이
          아닙니다. 참고용 안내이며 최종 판정은 관할 출입국·외국인관서에서 확인해
          주세요.
        </p>
      )}
    </div>
  );
}
