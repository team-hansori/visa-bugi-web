import { describe, expect, it } from "vitest";
import { buildEscalation, regionMatches, resolveRiskRoute, visaCodeMatches } from "@/features/chat/risk-routing";
import type { AgencyContactRow, RiskRoutingRow, ScreeningResult } from "@/features/chat/types";

function row(over: Partial<RiskRoutingRow>): RiskRoutingRow {
  return {
    routing_id: "r1", keyword_category: "ILLEGAL_EMPLOYMENT", user_type: "FOREIGN_WORKER",
    applies_to_visa_code: null, resolution_type: "EXTERNAL", target_agency_category: null,
    external_agency_name: "고용노동부 청주지청", external_region_scope: "청주|진천|괴산|증평|보은|옥천|영동",
    external_phone: "1350", external_url: "https://www.moel.go.kr/cheongju/",
    escalation_message_template: "임금체불은 저희가 직접 해결해드릴 수 없는 문제입니다.",
    notes: null, valid_from: null, valid_to: null,
    source_document: null, source_page: null, last_verified_at: null, ...over,
  };
}

function screening(over: Partial<ScreeningResult>): ScreeningResult {
  return { riskCategory: "ILLEGAL_EMPLOYMENT", userType: "FOREIGN_WORKER", region: null, visaCode: null, inScope: true, language: "ko", ...over };
}

function fakeQueries(rows: RiskRoutingRow[], agencies: AgencyContactRow[] = []) {
  const calls = {
    riskCategories: [] as ScreeningResult["riskCategory"][],
    agencyParams: [] as Array<{ region?: string; categoryMinor?: string; categoryMajor?: string }>,
  };
  return {
    getRiskRoutingRows: async (category: ScreeningResult["riskCategory"]) => {
      calls.riskCategories.push(category);
      return rows;
    },
    findAgency: async (params: { region?: string; categoryMinor?: string; categoryMajor?: string }) => {
      calls.agencyParams.push(params);
      return agencies;
    },
    calls,
  };
}

describe("regionMatches", () => {
  it("NATIONWIDE는 항상 매칭", () => {
    expect(regionMatches("NATIONWIDE", "청주")).toBe(true);
    expect(regionMatches("NATIONWIDE", null)).toBe(true);
  });
  it("NULL 스코프(관할 미확인)는 '지역 제한 없음'으로 해석하지 않는다", () => {
    expect(regionMatches(null, "청주")).toBe(false);
  });
  it("파이프 목록은 포함 여부로 판단, 사용자 지역 미상이면 후보 유지", () => {
    expect(regionMatches("청주|진천", "청주")).toBe(true);
    expect(regionMatches("충주|제천", "청주")).toBe(false);
    expect(regionMatches("청주|진천", null)).toBe(true);
  });
});

describe("visaCodeMatches", () => {
  it("applies_to_visa_code가 null이면 모든 비자에 적용된다(제한 없음)", () => {
    expect(visaCodeMatches(null, "E-9")).toBe(true);
    expect(visaCodeMatches(null, null)).toBe(true);
  });
  it("사용자 visaCode가 불명확하면 후보로 유지한다", () => {
    expect(visaCodeMatches("F-2-R|E-7-4R|F-4-R", null)).toBe(true);
  });
  it("파이프 목록에 있으면 매칭, 없으면 제외한다", () => {
    expect(visaCodeMatches("F-2-R|E-7-4R|F-4-R", "F-2-R")).toBe(true);
    expect(visaCodeMatches("F-2-R|E-7-4R|F-4-R", "E-9")).toBe(false);
  });
});

describe("resolveRiskRoute", () => {
  it("행이 없으면 matched:false", async () => {
    const r = await resolveRiskRoute(screening({}), fakeQueries([]));
    expect(r.matched).toBe(false);
  });

  it("지역이 확정되면 관할 행만 남긴다 (청주 vs 충주)", async () => {
    const cj = row({ routing_id: "cj" });
    const chj = row({ routing_id: "chj", external_agency_name: "고용노동부 충주지청", external_region_scope: "충주|제천|음성|단양" });
    const r = await resolveRiskRoute(screening({ region: "청주" }), fakeQueries([cj, chj]));
    expect(r.matched && r.rows.map((x) => x.routing_id)).toEqual(["cj"]);
  });

  it("지역 미상이면 모든 후보를 유지한다", async () => {
    const cj = row({ routing_id: "cj" });
    const chj = row({ routing_id: "chj", external_region_scope: "충주|제천|음성|단양" });
    const r = await resolveRiskRoute(screening({ region: null }), fakeQueries([cj, chj]));
    expect(r.matched && r.rows).toHaveLength(2);
  });

  it("지역 필터로 전부 빠지면 전체 행으로 폴백한다(안내 차단 금지)", async () => {
    const nullScope = row({ external_region_scope: null });
    const r = await resolveRiskRoute(screening({ region: "청주" }), fakeQueries([nullScope]));
    expect(r.matched && r.rows).toHaveLength(1);
  });

  it("user_type이 다르면 재사용하되 verifiedForUserType=false (재사용+한계 고지 정책)", async () => {
    const r = await resolveRiskRoute(screening({ userType: "STUDENT" }), fakeQueries([row({})]));
    expect(r.matched && r.verifiedForUserType).toBe(false);
  });

  it("applies_to_visa_code가 있고 사용자 visaCode가 목록 밖이면 매칭에서 제외한다", async () => {
    // RESIDENCE_CONDITION_VIOLATION은 F-2-R/E-7-4R/F-4-R(지역특화형 비자) 전용 — E-9 사용자에게 노출되면 안 된다.
    const restricted = row({
      keyword_category: "RESIDENCE_CONDITION_VIOLATION",
      applies_to_visa_code: "F-2-R|E-7-4R|F-4-R",
    });
    const r = await resolveRiskRoute(
      screening({ riskCategory: "RESIDENCE_CONDITION_VIOLATION", visaCode: "E-9" }),
      fakeQueries([restricted]),
    );
    expect(r.matched).toBe(false);
  });

  it("applies_to_visa_code가 있고 사용자 visaCode가 목록 안이면 매칭된다", async () => {
    const restricted = row({
      keyword_category: "RESIDENCE_CONDITION_VIOLATION",
      applies_to_visa_code: "F-2-R|E-7-4R|F-4-R",
    });
    const r = await resolveRiskRoute(
      screening({ riskCategory: "RESIDENCE_CONDITION_VIOLATION", visaCode: "F-4-R" }),
      fakeQueries([restricted]),
    );
    expect(r.matched).toBe(true);
  });

  it("IN_DOMAIN이면 target_agency_category로 agency_contacts를 조인한다", async () => {
    const inDomain = row({
      resolution_type: "IN_DOMAIN", target_agency_category: "VISA_STATUS_CHANGE",
      external_agency_name: null, external_phone: null, external_url: null, external_region_scope: null,
    });
    const agency = {
      agency_id: "a1", category_major: "FOREIGN_RESIDENT_SETTLEMENT", category_minor: "VISA_STATUS_CHANGE",
      region: "청주", department_name: "청주출입국·외국인사무소", address: null, phone: "043-000-0000",
      url: null, target_audience: null, is_user_facing: true, valid_from: null, valid_to: null,
      source_document: null, source_page: null, last_verified_at: null,
    } satisfies AgencyContactRow;
    const r = await resolveRiskRoute(screening({ riskCategory: "ILLEGAL_EMPLOYMENT", region: "청주" }), fakeQueries([inDomain], [agency]));
    expect(r.matched && r.agencies).toHaveLength(1);
  });
  it("uses matching user_type rows before applying the regional filter", async () => {
    const worker = row({ routing_id: "worker", user_type: "FOREIGN_WORKER", external_phone: "1350" });
    const student = row({ routing_id: "student", user_type: "STUDENT", external_phone: "1577-1366" });
    const r = await resolveRiskRoute(
      screening({ userType: "FOREIGN_WORKER", region: null }),
      fakeQueries([worker, student]),
    );

    expect(r.matched && r.verifiedForUserType).toBe(true);
    expect(r.matched && r.rows.map((entry) => entry.routing_id)).toEqual(["worker"]);
  });
});

it("passes the risk category and in-domain agency filters to queries", async () => {
  const inDomain = row({
    resolution_type: "IN_DOMAIN",
    target_agency_category: "VISA_STATUS_CHANGE",
    external_agency_name: null,
    external_phone: null,
    external_url: null,
    external_region_scope: null,
  });
  const agency = {
    agency_id: "a1", category_major: "FOREIGN_RESIDENT_SETTLEMENT", category_minor: "VISA_STATUS_CHANGE",
    region: "\uCCAD\uC8FC", department_name: null, address: null, phone: "043-000-0000",
    url: null, target_audience: null, is_user_facing: true, valid_from: null, valid_to: null,
    source_document: null, source_page: null, last_verified_at: null,
  } satisfies AgencyContactRow;
  const queries = fakeQueries([inDomain], [agency]);

  await resolveRiskRoute(screening({ region: "\uCCAD\uC8FC" }), queries);

  expect(queries.calls.riskCategories).toEqual(["ILLEGAL_EMPLOYMENT"]);
  expect(queries.calls.agencyParams).toEqual([{
    region: "\uCCAD\uC8FC",
    categoryMinor: "VISA_STATUS_CHANGE",
  }]);
});

describe("buildEscalation", () => {
  it("EXTERNAL 행은 external_* 필드를 verbatim 연락처로 만든다", async () => {
    const r = await resolveRiskRoute(screening({ region: "청주" }), fakeQueries([row({})]));
    if (!r.matched) throw new Error("expected match");
    const e = buildEscalation(r);
    expect(e.template).toBe("임금체불은 저희가 직접 해결해드릴 수 없는 문제입니다.");
    expect(e.contacts[0]).toMatchObject({ name: "고용노동부 청주지청", phone: "1350" });
  });
});
