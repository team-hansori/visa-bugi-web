"use client";

import { useTranslations } from "next-intl";
import type { RequirementStatus } from "./preparation-model";

export function RequirementBadge({ status }: { status: RequirementStatus }) {
  const t = useTranslations("Home.tasks.status");
  const styles: Record<RequirementStatus, string> = {
    REQUIRED: "bg-[#ffe5df] text-[#8d3f30]",
    OPTIONAL: "bg-[#edf2ef] text-[#5f6d67]",
    CONDITIONAL: "bg-[#fff0cf] text-[#815711]",
    ALTERNATIVE: "bg-[#e8ecf7] text-[#505f89]",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 font-extrabold ${styles[status]}`}>
      {t(status.toLowerCase())}
    </span>
  );
}
