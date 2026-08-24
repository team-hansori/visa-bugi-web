import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const LOCALES = ["ko", "zh", "vi", "uz", "ne", "km"];

function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === "object"
      ? keyPaths(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  const byLocale = Object.fromEntries(
    LOCALES.map((l) => [l, JSON.parse(readFileSync(`messages/${l}.json`, "utf8"))]),
  );

  it("모든 locale이 ko와 같은 키 구조를 가진다", () => {
    const koKeys = keyPaths(byLocale.ko).sort();
    for (const l of LOCALES) {
      expect(keyPaths(byLocale[l]).sort(), `locale ${l}`).toEqual(koKeys);
    }
  });

  it("Chat 네임스페이스와 Nav.chat 키가 있다", () => {
    expect(keyPaths(byLocale.ko)).toContain("Nav.chat");
    expect(keyPaths(byLocale.ko)).toContain("Chat.inputPlaceholder");
    expect(keyPaths(byLocale.ko)).toContain("Chat.deleteConfirm");
    expect(keyPaths(byLocale.ko)).toContain("Chat.unverifiedNotice");
  });
});
