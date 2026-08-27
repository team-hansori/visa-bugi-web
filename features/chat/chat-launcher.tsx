"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ChatUi } from "./chat-ui";

type ChatLauncherProps = {
  surface: "home" | "ocr";
};

export function ChatLauncher({ surface }: ChatLauncherProps) {
  const t = useTranslations("Chat");
  const [isOpen, setIsOpen] = useState(false);
  const isOcr = surface === "ocr";

  return (
    <>
      <div className="fixed bottom-24 right-4 z-50 flex items-end gap-3 md:bottom-6 md:right-6">
        {isOcr ? (
          <p className="hidden max-w-52 rounded-2xl border border-[#d5e4dc] bg-white px-3.5 py-2.5 text-xs font-bold leading-5 text-[#3d5c51] shadow-[0_8px_24px_rgba(31,64,53,0.12)] sm:block">
            {t("ocrLauncherHint")}
          </p>
        ) : null}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={t("open")}
          onClick={() => setIsOpen(true)}
          className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#e6f1ec] shadow-[0_12px_28px_rgba(24,73,59,0.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2d6d5d]"
        >
          <Image
            src="/brand/chatbot/bugi-chatbot-face-128.png"
            alt=""
            aria-hidden="true"
            width={128}
            height={128}
            className="size-full object-cover"
          />
        </button>
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("title")}
          className="fixed inset-0 z-[60] flex items-end bg-[#173f36]/30 p-3 backdrop-blur-[1px] sm:items-center sm:justify-end sm:p-6"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] bg-[#f7f8f4] shadow-[0_24px_72px_rgba(17,49,40,0.28)]">
            <div className="flex items-center justify-between border-b border-[#e2e7e3] px-4 py-3 sm:px-5">
              <p className="font-black tracking-[-0.03em] text-[#173f36]">{t("title")}</p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid size-10 place-items-center rounded-xl text-[#52615b] hover:bg-[#edf2ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
                aria-label={t("close")}
              >
                <Icon name="close" className="size-5" aria-hidden="true" />
              </button>
            </div>
            {isOcr ? (
              <p className="border-b border-[#e2e7e3] bg-[#fff8e8] px-4 py-2.5 text-xs font-semibold leading-5 text-[#775b24] sm:px-5">
                {t("ocrIntegrationNotice")}
              </p>
            ) : null}
            <div className="p-3 sm:p-4">
              <ChatUi embedded />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
