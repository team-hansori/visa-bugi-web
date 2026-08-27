import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SUPPORTED_VISAS } from "@/lib/visa-schedule/supported-visas";
import type {
  HomeDocumentRequirement,
  HomeVisaPreparation,
  HomeVisaPreparationCatalog,
  RequirementStatus,
} from "./preparation-model";

type VisaRow = {
  visa_id: string;
  visa_code: string;
  visa_name_kr: string;
  valid_from: string | null;
  valid_to: string | null;
};

type StageRow = {
  stage_id: string;
  visa_id: string;
  stage_order: number;
  stage_code: string;
  stage_name_kr: string;
  valid_from: string | null;
  valid_to: string | null;
};

type DocumentRow = {
  document_requirement_id: string;
  stage_id: string;
  document_name: string;
  document_category: string | null;
  requirement_status: string;
  alternative_group: string | null;
  condition_note: string | null;
  display_order: number | null;
  valid_from: string | null;
  valid_to: string | null;
};

export async function getHomeVisaPreparationCatalog(): Promise<HomeVisaPreparationCatalog> {
  if (!isSupabaseConfigured()) return previewCatalog();

  try {
    const today = new Date().toISOString().slice(0, 10);
    const supabase = await createClient();
    const { data: visaData, error: visaError } = await supabase
      .from("visa_requirements")
      .select("visa_id,visa_code,visa_name_kr,valid_from,valid_to")
      .in(
        "visa_code",
        SUPPORTED_VISAS.map((visa) => visa.id),
      );

    if (visaError || !visaData?.length) return previewCatalog();
    const visas = (visaData as VisaRow[]).filter((row) => isCurrentlyValid(row, today));
    if (!visas.length) return previewCatalog();

    const { data: stageData, error: stageError } = await supabase
      .from("visa_process_stages")
      .select("stage_id,visa_id,stage_order,stage_code,stage_name_kr,valid_from,valid_to")
      .in(
        "visa_id",
        visas.map((visa) => visa.visa_id),
      )
      .order("stage_order", { ascending: true });

    if (stageError || !stageData?.length) return previewCatalog();
    const stages = (stageData as StageRow[]).filter((row) => isCurrentlyValid(row, today));
    if (!stages.length) return previewCatalog();

    const { data: documentData, error: documentError } = await supabase
      .from("document_requirements")
      .select(
        "document_requirement_id,stage_id,document_name,document_category,requirement_status,alternative_group,condition_note,display_order,valid_from,valid_to",
      )
      .in(
        "stage_id",
        stages.map((stage) => stage.stage_id),
      )
      .order("display_order", { ascending: true });

    if (documentError || !documentData?.length) return previewCatalog();
    const documents = (documentData as DocumentRow[]).filter((row) =>
      isCurrentlyValid(row, today),
    );
    const liveItems = buildLivePreparations(visas, stages, documents);
    const liveByVisa = new Map(liveItems.map((item) => [item.visaCode, item]));
    const previews = previewCatalog().visas;

    return {
      visas: previews.map((preview) => liveByVisa.get(preview.visaCode) ?? preview),
    };
  } catch {
    return previewCatalog();
  }
}

function buildLivePreparations(
  visas: VisaRow[],
  stages: StageRow[],
  documents: DocumentRow[],
): HomeVisaPreparation[] {
  const documentsByStage = new Map<string, DocumentRow[]>();
  for (const document of documents) {
    const current = documentsByStage.get(document.stage_id) ?? [];
    current.push(document);
    documentsByStage.set(document.stage_id, current);
  }

  return visas.flatMap<HomeVisaPreparation>((visa) => {
    const candidateStages = stages
      .filter((stage) => stage.visa_id === visa.visa_id && documentsByStage.has(stage.stage_id))
      .sort((left, right) => left.stage_order - right.stage_order);
    const selectedStage =
      candidateStages.find((stage) => stage.stage_code === "APPLICATION_SUBMISSION") ??
      candidateStages[0];
    if (!selectedStage) return [];

    return [
      {
        visaCode: visa.visa_code,
        visaNameKr: visa.visa_name_kr,
        stageNameKr: selectedStage.stage_name_kr,
        source: "supabase",
        documents: (documentsByStage.get(selectedStage.stage_id) ?? [])
          .map(toHomeDocument)
          .sort((left, right) => left.displayOrder - right.displayOrder),
      },
    ];
  });
}

function toHomeDocument(row: DocumentRow): HomeDocumentRequirement {
  return {
    id: row.document_requirement_id,
    name: row.document_name,
    category: row.document_category,
    requirementStatus: normalizeRequirementStatus(row.requirement_status),
    alternativeGroup: row.alternative_group,
    conditionNote: row.condition_note,
    displayOrder: row.display_order ?? 999,
  };
}

function normalizeRequirementStatus(value: string): RequirementStatus {
  if (
    value === "OPTIONAL" ||
    value === "CONDITIONAL" ||
    value === "ALTERNATIVE"
  ) {
    return value;
  }
  return "REQUIRED";
}

function isSupabaseConfigured() {
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

function previewCatalog(): HomeVisaPreparationCatalog {
  return {
    visas: previewVisas.map((visa) => ({
      ...visa,
      source: "preview" as const,
      documents: visa.documents.map((document, index) => ({
        id: `preview:${visa.visaCode}:${index + 1}`,
        category: null,
        requirementStatus: "REQUIRED" as const,
        alternativeGroup: null,
        conditionNote: null,
        displayOrder: index + 1,
        ...document,
      })),
    })),
  };
}

const previewVisas = [
  {
    visaCode: "F-4-R",
    visaNameKr: "지역특화형 재외동포",
    stageNameKr: "신청 접수",
    documents: [
      { name: "지역특화형 비자사업 추천서 발급 신청서(재외동포)" },
      { name: "재외동포(F-4) 통합신청서(신고서)" },
      { name: "여권 사본" },
      { name: "거주/숙소제공 확인서" },
      { name: "확약서" },
    ],
  },
  {
    visaCode: "E-7-4R",
    visaNameKr: "지역특화형 숙련기능인력",
    stageNameKr: "서류 제출",
    documents: [
      { name: "지역특화형 비자사업 추천서 발급 신청서" },
      { name: "여권 사본" },
      { name: "외국인등록증 사본" },
      { name: "K-POINT E-7-4 점수제 자체 심사표" },
      { name: "외국인근로자 표준근로계약서" },
      { name: "신원보증서" },
    ],
  },
  {
    visaCode: "F-2-R",
    visaNameKr: "지역특화형 지역우수인재",
    stageNameKr: "시·군 추천 신청",
    documents: [
      { name: "지역특화형 비자사업 추천서 발급 신청서" },
      { name: "여권 사본" },
      { name: "외국인등록증 사본" },
      { name: "외국인근로자 표준근로계약서" },
      { name: "거주/숙소제공 확인서" },
      { name: "한국어 능력 증빙서류" },
    ],
  },
  {
    visaCode: "D-2",
    visaNameKr: "광역형 유학비자",
    stageNameKr: "서류 준비",
    documents: [
      { name: "사업자(고용주) 및 신청인 서약서" },
      { name: "재학사항 신고서" },
      { name: "어학연수생 현황" },
      { name: "논문 지도교수 확인서(국문)" },
      { name: "유학생 시간제취업 요건 준수 확인서" },
    ],
  },
];

