import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChatUi } from "@/features/chat/chat-ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Chat" });

  return { title: t("title") };
}

export default function ChatPage() {
  return <ChatUi />;
}
