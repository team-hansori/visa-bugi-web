import type {
  ApplicationFormTemplate,
  ApplicationFormTemplateKey,
  FormFieldDefinition,
  ReviewedFormField,
  FormReviewStatus,
  VisaCode,
} from "./types";

export const applicationFormTemplates: ApplicationFormTemplate[] = [
  {
    templateKey: "common_integrated_application",
    visaCode: "COMMON",
    titleKr: "통합신청서(신고서)",
    revision: "2022-04-12",
    documentNamePatterns: ["통합신청서", "APPLICATION FORM"],
    fields: [
      field("application_type", "신청·신고 선택", "choice", true, "APPLICANT"),
      field("full_name", "성명", "text", true, "APPLICANT", { example: "NGUYEN VAN AN" }),
      field("birth_date", "생년월일", "date", true, "APPLICANT", { example: "YYYY-MM-DD" }),
      field("sex", "성별", "choice", true, "APPLICANT"),
      field("nationality", "국적", "text", true, "APPLICANT"),
      field("alien_registration_number", "외국인등록번호", "identifier", false, "APPLICANT", { sensitive: true }),
      field("passport_number", "여권번호", "identifier", true, "APPLICANT", { sensitive: true }),
      field("address_korea", "대한민국 내 주소", "address", true, "APPLICANT"),
      field("mobile_phone", "휴대전화", "text", true, "APPLICANT", { example: "010-0000-0000" }),
      field("email", "전자우편", "text", false, "APPLICANT", { example: "name@example.com" }),
      field("application_date", "신청일", "date", true, "APPLICANT", { example: "YYYY-MM-DD" }),
      field("applicant_signature", "신청인 서명 또는 인", "signature", true, "SIGNER", { manualOnly: true }),
      field("official_use_only", "공용란", "text", false, "OFFICIAL", { manualOnly: true }),
    ],
  },
  {
    templateKey: "f2r_recommendation_application",
    visaCode: "F-2-R",
    titleKr: "지역우수인재 추천서 발급 신청서",
    revision: "2026-R17",
    documentNamePatterns: ["추천서 발급 신청서", "지역우수인재", "F-2-R"],
    fields: [
      field("application_type", "신청유형", "choice", true, "APPLICANT"),
      field("full_name", "성명", "text", true, "APPLICANT", { example: "NGUYEN VAN AN" }),
      field("alien_registration_number", "외국인등록번호", "identifier", true, "APPLICANT", { sensitive: true }),
      field("passport_number", "여권번호", "identifier", true, "APPLICANT", { sensitive: true }),
      field("address_korea", "현 주소", "address", true, "APPLICANT"),
      field("mobile_phone", "연락처", "text", true, "APPLICANT"),
      field("email", "이메일", "text", true, "APPLICANT"),
      field("current_visa_status", "현재 체류자격", "text", true, "APPLICANT", { example: "D-2" }),
      field("nationality", "국적", "text", true, "APPLICANT"),
      field("final_education", "최종학력", "text", true, "APPLICANT"),
      field("korean_language_level", "한국어 능력", "text", true, "APPLICANT", { example: "TOPIK 3급" }),
      field("employer_name", "근무처·회사명", "text", true, "EMPLOYER"),
      field("business_registration_number", "사업자등록번호", "identifier", true, "EMPLOYER", { sensitive: true }),
      field("employer_address", "근무처 주소", "address", true, "EMPLOYER"),
      field("chungbuk_residence_period", "충북 거주기간", "text", true, "APPLICANT"),
      field("privacy_consent", "개인정보 수집·이용 동의", "checkbox", true, "SIGNER", { manualOnly: true }),
      field("application_date", "신청일", "date", true, "APPLICANT"),
      field("applicant_signature", "신청인 서명 또는 인", "signature", true, "SIGNER", { manualOnly: true }),
    ],
  },
  {
    templateKey: "e74_self_assessment",
    visaCode: "E-7-4R",
    titleKr: "K-POINT E-7-4 점수제 자체 심사표",
    revision: "2026",
    documentNamePatterns: ["점수제 자체 심사표", "K-POINT E-7-4", "K-point E74"],
    fields: [
      field("full_name", "영문성명", "text", true, "APPLICANT"),
      field("alien_registration_number", "외국인등록번호", "identifier", true, "APPLICANT", { sensitive: true }),
      field("employer_name", "회사명", "text", true, "EMPLOYER"),
      field("nationality", "국적", "text", true, "APPLICANT"),
      field("basic_eligibility", "기본요건 확인", "checkbox", true, "APPLICANT"),
      field("annual_income_score", "최근 2년 연간 평균소득 점수", "number", true, "APPLICANT"),
      field("korean_language_score", "한국어 능력 점수", "number", true, "APPLICANT"),
      field("age_score", "나이 점수", "number", true, "APPLICANT"),
      field("recommendation_score", "추천 가점", "number", false, "APPLICANT"),
      field("tenure_score", "장기근속 가점", "number", false, "APPLICANT"),
      field("penalty_score", "감점", "number", false, "APPLICANT"),
      field("total_score", "총점", "number", true, "APPLICANT"),
      field("application_date", "작성일", "date", true, "APPLICANT"),
      field("applicant_signature", "작성자 서명", "signature", true, "SIGNER", { manualOnly: true }),
    ],
  },
  {
    templateKey: "generic_application_form",
    visaCode: "COMMON",
    titleKr: "기타 비자 신청·확인 서류",
    revision: "data-catalog-v2",
    documentNamePatterns: [],
    fields: [
      field("application_type", "신청·신고 유형", "choice", false, "APPLICANT"),
      field("full_name", "성명", "text", false, "APPLICANT"),
      field("birth_date", "생년월일", "date", false, "APPLICANT"),
      field("sex", "성별", "choice", false, "APPLICANT"),
      field("nationality", "국적", "text", false, "APPLICANT"),
      field("alien_registration_number", "외국인등록번호", "identifier", false, "APPLICANT", { sensitive: true }),
      field("passport_number", "여권번호", "identifier", false, "APPLICANT", { sensitive: true }),
      field("address_korea", "주소", "address", false, "APPLICANT"),
      field("mobile_phone", "연락처", "text", false, "APPLICANT"),
      field("email", "전자우편", "text", false, "APPLICANT"),
      field("employer_name", "근무처·기관명", "text", false, "EMPLOYER"),
      field("business_registration_number", "사업자등록번호", "identifier", false, "EMPLOYER", { sensitive: true }),
      field("application_date", "작성·신청일", "date", false, "APPLICANT"),
      field("applicant_signature", "서명 또는 인", "signature", false, "SIGNER", { manualOnly: true }),
      field("official_use_only", "기관 작성란", "text", false, "OFFICIAL", { manualOnly: true }),
    ],
  },
];

type FieldOptions = Pick<FormFieldDefinition, "manualOnly" | "sensitive" | "example">;

function field(
  fieldIdentifier: string,
  labelKr: string,
  kind: FormFieldDefinition["kind"],
  required: boolean,
  filledBy: FormFieldDefinition["filledBy"],
  options: FieldOptions = {},
): FormFieldDefinition {
  return { fieldIdentifier, labelKr, kind, required, filledBy, ...options };
}

export function getApplicationFormTemplate(templateKey: string | null | undefined) {
  return applicationFormTemplates.find((template) => template.templateKey === templateKey) ?? null;
}

export function matchApplicationFormTemplate(documentName: string, visaCode?: string | null) {
  const normalizedName = documentName.toLocaleLowerCase();

  return (
    applicationFormTemplates.find(
      (template) =>
        (visaCode == null || template.visaCode === "COMMON" || template.visaCode === visaCode) &&
        template.documentNamePatterns.some((pattern) => normalizedName.includes(pattern.toLocaleLowerCase())),
    ) ?? null
  );
}

export function allFieldIdentifiers() {
  return [...new Set(applicationFormTemplates.flatMap((template) => template.fields.map((item) => item.fieldIdentifier)))];
}

export function reviewExtractedFields(
  templateKey: ApplicationFormTemplateKey,
  extracted: Array<{ fieldIdentifier: string; rawValue: string; confidence: number }>,
): ReviewedFormField[] {
  const template = getApplicationFormTemplate(templateKey);
  if (!template) return [];

  const extractedByIdentifier = new Map(
    extracted.map((item) => [item.fieldIdentifier, { ...item, confidence: clampConfidence(item.confidence) }]),
  );

  return template.fields.map((definition) => {
    const found = extractedByIdentifier.get(definition.fieldIdentifier);
    const rawValue = found?.rawValue.trim() ?? "";
    let status: FormReviewStatus;

    if (definition.manualOnly) status = "manual";
    else if (!rawValue) status = definition.required ? "missing" : "optional";
    else if ((found?.confidence ?? 0) < 0.85) status = "review";
    else status = "complete";

    return {
      ...definition,
      rawValue,
      confidence: found?.confidence ?? 0,
      status,
    };
  });
}

export function summarizeReviewedFields(fields: ReviewedFormField[]) {
  return fields.reduce(
    (summary, field) => {
      if (field.status === "complete") summary.complete += 1;
      if (field.status === "review") summary.review += 1;
      if (field.status === "missing") summary.missing += 1;
      if (field.status === "manual") summary.manual += 1;
      return summary;
    },
    { complete: 0, review: 0, missing: 0, manual: 0 },
  );
}

export function isVisaCode(value: string): value is VisaCode {
  return ["COMMON", "F-2-R", "E-7-4R", "F-4-R", "D-2"].includes(value);
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
