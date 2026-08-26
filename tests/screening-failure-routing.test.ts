import { describe, expect, it } from "vitest";

import { createNoopLogger } from "@/features/chat/logging";
import { handleChatTurn, type OrchestratorDeps } from "@/features/chat/orchestrate";
import { FALLBACK_SCREENING } from "@/features/chat/screening";

describe("screening failure routing", () => {
  it("uses the safe agency fallback rather than generating a general answer", async () => {
    let agencyLookups = 0;
    const deps: OrchestratorDeps = {
      queries: {
        getVisaRequirements: async () => [],
        getRequirementCriteria: async () => [],
        getProcessStages: async () => [],
        getDocumentRequirements: async () => [],
        getQuotaStatus: async () => [],
        getRiskRoutingRows: async () => [],
        findAgency: async () => {
          agencyLookups += 1;
          return [];
        },
      },
      logger: createNoopLogger(),
      screen: async () => FALLBACK_SCREENING,
      generateAnswer: async () => {
        throw new Error("general answer generation must not run");
      },
      translate: async (text) => text,
      answerModel: "test-model",
    };

    const result = await handleChatTurn({
      messages: [{ role: "user", content: "hello" }],
      locale: "ko",
      anonKey: "anon",
    }, deps);

    expect(result.kind).toBe("out_of_scope");
    expect(agencyLookups).toBeGreaterThan(0);
  });
});
