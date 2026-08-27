export type RequirementStatus =
  | "REQUIRED"
  | "OPTIONAL"
  | "CONDITIONAL"
  | "ALTERNATIVE";

export type HomeDocumentRequirement = {
  id: string;
  name: string;
  category: string | null;
  requirementStatus: RequirementStatus;
  alternativeGroup: string | null;
  conditionNote: string | null;
  displayOrder: number;
};

export type HomeVisaPreparation = {
  visaCode: string;
  visaNameKr: string;
  stageNameKr: string;
  source: "supabase" | "preview";
  documents: HomeDocumentRequirement[];
};

export type HomeVisaPreparationCatalog = {
  visas: HomeVisaPreparation[];
};

export function areAllDocumentsChecked(
  documents: HomeDocumentRequirement[],
  checkedIds: ReadonlySet<string>,
) {
  return documents.length > 0 && documents.every((document) => checkedIds.has(document.id));
}

export function calculatePreparationPercentage(
  currentStage: number,
  documents: HomeDocumentRequirement[],
  checkedIds: ReadonlySet<string>,
) {
  if (currentStage >= 4) return 100;
  if (currentStage >= 3) return 75;
  if (currentStage <= 1) return 25;

  const checkedCount = documents.filter((document) => checkedIds.has(document.id)).length;
  const documentProgress = documents.length ? checkedCount / documents.length : 0;
  return Math.round(25 + documentProgress * 25);
}

export function getJourneyStageState(stageNumber: number, currentStage: number) {
  if (stageNumber < currentStage) return "done" as const;
  if (stageNumber === currentStage) return "current" as const;
  return "upcoming" as const;
}

