export type VisaCode = "COMMON" | "F-2-R" | "E-7-4R" | "F-4-R" | "D-2";

export type ApplicationFormTemplateKey =
  | "common_integrated_application"
  | "f2r_recommendation_application"
  | "e74_self_assessment"
  | "generic_application_form";

export type FormFieldKind =
  | "text"
  | "date"
  | "number"
  | "choice"
  | "checkbox"
  | "address"
  | "identifier"
  | "signature";

export type FormFieldOwner =
  | "APPLICANT"
  | "EMPLOYER"
  | "SCHOOL"
  | "OFFICIAL"
  | "SIGNER";

export type FormFieldDefinition = {
  fieldIdentifier: string;
  labelKr: string;
  kind: FormFieldKind;
  filledBy: FormFieldOwner;
  required: boolean;
  manualOnly?: boolean;
  sensitive?: boolean;
  example?: string;
};

export type ApplicationFormTemplate = {
  templateKey: ApplicationFormTemplateKey;
  visaCode: VisaCode;
  titleKr: string;
  revision: string;
  documentNamePatterns: string[];
  fields: FormFieldDefinition[];
};

export type ApplicationFormOption = {
  documentRequirementId: string;
  templateKey: ApplicationFormTemplateKey;
  visaCode: VisaCode;
  visaNameKr: string;
  documentName: string;
  requirementStatus: "REQUIRED" | "OPTIONAL" | "CONDITIONAL" | "ALTERNATIVE";
  filledBy: string;
  submittedBy: string | null;
  signer: string | null;
  noticeRound: number | null;
  sourcePage: string | null;
  schemaSource: "supabase_v2" | "built_in";
};

export type ApplicationFormCatalog = {
  forms: ApplicationFormOption[];
  source: "supabase_v2" | "built_in";
};

export type FormReviewStatus = "complete" | "review" | "missing" | "manual" | "optional";

export type ReviewedFormField = FormFieldDefinition & {
  rawValue: string;
  confidence: number;
  status: FormReviewStatus;
};

export type ImageQuality = "clear" | "blurred" | "cropped" | "glare" | "unknown";

export type ApplicationFormAnalysis = {
  mode: "live" | "demo";
  templateKey: ApplicationFormTemplateKey;
  documentTitle: string;
  visaCode: VisaCode;
  pageNumber: number | null;
  imageQuality: ImageQuality;
  fields: ReviewedFormField[];
  warnings: string[];
  summary: {
    complete: number;
    review: number;
    missing: number;
    manual: number;
  };
};

export type OcrApiError = {
  error: string;
  code: string;
};

export type SavedDocumentReviewStatus =
  | "READY"
  | "NEEDS_REVIEW"
  | "INCOMPLETE";

export type SaveOcrResultRequest = {
  documentRequirementId: string | null;
  sourceKind: "image" | "hwpx";
  analysis: Pick<
    ApplicationFormAnalysis,
    | "mode"
    | "templateKey"
    | "documentTitle"
    | "visaCode"
    | "pageNumber"
    | "imageQuality"
    | "warnings"
  > & {
    fields: Array<
      Pick<
        ReviewedFormField,
        "fieldIdentifier" | "status" | "confidence" | "required"
      >
    >;
  };
};

export type SaveOcrResultResponse = {
  reviewId: string;
  reviewStatus: SavedDocumentReviewStatus;
  updatedAt: string;
};
