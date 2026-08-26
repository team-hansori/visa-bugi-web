import { describe, expect, it } from "vitest";
import { buildAnswerSystemPrompt } from "@/features/chat/prompts";
import { createChatTools } from "@/features/chat/tools";
import type { ChatQueries } from "@/features/chat/queries";

function stubQueries(): { queries: ChatQueries; log: string[] } {
  const log: string[] = [];
  const queries: ChatQueries = {
    getVisaRequirements: async (v) => { log.push(`req:${v}`); return [{ visa_code: v }]; },
    getRequirementCriteria: async (v) => { log.push(`crit:${v}`); return []; },
    getProcessStages: async (v, r) => { log.push(`stages:${v}:${r ?? "-"}`); return []; },
    getDocumentRequirements: async (s) => { log.push(`docs:${s}`); return []; },
    getQuotaStatus: async (v) => { log.push(`quota:${v}`); return []; },
    findAgency: async (p) => { log.push(`agency:${p.region ?? "-"}`); return []; },
    getRiskRoutingRows: async () => [],
  };
  return { queries, log };
}

describe("createChatTools", () => {
  it("6개 tool을 노출한다 (search_admin_guide는 예약이므로 없음)", () => {
    const { queries } = stubQueries();
    const tools = createChatTools(queries);
    expect(Object.keys(tools).sort()).toEqual([
      "find_agency", "get_document_requirements", "get_process_stages",
      "get_quota_status", "get_requirement_criteria", "get_visa_requirements",
    ]);
  });

  it("tool execute가 쿼리를 호출하고 {table, rows}를 반환한다", async () => {
    const { queries, log } = stubQueries();
    const tools = createChatTools(queries);
    const out = await tools.get_visa_requirements.execute!({ visa_code: "F-2-R" }, {} as never);
    expect(out).toEqual({ table: "visa_requirements", rows: [{ visa_code: "F-2-R" }] });
    expect(log).toContain("req:F-2-R");
  });
});

describe("buildAnswerSystemPrompt", () => {
  it("핵심 정책 문구를 포함한다", () => {
    const p = buildAnswerSystemPrompt("vi");
    expect(p).toContain("tool");
    expect(p).toContain("전화번호");
    expect(p).toContain("vi");
  });
});
