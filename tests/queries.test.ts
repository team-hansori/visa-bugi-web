import { describe, expect, it } from "vitest";
import { createChatQueries, todayInSeoul } from "@/features/chat/queries";
import { createFakeSupabase } from "./helpers/fake-supabase";

const TODAY = todayInSeoul();

describe("todayInSeoul", () => {
  it("uses the Korean calendar date across the UTC day boundary", () => {
    expect(todayInSeoul(new Date("2026-08-24T14:59:00.000Z"))).toBe("2026-08-24");
    expect(todayInSeoul(new Date("2026-08-24T15:00:00.000Z"))).toBe("2026-08-25");
  });
});

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
    // region은 정확 일치가 아닌 부분일치: agency_contacts.region 실값이
    // "청주(관할:전지역)", "옥천,영동"처럼 정규화된 시군명과 다르기 때문 (data-contract-reviewer 확인)
    expect(calls[0].filters).toContain("ilike:region:%청주%");
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
