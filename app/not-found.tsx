import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import "./globals.css";

export default async function RootNotFound() {
  const t = await getTranslations("NotFound");

  return (
    <html className="h-full antialiased">
      <body className="min-h-full bg-[#f7f8f4] text-[#20332c]">
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-black tracking-[-0.04em]">{t("title")}</h1>
          <p className="text-sm leading-6 text-[#6c7873]">{t("description")}</p>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#2d6d5d] px-4 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          >
            {t("backHome")}
          </Link>
        </div>
      </body>
    </html>
  );
}
