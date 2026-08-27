"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { ChatMessage, ChatResponse } from "./types";

type Entry =
  | { role: "user"; content: string }
  | { role: "assistant"; response: ChatResponse };

export function ChatUi({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);

  function toHistory(items: Entry[]): ChatMessage[] {
    return items.slice(-10).map((e) =>
      e.role === "user"
        ? { role: "user" as const, content: e.content }
        : { role: "assistant" as const, content: e.response.text },
    );
  }

  async function send() {
    const question = input.trim();
    if (!question || busy || inFlightRef.current) return;
    inFlightRef.current = true;
    setInput("");
    const next: Entry[] = [...entries, { role: "user", content: question }];
    setEntries(next);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toHistory(next), locale }),
      });
      const data = (await res.json()) as ChatResponse;
      setEntries((prev) => [...prev, { role: "assistant", response: data }]);
    } catch {
      setEntries((prev) => [
        ...prev,
        { role: "assistant", response: { kind: "error", text: t("error"), sources: [] } },
      ]);
    } finally {
      inFlightRef.current = false;
      setBusy(false);
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }

  async function deleteHistory() {
    if (!window.confirm(t("deleteConfirm"))) return;
    setDeleteNotice(null);
    try {
      const res = await fetch("/api/chat/session", { method: "DELETE" });
      if (!res.ok) {
        setDeleteNotice(t("error"));
        return;
      }
      setEntries([]);
      setDeleteNotice(t("deleted"));
    } catch {
      setDeleteNotice(t("error"));
    }
  }

  return (
    <div className={embedded ? "" : "space-y-4"}>
      {!embedded ? <header>
        <h1 className="text-xl font-extrabold tracking-[-0.03em] text-[#173f36]">{t("title")}</h1>
        <p className="mt-1 text-sm text-[#66736e]">{t("description")}</p>
      </header> : null}
    <section className={`mx-auto flex flex-col rounded-2xl border border-[#e2e7e3] bg-white ${embedded ? "h-[min(34rem,calc(100dvh-10rem))] max-w-none" : "h-[calc(100dvh-14rem)] max-w-3xl"}`}>
      <header className="flex items-center justify-between border-b border-[#eef1ee] px-4 py-3">
        <p className="text-sm text-[#66736e]">{t("disclaimer")}</p>
        <button
          type="button"
          onClick={deleteHistory}
          className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#8a4b3f] hover:bg-[#faf1ef] focus-visible:outline-2 focus-visible:outline-[#2d6d5d]"
        >
          {t("deleteHistory")}
        </button>
      </header>
      {deleteNotice && (
        <p role="status" className="border-b border-[#eef1ee] px-4 py-2 text-xs text-[#66736e]">
          {deleteNotice}
        </p>
      )}

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {entries.length === 0 && <p className="text-sm text-[#77817d]">{t("empty")}</p>}
        {entries.map((entry, i) =>
          entry.role === "user" ? (
            <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl bg-[#e6f1ec] px-4 py-2.5 text-sm text-[#1e5a4b]">
              {entry.content}
            </p>
          ) : (
            <AssistantBubble key={i} response={entry.response} />
          ),
        )}
        {busy && <p className="text-sm text-[#77817d]">{t("sending")}</p>}
      </div>

      <form
        className="flex gap-2 border-t border-[#eef1ee] p-3"
        onSubmit={(e) => { e.preventDefault(); void send(); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label={t("inputAriaLabel")}
          placeholder={t("inputPlaceholder")}
          maxLength={4000}
          className="min-h-11 flex-1 rounded-xl border border-[#dfe5e1] px-3.5 text-sm focus-visible:outline-2 focus-visible:outline-[#2d6d5d]"
        />
        <button
          type="submit"
          disabled={busy || input.trim() === ""}
          className="min-h-11 rounded-xl bg-[#1e5a4b] px-4 text-sm font-bold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        >
          {t("send")}
        </button>
      </form>
    </section>
    </div>
  );
}

function AssistantBubble({ response }: { response: ChatResponse }) {
  const t = useTranslations("Chat");
  return (
    <div className="w-fit max-w-[90%] space-y-2 rounded-2xl bg-[#f2f5f2] px-4 py-3 text-sm text-[#20332c]">
      <p className="whitespace-pre-wrap">{response.text}</p>

      {response.escalation && (
        <div className="space-y-2 rounded-xl border border-[#dfe5e1] bg-white p-3">
          {response.escalation.template && response.escalation.template !== response.text && (
            <p lang="ko" className="text-[#52615b]">{response.escalation.template}</p>
          )}
          {!response.escalation.verifiedForUserType && (
            <p className="rounded-lg bg-[#fdf6e5] px-2.5 py-1.5 text-xs text-[#8a6a1f]">
              {t("unverifiedNotice")}
            </p>
          )}
          <p className="text-xs font-bold text-[#66736e]">{t("contactsLabel")}</p>
          <ul className="space-y-1.5">
            {response.escalation.contacts.map((c, i) => (
              <li key={i} lang="ko">
                <span className="font-semibold">{c.name}</span>
                {c.regionScope && <span className="text-xs text-[#77817d]"> · {c.regionScope}</span>}
                {c.phone && (
                  <>
                    {" · "}
                    <a href={`tel:${c.phone}`} className="font-semibold text-[#1e5a4b] underline">
                      <Icon name="phone" className="mr-0.5 inline size-3.5" aria-hidden="true" />
                      {c.phone}
                    </a>
                  </>
                )}
                {c.url && (
                  <>
                    {" · "}
                    <a href={c.url} target="_blank" rel="noreferrer" className="break-all text-[#1e5a4b] underline">
                      {c.url}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {response.sources.length > 0 && (
        <p className="text-xs text-[#77817d]" lang="ko">
          {t("sourcesLabel")}:{" "}
          {response.sources
            .map((s) => `${s.sourceDocument ?? s.table}${s.lastVerifiedAt ? ` (${t("verifiedAtLabel")} ${s.lastVerifiedAt})` : ""}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
