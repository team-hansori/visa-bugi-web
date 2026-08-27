export type VisaRequirementRow = {
  visa_id: string;
  visa_code: string;
  visa_name_kr: string;
  last_verified_at: string | null;
};

export type QuotaPolicyRow = {
  quota_policy_id: string;
  visa_id: string;
  quota_type: "LIMITED" | "UNLIMITED" | "UNKNOWN";
  quota_unit: string;
  valid_from: string;
  valid_to: string | null;
};

export type QuotaSnapshotRow = {
  quota_policy_id: string;
  notice_round: number | string | null;
  as_of_date: string;
  scope_type: string;
  scope_name: string;
  allocated_quota: number | string;
  remaining_quota: number | string;
};

export type VisaQuotaItem = {
  visaCode: string;
  visaNameKr: string;
  status: "limited" | "unlimited" | "unavailable";
  remainingQuota: number | null;
  allocatedQuota: number | null;
  noticeRound: number | null;
  asOfDate: string | null;
  scopeKind: "municipalities" | "province" | "single" | "none";
  scopeCount: number;
};

const preferredVisaOrder = ["F-2-R", "E-7-4R", "F-4-R", "D-2"];

export function buildVisaQuotaItems(
  visas: VisaRequirementRow[],
  policies: QuotaPolicyRow[],
  snapshots: QuotaSnapshotRow[],
  today = new Date().toISOString().slice(0, 10),
): VisaQuotaItem[] {
  return [...visas]
    .sort((left, right) => {
      const leftIndex = preferredVisaOrder.indexOf(left.visa_code);
      const rightIndex = preferredVisaOrder.indexOf(right.visa_code);
      return (
        (leftIndex === -1 ? preferredVisaOrder.length : leftIndex) -
          (rightIndex === -1 ? preferredVisaOrder.length : rightIndex) ||
        left.visa_code.localeCompare(right.visa_code)
      );
    })
    .map((visa) => {
      const policy = policies
        .filter(
          (candidate) =>
            candidate.visa_id === visa.visa_id &&
            candidate.valid_from <= today &&
            (!candidate.valid_to || candidate.valid_to >= today),
        )
        .sort((left, right) => right.valid_from.localeCompare(left.valid_from))[0];

      if (!policy || policy.quota_type === "UNKNOWN") {
        return unavailableItem(visa);
      }

      if (policy.quota_type === "UNLIMITED") {
        return {
          ...unavailableItem(visa),
          status: "unlimited",
          asOfDate: policy.valid_from,
        };
      }

      const policySnapshots = snapshots.filter(
        (snapshot) => snapshot.quota_policy_id === policy.quota_policy_id,
      );
      const latestDate = policySnapshots.reduce(
        (latest, snapshot) =>
          snapshot.as_of_date > latest ? snapshot.as_of_date : latest,
        "",
      );
      const latestSnapshots = policySnapshots.filter(
        (snapshot) => snapshot.as_of_date === latestDate,
      );
      if (!latestSnapshots.length) return unavailableItem(visa);

      const remainingQuota = sumNumeric(
        latestSnapshots.map((snapshot) => snapshot.remaining_quota),
      );
      const allocatedQuota = sumNumeric(
        latestSnapshots.map((snapshot) => snapshot.allocated_quota),
      );
      const noticeRound = finiteNumber(latestSnapshots[0].notice_round);
      const scopeKind = getScopeKind(latestSnapshots);

      return {
        visaCode: visa.visa_code,
        visaNameKr: visa.visa_name_kr,
        status: "limited",
        remainingQuota,
        allocatedQuota,
        noticeRound,
        asOfDate: latestDate,
        scopeKind,
        scopeCount: latestSnapshots.length,
      };
    });
}

function unavailableItem(visa: VisaRequirementRow): VisaQuotaItem {
  return {
    visaCode: visa.visa_code,
    visaNameKr: visa.visa_name_kr,
    status: "unavailable",
    remainingQuota: null,
    allocatedQuota: null,
    noticeRound: null,
    asOfDate: visa.last_verified_at,
    scopeKind: "none",
    scopeCount: 0,
  };
}

function getScopeKind(
  snapshots: QuotaSnapshotRow[],
): VisaQuotaItem["scopeKind"] {
  if (snapshots.length > 1) return "municipalities";
  if (snapshots[0].scope_type === "PROVINCE") return "province";
  return "single";
}

function sumNumeric(values: Array<number | string>) {
  return values.reduce<number>((sum, value) => sum + (finiteNumber(value) ?? 0), 0);
}

function finiteNumber(value: number | string | null) {
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
