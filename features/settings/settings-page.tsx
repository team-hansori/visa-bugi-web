"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function SettingsView() {
  const t = useTranslations("Settings");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("language.eyebrow")}</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">{t("language.heading")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#6d7974]">{t("language.description")}</p>
        <div className="mt-4">
          <LocaleSwitcher variant="full" />
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("location.eyebrow")}</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">{t("location.heading")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#6d7974]">{t("location.description")}</p>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-[#f5f7f4] p-4">
          <span className="font-extrabold text-[#2a3c35]">{t("location.toggleLabel")}</span>
          <span aria-disabled="true" className="inline-flex min-h-8 cursor-not-allowed items-center rounded-full bg-[#eef1ef] px-3 text-xs font-extrabold text-[#929b97]">
            {t("location.statusPreparing")}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-[#e5ebe7] px-4 py-3">
          <span className="text-sm font-bold text-[#40534b]">{t("location.policyLinkLabel")}</span>
          <span aria-disabled="true" className="inline-flex min-h-8 cursor-not-allowed items-center rounded-full bg-[#eef1ef] px-3 text-xs font-extrabold text-[#929b97]">
            {t("location.policyLinkStatus")}
          </span>
        </div>
      </section>
    </div>
  );
}
