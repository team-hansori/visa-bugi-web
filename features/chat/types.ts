export const RISK_CATEGORIES = [
  "WAGE_ARREARS",
  "INDUSTRIAL_ACCIDENT",
  "ASSAULT",
  "ILLEGAL_EMPLOYMENT",
  "RESIDENCE_CONDITION_VIOLATION",
] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];

export const USER_TYPES = ["FOREIGN_WORKER", "STUDENT", "UNKNOWN"] as const;
export type UserType = (typeof USER_TYPES)[number];

export const CHUNGBUK_REGIONS = [
  "청주", "충주", "제천", "보은", "옥천", "영동",
  "증평", "진천", "괴산", "음성", "단양", "충청북도",
] as const;
export type ChungbukRegion = (typeof CHUNGBUK_REGIONS)[number];

export type ScreeningResult = {
  riskCategory: RiskCategory | "NONE";
  userType: UserType;
  region: ChungbukRegion | null;
  visaCode: string | null;
  inScope: boolean;
  /** BCP-47 언어 태그 소문자 (예: "ko", "vi") */
  language: string;
};

/** visa-data reference/risk_routing_table.csv 컬럼 그대로 */
export type RiskRoutingRow = {
  routing_id: string;
  keyword_category: string;
  user_type: string;
  applies_to_visa_code: string | null;
  resolution_type: "EXTERNAL" | "IN_DOMAIN";
  target_agency_category: string | null;
  external_agency_name: string | null;
  external_region_scope: string | null;
  external_phone: string | null;
  external_url: string | null;
  escalation_message_template: string;
  notes: string | null;
  valid_from: string | null;
  valid_to: string | null;
  source_document: string | null;
  source_page: string | null;
  last_verified_at: string | null;
};

/** visa-data reference/agency_contacts.csv 컬럼 그대로 */
export type AgencyContactRow = {
  agency_id: string;
  category_major: string;
  category_minor: string;
  region: string;
  department_name: string | null;
  address: string | null;
  phone: string | null;
  url: string | null;
  target_audience: string | null;
  is_user_facing: boolean;
  valid_from: string | null;
  valid_to: string | null;
  source_document: string | null;
  source_page: string | null;
  last_verified_at: string | null;
};

export type EscalationContact = {
  name: string;
  phone: string | null;
  url: string | null;
  regionScope: string | null;
  department: string | null;
  address: string | null;
};

export type EscalationPayload = {
  /** escalation_message_template 한국어 원문 verbatim */
  template: string;
  /** false면 UI에 "이주노동자 기준으로 확인된 안내" 한계 고지 */
  verifiedForUserType: boolean;
  contacts: EscalationContact[];
};

export type SourceRef = {
  table: string;
  sourceDocument: string | null;
  lastVerifiedAt: string | null;
};

export type ChatResponseKind = "answer" | "escalation" | "out_of_scope" | "error";

export type ChatResponse = {
  kind: ChatResponseKind;
  /** 사용자 언어로 생성된 본문 (escalation이면 번역 안내문, 원문은 escalation.template) */
  text: string;
  escalation?: EscalationPayload;
  sources: SourceRef[];
};

export type ChatMessage = { role: "user" | "assistant"; content: string };
