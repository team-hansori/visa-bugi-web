"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { updateTargetVisa } from "@/features/onboarding/actions";
import { Link } from "@/i18n/navigation";
import {
  getOrCreateSampleSeed,
  readStoredChecks,
  readStoredJourneyStage,
  writeStoredChecks,
  writeStoredJourneyStage,
} from "./checklist-storage";
import {
  areAllRequiredDocumentsChecked,
  calculatePreparationPercentage,
  getCurrentPreparationStageIndex,
  getJourneyStageState,
  getRequiredVisaDocuments,
  getVisaDocuments,
  isPreparationStageComplete,
  selectRequiredDocumentSample,
  type HomeVisaPreparationCatalog,
} from "./preparation-model";
import { RequirementBadge } from "./requirement-badge";
import { useSelectedVisa } from "./use-selected-visa";

const journeyStages = [
  { id: "requirementCheck", number: 1 },
  { id: "documentPrep", number: 2 },
  { id: "agencyVisit", number: 3 },
  { id: "resultCheck", number: 4 },
] as const;

/**
 * "공고 유효기간" 표시용 포맷. valid_from/valid_to는 마스터 데이터의
 * 유효기간이지 사용자 개인 일정이 아니므로(데이터 경계 규칙), 날짜 범위
 * 그대로만 보여주고 상대 기한을 추정하지 않는다.
 */
function formatVisaValidity(
  validFrom: string | null | undefined,
  validTo: string | null | undefined,
  locale: string,
): string | null {
  if (!validFrom && !validTo) return null;
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const from = validFrom ? formatter.format(new Date(validFrom)) : null;
  const to = validTo ? formatter.format(new Date(validTo)) : null;
  if (from && to) return `${from} – ${to}`;
  if (from) return `${from} ~`;
  return `~ ${to}`;
}

export function VisaProgressDashboard({
  catalog,
  savedReadyDocumentNames = [],
}: {
  catalog: HomeVisaPreparationCatalog;
  savedReadyDocumentNames?: string[];
}) {
  const t = useTranslations("Home");
  const locale = useLocale();
  const { selectedVisa, setSelectedVisaCode } = useSelectedVisa(catalog);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [storedJourneyStage, setStoredJourneyStage] = useState(2);
  const [sampleSeed, setSampleSeed] = useState(1);
  const [isChangingVisa, startVisaChange] = useTransition();
  const [visaChangeError, setVisaChangeError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedVisa) return;
    const storedChecks = readStoredChecks(selectedVisa.visaCode);
    const allDocuments = getVisaDocuments(selectedVisa);
    const initialChecks = storedChecks ?? new Set(
      allDocuments
        .filter((document) => savedReadyDocumentNames.includes(document.name))
        .map((document) => document.id),
    );

    // These values come from browser storage and cannot be known during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckedIds(initialChecks);
    setStoredJourneyStage(readStoredJourneyStage(selectedVisa.visaCode));
    setSampleSeed(getOrCreateSampleSeed(selectedVisa.visaCode));
  }, [savedReadyDocumentNames, selectedVisa]);

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
  const journeyStage = storedJourneyStage >= 3 && allRequiredChecked
    ? storedJourneyStage
    : 2;
  const currentPreparationStageIndex = selectedVisa
    ? getCurrentPreparationStageIndex(selectedVisa, checkedIds)
    : 0;
  const currentPreparationStage = selectedVisa?.stages[currentPreparationStageIndex];
  const pendingSample = useMemo(
    () => selectedVisa
      ? selectRequiredDocumentSample(selectedVisa, checkedIds, sampleSeed, 5)
      : [],
    [checkedIds, sampleSeed, selectedVisa],
  );
  const percentage = selectedVisa
    ? calculatePreparationPercentage(journeyStage, selectedVisa, checkedIds)
    : 0;
  const currentJourneyStage = journeyStages.find((stage) => stage.number === journeyStage) ?? journeyStages[1];
  const currentJourneyLabel = journeyStage === 2
    ? currentPreparationStage?.nameKr ?? t("journey.stages.documentPrep")
    : t(`journey.stages.${currentJourneyStage.id}`);
  const turtleLeft = 31.25 + (journeyStage - 2) * 25;
  const turtleTop = 8 + (journeyStage - 2) * 76;

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

  function advanceToAgencyVisit() {
    if (!allRequiredChecked || journeyStage !== 2) return;
    setStoredJourneyStage(3);
    writeStoredJourneyStage(selectedVisa.visaCode, 3);
  }

  /**
   * 예전에는 목표 비자를 바꾸려면 "변경" 링크로 온보딩 전체를 다시 거쳐야
   * 했다. 이 드롭다운은 user_visa_profile.target_visa_code만 바로 갱신한다.
   */
  function changeVisaCode(nextVisaCode: string) {
    if (nextVisaCode === selectedVisa.visaCode) return;
    setVisaChangeError(null);
    startVisaChange(async () => {
      const result = await updateTargetVisa(nextVisaCode);
      if (result.status === "error") {
        setVisaChangeError(result.message);
        return;
      }
      setSelectedVisaCode(nextVisaCode);
    });
  }

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-12" aria-label={t("progress.sectionAriaLabel")}>
        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 xl:col-span-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("progress.onboardingEyebrow")}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#20332c]">{t("progress.heading")}</h2>
            </div>
            <span className="rounded-full bg-[#fff1d4] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#8a5910]">
              {selectedVisa.source === "supabase" ? t("progress.liveTag") : t("progress.previewTag")}
            </span>
          </div>
          <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center xl:flex-col">
            <ProgressRing
              ariaLabel={t("progress.dynamicAriaLabel", { percent: percentage })}
              caption={t("progress.checklistCaption")}
              percentage={percentage}
            />
            <div className="w-full rounded-2xl bg-[#f5f7f4] p-4">
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="mt-1.5 font-semibold text-[#64716c]">{t("progress.selectedVisaLabel")}</span>
                <div className="flex flex-col items-end gap-1">
                  <select
                    aria-label={t("progress.selectedVisaLabel")}
                    aria-busy={isChangingVisa}
                    value={selectedVisa.visaCode}
                    onChange={(event) => changeVisaCode(event.target.value)}
                    disabled={isChangingVisa}
                    className={`rounded-lg border border-[#d4ddd8] bg-white px-2.5 py-1.5 text-right text-sm font-extrabold text-[#20332c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${isChangingVisa ? "opacity-60" : ""}`}
                  >
                    {catalog.visas.map((visa) => (
                      <option key={visa.visaCode} value={visa.visaCode}>
                        {visa.visaCode} ({visa.visaNameKr})
                      </option>
                    ))}
                  </select>
                  {visaChangeError ? (
                    <span role="alert" className="text-xs font-semibold text-[#9f4038]">
                      {visaChangeError}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 border-t border-[#e3e8e5] pt-3 text-xs">
                <span className="font-semibold text-[#64716c]">{t("progress.validityLabel")}</span>
                <strong className="text-[#8a5910]">
                  {formatVisaValidity(selectedVisa.validFrom, selectedVisa.validTo, locale) ??
                    t("progress.validityUnavailable")}
                </strong>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 xl:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-[-0.035em]">{t("journey.heading")}</h2>
              <p className="mt-1 text-xs font-bold text-[#68756f]">{selectedVisa.visaCode} · {selectedVisa.visaNameKr}</p>
            </div>
            <span className="text-sm font-bold text-[#2d6d5d]">
              {t("journey.stepIndicatorDynamic", {
                step: journeyStage,
                stage: currentJourneyLabel,
              })}
            </span>
          </div>

          <ol className="relative mt-7 grid gap-0 md:grid-cols-4" aria-label={t("journey.stagesAriaLabel")}>
            <Image
              src="/brand/character/bugi-crawling-side-2.png"
              alt=""
              aria-hidden="true"
              width={512}
              height={512}
              style={{ top: turtleTop }}
              className="bugi-crawl-vertical pointer-events-none absolute left-[18px] z-20 h-auto w-12 transition-[top] duration-700 drop-shadow-[0_4px_6px_rgba(24,76,63,0.18)] md:hidden"
            />
            <Image
              src="/brand/character/bugi-crawling-side-2.png"
              alt=""
              aria-hidden="true"
              width={512}
              height={512}
              style={{ left: `${turtleLeft}%` }}
              className="bugi-crawl pointer-events-none absolute top-[-38px] z-20 hidden h-auto w-20 transition-[left] duration-700 drop-shadow-[0_6px_8px_rgba(24,76,63,0.2)] md:block"
            />
            {journeyStages.map((stage, index) => {
              const state = getJourneyStageState(stage.number, journeyStage);
              const done = state === "done";
              const current = state === "current";
              const statusLabel = done
                ? t("journey.stageDone")
                : current
                  ? t("journey.stageCurrent")
                  : t("journey.stageUpcoming");
              return (
                <li key={stage.id} className="relative flex min-h-[76px] gap-3 pb-4 last:pb-0 md:block md:min-h-0 md:pb-0 md:text-center">
                  {index < journeyStages.length - 1 ? (
                    <span aria-hidden="true" className={`absolute left-[18px] top-9 h-[calc(100%-1rem)] w-0.5 md:left-1/2 md:top-[18px] md:h-0.5 md:w-full ${stage.number < journeyStage ? "bg-[#2d6d5d]" : "bg-[#dce4df]"}`} />
                  ) : null}
                  <span className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 text-xs font-black md:mx-auto ${done ? "border-[#2d6d5d] bg-[#2d6d5d] text-white" : current ? "border-[#2d6d5d] bg-[#e5f1ec] text-[#245d4f]" : "border-[#dce4df] bg-white text-[#87908c]"}`}>
                    {done ? <Icon name="check" className="size-4" /> : stage.number}
                  </span>
                  <div className="pt-1 md:mt-3 md:pt-0">
                    <span className={`block text-sm font-extrabold ${current ? "text-[#205848]" : done ? "text-[#354b43]" : "text-[#7d8883]"}`}>
                      {t(`journey.stages.${stage.id}`)}
                    </span>
                    <span className="mt-1 block text-xs text-[#8a938f]">{statusLabel}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          {selectedVisa.stages.length ? (
            <div className="mt-6 rounded-2xl border border-[#dfe7e2] bg-[#f7f9f7] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-[#29483e]">{t("journey.detailHeading")}</p>
                <span className="text-xs font-bold text-[#68756f]">
                  {t("journey.detailProgress", {
                    current: currentPreparationStageIndex + 1,
                    total: selectedVisa.stages.length,
                  })}
                </span>
              </div>
              <ol className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={t("journey.detailHeading")}>
                {selectedVisa.stages.map((stage, index) => {
                  const complete = isPreparationStageComplete(stage, checkedIds);
                  const current = index === currentPreparationStageIndex && !allRequiredChecked;
                  return (
                    <li key={stage.id} className={`min-w-[10rem] flex-1 rounded-xl border px-3 py-2 ${current ? "border-[#2d6d5d] bg-[#e9f4ef]" : complete ? "border-[#cbded5] bg-white" : "border-[#e1e6e3] bg-white"}`}>
                      <span className="flex items-center gap-2 text-xs font-black text-[#2c5044]">
                        <span className={`grid size-5 place-items-center rounded-full ${complete ? "bg-[#2d6d5d] text-white" : "bg-[#edf2ef] text-[#65716c]"}`}>
                          {complete ? <Icon name="check" className="size-3" /> : index + 1}
                        </span>
                        {stage.nameKr}
                      </span>
                      {stage.actorTo ? <span className="mt-1 block text-[0.68rem] text-[#7a8580]">→ {stage.actorTo}</span> : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-[#dce8e2] bg-[#edf6f2] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="font-extrabold text-[#1d5748]">{t("journey.noticeTitle")}</p>
              <p className="mt-1 text-sm leading-6 text-[#5d7068]">{t("journey.noticeBody")}</p>
            </div>
            <Link href="/calendar" className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-extrabold text-[#205848] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] sm:mt-0">
              {t("journey.viewSchedule")}
              <Icon name="chevron-right" className="size-4" />
            </Link>
          </div>
        </article>
      </section>

      <section>
        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-[-0.035em]">{t("tasks.pendingHeading")}</h2>
                <span className="rounded-full bg-[#e8f2ee] px-2.5 py-1 text-xs font-extrabold text-[#245d4f]">{selectedVisa.visaCode}</span>
              </div>
              <p className="mt-2 text-sm text-[#68756f]">{t("tasks.pendingDescription")}</p>
            </div>
            <div className="text-right">
              <Icon name="document" className="ml-auto size-6 text-[#2d6d5d]" />
              <p className="mt-1 text-xs font-bold text-[#68756f]">
                {t("tasks.requiredSummary", { checked: checkedRequiredCount, total: requiredDocuments.length })}
              </p>
            </div>
          </div>

          {pendingSample.length ? (
            <ul className="mt-5 divide-y divide-[#edf0ee]">
              {pendingSample.map(({ stage, document }) => (
                <li key={document.id} className="py-1 first:pt-0 last:pb-0">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-3 transition-colors hover:bg-[#f7faf8]">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleDocument(document.id)}
                      aria-label={t("tasks.checkAriaLabel", { document: document.name })}
                      className="mt-0.5 size-5 shrink-0 accent-[#2d6d5d]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-extrabold text-[#2a3c35]">{document.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#76817c]">
                        <RequirementBadge status={document.requirementStatus} />
                        <span className="rounded-full bg-[#edf2ef] px-2 py-0.5 font-bold text-[#596861]">{stage.nameKr}</span>
                        {document.conditionNote ? <span>· {document.conditionNote}</span> : null}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#edf7f2] p-4 text-sm font-bold text-[#245d4f]">{t("tasks.noPendingRequired")}</p>
          )}

          <div className={`mt-6 rounded-2xl border p-4 sm:flex sm:items-center sm:justify-between sm:gap-4 ${allRequiredChecked ? "border-[#bed9ce] bg-[#edf7f2]" : "border-[#dfe7e2] bg-[#f7f9f7]"}`}>
            <div>
              <p className={`font-extrabold ${allRequiredChecked ? "text-[#1d5748]" : "text-[#41554d]"}`}>
                {journeyStage >= 3 ? t("tasks.advanced") : allRequiredChecked ? t("tasks.allRequiredChecked") : t("tasks.sampleHint")}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#6d7773]">
                {selectedVisa.source === "supabase" ? t("tasks.sourceSupabase") : t("tasks.sourcePreview")}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
              <Link
                href="/documents/status"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cbd8d2] bg-white px-4 text-sm font-extrabold text-[#245d4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
              >
                {t("tasks.viewAll")}
                <Icon name="chevron-right" className="size-4" />
              </Link>
              {allRequiredChecked && journeyStage === 2 ? (
                <button
                  type="button"
                  onClick={advanceToAgencyVisit}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#245d4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
                >
                  {t("tasks.advance")}
                  <Icon name="chevron-right" className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

function ProgressRing({
  ariaLabel,
  caption,
  percentage,
}: {
  ariaLabel: string;
  caption: string;
  percentage: number;
}) {
  const safePercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className="relative grid size-36 shrink-0 place-items-center sm:size-40" role="img" aria-label={ariaLabel}>
      <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="51" fill="none" stroke="#e5ebe7" strokeWidth="10" />
        <circle cx="60" cy="60" r="51" fill="none" pathLength="100" stroke="#2d6d5d" strokeDasharray={`${safePercentage} ${100 - safePercentage}`} strokeLinecap="round" strokeWidth="10" className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <div className="absolute text-center">
        <strong className="block text-3xl font-black tracking-[-0.06em] text-[#173f36] sm:text-4xl">{safePercentage}%</strong>
        <span className="mt-1 block text-xs font-semibold text-[#73807b]">{caption}</span>
      </div>
    </div>
  );
}
