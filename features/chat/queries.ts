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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function withValidWindow(builder: any): any {
  const d = today();
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
      if (region) b = b.eq("region", region);
      if (categoryMajor) b = b.eq("category_major", categoryMajor);
      if (categoryMinor) b = b.eq("category_minor", categoryMinor);
      if (targetAudience) b = b.or(`target_audience.is.null,target_audience.eq.${targetAudience}`);
      return run(withValidWindow(b));
    },
    getRiskRoutingRows(category) {
      return run(withValidWindow(client.from("risk_routing_table").select("*").eq("keyword_category", category)));
    },
  };
}
