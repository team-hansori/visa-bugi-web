import { describe, expect, it } from "vitest";
import {
  areAllRequiredDocumentsChecked,
  calculatePreparationPercentage,
  getCurrentPreparationStageIndex,
  getJourneyStageState,
  selectRequiredDocumentSample,
  type HomeDocumentRequirement,
  type HomeVisaPreparation,
} from "@/features/home/preparation-model";

function document(
  id: string,
  requirementStatus: HomeDocumentRequirement["requirementStatus"] = "REQUIRED",
): HomeDocumentRequirement {
  return {
    id,
    name: id,
    category: null,
    requirementStatus,
    alternativeGroup: null,
    conditionNote: null,
    displayOrder: 1,
  };
}

const visa: HomeVisaPreparation = {
  visaCode: "F-2-R",
  visaNameKr: "지역우수인재",
  source: "preview",
  stages: [
    {
      id: "stage-1",
      code: "APPLICATION_SUBMISSION",
      nameKr: "추천 신청",
      order: 1,
      actorFrom: "신청자",
      actorTo: "시·군",
      documents: [
        document("application"),
        document("passport"),
        document("photo", "OPTIONAL"),
      ],
    },
    {
      id: "stage-2",
      code: "STATUS_CHANGE_APPLICATION",
      nameKr: "체류자격 변경",
      order: 2,
      actorFrom: "신청자",
      actorTo: "출입국",
      documents: [
        document("recommendation"),
        document("contract"),
        document("residence"),
        document("income"),
        document("guarantee"),
      ],
    },
  ],
};

describe("home preparation progress", () => {
  it("moves the current detailed stage using stage_id groups", () => {
    expect(getCurrentPreparationStageIndex(visa, new Set())).toBe(0);
    expect(getCurrentPreparationStageIndex(visa, new Set(["application", "passport"]))).toBe(1);
  });

  it("requires every required document but not optional documents", () => {
    const allRequired = new Set([
      "application",
      "passport",
      "recommendation",
      "contract",
      "residence",
      "income",
      "guarantee",
    ]);
    expect(areAllRequiredDocumentsChecked(visa, allRequired)).toBe(true);
    expect(areAllRequiredDocumentsChecked(visa, new Set(["application"]))).toBe(false);
  });

  it("shows at most five stable, incomplete required documents", () => {
    const first = selectRequiredDocumentSample(visa, new Set(["passport"]), 42);
    const second = selectRequiredDocumentSample(visa, new Set(["passport"]), 42);
    expect(first).toHaveLength(5);
    expect(first.map(({ document: item }) => item.id)).toEqual(
      second.map(({ document: item }) => item.id),
    );
    expect(first.every(({ document: item }) => item.requirementStatus === "REQUIRED")).toBe(true);
    expect(first.some(({ document: item }) => item.id === "passport")).toBe(false);
  });

  it("updates the percentage from required documents and after advancing", () => {
    expect(calculatePreparationPercentage(2, visa, new Set())).toBe(25);
    expect(calculatePreparationPercentage(2, visa, new Set(["application", "passport"]))).toBe(32);
    expect(calculatePreparationPercentage(3, visa, new Set())).toBe(75);
  });

  it("derives each journey marker from the current stage", () => {
    expect(getJourneyStageState(1, 3)).toBe("done");
    expect(getJourneyStageState(3, 3)).toBe("current");
    expect(getJourneyStageState(4, 3)).toBe("upcoming");
  });
});
