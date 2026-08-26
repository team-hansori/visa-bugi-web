// upstream 원본 shape (visa-data의 visa_process_stages 검수 전 초안 컬럼).
// 이 타입은 이 파일 밖으로 export하지 않는다 — 컬럼명이 바뀌면 여기와 toChecklistItem만 고친다.
type VisaProcessStageRow = {
  stage_id: string;
  visa_id: string;
  stage_order: number;
  stage_name_kr: string;
  stage_start_date: string | null;
  stage_end_date: string | null;
  notice_round: number | null;
  source_document: string;
};

export type ChecklistItem = {
  id: string;
  order: number;
  title: string;
  startDate?: string;
  endDate?: string;
  noticeRound?: number;
  referenceEvent?: string;
  offsetDays?: number;
  source: string;
};

// 실제 visa-data 원문을 복사하지 않은 합성 mock 데이터. source_document는 항상 "mock-data".
const MOCK_STAGE_ROWS: VisaProcessStageRow[] = [
  {
    stage_id: "mock-e74r-1",
    visa_id: "E-7-4R",
    stage_order: 1,
    stage_name_kr: "고용노동부 특정활동 확인서 발급",
    stage_start_date: "2026-08-01",
    stage_end_date: "2026-08-31",
    notice_round: 1,
    source_document: "mock-data",
  },
  {
    stage_id: "mock-e74r-2",
    visa_id: "E-7-4R",
    stage_order: 2,
    stage_name_kr: "체류자격 변경허가 신청",
    stage_start_date: "2026-09-01",
    stage_end_date: "2026-09-30",
    notice_round: 1,
    source_document: "mock-data",
  },
  {
    stage_id: "mock-f2r-1",
    visa_id: "F-2-R",
    stage_order: 1,
    stage_name_kr: "거주자격 점수제 서류 제출",
    stage_start_date: "2026-09-10",
    stage_end_date: "2026-09-25",
    notice_round: 3,
    source_document: "mock-data",
  },
];

function toChecklistItem(row: VisaProcessStageRow): ChecklistItem {
  return {
    id: row.stage_id,
    order: row.stage_order,
    title: row.stage_name_kr,
    startDate: row.stage_start_date ?? undefined,
    endDate: row.stage_end_date ?? undefined,
    noticeRound: row.notice_round ?? undefined,
    source: row.source_document,
  };
}

export function getDefaultChecklist(targetVisaId: string): ChecklistItem[] {
  return MOCK_STAGE_ROWS.filter((row) => row.visa_id === targetVisaId)
    .sort((a, b) => a.stage_order - b.stage_order)
    .map(toChecklistItem);
}
