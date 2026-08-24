import { describe, expect, it } from "vitest";
import { handleChatTurn, type OrchestratorDeps } from "@/features/chat/orchestrate";
import { createNoopLogger } from "@/features/chat/logging";
import type { ChatQueries } from "@/features/chat/queries";
import type { RiskRoutingRow, ScreeningResult } from "@/features/chat/types";

const WAGE_ROW: RiskRoutingRow = {
  routing_id: "r1", keyword_category: "WAGE_ARREARS", user_type: "FOREIGN_WORKER",
  applies_to_visa_code: null, resolution_type: "EXTERNAL", target_agency_category: null,
  external_agency_name: "고용노동부 청주지청", external_region_scope: "NATIONWIDE",
  external_phone: "1350", external_url: "https://www.moel.go.kr/cheongju/",
  escalation_message_template: "임금체불은 저희가 직접 해결해드릴 수 없는 문제입니다.",
  notes: null, valid_from: null, valid_to: null,
  source_document: null, source_page: null, last_verified_at: null,
};

function queriesWith(over: Partial<ChatQueries>): ChatQueries {
  return {
    getVisaRequirements: async () => [],
    getRequirementCriteria: async () => [],
    getProcessStages: async () => [],
    getDocumentRequirements: async () => [],
    getQuotaStatus: async () => [],
    findAgency: async () => [],
    getRiskRoutingRows: async () => [],
    ...over,
  };
}

function depsWith(over: Partial<OrchestratorDeps>): OrchestratorDeps {
  return {
    queries: queriesWith({}),
    logger: createNoopLogger(),
    screen: async (): Promise<ScreeningResult> => ({
      riskCategory: "NONE", userType: "UNKNOWN", region: null, visaCode: null, inScope: true, language: "ko",
    }),
    generateAnswer: async () => ({ text: "답변", toolCalls: [] }),
    translate: async () => "번역문",
    answerModel: "test-model",
    ...over,
  };
}

const input = { messages: [{ role: "user" as const, content: "질문" }], locale: "ko", anonKey: "anon" };

describe("handleChatTurn — 폴백 사다리", () => {
  it("① 위험 감지 + risk 행 존재 → escalation, 연락처는 verbatim", async () => {
    const deps = depsWith({
      screen: async () => ({ riskCategory: "WAGE_ARREARS", userType: "FOREIGN_WORKER", region: null, visaCode: null, inScope: true, language: "ko" }),
      queries: queriesWith({ getRiskRoutingRows: async () => [WAGE_ROW] }),
    });
    const res = await handleChatTurn(input, deps);
    expect(res.kind).toBe("escalation");
    expect(res.escalation?.contacts[0].phone).toBe("1350");
    expect(res.escalation?.template).toContain("임금체불");
  });

  it("escalation은 ko가 아니면 translate를 거치고, ko면 template 원문을 쓴다", async () => {
    let translated = false;
    const deps = depsWith({
      screen: async () => ({ riskCategory: "WAGE_ARREARS", userType: "FOREIGN_WORKER", region: null, visaCode: null, inScope: true, language: "vi" }),
      queries: queriesWith({ getRiskRoutingRows: async () => [WAGE_ROW] }),
      translate: async () => { translated = true; return "bản dịch"; },
    });
    const res = await handleChatTurn({ ...input, locale: "vi" }, deps);
    expect(translated).toBe(true);
    expect(res.text).toBe("bản dịch");
  });

  it("② 위험 아님 → generateAnswer 경로, tool 결과에서 sources를 수집한다", async () => {
    const deps = depsWith({
      generateAnswer: async () => ({
        text: "F-2-R 요건은 다음과 같습니다",
        toolCalls: [{ toolName: "get_visa_requirements", output: { table: "visa_requirements", rows: [{ visa_id: "v1", source_document: "공고문.pdf", last_verified_at: "2026-08-12" }] } }],
      }),
    });
    const res = await handleChatTurn(input, deps);
    expect(res.kind).toBe("answer");
    expect(res.sources[0]).toEqual({ table: "visa_requirements", sourceDocument: "공고문.pdf", lastVerifiedAt: "2026-08-12" });
  });

  it("③ 모든 tool 결과가 비면 out_of_scope + FOREIGN_SUPPORT_CENTER 폴백 조회", async () => {
    const agencyCalls: unknown[] = [];
    const deps = depsWith({
      generateAnswer: async () => ({ text: "정보가 없습니다", toolCalls: [{ toolName: "get_visa_requirements", output: { table: "visa_requirements", rows: [] } }] }),
      queries: queriesWith({
        findAgency: async (p) => { agencyCalls.push(p); return []; },
      }),
    });
    const res = await handleChatTurn(input, deps);
    expect(res.kind).toBe("out_of_scope");
    expect(agencyCalls[0]).toMatchObject({ categoryMinor: "FOREIGN_SUPPORT_CENTER" });
  });

  it("④ screen이 inScope=false(폴백 포함)여도 위험이 아니면 답변 경로를 막지 않고 진행한다", async () => {
    const deps = depsWith({
      screen: async () => ({ riskCategory: "NONE", userType: "UNKNOWN", region: null, visaCode: null, inScope: false, language: "ko" }),
      generateAnswer: async () => ({ text: "답", toolCalls: [{ toolName: "find_agency", output: { table: "agency_contacts", rows: [{ agency_id: "a1" }] } }] }),
    });
    const res = await handleChatTurn(input, deps);
    expect(res.kind).toBe("answer");
  });

  it("generateAnswer가 던지면 kind=error + locale 정적 안내문", async () => {
    const deps = depsWith({ generateAnswer: async () => { throw new Error("down"); } });
    const res = await handleChatTurn(input, deps);
    expect(res.kind).toBe("error");
    expect(res.text.length).toBeGreaterThan(0);
  });

  it("verbatim 위반이 로그에 집계된다", async () => {
    const logged: number[] = [];
    const deps = depsWith({
      generateAnswer: async () => ({ text: "010-1234-5678로 전화하세요", toolCalls: [{ toolName: "find_agency", output: { table: "agency_contacts", rows: [{ agency_id: "a1", phone: "1350" }] } }] }),
      logger: { ...createNoopLogger(), logTurn: async (e) => { logged.push(e.verbatimViolationCount); } },
    });
    await handleChatTurn(input, deps);
    expect(logged[0]).toBeGreaterThan(0);
  });
});
