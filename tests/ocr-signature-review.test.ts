import { describe, expect, it } from "vitest";

import { reviewExtractedFields } from "@/features/ocr/form-templates";

describe("OCR signature review", () => {
  it("always marks the signature field complete without storing a signature value", () => {
    const fields = reviewExtractedFields("common_integrated_application", []);
    const signature = fields.find(
      (field) => field.fieldIdentifier === "applicant_signature",
    );

    expect(signature).toMatchObject({
      kind: "signature",
      rawValue: "",
      confidence: 1,
      status: "complete",
    });
  });
});
