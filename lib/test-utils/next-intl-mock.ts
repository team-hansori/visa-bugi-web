import { createElement, Fragment, type ReactNode } from "react";
import koMessages from "@/messages/ko.json";

type MessageTree = { [key: string]: string | MessageTree };

const namespaces = koMessages as Record<string, MessageTree>;

function resolve(namespace: string, key: string): unknown {
  const root = namespaces[namespace];
  return key
    .split(".")
    .reduce<unknown>(
      (acc, part) => (acc && typeof acc === "object" ? (acc as MessageTree)[part] : undefined),
      root,
    );
}

/**
 * `vi.mock("next-intl", ...)` 안에서 쓰는 t() 대역. ko.json을 실제로 읽어
 * 응답하므로, 메시지 키를 추가할 때마다 목을 손으로 따라 갱신할 필요가 없다.
 */
export function createTestTranslator(namespace: string) {
  function t(key: string, values?: Record<string, unknown>) {
    const raw = resolve(namespace, key);
    if (typeof raw !== "string") return key;
    if (!values) return raw;
    return raw.replace(/\{(\w+)\}/g, (_match, name: string) => String(values[name] ?? ""));
  }

  t.rich = (
    key: string,
    values: Record<string, (chunks: ReactNode) => ReactNode>,
  ): ReactNode => {
    const raw = resolve(namespace, key);
    if (typeof raw !== "string") return key;

    const parts: ReactNode[] = [];
    const tagPattern = /<(\w+)>(.*?)<\/\1>/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let partIndex = 0;

    while ((match = tagPattern.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        parts.push(raw.slice(lastIndex, match.index));
      }
      const [, tagName, inner] = match;
      const render = values[tagName];
      if (!render) {
        throw new Error(`Missing rich text handler for <${tagName}>`);
      }
      parts.push(createElement(Fragment, { key: partIndex++ }, render(inner)));
      lastIndex = tagPattern.lastIndex;
    }
    if (lastIndex < raw.length) {
      parts.push(raw.slice(lastIndex));
    }
    return parts;
  };

  return t;
}
