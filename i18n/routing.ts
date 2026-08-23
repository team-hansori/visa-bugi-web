import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "zh", "vi", "uz", "ne", "km"],
  defaultLocale: "ko",
});

export const localeNames: Record<(typeof routing.locales)[number], string> = {
  ko: "한국어",
  zh: "中文",
  vi: "Tiếng Việt",
  uz: "Oʻzbekcha",
  ne: "नेपाली",
  km: "ខ្មែរ",
};
