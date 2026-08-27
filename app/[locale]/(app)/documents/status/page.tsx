import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getHomeVisaPreparationCatalog } from "@/features/home/preparation-data";
import { DocumentSubmissionStatus } from "@/features/home/document-submission-status";

export const metadata: Metadata = { title: "비자 제출 서류 현황" };

export default async function DocumentStatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const catalog = await getHomeVisaPreparationCatalog();

  return <DocumentSubmissionStatus catalog={catalog} />;
}
