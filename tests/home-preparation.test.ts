import { describe, expect, it } from "vitest";
import {
  areAllDocumentsChecked,
  calculatePreparationPercentage,
  getJourneyStageState,
  type HomeDocumentRequirement,
} from "@/features/home/preparation-model";

const documents: HomeDocumentRequirement[] = [
  {
    id: "passport",
    name: "여권 사본",
    category: "IDENTITY",
    requirementStatus: "REQUIRED",
    alternativeGroup: null,
    conditionNote: null,
    displayOrder: 1,
  },
  {
    id: "application",
    name: "신청서",
    category: "APPLICATION",
    requirementStatus: "REQUIRED",
    alternativeGroup: null,
    conditionNote: null,
    displayOrder: 2,
  },
];

describe("home preparation progress", () => {
  it("requires every displayed document before stage advancement", () => {
    expect(areAllDocumentsChecked(documents, new Set(["passport"]))).toBe(false);
    expect(areAllDocumentsChecked(documents, new Set(["passport", "application"]))).toBe(true);
  });

  it("updates the percentage while documents are checked and after advancing", () => {
    expect(calculatePreparationPercentage(2, documents, new Set())).toBe(25);
    expect(calculatePreparationPercentage(2, documents, new Set(["passport"]))).toBe(38);
    expect(calculatePreparationPercentage(2, documents, new Set(["passport", "application"]))).toBe(50);
    expect(calculatePreparationPercentage(3, documents, new Set())).toBe(75);
  });

  it("derives each journey marker from the current stage", () => {
    expect(getJourneyStageState(1, 3)).toBe("done");
    expect(getJourneyStageState(3, 3)).toBe("current");
    expect(getJourneyStageState(4, 3)).toBe("upcoming");
  });
});

