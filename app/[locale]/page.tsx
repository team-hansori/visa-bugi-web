import { setRequestLocale } from "next-intl/server";
import { getHomeVisaPreparationCatalog } from "@/features/home/preparation-data";
import { getVisaQuotaOverview } from "@/features/home/quota-data";
import { VisaProgressDashboard } from "@/features/home/visa-progress-dashboard";
import { VisaQuotaCarousel } from "@/features/home/visa-quota-carousel";
import { getSavedDocumentProgress } from "@/features/ocr/saved-progress";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [quotaOverview, preparationCatalog, savedProgress] = await Promise.all([
    getVisaQuotaOverview(),
    getHomeVisaPreparationCatalog(),
    getSavedDocumentProgress(),
  ]);
  const savedReadyDocumentNames =
    savedProgress?.tasks
      .filter((task) => task.kind === "ready")
      .map((task) => task.documentTitle) ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      <VisaQuotaCarousel items={quotaOverview.items} source={quotaOverview.source} />
      <VisaProgressDashboard
        catalog={preparationCatalog}
        savedReadyDocumentNames={savedReadyDocumentNames}
      />
    </div>
  );
}
