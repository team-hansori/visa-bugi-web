"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#e0e7e2] bg-white px-4 shadow-[0_10px_32px_rgba(52,76,65,0.06)]">
      {children}
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 border-b border-[#e7ebe8] py-4 last:border-b-0">
      {children}
    </div>
  );
}

function LinkRow({ href, icon, label }: { href: string; icon?: IconName; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center justify-between gap-4 border-b border-[#e7ebe8] py-4 last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
    >
      <span className="flex items-center gap-3 font-bold text-[#2a3c35]">
        {icon ? <Icon name={icon} className="size-5 text-[#5a6b64]" /> : null}
        {label}
      </span>
      <Icon name="chevron-right" className="size-4 shrink-0 text-[#9aa6a0]" />
    </Link>
  );
}

function DisabledRow({ label, tone = "default" }: { label: string; tone?: "default" | "danger" }) {
  return (
    <span
      aria-disabled="true"
      className={`flex min-h-14 cursor-not-allowed items-center border-b border-[#e7ebe8] py-4 font-bold last:border-b-0 ${
        tone === "danger" ? "text-[#c1725f]" : "text-[#9aa6a0]"
      }`}
    >
      {label}
    </span>
  );
}

export function MyHub() {
  const t = useTranslations();
  const [pushEnabled, setPushEnabled] = useState(true);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div
        aria-disabled="true"
        className="flex items-center gap-4 rounded-[20px] border border-[#dce8e2] bg-[#edf6f2] p-4"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-[#2d6d5d]">
          <Icon name="user" className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-[#1d5748]">{t("My.loginBanner.title")}</span>
          <span className="mt-0.5 block truncate text-sm text-[#5d7068]">{t("My.loginBanner.body")}</span>
        </span>
        <Icon name="chevron-right" className="size-4 shrink-0 text-[#9bb9ac]" />
      </div>

      <Card>
        <Row>
          <span className="font-bold text-[#2a3c35]">{t("Settings.language.label")}</span>
          <div className="w-44 max-w-[55%]">
            <LocaleSwitcher />
          </div>
        </Row>

        <Row>
          <span className="font-bold text-[#2a3c35]">{t("Settings.push.label")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={pushEnabled}
            onClick={() => setPushEnabled((value) => !value)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${
              pushEnabled ? "bg-[#2d6d5d]" : "bg-[#d8dfda]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
                pushEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </Row>

        <Row>
          <span>
            <span className="block font-bold text-[#2a3c35]">{t("Settings.location.label")}</span>
            <span className="mt-0.5 block text-xs text-[#9aa6a0]">{t("Settings.location.statusPreparing")}</span>
          </span>
          <span
            aria-disabled="true"
            className="relative inline-flex h-7 w-12 shrink-0 cursor-not-allowed items-center rounded-full bg-[#eef1ef] opacity-70"
          >
            <span aria-hidden="true" className="inline-block size-5 translate-x-1 rounded-full bg-white shadow-sm" />
          </span>
        </Row>

        <LinkRow href="/contact" label={t("Contact.pageTitle")} />
      </Card>

      <div>
        <p className="mb-2 px-1 text-xs font-bold text-[#8a938e]">{t("Settings.policy.sectionLabel")}</p>
        <Card>
          <LinkRow href="/terms" label={t("Terms.pageTitle")} />
          <LinkRow href="/privacy" label={t("Privacy.pageTitle")} />
          <LinkRow href="/privacy" label={t("Settings.policy.locationTerms")} />
        </Card>
      </div>

      <Card>
        <DisabledRow label={t("Settings.account.logout")} />
        <DisabledRow label={t("Settings.account.withdraw")} tone="danger" />
      </Card>

      <p className="pb-4 text-center text-xs text-[#a7b0ab]">{t("Settings.footer.appName")}</p>
    </div>
  );
}
