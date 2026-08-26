import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";

export async function ContactView() {
  const t = await getTranslations("Contact");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold text-[#2d6d5d]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#e8f3ee] text-[#215a4b]">
          <Icon name="mail" className="size-5" />
        </span>
        <h2 className="mt-4 text-xl font-black tracking-[-0.035em]">{t("heading")}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#6d7974]">{t("description")}</p>
        <span aria-disabled="true" className="mt-5 inline-flex min-h-11 cursor-not-allowed items-center gap-1.5 rounded-xl bg-[#eef1ef] px-4 text-sm font-extrabold text-[#929b97]">
          <Icon name="mail" className="size-4" />
          {t("buttonLabel")}
        </span>
      </section>
    </div>
  );
}
