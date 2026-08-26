import { getLocale, getTranslations } from "next-intl/server";
import { getPolicyContent } from "./policy-content";
import { PolicyDocument } from "./policy-document";

export async function TermsView() {
  const locale = await getLocale();
  const t = await getTranslations("Terms");
  const legalT = await getTranslations("Legal");
  const content = getPolicyContent(locale, t, legalT("revisionLabel"));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">{t("pageTitle")}</h1>
      </header>

      <section className="rounded-[24px] border border-[#e0e7e2] bg-white p-5 shadow-[0_10px_32px_rgba(52,76,65,0.06)] sm:p-7">
        <PolicyDocument content={content} viewOriginalLabel={legalT("viewOriginal")} viewOriginalHref="/terms" />
      </section>
    </div>
  );
}
