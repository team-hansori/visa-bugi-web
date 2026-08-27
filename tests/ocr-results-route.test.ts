import { beforeEach, describe, expect, it, vi } from "vitest";

import { getApplicationFormTemplate } from "@/features/ocr/form-templates";
import type { FormReviewStatus } from "@/features/ocr/types";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { POST } from "@/app/api/ocr/results/route";

const template = getApplicationFormTemplate("common_integrated_application")!;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
});

describe("POST /api/ocr/results", () => {
  it("rejects a client attempt to downgrade a required template field", async () => {
    const { client, upsert } = createSupabaseMock();
    mocks.createClient.mockResolvedValue(client);
    const fields = validTemplateFields();
    const fullName = fields.find(
      (field) => field.fieldIdentifier === "full_name",
    )!;
    fullName.required = false;
    fullName.status = "optional";

    const response = await POST(createRequest(fields));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_OCR_RESULT",
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects incomplete field arrays instead of deriving READY from them", async () => {
    const { client, upsert } = createSupabaseMock();
    mocks.createClient.mockResolvedValue(client);

    const response = await POST(
      createRequest([
        {
          fieldIdentifier: "full_name",
          status: "complete",
          confidence: 1,
          required: true,
        },
      ]),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_OCR_RESULT",
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects a template-required field with an optional status", async () => {
    const { client, upsert } = createSupabaseMock();
    mocks.createClient.mockResolvedValue(client);
    const fields = validTemplateFields();
    const fullName = fields.find(
      (field) => field.fieldIdentifier === "full_name",
    )!;
    fullName.status = "optional";

    const response = await POST(createRequest(fields));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_OCR_RESULT",
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("persists a complete server-verified template field set", async () => {
    const { client, upsert } = createSupabaseMock();
    mocks.createClient.mockResolvedValue(client);

    const response = await POST(createRequest(validTemplateFields()));

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert.mock.calls[0][0]).toMatchObject({
      template_key: template.templateKey,
      review_status: "NEEDS_REVIEW",
      field_statuses: expect.arrayContaining([
        expect.objectContaining({
          fieldIdentifier: "full_name",
          required: true,
          status: "complete",
        }),
        expect.objectContaining({
          fieldIdentifier: "applicant_signature",
          required: true,
          status: "complete",
        }),
      ]),
    });
  });
});

function validTemplateFields() {
  return template.fields.map((field) => ({
    fieldIdentifier: field.fieldIdentifier,
    status: (field.manualOnly
      ? "manual"
      : field.required
        ? "complete"
        : "optional") as FormReviewStatus,
    confidence: field.manualOnly ? 0 : 0.95,
    required: field.required,
  }));
}

function createRequest(fields: ReturnType<typeof validTemplateFields>) {
  return new Request("http://localhost/api/ocr/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentRequirementId: null,
      sourceKind: "image",
      analysis: {
        mode: "live",
        templateKey: template.templateKey,
        visaCode: template.visaCode,
        documentTitle: "Application form",
        pageNumber: 1,
        imageQuality: "clear",
        warnings: [],
        fields,
      },
    }),
  });
}

function createSupabaseMock() {
  const upsert = vi.fn();
  const single = vi.fn().mockResolvedValue({
    data: {
      review_id: "review-1",
      review_status: "NEEDS_REVIEW",
      updated_at: "2026-08-27T00:00:00.000Z",
    },
    error: null,
  });
  const select = vi.fn(() => ({ single }));
  upsert.mockReturnValue({ select });

  return {
    upsert,
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({ upsert })),
    },
  };
}
