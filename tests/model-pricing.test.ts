import { describe, expect, it } from "vitest";

import { estimateModelCost } from "@/src/domain/model-pricing";

describe("model pricing telemetry", () => {
  it("prices cached input separately and labels the result as estimated", () => {
    const cost = estimateModelCost(
      "openai",
      "gpt-5.6-luna",
      {
        inputTokens: 1_000,
        cachedInputTokens: 200,
        outputTokens: 500,
        reasoningTokens: 100,
        totalTokens: 1_500,
      },
      new Date("2026-08-09T12:00:00.000Z"),
    );

    expect(cost?.estimatedCostUsd).toBeCloseTo(0.000764, 10);
    expect(cost?.pricingVersion).toBe("openai-2026-08-09");
    expect(cost?.sourceNote).toContain("developers.openai.com");
  });

  it("does not invent cost without usage or matching versioned pricing", () => {
    expect(estimateModelCost("openai", "gpt-5.6-luna", null)).toBeNull();
    expect(
      estimateModelCost("intent-lab", "contextual-heuristic", {
        inputTokens: 1,
        cachedInputTokens: null,
        outputTokens: 1,
        reasoningTokens: null,
        totalTokens: 2,
      }),
    ).toBeNull();
  });
});
