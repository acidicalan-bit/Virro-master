import type { IntentModel } from "@/src/application/ports/intent-model";
import { HeuristicIntentModel } from "@/src/infrastructure/models/heuristic-intent-model";
import { HttpStructuredIntentModel } from "@/src/infrastructure/models/http-structured-intent-model";

export function createIntentModel(): IntentModel {
  const provider = process.env.LLM_PROVIDER?.trim().toLocaleLowerCase("en-US") || "heuristic";

  if (provider === "heuristic") {
    return new HeuristicIntentModel();
  }

  const apiKey = process.env.LLM_API_KEY?.trim();
  const modelName = process.env.LLM_MODEL?.trim();
  if (!apiKey || !modelName) {
    throw new Error("LLM_API_KEY y LLM_MODEL son obligatorios para un proveedor remoto.");
  }

  return new HttpStructuredIntentModel({
    provider,
    apiKey,
    modelName,
    modelVersion: process.env.LLM_MODEL_VERSION?.trim() || null,
    baseUrl: process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1",
  });
}
