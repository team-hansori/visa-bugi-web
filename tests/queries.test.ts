import { describe, expect, it } from "vitest";
import { createChatQueries } from "@/features/chat/queries";
import { createFakeSupabase } from "./helpers/fake-supabase";

const TODAY = new Date().toISOString().slice(0, 10);

describe("createChatQueries", () => {
  it("getVisaRequirements는 visa_code와 유효기간 필터를 건다", async () => {
    const { client, calls } = createFakeSupabase({ visa_requirements: [{ visa_code: "F-2-R" }] });
    const q = createChatQueries(client);
    const rows = await q.getVisaRequirements("F-2-R");
    expect(rows).toEqual([{ visa_code: "F-2-R" }]);
    expect(calls[0].table).toBe("visa_requirements");
    expect(calls[0].filters).toContain("eq:visa_code:F-2-R");
    expect(calls[0].filters).toContain(`or:valid_from.is.null,valid_from.lte.${TODAY}`);
    expect(calls[0].filters).toContain(`or:valid_to.is.null,valid_to.gte.${TODAY}`);
  });

  it("findAgency는 is_user_facing=true를 강제하고 전달된 파라미터만 필터한다", async () => {
    const { client, calls } = createFakeSupabase({ agency_contacts: [] });
    const q = createChatQueries(client);
    await q.findAgency({ region: "청주", categoryMinor: "VISA_STATUS_CHANGE" });
    expect(calls[0].filters).toContain("eq:is_user_facing:true");
    expect(calls[0].filters).toContain("eq:region:청주");
    expect(calls[0].filters).toContain("eq:category_minor:VISA_STATUS_CHANGE");
    expect(calls[0].filters.some((f) => f.startsWith("eq:category_major"))).toBe(false);
  });

  it("findAgency에 targetAudience를 주면 null 허용 or 필터를 쓴다", async () => {
    const { client, calls } = createFakeSupabase({ agency_contacts: [] });
    const q = createChatQueries(client);
    await q.findAgency({ targetAudience: "STUDENT" });
    expect(calls[0].filters).toContain("or:target_audience.is.null,target_audience.eq.STUDENT");
  });

  it("getRiskRoutingRows는 keyword_category로 필터한다", async () => {
    const { client, calls } = createFakeSupabase({ risk_routing_table: [] });
    const q = createChatQueries(client);
    await q.getRiskRoutingRows("WAGE_ARREARS");
    expect(calls[0].table).toBe("risk_routing_table");
    expect(calls[0].filters).toContain("eq:keyword_category:WAGE_ARREARS");
  });

  it("getProcessStages는 notice_round가 있을 때만 회차 필터를 건다", async () => {
    const { client, calls } = createFakeSupabase({ visa_process_stages: [] });
    const q = createChatQueries(client);
    await q.getProcessStages("F-4-R", 12);
    expect(calls[0].filters).toContain("eq:notice_round:12");
    await q.getProcessStages("F-4-R");
    expect(calls[1].filters.some((f) => f.startsWith("eq:notice_round"))).toBe(false);
  });
});
