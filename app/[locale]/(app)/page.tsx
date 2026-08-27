import { getTranslations, setRequestLocale } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { ChatLauncher } from "@/features/chat/chat-launcher";
import { TargetVisaSelect } from "@/features/home/target-visa-select";
import { getTargetVisaValidity, type VisaValidity } from "@/features/home/visa-validity";
import { getTargetVisaCode } from "@/features/onboarding/get-target-visa";
import { getSavedDocumentProgress, type SavedDocumentProgress } from "@/features/ocr/saved-progress";
import { Link, redirect } from "@/i18n/navigation";
import { hasCompletedOnboarding } from "@/lib/onboarding/completion";

const sampleTasks = ["passport", "schedule", "agency"] as const;

/**
 * "공고 유효기간" 표시용 포맷. valid_from/valid_to는 마스터 데이터의
 * 유효기간이지 사용자 개인 일정이 아니므로(스펙 §데이터 경계), 날짜 범위
 * 그대로만 보여주고 상대 기한을 추정하지 않는다.
 */
function formatVisaValidity(validity: VisaValidity | null, locale: string): string | null {
  if (!validity || (!validity.validFrom && !validity.validTo)) return null;
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const from = validity.validFrom ? formatter.format(new Date(validity.validFrom)) : null;
  const to = validity.validTo ? formatter.format(new Date(validity.validTo)) : null;
  if (from && to) return `${from} – ${to}`;
  if (from) return `${from} ~`;
  return `~ ${to}`;
}

/**
 * "서류 준비" 단계만 저장된 OCR 진행률(user_document_reviews)로 실데이터화한다.
 * "기관 방문"·"결과 확인"은 아직 이를 추적할 마스터 데이터 개념이 없어
 * upcoming으로 고정해 둔다(별도 논의 필요 — Task B 계획 참고).
 */
function buildStages(savedProgress: SavedDocumentProgress | null) {
  const documentPrepDone = Boolean(
    savedProgress &&
      savedProgress.totalDocuments > 0 &&
      savedProgress.readyDocuments === savedProgress.totalDocuments,
  );

  return [
    { id: "requirementCheck", state: "done" },
    { id: "documentPrep", state: documentPrepDone ? "done" : "current" },
    { id: "agencyVisit", state: "upcoming" },
    { id: "resultCheck", state: "upcoming" },
  ] as const;
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
        <circle cx="60" cy="60" r="51" fill="none" pathLength="100" stroke="#2d6d5d" strokeDasharray={`${safePercentage} ${100 - safePercentage}`} strokeLinecap="round" strokeWidth="10" />
      </svg>
      <div className="absolute text-center">
        <strong className="block text-3xl font-black tracking-[-0.06em] text-[#173f36] sm:text-4xl">{safePercentage}%</strong>
        <span className="mt-1 block text-xs font-semibold text-[#73807b]">{caption}</span>
      </div>
    </div>
  );
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!(await hasCompletedOnboarding())) {
    redirect({ href: "/onboarding", locale });
  }

  const t = await getTranslations("Home");
  const [savedProgress, targetVisaCode] = await Promise.all([
    getSavedDocumentProgress(),
    getTargetVisaCode(),
  ]);
  const targetVisaValidity =
    !savedProgress && targetVisaCode
      ? await getTargetVisaValidity(targetVisaCode)
      : null;
  const stages = buildStages(savedProgress);
  const progressPercentage = savedProgress?.percentage ?? 68;
  const baseDateLabel = savedProgress
    ? t("progress.lastUpdatedLabel")
    : t("progress.validityLabel");
  const baseDate = savedProgress
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
        new Date(savedProgress.lastUpdatedAt),
      )
    : (formatVisaValidity(targetVisaValidity, locale) ??
      t("progress.validityUnavailable"));
  const taskItems = savedProgress
    ? savedProgress.tasks.map((task, index) => ({
        key: `${task.kind}:${task.documentTitle}:${index}`,
        label:
          task.kind === "missing"
            ? t("tasks.saved.missing.label", {
                document: task.documentTitle,
                count: task.count,
              })
            : task.kind === "review"
              ? t("tasks.saved.review.label", {
                  document: task.documentTitle,
                  count: task.count,
                })
              : t("tasks.saved.ready.label", {
                  document: task.documentTitle,
                }),
        meta:
          task.kind === "missing"
            ? t("tasks.saved.missing.meta")
            : task.kind === "review"
              ? t("tasks.saved.review.meta")
              : t("tasks.saved.ready.meta"),
      }))
    : sampleTasks.map((taskId) => ({
        key: taskId,
        label: t(`tasks.items.${taskId}.label`),
        meta: t(`tasks.items.${taskId}.meta`),
      }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-col gap-5 rounded-[28px] bg-[#173f36] px-5 py-7 text-white shadow-[0_18px_50px_rgba(23,63,54,0.18)] sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div className="max-w-2xl">
          <span className="inline-flex min-h-8 items-center rounded-full bg-white/12 px-3 text-xs font-bold text-[#d9eee5]">{savedProgress ? t("savedBadge") : t("demoBadge")}</span>
          <h1 className="mt-4 text-[clamp(1.75rem,7vw,3.25rem)] font-black leading-[1.12] tracking-[-0.055em]">
            {t("heroTitle")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#d1dfda] sm:text-base sm:leading-7">
            {savedProgress
              ? t("savedHeroDescription", {
                  count: savedProgress.totalDocuments,
                })
              : t("heroDescription")}
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-12" aria-label={t("progress.sectionAriaLabel")}>
        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 xl:col-span-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{savedProgress ? t("progress.savedEyebrow") : t("progress.eyebrow")}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#20332c]">{t("progress.heading")}</h2>
            </div>
            <span className="rounded-full bg-[#fff1d4] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#8a5910]">{savedProgress ? t("progress.savedTag") : t("progress.demoTag")}</span>
          </div>
          <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center xl:flex-col">
            <ProgressRing
              ariaLabel={savedProgress ? t("progress.savedAriaLabel", { percent: progressPercentage }) : t("progress.ariaLabel")}
              caption={savedProgress ? t("progress.savedCaption") : t("progress.caption")}
              percentage={progressPercentage}
            />
            <div className="w-full rounded-2xl bg-[#f5f7f4] p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-[#64716c]">{t("progress.selectedVisaLabel")}</span>
                {targetVisaCode ? (
                  <TargetVisaSelect value={targetVisaCode} />
                ) : (
                  <strong className="text-[#20332c]">{t("progress.selectedVisaValue")}</strong>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-[#64716c]">{baseDateLabel}</span>
                <strong className="text-[#8a5910]">{baseDate}</strong>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 xl:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-[-0.035em]">{t("journey.heading")}</h2>
            </div>
            <span className="text-sm font-bold text-[#2d6d5d]">
              {savedProgress
                ? t("journey.savedStepIndicator", {
                    ready: savedProgress.readyDocuments,
                    total: savedProgress.totalDocuments,
                  })
                : t("journey.stepIndicator")}
            </span>
          </div>

          <ol className="relative mt-7 grid gap-0 md:grid-cols-4" aria-label={t("journey.stagesAriaLabel")}>
            {stages.map((stage, index) => {
              const done = stage.state === "done";
              const current = stage.state === "current";
              const statusLabel = done
                ? t("journey.stageDone")
                : current
                  ? t("journey.stageCurrent")
                  : t("journey.stageUpcoming");
              return (
                <li key={stage.id} className="relative flex min-h-[76px] gap-3 pb-4 last:pb-0 md:block md:min-h-0 md:pb-0 md:text-center">
                  {index < stages.length - 1 ? (
                    <span aria-hidden="true" className={`absolute left-[18px] top-9 h-[calc(100%-1rem)] w-0.5 md:left-1/2 md:top-[18px] md:h-0.5 md:w-full ${done ? "bg-[#2d6d5d]" : "bg-[#dce4df]"}`} />
                  ) : null}
                  <span className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 text-xs font-black md:mx-auto ${done ? "border-[#2d6d5d] bg-[#2d6d5d] text-white" : current ? "border-[#2d6d5d] bg-[#e5f1ec] text-[#245d4f]" : "border-[#dce4df] bg-white text-[#87908c]"}`}>
                    {done ? <Icon name="check" className="size-4" /> : index + 1}
                  </span>
                  <div className="pt-1 md:mt-3 md:pt-0">
                    <span className={`block text-sm font-extrabold ${current ? "text-[#205848]" : done ? "text-[#354b43]" : "text-[#7d8883]"}`}>{t(`journey.stages.${stage.id}`)}</span>
                    <span className="mt-1 block text-xs text-[#8a938f]">{statusLabel}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 rounded-2xl border border-[#dce8e2] bg-[#edf6f2] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
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

      <section className="grid gap-5 lg:grid-cols-5">
        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 lg:col-span-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-[-0.035em]">{t("tasks.heading")}</h2>
            </div>
            <Icon name="document" className="size-6 text-[#2d6d5d]" />
          </div>
          <ul className="mt-5 divide-y divide-[#edf0ee]">
            {taskItems.map((task, index) => (
              <li key={task.key} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${index === 0 ? "bg-[#fff0cf] text-[#8a5910]" : "bg-[#edf2ef] text-[#65716c]"}`}>{index + 1}</span>
                <div className="min-w-0">
                  <p className="font-extrabold text-[#2a3c35]">{task.label}</p>
                  <p className="mt-1 text-sm text-[#76817c]">{task.meta}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="overflow-hidden rounded-[24px] bg-[#f1e8d7] lg:col-span-2">
          <div className="p-5 sm:p-7">
            <span className="grid size-11 place-items-center rounded-2xl bg-white text-[#2d6d5d] shadow-sm"><Icon name="map-pin" className="size-5" /></span>
            <h2 className="mt-5 text-xl font-black tracking-[-0.035em] text-[#352d22]">{t("agencies.heading")}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6f6454]">{t("agencies.description")}</p>
            <Link href="/map" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#352d22] px-4 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#352d22]">
              {t("agencies.cta")}
              <Icon name="arrow-right" className="size-4" />
            </Link>
          </div>
        </article>
      </section>
      <ChatLauncher surface="home" />
    </div>
  );
}
