"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Link, useRouter } from "@/i18n/navigation";
import {
  readStoredChecks,
  writeStoredChecks,
  writeStoredJourneyStage,
} from "./checklist-storage";
import { splitConditionNote } from "./condition-note";
import {
  areAllRequiredDocumentsChecked,
  getRequiredVisaDocuments,
  getVisaDocuments,
  isPreparationStageComplete,
  type HomeVisaPreparationCatalog,
} from "./preparation-model";
import { RequirementBadge } from "./requirement-badge";
import { useSelectedVisa } from "./use-selected-visa";

export function DocumentSubmissionStatus({
  catalog,
}: {
  catalog: HomeVisaPreparationCatalog;
}) {
  const t = useTranslations("DocumentStatus");
  const router = useRouter();
  const { selectedVisa } = useSelectedVisa(catalog);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedVisa) return;
    // This browser-only progress state is restored after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckedIds(readStoredChecks(selectedVisa.visaCode) ?? new Set());
  }, [selectedVisa]);

  const allDocuments = useMemo(
    () => selectedVisa ? getVisaDocuments(selectedVisa) : [],
    [selectedVisa],
  );
  const requiredDocuments = useMemo(
    () => selectedVisa ? getRequiredVisaDocuments(selectedVisa) : [],
    [selectedVisa],
  );
  const checkedRequiredCount = requiredDocuments.filter(({ document }) =>
    checkedIds.has(document.id),
  ).length;
  const allRequiredChecked = selectedVisa
    ? areAllRequiredDocumentsChecked(selectedVisa, checkedIds)
    : false;
  const requiredPercentage = requiredDocuments.length
    ? Math.round((checkedRequiredCount / requiredDocuments.length) * 100)
    : 0;

  if (!selectedVisa) return null;

  function toggleDocument(documentId: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      writeStoredChecks(selectedVisa.visaCode, next);
      return next;
    });
  }

  function advanceJourney() {
    if (!allRequiredChecked) return;
    writeStoredJourneyStage(selectedVisa.visaCode, 3);
    router.push("/");
  }

  return (
    <section className="mx-auto max-w-5xl" aria-labelledby="document-status-heading">
      <Link href="/documents" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-extrabold text-[#2d6d5d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]">
        <Icon name="chevron-left" className="size-4" />
        {t("back")}
      </Link>

      <div className="mt-3 rounded-[28px] border border-[#dce6e1] bg-white p-5 shadow-[0_12px_36px_rgba(48,75,64,0.07)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 id="document-status-heading" className="text-3xl font-black tracking-[-0.045em] text-[#20332c]">{t("title")}</h1>
            <p className="mt-2 text-sm leading-6 text-[#66736e]">{t("description")}</p>
          </div>
          <div className="rounded-2xl bg-[#edf6f2] px-4 py-3 text-right">
            <p className="text-sm font-black text-[#205848]">{selectedVisa.visaCode}</p>
            <p className="mt-0.5 text-xs font-semibold text-[#60716a]">{selectedVisa.visaNameKr}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-[#f4f7f5] p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-extrabold text-[#314a41]">{t("requiredProgress")}</span>
            <strong className="text-sm text-[#205848]">{t("requiredSummary", { checked: checkedRequiredCount, total: requiredDocuments.length })}</strong>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dce5e0]" aria-hidden="true">
            <div className="h-full rounded-full bg-[#2d6d5d] transition-[width] duration-500" style={{ width: `${requiredPercentage}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#72807a]">{t("allSummary", { checked: allDocuments.filter((document) => checkedIds.has(document.id)).length, total: allDocuments.length })}</p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {selectedVisa.stages.map((stage, stageIndex) => {
          const stageComplete = isPreparationStageComplete(stage, checkedIds);
          const stageRequired = stage.documents.filter((document) => document.requirementStatus === "REQUIRED");
          const stageChecked = stageRequired.filter((document) => checkedIds.has(document.id)).length;

          return (
            <article key={stage.id} className="overflow-hidden rounded-[24px] border border-[#dfe6e2] bg-white shadow-[0_8px_28px_rgba(48,75,64,0.05)]">
              <header className={`p-5 sm:p-6 ${stageComplete ? "bg-[#edf7f2]" : "bg-[#f8faf8]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black ${stageComplete ? "bg-[#2d6d5d] text-white" : "bg-[#fff0cf] text-[#865b12]"}`}>
                      {stageComplete ? <Icon name="check" className="size-5" /> : stageIndex + 1}
                    </span>
                    <div>
                      <h2 className="text-lg font-black tracking-[-0.03em] text-[#273d35]">{stage.nameKr}</h2>
                      <p className="mt-1 text-xs font-semibold text-[#72807a]">
                        {stage.actorFrom && stage.actorTo
                          ? t("actorFlow", { from: stage.actorFrom, to: stage.actorTo })
                          : t("stageNumber", { current: stageIndex + 1, total: selectedVisa.stages.length })}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${stageComplete ? "bg-white text-[#25604f]" : "bg-[#fff4dc] text-[#7f5a18]"}`}>
                    {stageComplete
                      ? t("stageComplete")
                      : t("stageRequiredSummary", { checked: stageChecked, total: stageRequired.length })}
                  </span>
                </div>
              </header>

              <ul className="divide-y divide-[#edf0ee] px-4 sm:px-6">
                {stage.documents.map((document) => {
                  const checked = checkedIds.has(document.id);
                  const noteItems = splitConditionNote(document.conditionNote);
                  return (
                    <li key={document.id} className="flex items-start gap-3 rounded-xl py-4 sm:px-2">
                      <input
                        type="checkbox"
                        id={`doc-check-${document.id}`}
                        checked={checked}
                        onChange={() => toggleDocument(document.id)}
                        aria-label={t("checkAriaLabel", { document: document.name })}
                        className="mt-0.5 size-5 shrink-0 accent-[#2d6d5d]"
                      />
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={`doc-check-${document.id}`}
                          className={`block cursor-pointer font-extrabold ${checked ? "text-[#6f7c76] line-through decoration-[#9aaca4]" : "text-[#293e36]"}`}
                        >
                          {document.name}
                        </label>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#77827d]">
                          <RequirementBadge status={document.requirementStatus} />
                        </span>
                        {noteItems.length > 0 ? (
                          <ul className="mt-1.5 space-y-0.5 text-xs leading-5 text-[#77827d]">
                            {noteItems.map((item, index) => (
                              <li key={index} className="flex gap-1.5">
                                <span aria-hidden="true" className="mt-[0.4em] size-1 shrink-0 rounded-full bg-[#9aaca4]" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>

      <div className={`mt-6 rounded-[24px] border p-5 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-6 ${allRequiredChecked ? "border-[#bad6ca] bg-[#eaf6f0]" : "border-[#eadfc8] bg-[#fff8e9]"}`}>
        <div>
          <p className={`font-black ${allRequiredChecked ? "text-[#1d5748]" : "text-[#77561f]"}`}>
            {allRequiredChecked ? t("readyTitle") : t("remainingTitle")}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#67736e]">
            {allRequiredChecked ? t("readyDescription") : t("remainingDescription")}
          </p>
        </div>
        {allRequiredChecked ? (
          <button
            type="button"
            onClick={advanceJourney}
            className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] sm:mt-0"
          >
            {t("advance")}
            <Icon name="chevron-right" className="size-4" />
          </button>
        ) : null}
      </div>
    </section>
  );
}
