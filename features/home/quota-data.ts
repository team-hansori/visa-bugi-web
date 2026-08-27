import { createClient } from "@/lib/supabase/server";
import {
  buildVisaQuotaItems,
  type QuotaPolicyRow,
  type QuotaSnapshotRow,
  type VisaQuotaItem,
  type VisaRequirementRow,
} from "./quota-model";

export type VisaQuotaOverview = {
  source: "supabase" | "preview";
  items: VisaQuotaItem[];
};

export async function getVisaQuotaOverview(): Promise<VisaQuotaOverview> {
  if (!isSupabaseConfigured()) return previewOverview();

  try {
    const supabase = await createClient();
    const { data: visaData, error: visaError } = await supabase
      .from("visa_requirements")
      .select("visa_id,visa_code,visa_name_kr,last_verified_at")
      .order("visa_code", { ascending: true });
    if (visaError || !visaData?.length) return previewOverview();

    const visas = visaData as VisaRequirementRow[];
    const { data: policyData, error: policyError } = await supabase
      .from("visa_quota_policies")
      .select(
        "quota_policy_id,visa_id,quota_type,quota_unit,valid_from,valid_to",
      )
      .in(
        "visa_id",
        visas.map((visa) => visa.visa_id),
      );
    if (policyError || !policyData) return previewOverview();

    const policies = policyData as QuotaPolicyRow[];
    const policyIds = policies.map((policy) => policy.quota_policy_id);
    const snapshots = policyIds.length
      ? await supabase
          .from("visa_quota_snapshots")
          .select(
            "quota_policy_id,notice_round,as_of_date,scope_type,scope_name,allocated_quota,remaining_quota",
          )
          .in("quota_policy_id", policyIds)
          .order("as_of_date", { ascending: false })
          .limit(200)
      : { data: [], error: null };
    if (snapshots.error || !snapshots.data) return previewOverview();

    return {
      source: "supabase",
      items: buildVisaQuotaItems(
        visas,
        policies,
        snapshots.data as QuotaSnapshotRow[],
      ),
    };
  } catch {
    return previewOverview();
  }
}

function previewOverview(): VisaQuotaOverview {
  return {
    source: "preview",
    items: buildVisaQuotaItems(
      previewVisas,
      previewPolicies,
      previewSnapshots,
      "2026-08-27",
    ),
  };
}

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

const previewVisas: VisaRequirementRow[] = [
  {
    visa_id: "a228433b-abe4-4785-8496-3e1cb3d597c1",
    visa_code: "F-2-R",
    visa_name_kr: "지역특화형 지역우수인재",
    last_verified_at: "2026-08-15",
  },
  {
    visa_id: "346834f7-ac6e-4958-8e0d-8c2b4fb03a7e",
    visa_code: "E-7-4R",
    visa_name_kr: "지역특화형 숙련기능인력",
    last_verified_at: "2026-08-25",
  },
  {
    visa_id: "606d8651-1d04-47fe-8f69-165b3ed3d834",
    visa_code: "F-4-R",
    visa_name_kr: "지역특화형 재외동포",
    last_verified_at: "2026-08-14",
  },
  {
    visa_id: "8a295d32-46dd-43a8-8a9d-b3713251bf1f",
    visa_code: "D-2",
    visa_name_kr: "광역형 유학비자",
    last_verified_at: "2026-08-26",
  },
];

const previewPolicies: QuotaPolicyRow[] = [
  {
    quota_policy_id: "e5966735-9d7c-4fe2-a7ef-0ca6c85e88fb",
    visa_id: "a228433b-abe4-4785-8496-3e1cb3d597c1",
    quota_type: "LIMITED",
    quota_unit: "PERSON",
    valid_from: "2025-03-07",
    valid_to: "2026-09-18",
  },
  {
    quota_policy_id: "075f41cf-a090-4814-a4c3-9ab6c4da5d16",
    visa_id: "346834f7-ac6e-4958-8e0d-8c2b4fb03a7e",
    quota_type: "LIMITED",
    quota_unit: "PERSON",
    valid_from: "2026-01-12",
    valid_to: "2026-09-18",
  },
  {
    quota_policy_id: "e09ec683-e806-4f75-9f8f-531cacf378dd",
    visa_id: "606d8651-1d04-47fe-8f69-165b3ed3d834",
    quota_type: "UNLIMITED",
    quota_unit: "PERSON",
    valid_from: "2025-03-07",
    valid_to: "2026-09-18",
  },
];

const previewSnapshots: QuotaSnapshotRow[] = [
  ...[
    ["제천시", 84, 33],
    ["보은군", 70, 29],
    ["옥천군", 50, 26],
    ["영동군", 33, 24],
    ["괴산군", 30, 13],
    ["단양군", 44, 8],
  ].map(([scopeName, allocatedQuota, remainingQuota]) => ({
    quota_policy_id: "e5966735-9d7c-4fe2-a7ef-0ca6c85e88fb",
    notice_round: 17,
    as_of_date: "2026-08-03",
    scope_type: "MUNICIPALITY",
    scope_name: String(scopeName),
    allocated_quota: Number(allocatedQuota),
    remaining_quota: Number(remainingQuota),
  })),
  {
    quota_policy_id: "075f41cf-a090-4814-a4c3-9ab6c4da5d16",
    notice_round: 8,
    as_of_date: "2026-08-03",
    scope_type: "PROVINCE",
    scope_name: "충청북도",
    allocated_quota: 542,
    remaining_quota: 306,
  },
];
