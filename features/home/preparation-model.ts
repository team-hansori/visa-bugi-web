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

export type HomePreparationStage = {
  id: string;
  code: string;
  nameKr: string;
  order: number;
  actorFrom: string | null;
  actorTo: string | null;
  documents: HomeDocumentRequirement[];
};

export type HomeVisaPreparation = {
  visaCode: string;
  visaNameKr: string;
  source: "supabase" | "preview";
  stages: HomePreparationStage[];
  /** visa_requirements.valid_from/valid_to — 이 요건 공고 자체의 유효기간(데이터 경계). */
  validFrom?: string | null;
  validTo?: string | null;
};

export type HomeVisaPreparationCatalog = {
  visas: HomeVisaPreparation[];
};

export type StagedDocumentRequirement = {
  stage: HomePreparationStage;
  document: HomeDocumentRequirement;
};

export function getVisaDocuments(visa: HomeVisaPreparation) {
  return visa.stages.flatMap((stage) => stage.documents);
}

export function getRequiredVisaDocuments(visa: HomeVisaPreparation) {
  return visa.stages.flatMap((stage) =>
    stage.documents
      .filter((document) => document.requirementStatus === "REQUIRED")
      .map((document) => ({ stage, document })),
  );
}

export function isPreparationStageComplete(
  stage: HomePreparationStage,
  checkedIds: ReadonlySet<string>,
) {
  const requiredDocuments = stage.documents.filter(
    (document) => document.requirementStatus === "REQUIRED",
  );
  return requiredDocuments.length === 0 ||
    requiredDocuments.every((document) => checkedIds.has(document.id));
}

export function getCurrentPreparationStageIndex(
  visa: HomeVisaPreparation,
  checkedIds: ReadonlySet<string>,
) {
  const incompleteIndex = visa.stages.findIndex(
    (stage) => !isPreparationStageComplete(stage, checkedIds),
  );
  return incompleteIndex === -1 ? Math.max(visa.stages.length - 1, 0) : incompleteIndex;
}

export function areAllRequiredDocumentsChecked(
  visa: HomeVisaPreparation,
  checkedIds: ReadonlySet<string>,
) {
  const requiredDocuments = getRequiredVisaDocuments(visa);
  return requiredDocuments.length > 0 &&
    requiredDocuments.every(({ document }) => checkedIds.has(document.id));
}

export function getIncompleteRequiredDocuments(
  visa: HomeVisaPreparation,
  checkedIds: ReadonlySet<string>,
) {
  return getRequiredVisaDocuments(visa).filter(
    ({ document }) => !checkedIds.has(document.id),
  );
}

export function selectRequiredDocumentSample(
  visa: HomeVisaPreparation,
  checkedIds: ReadonlySet<string>,
  seed: number,
  limit = 5,
) {
  return getIncompleteRequiredDocuments(visa, checkedIds)
    .map((item) => ({
      item,
      rank: seededRank(`${seed}:${item.stage.id}:${item.document.id}`),
    }))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, limit)
    .map(({ item }) => item);
}

export function calculatePreparationPercentage(
  currentJourneyStage: number,
  visa: HomeVisaPreparation,
  checkedIds: ReadonlySet<string>,
) {
  if (currentJourneyStage >= 4) return 100;
  if (currentJourneyStage >= 3) return 75;
  if (currentJourneyStage <= 1) return 25;

  const requiredDocuments = getRequiredVisaDocuments(visa);
  const checkedCount = requiredDocuments.filter(({ document }) =>
    checkedIds.has(document.id),
  ).length;
  const documentProgress = requiredDocuments.length
    ? checkedCount / requiredDocuments.length
    : 0;
  return Math.round(25 + documentProgress * 25);
}

export function getJourneyStageState(stageNumber: number, currentStage: number) {
  if (stageNumber < currentStage) return "done" as const;
  if (stageNumber === currentStage) return "current" as const;
  return "upcoming" as const;
}

function seededRank(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
