import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";

const links: { href: string; icon: IconName; key: "settings" | "contact" | "terms" | "privacy" }[] = [
  { href: "/settings", icon: "settings", key: "settings" },
  { href: "/contact", icon: "mail", key: "contact" },
  { href: "/terms", icon: "document", key: "terms" },
  { href: "/privacy", icon: "shield", key: "privacy" },
];

export async function MyHub() {
  const t = await getTranslations("My");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section aria-label={t("loginBanner.title")} className="rounded-[24px] border border-[#dce8e2] bg-[#edf6f2] p-5 sm:p-6">
        <p className="font-extrabold text-[#1d5748]">{t("loginBanner.title")}</p>
        <p className="mt-1 text-sm leading-6 text-[#5d7068]">{t("loginBanner.body")}</p>
      </section>

      <nav aria-label={t("linksAriaLabel")} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-4 rounded-[20px] border border-[#e0e7e2] bg-white p-4 shadow-[0_10px_32px_rgba(52,76,65,0.06)] transition-colors hover:border-[#9bb9ac] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e8f3ee] text-[#215a4b]">
              <Icon name={link.icon} className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-extrabold text-[#2a3c35]">{t(`links.${link.key}.label`)}</span>
              <span className="mt-0.5 block truncate text-sm text-[#76817c]">{t(`links.${link.key}.description`)}</span>
            </span>
            <Icon name="chevron-right" className="ml-auto size-4 shrink-0 text-[#9aa6a0]" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
