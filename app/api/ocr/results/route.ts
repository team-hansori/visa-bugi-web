import { createClient } from "@/lib/supabase/server";
import { getApplicationFormTemplate } from "@/features/ocr/form-templates";
import type {
  ApplicationFormTemplate,
  FormReviewStatus,
  ImageQuality,
  OcrApiError,
  SaveOcrResultResponse,
  SavedDocumentReviewStatus,
} from "@/features/ocr/types";

const fieldStatuses = new Set<FormReviewStatus>([
  "complete",
  "review",
  "missing",
  "manual",
  "optional",
]);
const imageQualities = new Set<ImageQuality>([
  "clear",
  "blurred",
  "cropped",
  "glare",
  "unknown",
]);
const sourceKinds = new Set(["image", "hwpx", "pdf"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ValidatedRequest = {
  documentRequirementId: string | null;
  sourceKind: "image" | "hwpx" | "pdf";
  templateKey: string;
  visaCode: string;
  documentTitle: string;
  pageNumber: number | null;
  imageQuality: ImageQuality;
  warnings: string[];
  fields: Array<{
    fieldIdentifier: string;
    status: FormReviewStatus;
    confidence: number;
    required: boolean;
  }>;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return errorResponse(
      "진행상황 저장소가 아직 연결되지 않았습니다.",
      "STORAGE_NOT_CONFIGURED",
      503,
    );
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return errorResponse(
      "사용자 세션을 확인하지 못했습니다.",
      "AUTH_REQUIRED",
      401,
    );
  }

  const rawBody = await request.json().catch(() => null);
  const input = validateRequest(rawBody);
  if (!input) {
    return errorResponse(
      "저장할 OCR 결과 형식을 확인해 주세요.",
      "INVALID_OCR_RESULT",
      400,
    );
  }

  const requiredMissingCount = input.fields.filter(
    (field) => field.required && field.status === "missing",
  ).length;
  if (requiredMissingCount > 0) {
    return errorResponse(
      `필수 미작성 항목 ${requiredMissingCount}개를 작성한 뒤 다시 분석해 주세요.`,
      "REQUIRED_FIELDS_MISSING",
      422,
    );
  }

  const summary = summarizeFields(input.fields);
  const reviewStatus = getReviewStatus(summary);
  const documentKey = createDocumentKey(input);
  const updatedAt = new Date().toISOString();
  const row = {
    user_id: authData.user.id,
    document_key: documentKey,
    document_requirement_id: input.documentRequirementId,
    template_key: input.templateKey,
    visa_code: input.visaCode,
    document_title: input.documentTitle,
    source_kind: input.sourceKind,
    review_status: reviewStatus,
    page_number: input.pageNumber,
    image_quality: input.imageQuality,
    complete_count: summary.complete,
    review_count: summary.review,
    missing_count: summary.missing,
    manual_count: summary.manual,
    field_statuses: input.fields,
    warning_codes: input.warnings,
    updated_at: updatedAt,
  };

  const { data, error } = await supabase
    .from("user_document_reviews")
    .upsert(row, { onConflict: "user_id,document_key" })
    .select("review_id,review_status,updated_at")
    .single();

  if (error || !data) {
    return errorResponse(
      "OCR 결과를 저장하지 못했습니다.",
      "STORAGE_WRITE_FAILED",
      503,
    );
  }

  return noStoreJson<SaveOcrResultResponse>({
    reviewId: String(data.review_id),
    reviewStatus: data.review_status as SavedDocumentReviewStatus,
    updatedAt: String(data.updated_at),
  });
}

function validateRequest(value: unknown): ValidatedRequest | null {
  if (!isRecord(value) || !isRecord(value.analysis)) return null;
  const analysis = value.analysis;
  if (analysis.mode !== "live") return null;

  const documentRequirementId = value.documentRequirementId;
  if (
    documentRequirementId !== null &&
    (typeof documentRequirementId !== "string" || !uuidPattern.test(documentRequirementId))
  ) {
    return null;
  }
  if (typeof value.sourceKind !== "string" || !sourceKinds.has(value.sourceKind)) return null;
  if (!isShortText(analysis.templateKey, 120)) return null;
  const template = getApplicationFormTemplate(analysis.templateKey);
  if (!template) return null;
  if (!isShortText(analysis.visaCode, 30)) return null;
  if (!isShortText(analysis.documentTitle, 200)) return null;
  if (
    analysis.pageNumber !== null &&
    (typeof analysis.pageNumber !== "number" ||
      !Number.isInteger(analysis.pageNumber) ||
      analysis.pageNumber < 1)
  ) return null;
  if (typeof analysis.imageQuality !== "string" || !imageQualities.has(analysis.imageQuality as ImageQuality)) return null;
  if (!Array.isArray(analysis.warnings) || analysis.warnings.length > 16) return null;
  if (!analysis.warnings.every((warning) => isShortText(warning, 80))) return null;
  if (!Array.isArray(analysis.fields) || analysis.fields.length === 0 || analysis.fields.length > 120) return null;

  const fields = analysis.fields.map((field) => {
    if (!isRecord(field)) return null;
    if (!isShortText(field.fieldIdentifier, 120)) return null;
    if (typeof field.status !== "string" || !fieldStatuses.has(field.status as FormReviewStatus)) return null;
    if (typeof field.confidence !== "number" || !Number.isFinite(field.confidence)) return null;
    if (typeof field.required !== "boolean") return null;
    return {
      fieldIdentifier: field.fieldIdentifier,
      status: field.status as FormReviewStatus,
      confidence: Math.max(0, Math.min(1, field.confidence)),
      required: field.required,
    };
  });
  if (fields.some((field) => field === null)) return null;
  const templateFields = validateTemplateFields(
    template,
    fields as ValidatedRequest["fields"],
  );
  if (!templateFields) return null;

  return {
    documentRequirementId,
    sourceKind: value.sourceKind as "image" | "hwpx" | "pdf",
    templateKey: analysis.templateKey,
    visaCode: analysis.visaCode,
    documentTitle: analysis.documentTitle.trim(),
    pageNumber: analysis.pageNumber as number | null,
    imageQuality: analysis.imageQuality as ImageQuality,
    warnings: analysis.warnings as string[],
    fields: templateFields,
  };
}

function validateTemplateFields(
  template: ApplicationFormTemplate,
  submittedFields: ValidatedRequest["fields"],
) {
  if (submittedFields.length !== template.fields.length) return null;

  const submittedByIdentifier = new Map<
    string,
    ValidatedRequest["fields"][number]
  >();
  for (const field of submittedFields) {
    if (submittedByIdentifier.has(field.fieldIdentifier)) return null;
    submittedByIdentifier.set(field.fieldIdentifier, field);
  }

  const validatedFields: ValidatedRequest["fields"] = [];
  for (const definition of template.fields) {
    const submitted = submittedByIdentifier.get(definition.fieldIdentifier);
    if (
      !submitted ||
      submitted.required !== definition.required ||
      !isStatusValidForDefinition(definition, submitted.status)
    ) {
      return null;
    }

    validatedFields.push({
      ...submitted,
      required: definition.required,
    });
  }

  return validatedFields;
}

function isStatusValidForDefinition(
  definition: ApplicationFormTemplate["fields"][number],
  status: FormReviewStatus,
) {
  if (definition.manualOnly) return status === "manual";
  if (definition.required) {
    return status === "complete" || status === "review" || status === "missing";
  }
  return status === "complete" || status === "review" || status === "optional";
}

function summarizeFields(fields: ValidatedRequest["fields"]) {
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

function getReviewStatus(summary: ReturnType<typeof summarizeFields>): SavedDocumentReviewStatus {
  if (summary.missing > 0) return "INCOMPLETE";
  if (summary.review > 0 || summary.manual > 0) return "NEEDS_REVIEW";
  return "READY";
}

function createDocumentKey(input: ValidatedRequest) {
  if (input.documentRequirementId) return `requirement:${input.documentRequirementId}`;
  const normalizedTitle = input.documentTitle
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `ocr:${input.visaCode}:${input.templateKey}:${normalizedTitle || "untitled"}`.slice(0, 300);
}

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShortText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function errorResponse(error: string, code: string, status: number) {
  return noStoreJson<OcrApiError>({ error, code }, status);
}

function noStoreJson<T>(body: T, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
