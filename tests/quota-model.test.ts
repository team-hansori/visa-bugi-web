import { describe, expect, it } from "vitest";
import { buildVisaQuotaItems } from "@/features/home/quota-model";

describe("buildVisaQuotaItems", () => {
  it("sums only the latest snapshot date for a limited visa", () => {
    const items = buildVisaQuotaItems(
      [
        {
          visa_id: "visa-1",
          visa_code: "F-2-R",
          visa_name_kr: "지역우수인재",
          last_verified_at: "2026-08-20",
        },
      ],
      [
        {
          quota_policy_id: "policy-1",
          visa_id: "visa-1",
          quota_type: "LIMITED",
          quota_unit: "PERSON",
          valid_from: "2026-01-01",
          valid_to: "2026-12-31",
        },
      ],
      [
        {
          quota_policy_id: "policy-1",
          notice_round: 16,
          as_of_date: "2026-07-01",
          scope_type: "MUNICIPALITY",
          scope_name: "A",
          allocated_quota: 10,
          remaining_quota: 8,
        },
        {
          quota_policy_id: "policy-1",
          notice_round: 17,
          as_of_date: "2026-08-01",
          scope_type: "MUNICIPALITY",
          scope_name: "A",
          allocated_quota: 10,
          remaining_quota: 6,
        },
        {
          quota_policy_id: "policy-1",
          notice_round: 17,
          as_of_date: "2026-08-01",
          scope_type: "MUNICIPALITY",
          scope_name: "B",
          allocated_quota: 20,
          remaining_quota: 9,
        },
      ],
      "2026-08-27",
    );

    expect(items[0]).toMatchObject({
      status: "limited",
      remainingQuota: 15,
      allocatedQuota: 30,
      noticeRound: 17,
      scopeKind: "municipalities",
      scopeCount: 2,
    });
  });

  it("keeps unlimited and unknown policies distinct", () => {
    const visas = [
      {
        visa_id: "visa-unlimited",
        visa_code: "F-4-R",
        visa_name_kr: "재외동포",
        last_verified_at: "2026-08-20",
      },
      {
        visa_id: "visa-unknown",
        visa_code: "D-2",
        visa_name_kr: "유학",
        last_verified_at: "2026-08-20",
      },
    ];
    const items = buildVisaQuotaItems(
      visas,
      [
        {
          quota_policy_id: "policy-unlimited",
          visa_id: "visa-unlimited",
          quota_type: "UNLIMITED",
          quota_unit: "PERSON",
          valid_from: "2026-01-01",
          valid_to: null,
        },
      ],
      [],
      "2026-08-27",
    );

    expect(items.map((item) => item.status)).toEqual([
      "unlimited",
      "unavailable",
    ]);
  });
});
