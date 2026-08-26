import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";

export async function PrivacyView() {
  const t = await getTranslations("Privacy");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#fff1d4] text-[#8a5910]">
            <Icon name="shield" className="size-5" />
          </span>
          <span className="rounded-full bg-[#fff1d4] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#8a5910]">{t("badge")}</span>
        </div>
        <h2 className="mt-4 text-xl font-black tracking-[-0.035em]">{t("heading")}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#6d7974]">{t("description")}</p>
        <p className="mt-4 max-w-xl rounded-2xl bg-[#f5f7f4] p-4 text-sm leading-6 text-[#5d6a63]">{t("locationNotice")}</p>
      </section>
    </div>
  );
}
