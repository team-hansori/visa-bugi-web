"use server";

import type {
  ProfileInsert,
  UserVisaProfileInsert,
  VisaDetails,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { type OnboardingSubmission, onboardingSubmissionSchema } from "./schema";

export type SaveOnboardingState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

/** 제출값에서 `visa_details` JSONB에 들어갈 부분만 뽑는다 (스펙 §3.2). */
function toVisaDetails(submission: OnboardingSubmission): VisaDetails {
  switch (submission.targetVisaCode) {
    case "E-7-4R":
      return { e9E10H2ResidenceYears: submission.e9E10H2ResidenceYears };
    case "F-4-R":
      return { migrationType: submission.migrationType };
    case "D-2":
      return {
        universityName: submission.universityName,
        departmentName: submission.departmentName,
        academicStatus: submission.academicStatus,
        programStartDate: submission.programStartDate,
      };
    // F-2-R의 educationLevel은 typed column으로 간다.
    case "F-2-R":
      return {};
  }
}

/**
 * 온보딩 답변을 저장한다.
 *
 * Next.js 문서 요구사항에 따라 이 함수 안에서 인증과 입력 검증을 모두 다시 수행한다.
 * 클라이언트 검증만 신뢰하면 조작된 payload가 그대로 DB에 들어간다.
 */
export async function saveOnboarding(
  _prev: SaveOnboardingState,
  formData: FormData,
): Promise<SaveOnboardingState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // 정상 흐름이라면 Task 10의 마운트 훅이 이미 익명 세션을 발급해 두었어야 한다.
    // 여기 도달했다면 쿠키 차단 등 예외 상황이다.
    return {
      status: "error",
      message: "일시적인 오류로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { status: "error", message: "입력값을 읽지 못했습니다." };
  }

  const parsed = onboardingSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      message: "입력값을 다시 확인해 주세요.",
      fieldErrors,
    };
  }

  const submission = parsed.data;

  const profileRow: ProfileInsert = {
    user_id: user.id,
    locale: submission.locale,
    gender: submission.gender,
    birthdate: submission.birthdate,
    nationality: submission.nationality,
  };

  const visaProfileRow: UserVisaProfileInsert = {
    user_id: user.id,
    current_visa_code: submission.currentVisaCode,
    target_visa_code: submission.targetVisaCode,
    topik_level: submission.topikLevel,
    kiip_level: submission.kiipLevel,
    address_road: submission.addressRoad,
    address_jibun: submission.addressJibun,
    region_sigungu: submission.regionSigungu,
    lat: submission.lat,
    lng: submission.lng,
    // 3단계("내 정보 입력하기")에서 채워지는 필드. 온보딩에서는 수집하지 않는다.
    annual_income_krw: null,
    employment_months: null,
    education_level:
      submission.targetVisaCode === "F-2-R" ? submission.educationLevel : null,
    visa_details: toVisaDetails(submission),
  };

  const profileResult = await supabase
    .from("profiles")
    .upsert(profileRow, { onConflict: "user_id" });
  if (profileResult.error) {
    return { status: "error", message: "저장에 실패했습니다. 다시 시도해 주세요." };
  }

  const visaProfileResult = await supabase
    .from("user_visa_profile")
    .upsert(visaProfileRow, { onConflict: "user_id" });
  if (visaProfileResult.error) {
    return { status: "error", message: "저장에 실패했습니다. 다시 시도해 주세요." };
  }

  return { status: "success" };
}
