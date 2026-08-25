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
  return (key: string, values?: Record<string, unknown>) => {
    const raw = resolve(namespace, key);
    if (typeof raw !== "string") return key;
    if (!values) return raw;
    return raw.replace(/\{(\w+)\}/g, (_match, name: string) => String(values[name] ?? ""));
  };
}
