import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { MyHub } from "@/features/my/my-hub";

export const metadata: Metadata = { title: "마이" };

export default async function MyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MyHub />;
}
