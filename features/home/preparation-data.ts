import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SUPPORTED_VISAS } from "@/lib/visa-schedule/supported-visas";
import type {
  HomeDocumentRequirement,
  HomePreparationStage,
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
  actor_from: string | null;
  actor_to: string | null;
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
      .select("stage_id,visa_id,stage_order,stage_code,stage_name_kr,actor_from,actor_to,valid_from,valid_to")
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
    if (!candidateStages.length) return [];

    return [
      {
        visaCode: visa.visa_code,
        visaNameKr: visa.visa_name_kr,
        source: "supabase",
        stages: candidateStages.map<HomePreparationStage>((stage) => ({
          id: stage.stage_id,
          code: stage.stage_code,
          nameKr: stage.stage_name_kr,
          order: stage.stage_order,
          actorFrom: stage.actor_from,
          actorTo: stage.actor_to,
          documents: (documentsByStage.get(stage.stage_id) ?? [])
            .map(toHomeDocument)
            .sort((left, right) => left.displayOrder - right.displayOrder),
        })),
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
      visaCode: visa.visaCode,
      visaNameKr: visa.visaNameKr,
      source: "preview" as const,
      stages: visa.stages.map((stage, stageIndex) => ({
        id: `preview:${visa.visaCode}:stage:${stageIndex + 1}`,
        code: stage.code,
        nameKr: stage.nameKr,
        order: stageIndex + 1,
        actorFrom: stage.actorFrom,
        actorTo: stage.actorTo,
        documents: stage.documents.map((document, documentIndex) => ({
          id: `preview:${visa.visaCode}:${stageIndex + 1}:${documentIndex + 1}`,
          category: null,
          requirementStatus: "REQUIRED" as const,
          alternativeGroup: null,
          conditionNote: null,
          displayOrder: documentIndex + 1,
          ...document,
        })),
      })),
    })),
  };
}

const previewVisas = [
  {
    visaCode: "F-4-R",
    visaNameKr: "지역특화형 재외동포",
    stages: [
      {
        code: "APPLICATION_SUBMISSION",
        nameKr: "시·군 추천 신청",
        actorFrom: "재외동포 신청자",
        actorTo: "시·군 담당부서",
        documents: [
          { name: "지역특화형 비자사업 추천서 발급 신청서(재외동포)" },
          { name: "여권 사본" },
          { name: "거주/숙소제공 확인서" },
          { name: "확약서" },
        ],
      },
      {
        code: "STATUS_CHANGE_APPLICATION",
        nameKr: "체류자격 변경신청",
        actorFrom: "재외동포 신청자",
        actorTo: "출입국·외국인관서",
        documents: [
          { name: "재외동포(F-4) 통합신청서(신고서)" },
          { name: "재외동포 직업 및 연간 소득금액 신고서" },
          { name: "충청북도지사 추천서" },
        ],
      },
    ],
  },
  {
    visaCode: "E-7-4R",
    visaNameKr: "지역특화형 숙련기능인력",
    stages: [
      {
        code: "APPLICATION_SUBMISSION",
        nameKr: "광역지자체 추천 신청",
        actorFrom: "신청자·고용기업",
        actorTo: "충청북도",
        documents: [
          { name: "지역특화형 비자사업 추천서 발급 신청서" },
          { name: "여권 사본" },
          { name: "외국인등록증 사본" },
          { name: "K-POINT E-7-4 점수제 자체 심사표" },
          { name: "K-POINT E-7-4 신상기술서" },
        ],
      },
      {
        code: "EMPLOYMENT_REVIEW",
        nameKr: "고용 서류 확인",
        actorFrom: "고용기업",
        actorTo: "충청북도",
        documents: [
          { name: "외국인근로자 표준근로계약서" },
          { name: "신원보증서" },
          { name: "K-POINT E-7-4 고용기업 추천 양식" },
        ],
      },
      {
        code: "STATUS_CHANGE_APPLICATION",
        nameKr: "체류자격 변경신청",
        actorFrom: "신청자",
        actorTo: "출입국·외국인관서",
        documents: [
          { name: "통합신청서(신고서)" },
          { name: "광역지자체장 추천서" },
        ],
      },
    ],
  },
  {
    visaCode: "F-2-R",
    visaNameKr: "지역특화형 지역우수인재",
    stages: [
      {
        code: "APPLICATION_SUBMISSION",
        nameKr: "시·군 추천 신청",
        actorFrom: "지역우수인재 신청자",
        actorTo: "시·군 담당부서",
        documents: [
          { name: "지역특화형 비자사업 추천서 발급 신청서" },
          { name: "여권 사본" },
          { name: "외국인등록증 사본" },
          { name: "한국어 능력 증빙서류" },
        ],
      },
      {
        code: "RESIDENCE_EMPLOYMENT_REVIEW",
        nameKr: "취업·거주 증빙 확인",
        actorFrom: "지역우수인재 신청자",
        actorTo: "시·군 담당부서",
        documents: [
          { name: "외국인근로자 표준근로계약서" },
          { name: "거주/숙소제공 확인서" },
          { name: "재직증명서" },
        ],
      },
      {
        code: "STATUS_CHANGE_APPLICATION",
        nameKr: "체류자격 변경신청",
        actorFrom: "지역우수인재 신청자",
        actorTo: "출입국·외국인관서",
        documents: [
          { name: "지역우수인재 추천서" },
          { name: "통합신청서(신고서)" },
        ],
      },
    ],
  },
  {
    visaCode: "D-2",
    visaNameKr: "광역형 유학비자",
    stages: [
      {
        code: "SCHOOL_CONFIRMATION",
        nameKr: "학교 확인 서류 준비",
        actorFrom: "유학생",
        actorTo: "소속 대학",
        documents: [
          { name: "재학사항 신고서" },
          { name: "어학연수생 현황" },
          { name: "논문 지도교수 확인서(국문)" },
        ],
      },
      {
        code: "PART_TIME_WORK_APPLICATION",
        nameKr: "시간제취업 신청",
        actorFrom: "유학생·고용주",
        actorTo: "출입국·외국인관서",
        documents: [
          { name: "사업자(고용주) 및 신청인 서약서" },
          { name: "유학생 시간제취업 요건 준수 확인서" },
          { name: "외국인 유학생 시간제취업 확인서" },
        ],
      },
    ],
  },
];
