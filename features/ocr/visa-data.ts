import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  applicationFormTemplates,
  matchApplicationFormTemplate,
} from "./form-templates";
import type { ApplicationFormCatalog, ApplicationFormOption } from "./types";

type DocumentRequirementRow = {
  document_requirement_id: string;
  stage_id: string;
  document_name: string;
  filled_by: string | null;
  submitted_by: string | null;
  signer: string | null;
  requirement_status: ApplicationFormOption["requirementStatus"];
  display_order: number | null;
  source_page: string | null;
  valid_from: string | null;
  valid_to: string | null;
};

type ProcessStageRow = {
  stage_id: string;
  visa_id: string;
  notice_round: number | null;
  valid_from: string | null;
  valid_to: string | null;
};

type VisaRequirementRow = {
  visa_id: string;
  visa_code: string;
  visa_name_kr: string;
  valid_from: string | null;
  valid_to: string | null;
};

export async function getApplicationFormCatalog(): Promise<ApplicationFormCatalog> {
  if (!hasSupabaseEnvironment()) return builtInCatalog();

  try {
    const supabase = await createClient();
    const { data: documentRows, error: documentError } = await supabase
      .from("document_requirements")
      .select(
        "document_requirement_id,stage_id,document_name,filled_by,submitted_by,signer,requirement_status,display_order,source_page,valid_from,valid_to",
      )
      .eq("document_category", "APPLICATION")
      .order("display_order", { ascending: true });

    if (documentError || !documentRows?.length) return builtInCatalog();

    const today = new Date().toISOString().slice(0, 10);
    const documents = (documentRows as unknown as DocumentRequirementRow[]).filter((row) =>
      isCurrentlyValid(row, today),
    );
    const stageIds = [...new Set(documents.map((item) => item.stage_id))];
    if (!stageIds.length) return builtInCatalog();

    const { data: stageRows, error: stageError } = await supabase
      .from("visa_process_stages")
      .select("stage_id,visa_id,notice_round,valid_from,valid_to")
      .in("stage_id", stageIds);

    if (stageError || !stageRows?.length) return builtInCatalog();

    const stages = (stageRows as unknown as ProcessStageRow[]).filter((row) =>
      isCurrentlyValid(row, today),
    );
    if (!stages.length) return builtInCatalog();

    const visaIds = [...new Set(stages.map((item) => item.visa_id))];
    const { data: visaRows, error: visaError } = await supabase
      .from("visa_requirements")
      .select("visa_id,visa_code,visa_name_kr,valid_from,valid_to")
      .in("visa_id", visaIds);

    if (visaError || !visaRows?.length) return builtInCatalog();

    const currentVisas = (visaRows as unknown as VisaRequirementRow[]).filter((row) =>
      isCurrentlyValid(row, today),
    );
    const stageById = new Map(stages.map((item) => [item.stage_id, item]));
    const visaById = new Map(
      currentVisas.map((item) => [item.visa_id, item]),
    );

    const forms = documents.flatMap<ApplicationFormOption>((document) => {
      const stage = stageById.get(document.stage_id);
      const visa = stage ? visaById.get(stage.visa_id) : null;
      const template = matchApplicationFormTemplate(document.document_name, visa?.visa_code);
      if (!stage || !visa || !template) return [];

      return [
        {
          documentRequirementId: document.document_requirement_id,
          templateKey: template.templateKey,
          visaCode: template.visaCode,
          visaNameKr: visa.visa_name_kr,
          documentName: document.document_name,
          requirementStatus: document.requirement_status,
          filledBy: document.filled_by ?? "신청인",
          submittedBy: document.submitted_by,
          signer: document.signer,
          noticeRound: stage.notice_round,
          sourcePage: document.source_page,
          schemaSource: "supabase_v2",
        },
      ];
    });

    return forms.length ? { forms, source: "supabase_v2" } : builtInCatalog();
  } catch {
    return builtInCatalog();
  }
}

function hasSupabaseEnvironment() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function isCurrentlyValid(
  record: { valid_from: string | null; valid_to: string | null },
  today: string,
) {
  return (!record.valid_from || record.valid_from <= today) &&
    (!record.valid_to || record.valid_to >= today);
}

function builtInCatalog(): ApplicationFormCatalog {
  return {
    source: "built_in",
    forms: applicationFormTemplates.map((template) => ({
      documentRequirementId: `built-in:${template.templateKey}`,
      templateKey: template.templateKey,
      visaCode: template.visaCode,
      visaNameKr: template.visaCode === "COMMON" ? "공통 체류민원" : template.visaCode,
      documentName: template.titleKr,
      requirementStatus: "REQUIRED",
      filledBy: "신청인",
      submittedBy: null,
      signer: null,
      noticeRound: template.templateKey === "f2r_recommendation_application" ? 17 : null,
      sourcePage: null,
      schemaSource: "built_in",
    })),
  };
}
