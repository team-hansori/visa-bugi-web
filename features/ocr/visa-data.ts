import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  isVisaCode,
  matchApplicationFormTemplate,
} from "./form-templates";
import type {
  ApplicationFormCatalog,
  ApplicationFormOption,
  VisaCode,
} from "./types";

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
      if (!stage || !visa) return [];

      const visaCode = isVisaCode(visa.visa_code) ? visa.visa_code : "COMMON";
      const template = matchApplicationFormTemplate(document.document_name, visaCode);

      return [
        {
          documentRequirementId: document.document_requirement_id,
          templateKey: template?.templateKey ?? "generic_application_form",
          visaCode,
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
    forms: builtInApplicationForms.map((form, index) => ({
      documentRequirementId: `built-in:${form.visaCode}:${index + 1}`,
      templateKey:
        matchApplicationFormTemplate(form.documentName, form.visaCode)
          ?.templateKey ?? "generic_application_form",
      visaCode: form.visaCode,
      visaNameKr: form.visaNameKr,
      documentName: form.documentName,
      requirementStatus: "REQUIRED",
      filledBy: "신청인",
      submittedBy: null,
      signer: null,
      noticeRound: form.noticeRound ?? null,
      sourcePage: null,
      schemaSource: "built_in",
    })),
  };
}

type BuiltInApplicationForm = {
  visaCode: VisaCode;
  visaNameKr: string;
  documentName: string;
  noticeRound?: number;
};

// Supabase 연결 전에도 전달받은 검수 데이터의 신청·확인 서식을 모두 볼 수
// 있도록 제공하는 읽기 전용 목록이다. 연결되면 v2 document_requirements가
// 이 목록을 대체한다.
const builtInApplicationForms: BuiltInApplicationForm[] = [
  { visaCode: "COMMON", visaNameKr: "공통 체류민원", documentName: "통합신청서(신고서)" },
  { visaCode: "COMMON", visaNameKr: "공통 체류민원", documentName: "외국인 직업 및 연간 소득금액 신고서" },
  { visaCode: "COMMON", visaNameKr: "공통 체류민원", documentName: "거주/숙소제공 확인서" },
  { visaCode: "COMMON", visaNameKr: "공통 체류민원", documentName: "신원보증서" },
  { visaCode: "COMMON", visaNameKr: "공통 체류민원", documentName: "체류허가 등 신청 취하서" },
  { visaCode: "COMMON", visaNameKr: "공통 체류민원", documentName: "위임장" },
  { visaCode: "COMMON", visaNameKr: "공통 체류민원", documentName: "여권 유효기간 범위 내 체류 확인서" },

  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "지역특화형 비자사업 추천서 발급 신청서", noticeRound: 17 },
  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "거주/숙소제공 확인서", noticeRound: 17 },
  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "확약서", noticeRound: 17 },
  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "위임장", noticeRound: 17 },
  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "지역우수인재 추천서", noticeRound: 17 },
  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "수령증", noticeRound: 17 },
  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "외국인근로자 표준근로계약서", noticeRound: 17 },
  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "지역특화형 우수인재 허가조건 변경 신청서", noticeRound: 17 },
  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "중소기업 확인서", noticeRound: 17 },
  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "영농조합법인 설립신고확인증", noticeRound: 17 },
  { visaCode: "F-2-R", visaNameKr: "지역우수인재", documentName: "농업회사법인 설립신고확인증", noticeRound: 17 },

  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "지역특화형 비자사업 추천서 발급 신청서", noticeRound: 8 },
  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "위임장", noticeRound: 8 },
  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "K-POINT E-7-4 점수제 자체 심사표", noticeRound: 8 },
  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "K-POINT E-7-4 신상기술서", noticeRound: 8 },
  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "K-POINT E-7-4 고용기업 추천 양식", noticeRound: 8 },
  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "외국인근로자 표준근로계약서", noticeRound: 8 },
  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "신원보증서", noticeRound: 8 },
  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "광역지자체장 추천서", noticeRound: 8 },
  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "통합신청서(신고서)", noticeRound: 8 },
  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "고용·연수외국인 변동사유 발생신고서", noticeRound: 8 },
  { visaCode: "E-7-4R", visaNameKr: "숙련기능인력", documentName: "K-POINT E-7-4 고용계약서 견본", noticeRound: 8 },

  { visaCode: "F-4-R", visaNameKr: "외국국적동포", documentName: "지역특화형 비자사업 추천서 발급 신청서(재외동포)", noticeRound: 12 },
  { visaCode: "F-4-R", visaNameKr: "외국국적동포", documentName: "재외동포(F-4) 통합신청서(신고서)", noticeRound: 12 },
  { visaCode: "F-4-R", visaNameKr: "외국국적동포", documentName: "재외동포 직업 및 연간 소득금액 신고서", noticeRound: 12 },
  { visaCode: "F-4-R", visaNameKr: "외국국적동포", documentName: "확약서", noticeRound: 12 },
  { visaCode: "F-4-R", visaNameKr: "외국국적동포", documentName: "위임장", noticeRound: 12 },
  { visaCode: "F-4-R", visaNameKr: "외국국적동포", documentName: "거주/숙소제공 확인서", noticeRound: 12 },
  { visaCode: "F-4-R", visaNameKr: "외국국적동포", documentName: "지역특화동포 동반가족 사항 확인서", noticeRound: 12 },

  { visaCode: "D-2", visaNameKr: "광역형 유학비자", documentName: "사업자(고용주) 및 신청인 서약서" },
  { visaCode: "D-2", visaNameKr: "광역형 유학비자", documentName: "재학사항 신고서" },
  { visaCode: "D-2", visaNameKr: "광역형 유학비자", documentName: "어학연수생 현황" },
  { visaCode: "D-2", visaNameKr: "광역형 유학비자", documentName: "논문 지도교수 확인서(국문)" },
  { visaCode: "D-2", visaNameKr: "광역형 유학비자", documentName: "유학생 시간제취업 요건 준수 확인서(제조업·국문)" },
];
