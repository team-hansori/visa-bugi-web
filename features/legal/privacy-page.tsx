import { getLocale, getTranslations } from "next-intl/server";
import { getPolicyContent } from "./policy-content";
import { PolicyDocument } from "./policy-document";

export async function PrivacyView() {
  const locale = await getLocale();
  const t = await getTranslations("Privacy");
  const legalT = await getTranslations("Legal");
  const content = getPolicyContent(locale, t);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <PolicyDocument content={content} viewOriginalLabel={legalT("viewOriginal")} viewOriginalHref="/privacy" />
        <p className="mt-4 max-w-xl rounded-2xl bg-[#f5f7f4] p-4 text-sm leading-6 text-[#5d6a63]">{t("locationNotice")}</p>
      </section>
    </div>
  );
}
