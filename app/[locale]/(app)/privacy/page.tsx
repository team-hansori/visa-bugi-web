import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PrivacyView } from "@/features/legal/privacy-page";

export const metadata: Metadata = { title: "개인정보처리방침" };

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyView />;
}
