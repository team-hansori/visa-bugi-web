"use client";

import { type TouchEvent, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import type { VisaQuotaItem } from "./quota-model";

type VisaQuotaCarouselProps = {
  items: VisaQuotaItem[];
  source: "supabase" | "preview";
};

const themes = [
  "from-[#123e34] via-[#1a5749] to-[#26715d]",
  "from-[#173f4b] via-[#245b65] to-[#34737b]",
  "from-[#5a421e] via-[#7a5924] to-[#9b7433]",
  "from-[#263b58] via-[#354f72] to-[#49678b]",
];

const announcementUrls: Partial<Record<string, string>> = {
  "F-2-R":
    "https://www.chungbuk.go.kr/www/selectGosiPblancView.do?key=422&no=69043&pageUnit=10&pageIndex=1&searchCnd=all&searchKrwd=%EB%B9%84%EC%9E%90",
  "E-7-4R":
    "https://www.chungbuk.go.kr/www/selectGosiPblancView.do?key=422&no=69044&pageUnit=10&pageIndex=1&searchCnd=all&searchKrwd=%EB%B9%84%EC%9E%90",
  "F-4-R":
    "https://www.chungbuk.go.kr/www/selectGosiPblancView.do?key=422&no=69045&pageUnit=10&pageIndex=1&searchCnd=all&searchKrwd=%EB%B9%84%EC%9E%90",
};

export function VisaQuotaCarousel({ items, source }: VisaQuotaCarouselProps) {
  const t = useTranslations("Home.quota");
  const visaT = useTranslations("Calendar.visaPicker.visas");
  const locale = useLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const numberFormatter = new Intl.NumberFormat(locale);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });

  if (!items.length) return null;

  function move(offset: number) {
    setActiveIndex((current) => (current + offset + items.length) % items.length);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 45) return;
    move(distance > 0 ? -1 : 1);
  }

  return (
    <section
      className="relative overflow-hidden rounded-[28px] bg-[#173f36] text-white shadow-[0_18px_50px_rgba(23,63,54,0.18)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2d6d5d]"
      aria-label={t("sectionAriaLabel")}
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") move(-1);
        if (event.key === "ArrowRight") move(1);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {items.map((item, index) => {
          const progress =
            item.status === "limited" &&
            item.allocatedQuota &&
            item.remainingQuota !== null
              ? Math.max(
                  0,
                  Math.min(100, (item.remainingQuota / item.allocatedQuota) * 100),
                )
              : 0;
          const visaName = getVisaName(item.visaCode, item.visaNameKr, visaT);
          const date = item.asOfDate
            ? dateFormatter.format(new Date(`${item.asOfDate}T00:00:00+09:00`))
            : null;
          const announcementUrl = announcementUrls[item.visaCode];

          return (
            <article
              key={item.visaCode}
              className={`relative min-h-[340px] w-full shrink-0 bg-gradient-to-br ${themes[index % themes.length]} px-6 pb-20 pt-7 sm:min-h-[330px] sm:px-16 sm:pb-16 sm:pt-10 lg:px-24`}
              aria-hidden={index !== activeIndex}
            >
              <div className="absolute -right-16 -top-24 size-72 rounded-full border-[46px] border-white/[0.04]" aria-hidden="true" />
              <div className="absolute -bottom-36 right-20 size-72 rounded-full bg-white/[0.04] blur-2xl" aria-hidden="true" />

              <div className="relative flex h-full flex-col justify-between gap-7 sm:flex-row sm:items-end">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex min-h-8 items-center rounded-full bg-white/12 px-3 text-xs font-extrabold text-white/90">
                      {t("eyebrow")}
                    </span>
                    <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 px-3 text-xs font-bold text-white/75">
                      {source === "supabase"
                        ? t("supabaseBadge")
                        : t("previewBadge")}
                    </span>
                  </div>
                  <p className="mt-5 text-sm font-extrabold tracking-[0.12em] text-[#ffda8b]">
                    {item.visaCode}
                  </p>
                  <h1 className="mt-1 text-[clamp(1.45rem,5vw,2.5rem)] font-black leading-tight tracking-[-0.045em]">
                    {visaName}
                  </h1>

                  <div className="mt-5">
                    {item.status === "limited" && item.remainingQuota !== null ? (
                      <>
                        <p className="text-sm font-bold text-white/75">
                          {t("remaining")}
                        </p>
                        <p className="mt-1 flex items-end gap-2">
                          <strong className="text-5xl font-black leading-none tracking-[-0.06em] sm:text-6xl">
                            {numberFormatter.format(item.remainingQuota)}
                          </strong>
                          <span className="pb-1 text-xl font-black text-[#ffda8b]">
                            {t("people")}
                          </span>
                        </p>
                        {item.allocatedQuota !== null ? (
                          <div className="mt-4 max-w-md">
                            <div className="h-2 overflow-hidden rounded-full bg-black/20">
                              <div
                                className="h-full rounded-full bg-[#ffce72]"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs font-semibold text-white/70">
                              {t("allocated", {
                                count: numberFormatter.format(item.allocatedQuota),
                              })}
                            </p>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-white/75">
                          {t("remaining")}
                        </p>
                        <strong className="mt-2 block text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">
                          {item.status === "unlimited"
                            ? t("unlimited")
                            : t("unavailable")}
                        </strong>
                      </>
                    )}
                  </div>
                </div>

                <div className="relative w-full rounded-2xl border border-white/12 bg-black/15 p-4 backdrop-blur-sm sm:w-[280px]">
                  <p className="text-sm font-extrabold text-white">
                    {getScopeLabel(item, t)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/70">
                    {item.noticeRound ? t("round", { round: item.noticeRound }) : null}
                    {item.noticeRound && date ? " · " : null}
                    {date ? t("asOf", { date }) : t("dateUnavailable")}
                  </p>
                  <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-white/65">
                    {t("notice")}
                  </p>
                  {announcementUrl ? (
                    <a
                      href={announcementUrl}
                      tabIndex={index === activeIndex ? 0 : -1}
                      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ffce72] px-4 text-sm font-extrabold text-[#173f36] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
                    >
                      {t("cta")}
                      <Icon name="arrow-right" className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => move(-1)}
        aria-label={t("previous")}
        className="absolute bottom-4 left-3 grid size-11 place-items-center rounded-full border border-white/15 bg-black/20 text-white backdrop-blur transition-colors hover:bg-black/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-auto sm:left-5 sm:top-1/2 sm:-translate-y-1/2"
      >
        <Icon name="chevron-left" className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        aria-label={t("next")}
        className="absolute bottom-4 right-3 grid size-11 place-items-center rounded-full border border-white/15 bg-black/20 text-white backdrop-blur transition-colors hover:bg-black/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-auto sm:right-5 sm:top-1/2 sm:-translate-y-1/2"
      >
        <Icon name="chevron-right" className="size-5" />
      </button>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2" aria-label={t("pagination")}>
        {items.map((item, index) => (
          <button
            key={item.visaCode}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={t("goTo", { visa: item.visaCode })}
            aria-current={index === activeIndex ? "true" : undefined}
            className={`h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white ${
              index === activeIndex ? "w-8 bg-[#ffce72]" : "w-2 bg-white/45"
            }`}
          />
        ))}
        <span className="ml-1 text-[0.68rem] font-extrabold text-white/65">
          {t("position", { current: activeIndex + 1, total: items.length })}
        </span>
      </div>
    </section>
  );
}

type Translator = ReturnType<typeof useTranslations>;

function getVisaName(code: string, fallback: string, t: Translator) {
  const keys: Record<string, string> = {
    "F-4-R": "f4r",
    "E-7-4R": "e74r",
    "F-2-R": "f2r",
    "D-2": "d2",
  };
  const key = keys[code];
  return key ? t(key) : fallback;
}

function getScopeLabel(item: VisaQuotaItem, t: Translator) {
  if (item.scopeKind === "municipalities") {
    return t("municipalityScope", { count: item.scopeCount });
  }
  if (item.scopeKind === "province") return t("provinceScope");
  if (item.scopeKind === "single") return t("singleScope");
  return t("policyScope");
}
