"use client";

import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type {
  ApplicationFormAnalysis,
  OcrApiError,
  OcrHelpChatMessage,
  OcrHelpLocale,
  OcrHelpRequest,
  OcrHelpResponse,
  ReviewedFormField,
} from "./types";

export function OcrHelpChat({
  analysis,
  selectedField,
  onClose,
}: {
  analysis: ApplicationFormAnalysis;
  selectedField: ReviewedFormField | null;
  onClose: () => void;
}) {
  const t = useTranslations("Ocr.chat");
  const locale = useLocale() as OcrHelpLocale;
  const [question, setQuestion] = useState(() =>
    selectedField
      ? t("fieldDefaultQuestion", { field: selectedField.labelKr })
      : "",
  );
  const [messages, setMessages] = useState<OcrHelpChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const suggestions = selectedField
    ? [
        t("suggestions.what", { field: selectedField.labelKr }),
        t("suggestions.who", { field: selectedField.labelKr }),
        t("suggestions.why", { field: selectedField.labelKr }),
      ]
    : [
        t("suggestions.first"),
        t("suggestions.applicant"),
        t("suggestions.manual"),
      ];

  async function sendQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion || isSending) return;

    setIsSending(true);
    setError("");

    const payload: OcrHelpRequest = {
      locale,
      question: nextQuestion,
      documentTitle: analysis.documentTitle,
      visaCode: analysis.visaCode,
      summary: analysis.summary,
      fields: analysis.fields.map((field) => ({
        fieldIdentifier: field.fieldIdentifier,
        labelKr: field.labelKr,
        kind: field.kind,
        filledBy: field.filledBy,
        required: field.required,
        manualOnly: field.manualOnly,
        status: field.status,
      })),
      selectedFieldIdentifier: selectedField?.fieldIdentifier ?? null,
      history: messages.slice(-6),
    };

    try {
      const response = await fetch("/api/chat/ocr-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as OcrHelpResponse | OcrApiError;
      if (!response.ok || "error" in body) {
        throw new Error(
          "error" in body ? chatErrorMessage(body.code, t) : t("errors.generic"),
        );
      }

      setMessages((current) => [
        ...current,
        { role: "user", content: nextQuestion },
        { role: "assistant", content: body.answer },
      ]);
      setQuestion("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section
      id="ocr-help-chat"
      className="mt-5 overflow-hidden rounded-[22px] border border-[#cbded5] bg-[#f4faf7]"
      aria-labelledby="ocr-help-chat-title"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#d9e7e0] bg-[#e8f4ee] px-4 py-4 sm:px-5">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#266452] text-white">
            <Icon name="message-circle" className="size-5" />
          </span>
          <div>
            <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">
              {t("eyebrow")}
            </p>
            <h3 id="ocr-help-chat-title" className="mt-0.5 font-black text-[#24473c]">
              {t("title")}
            </h3>
            {selectedField ? (
              <p className="mt-1 text-xs font-bold text-[#60746b]">
                {t("fieldContext", { field: selectedField.labelKr })}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 rounded-xl px-3 text-xs font-extrabold text-[#567067] hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        >
          {t("close")}
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <div className="rounded-2xl bg-white px-4 py-3 text-xs font-bold leading-5 text-[#66776f] ring-1 ring-[#dce7e1]">
          <p>{t("privacy")}</p>
          <p className="mt-1 text-[#8a5a16]">{t("sensitiveWarning")}</p>
        </div>

        {messages.length ? (
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto bg-[#266452] font-bold text-white"
                    : "bg-white text-[#40534b] ring-1 ring-[#dce7e1]"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[#61716a]">{t("description")}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuestion(suggestion)}
              className="min-h-10 rounded-full border border-[#cadbd3] bg-white px-3.5 py-2 text-left text-xs font-extrabold text-[#356153] hover:bg-[#edf6f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form onSubmit={sendQuestion} className="mt-4">
          <label htmlFor="ocr-help-question" className="sr-only">
            {t("inputLabel")}
          </label>
          <textarea
            id="ocr-help-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value.slice(0, 500))}
            placeholder={t("placeholder")}
            rows={3}
            className="w-full resize-y rounded-2xl border border-[#cbd9d2] bg-white px-4 py-3 text-sm leading-6 text-[#30463d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          />
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-bold text-[#718079]">
              {t("characterCount", { count: question.length })}
            </span>
            <button
              type="submit"
              disabled={!question.trim() || isSending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#266452] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#9cafA7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
            >
              <Icon name={isSending ? "clock" : "message-circle"} className="size-4" />
              {isSending ? t("sending") : t("send")}
            </button>
          </div>
        </form>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-bold leading-6 text-[#9a3f33]"
          >
            {error}
          </p>
        ) : null}

        <p className="mt-4 border-t border-[#dce7e1] pt-3 text-xs leading-5 text-[#718079]">
          {t("disclaimer")}
        </p>
      </div>
    </section>
  );
}

type ChatTranslator = ReturnType<typeof useTranslations<"Ocr.chat">>;

function chatErrorMessage(code: string, t: ChatTranslator) {
  if (code === "CHAT_NOT_CONFIGURED") return t("errors.notConfigured");
  if (code === "TOO_MANY_REQUESTS") return t("errors.rateLimit");
  if (code === "INVALID_CHAT_REQUEST") return t("errors.invalid");
  return t("errors.generic");
}
