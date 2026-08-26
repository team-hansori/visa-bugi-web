import { createClient } from "@/lib/supabase/server";

export type SavedProgressTask = {
  kind: "missing" | "review" | "ready";
  documentTitle: string;
  count: number;
};

export type SavedDocumentProgress = {
  percentage: number;
  totalDocuments: number;
  readyDocuments: number;
  visaCodes: string[];
  lastUpdatedAt: string;
  tasks: SavedProgressTask[];
};

type ReviewRow = {
  document_title: string;
  visa_code: string;
  review_status: "READY" | "NEEDS_REVIEW" | "INCOMPLETE";
  complete_count: number;
  review_count: number;
  missing_count: number;
  manual_count: number;
  updated_at: string;
};

export async function getSavedDocumentProgress(): Promise<SavedDocumentProgress | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return null;

    const { data, error } = await supabase
      .from("user_document_reviews")
      .select(
        "document_title,visa_code,review_status,complete_count,review_count,missing_count,manual_count,updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error || !data?.length) return null;

    const rows = data as ReviewRow[];
    const totals = rows.reduce(
      (sum, row) => ({
        complete: sum.complete + nonnegative(row.complete_count),
        review: sum.review + nonnegative(row.review_count),
        missing: sum.missing + nonnegative(row.missing_count),
        manual: sum.manual + nonnegative(row.manual_count),
      }),
      { complete: 0, review: 0, missing: 0, manual: 0 },
    );
    const trackedFieldCount =
      totals.complete + totals.review + totals.missing + totals.manual;
    const percentage = trackedFieldCount
      ? Math.round((totals.complete / trackedFieldCount) * 100)
      : 0;

    return {
      percentage,
      totalDocuments: rows.length,
      readyDocuments: rows.filter((row) => row.review_status === "READY").length,
      visaCodes: [
        ...new Set(
          rows
            .map((row) => row.visa_code)
            .filter((visaCode) => visaCode && visaCode !== "COMMON"),
        ),
      ].slice(0, 3),
      lastUpdatedAt: rows[0].updated_at,
      tasks: rows.slice(0, 3).map((row) => {
        const missing = nonnegative(row.missing_count);
        const review = nonnegative(row.review_count) + nonnegative(row.manual_count);
        if (missing > 0) {
          return {
            kind: "missing" as const,
            documentTitle: row.document_title,
            count: missing,
          };
        }
        if (review > 0) {
          return {
            kind: "review" as const,
            documentTitle: row.document_title,
            count: review,
          };
        }
        return {
          kind: "ready" as const,
          documentTitle: row.document_title,
          count: 0,
        };
      }),
    };
  } catch {
    return null;
  }
}

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function nonnegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
