import type { ModelUsage } from "@/src/application/ports/intent-model";

export type ModelPricing = {
  pricingVersion: string;
  provider: string;
  model: string;
  inputUsdPerMillionTokens: number;
  cachedInputUsdPerMillionTokens: number | null;
  outputUsdPerMillionTokens: number;
  effectiveFrom: string;
  sourceNote: string;
};

export type EstimatedModelCost = {
  estimatedCostUsd: number;
  pricingVersion: string;
  effectiveFrom: string;
  sourceNote: string;
};

export const MODEL_PRICING_CATALOG: readonly ModelPricing[] = [
  {
    pricingVersion: "openai-2026-08-09",
    provider: "openai",
    model: "gpt-5.6-luna",
    inputUsdPerMillionTokens: 0.2,
    cachedInputUsdPerMillionTokens: 0.02,
    outputUsdPerMillionTokens: 1.2,
    effectiveFrom: "2026-08-09",
    sourceNote: "OpenAI model page verified 2026-08-09: https://developers.openai.com/api/docs/models/gpt-5.6-luna",
  },
] as const;

export function estimateModelCost(
  provider: string,
  model: string,
  usage: ModelUsage | null,
  at = new Date(),
): EstimatedModelCost | null {
  if (!usage || usage.inputTokens === null || usage.outputTokens === null) return null;

  const pricing = MODEL_PRICING_CATALOG
    .filter(
      (entry) =>
        entry.provider === provider &&
        entry.model === model &&
        new Date(`${entry.effectiveFrom}T00:00:00.000Z`) <= at,
    )
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))[0];

  if (!pricing) return null;

  const cachedTokens = Math.min(usage.cachedInputTokens ?? 0, usage.inputTokens);
  const uncachedTokens = usage.inputTokens - cachedTokens;
  const cachedRate = pricing.cachedInputUsdPerMillionTokens ?? pricing.inputUsdPerMillionTokens;
  const estimatedCostUsd =
    (uncachedTokens * pricing.inputUsdPerMillionTokens +
      cachedTokens * cachedRate +
      usage.outputTokens * pricing.outputUsdPerMillionTokens) /
    1_000_000;

  return {
    estimatedCostUsd,
    pricingVersion: pricing.pricingVersion,
    effectiveFrom: pricing.effectiveFrom,
    sourceNote: pricing.sourceNote,
  };
}
