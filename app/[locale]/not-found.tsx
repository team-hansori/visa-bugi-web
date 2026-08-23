import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function LocaleNotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-black tracking-[-0.04em] text-[#20332c]">{t("title")}</h1>
      <p className="text-sm leading-6 text-[#6c7873]">{t("description")}</p>
      <Link
        href="/"
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#2d6d5d] px-4 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
