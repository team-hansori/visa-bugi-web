import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "서류" };

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("DocumentsHub");

  return (
    <section className="mx-auto max-w-4xl" aria-labelledby="documents-heading">
      <div className="text-center">
        <p className="text-sm font-extrabold tracking-[0.08em] text-[#2d6d5d]">{t("eyebrow")}</p>
        <h1 id="documents-heading" className="mt-2 text-3xl font-black tracking-[-0.045em] text-[#20332c] sm:text-4xl">{t("title")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#65716c] sm:text-base">{t("description")}</p>
      </div>

      <div className="mt-8 grid gap-5">
        <Link
          href="/ocr"
          className="group flex min-h-52 items-center justify-between gap-5 rounded-[28px] border border-[#c8ddd4] bg-[#eaf5f0] p-6 shadow-[0_12px_34px_rgba(42,82,66,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(42,82,66,0.12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2d6d5d] sm:p-8"
        >
          <span>
            <span className="grid size-12 place-items-center rounded-2xl bg-[#2d6d5d] text-white shadow-sm">
              <Icon name="search" className="size-6" />
            </span>
            <span className="mt-5 block text-2xl font-black tracking-[-0.04em] text-[#203d34]">{t("ocr.title")}</span>
            <span className="mt-2 block max-w-xl text-sm leading-6 text-[#5f7069]">{t("ocr.description")}</span>
          </span>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-[#2d6d5d] shadow-sm transition group-hover:translate-x-1">
            <Icon name="chevron-right" className="size-6" />
          </span>
        </Link>

        <Link
          href="/documents/status"
          className="group flex min-h-52 items-center justify-between gap-5 rounded-[28px] border border-[#ebdfc9] bg-[#fff7e7] p-6 shadow-[0_12px_34px_rgba(92,69,35,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(92,69,35,0.11)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a651f] sm:p-8"
        >
          <span>
            <span className="grid size-12 place-items-center rounded-2xl bg-[#8a651f] text-white shadow-sm">
              <Icon name="document" className="size-6" />
            </span>
            <span className="mt-5 block text-2xl font-black tracking-[-0.04em] text-[#473923]">{t("status.title")}</span>
            <span className="mt-2 block max-w-xl text-sm leading-6 text-[#736650]">{t("status.description")}</span>
          </span>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-[#7c5a1c] shadow-sm transition group-hover:translate-x-1">
            <Icon name="chevron-right" className="size-6" />
          </span>
        </Link>
      </div>
    </section>
  );
}

