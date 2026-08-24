import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyContactRow, RiskCategory, RiskRoutingRow } from "./types";

export type FindAgencyParams = {
  region?: string;
  categoryMajor?: string;
  categoryMinor?: string;
  targetAudience?: string;
};

export type ChatQueries = {
  getVisaRequirements(visaCode: string): Promise<Record<string, unknown>[]>;
  getRequirementCriteria(visaCode: string): Promise<Record<string, unknown>[]>;
  getProcessStages(visaCode: string, noticeRound?: number): Promise<Record<string, unknown>[]>;
  getDocumentRequirements(stageId: string): Promise<Record<string, unknown>[]>;
  getQuotaStatus(visaCode: string): Promise<Record<string, unknown>[]>;
  findAgency(params: FindAgencyParams): Promise<AgencyContactRow[]>;
  getRiskRoutingRows(category: RiskCategory): Promise<RiskRoutingRow[]>;
};

export function todayInSeoul(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  if (!year || !month || !day) throw new Error("could not format Seoul date");
  return `${year}-${month}-${day}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function withValidWindow(builder: any): any {
  const d = todayInSeoul();
  return builder
    .or(`valid_from.is.null,valid_from.lte.${d}`)
    .or(`valid_to.is.null,valid_to.gte.${d}`);
}

async function run<T>(builder: any): Promise<T[]> {
  const { data, error } = await builder;
  if (error) throw new Error(`supabase query failed: ${error.message}`);
  return (data ?? []) as T[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function createChatQueries(client: SupabaseClient): ChatQueries {
  return {
    getVisaRequirements(visaCode) {
      return run(withValidWindow(client.from("visa_requirements").select("*").eq("visa_code", visaCode)));
    },
    getRequirementCriteria(visaCode) {
      return run(withValidWindow(client.from("visa_requirement_criteria").select("*").eq("visa_code", visaCode)));
    },
    getProcessStages(visaCode, noticeRound) {
      let b = client.from("visa_process_stages").select("*").eq("visa_code", visaCode);
      if (noticeRound !== undefined) b = b.eq("notice_round", noticeRound);
      return run(withValidWindow(b));
    },
    getDocumentRequirements(stageId) {
      return run(withValidWindow(client.from("document_requirements").select("*").eq("stage_id", stageId)));
    },
    getQuotaStatus(visaCode) {
      // 시계열 로그 테이블: valid_from/to 없음, 최신 스냅샷 5건
      return run(
        client
          .from("visa_quota_status")
          .select("*")
          .eq("visa_code", visaCode)
          .order("as_of_date", { ascending: false })
          .limit(5),
      );
    },
    findAgency({ region, categoryMajor, categoryMinor, targetAudience }) {
      let b = client.from("agency_contacts").select("*").eq("is_user_facing", true);
      // region은 부분일치(ilike): 실제 값이 "청주(관할:전지역)", "옥천,영동"처럼
      // 정규화된 시군명과 정확히 일치하지 않는 자유 텍스트라 eq로는 매칭되지 않는다.
      if (region) b = b.ilike("region", `%${region}%`);
      if (categoryMajor) b = b.eq("category_major", categoryMajor);
      if (categoryMinor) b = b.eq("category_minor", categoryMinor);
      if (targetAudience) b = b.or(`target_audience.is.null,target_audience.eq.${targetAudience}`);
      // 명시적 정렬: ORDER BY 없이는 반환 순서가 보장되지 않아, 폴백 시 "처음 N개"
      // 선택(예: 범용 접점 안내)이 호출마다 달라질 수 있다 — agency_id로 고정한다.
      return run(withValidWindow(b).order("agency_id", { ascending: true }));
    },
    getRiskRoutingRows(category) {
      // routing_id 정렬로 rows[0] 선택(템플릿 대표행)을 결정론적으로 만든다.
      return run(
        withValidWindow(
          client.from("risk_routing_table").select("*").eq("keyword_category", category),
        ).order("routing_id", { ascending: true }),
      );
    },
  };
}
