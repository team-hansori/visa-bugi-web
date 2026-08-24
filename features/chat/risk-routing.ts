import type { ChatQueries } from "./queries";
import type {
  AgencyContactRow, EscalationContact, EscalationPayload, RiskRoutingRow, ScreeningResult,
} from "./types";

export type RiskRouteResult =
  | { matched: false }
  | {
      matched: true;
      rows: RiskRoutingRow[];
      verifiedForUserType: boolean;
      agencies: AgencyContactRow[];
    };

/**
 * external_region_scope 매칭.
 * - "NATIONWIDE": 전국 확인됨 → 항상 매칭
 * - null: 관할 미확인 → 매칭 아님 (스펙: NULL을 '지역 제한 없음'으로 해석 금지)
 * - "청주|진천|...": 사용자 지역이 목록에 있으면 매칭. 사용자 지역 미상이면 후보 유지(true).
 */
export function regionMatches(scope: string | null, region: string | null): boolean {
  if (scope === "NATIONWIDE") return true;
  if (scope === null || scope === "") return false;
  if (region === null) return true;
  return scope.split("|").includes(region);
}

export async function resolveRiskRoute(
  screening: ScreeningResult,
  queries: Pick<ChatQueries, "getRiskRoutingRows" | "findAgency">,
): Promise<RiskRouteResult> {
  if (screening.riskCategory === "NONE") return { matched: false };

  const all = await queries.getRiskRoutingRows(screening.riskCategory);
  if (all.length === 0) return { matched: false };

  const verifiedForUserType = all.some((r) => r.user_type === screening.userType);

  // 지역 필터. 전부 탈락하면 안내를 차단하는 대신 전체 행으로 폴백한다
  // (scope 정보는 UI에 verbatim으로 표기되므로 사용자가 판단 가능).
  const regionFiltered = all.filter((r) => regionMatches(r.external_region_scope, screening.region));
  const rows = regionFiltered.length > 0 ? regionFiltered : all;

  // IN_DOMAIN 행이 하나라도 있으면 target_agency_category로 스코프 내 기관을 조인한다.
  const inDomain = rows.filter((r) => r.resolution_type === "IN_DOMAIN" && r.target_agency_category);
  let agencies: AgencyContactRow[] = [];
  if (inDomain.length > 0) {
    agencies = await queries.findAgency({
      region: screening.region ?? undefined,
      categoryMinor: inDomain[0].target_agency_category ?? undefined,
    });
  }

  return { matched: true, rows, verifiedForUserType, agencies };
}

export function buildEscalation(result: Extract<RiskRouteResult, { matched: true }>): EscalationPayload {
  const contacts: EscalationContact[] = [];

  for (const row of result.rows) {
    if (row.resolution_type === "EXTERNAL" && row.external_agency_name) {
      contacts.push({
        name: row.external_agency_name,
        phone: row.external_phone,
        url: row.external_url,
        regionScope: row.external_region_scope,
        department: null,
        address: null,
      });
    }
  }
  for (const a of result.agencies) {
    contacts.push({
      name: a.department_name ?? a.category_minor,
      phone: a.phone,
      url: a.url,
      regionScope: a.region,
      department: a.department_name,
      address: a.address,
    });
  }

  return {
    template: result.rows[0].escalation_message_template,
    verifiedForUserType: result.verifiedForUserType,
    contacts,
  };
}
