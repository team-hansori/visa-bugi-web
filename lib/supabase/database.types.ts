import type { TargetVisaCode } from "@/features/onboarding/constants";

/** `user_visa_profile.visa_details`에 들어가는 비자 전용 값 (스펙 §3.2). */
export type VisaDetails = {
  /** F-4-R: 이주 유형 */
  migrationType?:
    | "EXISTING_RESIDENT"
    | "DOMESTIC_TRANSFER"
    | "OVERSEAS_TRANSFER";
  /** E-7-4R: 최근 10년 내 E-9·E-10·H-2 체류 연수 */
  e9E10H2ResidenceYears?: number;
  /** D-2: 재학 정보 */
  universityName?: string;
  departmentName?: string;
  academicStatus?:
    | "LANGUAGE_COURSE"
    | "ASSOCIATE"
    | "BACHELOR_1_2"
    | "BACHELOR_3_4"
    | "GRADUATE";
  programStartDate?: string;
};

export type ProfileRow = {
  user_id: string;
  locale: string;
  gender: string | null;
  birthdate: string | null;
  nationality: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at">;

export type UserVisaProfileRow = {
  user_id: string;
  current_visa_code: string | null;
  target_visa_code: TargetVisaCode | null;
  korean_level_type: "TOPIK" | "KIIP" | "NONE" | null;
  korean_level_value: number | null;
  address_road: string | null;
  address_jibun: string | null;
  region_sigungu: string | null;
  lat: number | null;
  lng: number | null;
  annual_income_krw: number | null;
  employment_months: number | null;
  education_level: string | null;
  visa_details: VisaDetails;
  updated_at: string;
};

export type UserVisaProfileInsert = Omit<UserVisaProfileRow, "updated_at">;
