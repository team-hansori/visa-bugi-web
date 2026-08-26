import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { TermsView } from "@/features/legal/terms-page";

export const metadata: Metadata = { title: "이용약관" };

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsView />;
}
