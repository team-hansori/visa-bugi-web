import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ContactView } from "@/features/contact/contact-page";

export const metadata: Metadata = { title: "문의하기" };

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ContactView />;
}
