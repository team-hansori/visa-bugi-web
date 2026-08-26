export type PolicySection = { heading: string; paragraphs: string[] };

export type PolicyContent =
  | {
      kind: "full";
      badge: string;
      revisionLabel: string;
      revisionDate: string;
      draftNotice: string;
      sections: PolicySection[];
    }
  | {
      kind: "referral";
      badge: string;
      revisionDate: string;
      notice: string;
    };

export interface PolicyTranslator {
  (key: string): string;
  raw(key: string): unknown;
}

export function getPolicyContent(locale: string, t: PolicyTranslator): PolicyContent {
  if (locale === "ko") {
    return {
      kind: "full",
      badge: t("badge"),
      revisionLabel: t("revisionLabel"),
      revisionDate: t("revisionDate"),
      draftNotice: t("draftNotice"),
      sections: t.raw("sections") as PolicySection[],
    };
  }

  return {
    kind: "referral",
    badge: t("badge"),
    revisionDate: t("revisionDate"),
    notice: t("referral.notice"),
  };
}
