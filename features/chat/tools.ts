import "server-only";
import { tool } from "ai";
import { z } from "zod";
import type { ChatQueries } from "./queries";

/**
 * Stage 2 typed tools. 각 tool은 파라미터화된 Supabase 쿼리만 실행한다(자유 SQL 없음).
 *
 * [예약] search_admin_guide(query): admin_guide_corpus가 visa-data 검수를 거쳐
 * Supabase에 적재된 뒤 같은 Postgres 안에서(FTS → 필요 시 pgvector) 구현한다.
 * 별도 Vector DB는 도입하지 않는다. (스펙 §2)
 */
export function createChatTools(queries: ChatQueries) {
  return {
    get_visa_requirements: tool({
      description: "비자 유형의 기본 요건·모집 정보를 조회한다. 예: F-2-R, E-7-4R, F-4-R",
      inputSchema: z.object({ visa_code: z.string() }),
      execute: async ({ visa_code }) => ({
        table: "visa_requirements",
        rows: await queries.getVisaRequirements(visa_code),
      }),
    }),
    get_requirement_criteria: tool({
      description: "비자 유형의 개별 심사 조건(항목·기준값·연산자)을 조회한다.",
      inputSchema: z.object({ visa_code: z.string() }),
      execute: async ({ visa_code }) => ({
        table: "visa_requirement_criteria",
        rows: await queries.getRequirementCriteria(visa_code),
      }),
    }),
    get_process_stages: tool({
      description: "비자 신청 절차 단계(누가·누구에게·언제까지)를 조회한다. notice_round는 공고 회차.",
      inputSchema: z.object({ visa_code: z.string(), notice_round: z.number().int().optional() }),
      execute: async ({ visa_code, notice_round }) => ({
        table: "visa_process_stages",
        rows: await queries.getProcessStages(visa_code, notice_round),
      }),
    }),
    get_document_requirements: tool({
      description: "특정 절차 단계(stage_id)에서 제출해야 하는 서류 목록을 조회한다.",
      inputSchema: z.object({ stage_id: z.string() }),
      execute: async ({ stage_id }) => ({
        table: "document_requirements",
        rows: await queries.getDocumentRequirements(stage_id),
      }),
    }),
    get_quota_status: tool({
      description: "비자 유형의 최근 잔여 인원(쿼터) 스냅샷을 조회한다.",
      inputSchema: z.object({ visa_code: z.string() }),
      execute: async ({ visa_code }) => ({
        table: "visa_quota_status",
        rows: await queries.getQuotaStatus(visa_code),
      }),
    }),
    find_agency: tool({
      description:
        "충북 시군의 외국인 지원기관(가족센터·외국인지원센터·출입국 관련 부서 등) 연락처를 조회한다. " +
        "region은 시군명(청주, 충주 등), category_major는 대분류(FOREIGN_EMPLOYMENT_SUPPORT, " +
        "FOREIGN_RESIDENT_SETTLEMENT, STUDENT_WORK_STUDY_LINKAGE), category_minor는 세부 분류 코드.",
      inputSchema: z.object({
        region: z.string().optional(),
        category_major: z.string().optional(),
        category_minor: z.string().optional(),
        target_audience: z.string().optional(),
      }),
      execute: async (input) => ({
        table: "agency_contacts",
        rows: await queries.findAgency({
          region: input.region,
          categoryMajor: input.category_major,
          categoryMinor: input.category_minor,
          targetAudience: input.target_audience,
        }),
      }),
    }),
  };
}

export type ChatTools = ReturnType<typeof createChatTools>;
