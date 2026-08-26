import { Link } from "@/i18n/navigation";
import type { PolicyContent } from "./policy-content";

export function PolicyDocument({
  content,
  viewOriginalLabel,
  viewOriginalHref,
}: {
  content: PolicyContent;
  viewOriginalLabel: string;
  viewOriginalHref: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#fff1d4] px-2.5 py-1 text-[0.68rem] font-extrabold text-[#8a5910]">
          {content.badge}
        </span>
        <span className="text-xs text-[#8a938e]">
          {content.revisionLabel} {content.revisionDate}
        </span>
      </div>

      {content.kind === "full" ? (
        <>
          <p className="text-sm leading-6 text-[#6d7974]">{content.draftNotice}</p>
          <div className="space-y-5">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-base font-extrabold text-[#20332c]">{section.heading}</h2>
                <div className="mt-2 space-y-2">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-6 text-[#4b5850]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-[#6d7974]">{content.notice}</p>
          <Link
            href={viewOriginalHref}
            locale="ko"
            className="inline-flex items-center gap-1 text-sm font-bold text-[#2d6d5d] underline underline-offset-4"
          >
            {viewOriginalLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
