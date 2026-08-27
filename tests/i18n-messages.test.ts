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

  it("정책 문서를 제외한 모든 locale이 ko와 같은 키 구조를 가진다", () => {
    const withoutPolicies = (source: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(source).filter(([namespace]) => !["Terms", "Privacy"].includes(namespace)));
    const koKeys = keyPaths(withoutPolicies(byLocale.ko)).sort();
    for (const l of LOCALES) {
      expect(keyPaths(withoutPolicies(byLocale[l])).sort(), `locale ${l}`).toEqual(koKeys);
    }
  });

  it("한국어는 정책 전문을, 번역 locale은 한국어 원문 안내를 제공한다", () => {
    for (const policy of ["Terms", "Privacy"]) {
      expect(byLocale.ko[policy].draftNotice).toBeTypeOf("string");
      expect(byLocale.ko[policy].sections).toBeInstanceOf(Array);

      for (const locale of LOCALES.filter((item) => item !== "ko")) {
        expect(byLocale[locale][policy].referral.notice).toBeTypeOf("string");
      }
    }
  });

  it("Chat 네임스페이스 키가 있다", () => {
    expect(keyPaths(byLocale.ko)).toContain("Chat.inputPlaceholder");
    expect(keyPaths(byLocale.ko)).toContain("Chat.deleteConfirm");
    expect(keyPaths(byLocale.ko)).toContain("Chat.unverifiedNotice");
  });

  it("localizes the chat labels for the translated locales", () => {
    for (const locale of ["zh", "uz", "ne", "km"]) {
      expect(byLocale[locale].Chat.title).not.toBe(byLocale.ko.Chat.title);
    }
  });

  it("localizes the language switcher label", () => {
    for (const locale of ["zh", "vi", "uz", "ne", "km"]) {
      expect(byLocale[locale].LocaleSwitcher.label).not.toBe(byLocale.ko.LocaleSwitcher.label);
    }
  });
});
