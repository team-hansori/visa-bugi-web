import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { TargetVisaCode } from "@/features/onboarding/constants";

export type VisaValidity = { validFrom: string | null; validTo: string | null };

type VisaRequirementValidityRow = {
  valid_from: string | null;
  valid_to: string | null;
};

function hasSupabaseEnvironment() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function isCurrentlyValid(record: VisaRequirementValidityRow, today: string) {
  return (
    (!record.valid_from || record.valid_from <= today) &&
    (!record.valid_to || record.valid_to >= today)
  );
}

/**
 * 홈 화면 "공고 유효기간"에 쓰는 마스터 데이터 조회.
 * `visa_requirements.valid_from`/`valid_to`는 사용자 개인의 비자 만료일이
 * 아니라 그 요건 공고 자체의 유효기간이다(스펙 §데이터 경계). 같은
 * visa_code로 여러 공고 회차가 쌓여 있을 수 있어 오늘 기준으로 유효한
 * 행 하나만 골라 보여준다.
 */
export async function getTargetVisaValidity(
  targetVisaCode: TargetVisaCode,
): Promise<VisaValidity | null> {
  if (!hasSupabaseEnvironment()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("visa_requirements")
      .select("valid_from,valid_to")
      .eq("visa_code", targetVisaCode);
    if (error || !data?.length) return null;

    const today = new Date().toISOString().slice(0, 10);
    const current = (data as VisaRequirementValidityRow[]).find((row) =>
      isCurrentlyValid(row, today),
    );
    if (!current) return null;

    return { validFrom: current.valid_from, validTo: current.valid_to };
  } catch {
    return null;
  }
}
