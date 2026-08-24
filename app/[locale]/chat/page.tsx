import type { Metadata } from "next";
import { ChatUi } from "@/features/chat/chat-ui";

export const metadata: Metadata = { title: "비자 상담" };

export default function ChatPage() {
  return <ChatUi />;
}
