import { getTranslations, setRequestLocale } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";

const stages = [
  { id: "requirementCheck", state: "done" },
  { id: "documentPrep", state: "current" },
  { id: "agencyVisit", state: "upcoming" },
  { id: "resultCheck", state: "upcoming" },
] as const;

const sampleTasks = ["passport", "schedule", "agency"] as const;

function ProgressRing({
  ariaLabel,
  caption,
}: {
  ariaLabel: string;
  caption: string;
}) {
  return (
    <div className="relative grid size-36 shrink-0 place-items-center sm:size-40" role="img" aria-label={ariaLabel}>
      <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="51" fill="none" stroke="#e5ebe7" strokeWidth="10" />
        <circle cx="60" cy="60" r="51" fill="none" pathLength="100" stroke="#2d6d5d" strokeDasharray="68 32" strokeLinecap="round" strokeWidth="10" />
      </svg>
      <div className="absolute text-center">
        <strong className="block text-3xl font-black tracking-[-0.06em] text-[#173f36] sm:text-4xl">68%</strong>
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
  const t = await getTranslations("Home");

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-col gap-5 rounded-[28px] bg-[#173f36] px-5 py-7 text-white shadow-[0_18px_50px_rgba(23,63,54,0.18)] sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div className="max-w-2xl">
          <span className="inline-flex min-h-8 items-center rounded-full bg-white/12 px-3 text-xs font-bold text-[#d9eee5]">{t("demoBadge")}</span>
          <h1 className="mt-4 text-[clamp(1.75rem,7vw,3.25rem)] font-black leading-[1.12] tracking-[-0.055em]">
            {t("heroTitle")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#d1dfda] sm:text-base sm:leading-7">
            {t("heroDescription")}
          </p>
        </div>
        <Link href="/onboarding" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffca68] px-5 text-sm font-extrabold text-[#173f36] shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-fit">
          {t("heroCta")}
          <Icon name="arrow-right" className="size-4" />
        </Link>
      </section>

      <section className="grid gap-5 xl:grid-cols-12" aria-label={t("progress.sectionAriaLabel")}>
        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 xl:col-span-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("progress.eyebrow")}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#20332c]">{t("progress.heading")}</h2>
            </div>
            <span className="rounded-full bg-[#fff1d4] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#8a5910]">{t("progress.demoTag")}</span>
          </div>
          <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center xl:flex-col">
            <ProgressRing ariaLabel={t("progress.ariaLabel")} caption={t("progress.caption")} />
            <div className="w-full rounded-2xl bg-[#f5f7f4] p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-[#64716c]">{t("progress.selectedVisaLabel")}</span>
                <strong className="text-[#20332c]">{t("progress.selectedVisaValue")}</strong>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-[#64716c]">{t("progress.baseDateLabel")}</span>
                <strong className="text-[#8a5910]">{t("progress.baseDateValue")}</strong>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7 xl:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("journey.eyebrow")}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">{t("journey.heading")}</h2>
            </div>
            <span className="text-sm font-bold text-[#2d6d5d]">{t("journey.stepIndicator")}</span>
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
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("tasks.eyebrow")}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">{t("tasks.heading")}</h2>
            </div>
            <Icon name="document" className="size-6 text-[#2d6d5d]" />
          </div>
          <ul className="mt-5 divide-y divide-[#edf0ee]">
            {sampleTasks.map((taskId, index) => (
              <li key={taskId} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${index === 0 ? "bg-[#fff0cf] text-[#8a5910]" : "bg-[#edf2ef] text-[#65716c]"}`}>{index + 1}</span>
                <div className="min-w-0">
                  <p className="font-extrabold text-[#2a3c35]">{t(`tasks.items.${taskId}.label`)}</p>
                  <p className="mt-1 text-sm text-[#76817c]">{t(`tasks.items.${taskId}.meta`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="overflow-hidden rounded-[24px] bg-[#f1e8d7] lg:col-span-2">
          <div className="p-5 sm:p-7">
            <span className="grid size-11 place-items-center rounded-2xl bg-white text-[#2d6d5d] shadow-sm"><Icon name="map-pin" className="size-5" /></span>
            <p className="mt-5 text-xs font-extrabold tracking-[0.08em] text-[#76582d]">{t("agencies.eyebrow")}</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#352d22]">{t("agencies.heading")}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6f6454]">{t("agencies.description")}</p>
            <Link href="/map" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#352d22] px-4 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#352d22]">
              {t("agencies.cta")}
              <Icon name="arrow-right" className="size-4" />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
