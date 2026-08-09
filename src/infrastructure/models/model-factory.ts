import type { IntentModel } from "@/src/application/ports/intent-model";
import { FrozenHeuristicBaselineModel } from "@/src/infrastructure/models/frozen-heuristic-baseline-model";
import { HttpStructuredIntentModel } from "@/src/infrastructure/models/http-structured-intent-model";
import { OpenAIIntentModel } from "@/src/infrastructure/models/openai-intent-model";

export function createIntentModel(): IntentModel {
  const provider = process.env.LLM_PROVIDER?.trim().toLocaleLowerCase("en-US") || "heuristic";

  if (provider === "heuristic") {
    return new FrozenHeuristicBaselineModel();
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim() || process.env.LLM_API_KEY?.trim();
  const modelName = process.env.OPENAI_INTENT_MODEL?.trim() || process.env.LLM_MODEL?.trim();
  if (!apiKey || !modelName) {
    throw new Error(
      provider === "openai"
        ? "OPENAI_API_KEY y OPENAI_INTENT_MODEL son obligatorios para usar OpenAI."
        : "LLM_API_KEY y LLM_MODEL son obligatorios para un proveedor remoto.",
    );
  }

  if (provider === "openai") {
    return new OpenAIIntentModel({
      apiKey,
      modelName,
      modelVersion: process.env.LLM_MODEL_VERSION?.trim() || null,
      baseUrl: process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1",
    });
  }

  return new HttpStructuredIntentModel({
    provider,
    apiKey,
    modelName,
    modelVersion: process.env.LLM_MODEL_VERSION?.trim() || null,
    baseUrl: process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1",
  });
}

export function createHeuristicBaselineModel(): IntentModel {
  return new FrozenHeuristicBaselineModel();
}

export function createBlindEvaluationCandidateModel(): IntentModel {
  const provider = process.env.BLIND_EVAL_CANDIDATE_PROVIDER?.trim().toLowerCase() || "openai";
  if (provider !== "openai") {
    throw new Error("Build 001.1 requiere OpenAI como candidato real de evaluación ciega.");
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim() || process.env.LLM_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY es obligatoria para iniciar una evaluación ciega.");

  return new OpenAIIntentModel({
    apiKey,
    modelName: process.env.OPENAI_INTENT_MODEL?.trim() || "gpt-5.6-luna",
    modelVersion: process.env.LLM_MODEL_VERSION?.trim() || null,
    baseUrl: process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1",
  });
}
