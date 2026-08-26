import { describe, expect, it } from "vitest";

import { screenMessage } from "@/features/chat/screening";

describe("screenMessage failure fallback", () => {
  it.each([
    ["model error", "\uC0AC\uC7A5\uB2D8\uC774 \uC6D4\uAE09\uC744 \uC548 \uC918\uC694", "WAGE_ARREARS"],
    ["schema-invalid output", "\uC0AC\uC7A5\uB2D8\uC774 \uC6D4\uAE09\uC744 \uC548 \uC918\uC694", "WAGE_ARREARS"],
    ["model error", "\uD68C\uC0AC\uC5D0\uC11C \uD3ED\uD589\uC744 \uB2F9\uD588\uC5B4\uC694", "ASSAULT"],
    ["schema-invalid output", "\uD68C\uC0AC\uC5D0\uC11C \uD3ED\uD589\uC744 \uB2F9\uD588\uC5B4\uC694", "ASSAULT"],
    ["model error", "\uC0AC\uC7A5\uC774 \uB3C8\uC744 \uC548 \uC918\uC694", "WAGE_ARREARS"],
    ["schema-invalid output", "\uC77C\uD588\uB294\uB370 \uB3C8\uC744 \uB5BC\uC600\uC5B4\uC694", "WAGE_ARREARS"],
    ["model error", "\uD68C\uC0AC\uC5D0\uC11C \uB9DE\uC558\uC5B4\uC694", "ASSAULT"],
    ["schema-invalid output", "\uC0C1\uC0AC\uAC00 \uB54C\uB838\uC5B4\uC694", "ASSAULT"],
  ] as const)("classifies %s for %s", async (kind, text, expectedRisk) => {
    const result = await screenMessage(text, {
      generate: kind === "model error"
        ? async () => { throw new Error("gateway unavailable"); }
        : async () => ({ invalid: true }),
    });

    expect(result.riskCategory).toBe(expectedRisk);
    expect(result.screeningFailed).toBe(true);
  });
});
