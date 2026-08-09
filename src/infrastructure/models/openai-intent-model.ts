import OpenAI from "openai";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";
import { z } from "zod";

import type {
  IntentModel,
  IntentModelDescriptor,
  ModelCompilation,
} from "@/src/application/ports/intent-model";
import type { PragmaticAnalysis } from "@/src/domain/human-pragmatics";
import {
  IntentContractSchema,
  intentContractJsonSchema,
  type CompileIntentInput,
} from "@/src/domain/intent-contract";
import { logEvent } from "@/src/infrastructure/observability/logger";
import {
  INTENT_COMPILER_SYSTEM_INSTRUCTION,
  INTENT_COMPILER_SYSTEM_INSTRUCTION_VERSION,
} from "@/src/infrastructure/models/system-instructions/intent-compiler-v1";
import { IntentModelError } from "@/src/infrastructure/models/http-structured-intent-model";

type CreateResponse = (params: ResponseCreateParamsNonStreaming) => Promise<Response>;

export type OpenAIIntentModelConfig = {
  apiKey: string;
  modelName?: string;
  modelVersion?: string | null;
  baseUrl?: string;
  createResponse?: CreateResponse;
};

export class OpenAIIntentModel implements IntentModel {
  readonly descriptor: IntentModelDescriptor;
  private readonly createResponse: CreateResponse;

  constructor(private readonly config: OpenAIIntentModelConfig) {
    const modelName = config.modelName ?? "gpt-5.6-luna";
    this.descriptor = {
      provider: "openai",
      modelName,
      modelVersion: config.modelVersion ?? null,
      systemInstructionVersion: INTENT_COMPILER_SYSTEM_INSTRUCTION_VERSION,
    };

    if (config.createResponse) {
      this.createResponse = config.createResponse;
    } else {
      const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
      this.createResponse = (params) => client.responses.create(params);
    }
  }

  async compile(input: CompileIntentInput, pragmatics: PragmaticAnalysis): Promise<ModelCompilation> {
    const startedAt = performance.now();
    let invalidOutput: string | null = null;
    let validationSummary: string | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await this.callProvider(input, pragmatics, invalidOutput, validationSummary);
      const parsedJson = parseJson(response.output_text);
      if (!parsedJson.success) {
        invalidOutput = response.output_text.slice(0, 16_000);
        validationSummary = "La salida no es JSON válido.";
        logEvent("validation_failed", { provider: "openai", attempt: attempt + 1, reason: "invalid_json" });
        continue;
      }

      const validated = IntentContractSchema.safeParse(parsedJson.value);
      if (validated.success) {
        return {
          contract: validated.data,
          provider: "openai",
          modelName: response.model || this.descriptor.modelName,
          modelVersion: this.config.modelVersion ?? response.model ?? null,
          providerLatencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
          systemInstructionVersion: INTENT_COMPILER_SYSTEM_INSTRUCTION_VERSION,
          usage: response.usage
            ? {
                inputTokens: response.usage.input_tokens,
                cachedInputTokens: response.usage.input_tokens_details.cached_tokens,
                outputTokens: response.usage.output_tokens,
                reasoningTokens: response.usage.output_tokens_details.reasoning_tokens,
                totalTokens: response.usage.total_tokens,
              }
            : null,
        };
      }

      invalidOutput = response.output_text.slice(0, 16_000);
      validationSummary = z.prettifyError(validated.error).slice(0, 4_000);
      logEvent("validation_failed", { provider: "openai", attempt: attempt + 1, reason: "schema" });
    }

    throw new IntentModelError(
      "OpenAI devolvió un Intent Contract inválido después del intento de reparación.",
    );
  }

  private async callProvider(
    input: CompileIntentInput,
    pragmatics: PragmaticAnalysis,
    invalidOutput: string | null,
    validationSummary: string | null,
  ) {
    try {
      return await this.createResponse({
        model: this.descriptor.modelName,
        store: false,
        reasoning: { effort: "low" },
        input: [
          { role: "system", content: INTENT_COMPILER_SYSTEM_INSTRUCTION },
          {
            role: "user",
            content: JSON.stringify({
              case: { rawInput: input.rawInput, context: input.context },
              pragmaticSignals: pragmatics,
              ...(invalidOutput
                ? { repair: { invalidOutput, validationSummary } }
                : {}),
            }),
          },
        ],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "intent_contract",
            description: "Intent Contract validado y consumible por otras máquinas.",
            strict: true,
            schema: intentContractJsonSchema,
          },
        },
      });
    } catch (error) {
      throw new IntentModelError("OpenAI rechazó o no completó la compilación.", { cause: error });
    }
  }
}

function parseJson(value: string): { success: true; value: unknown } | { success: false } {
  try {
    return { success: true, value: JSON.parse(value) as unknown };
  } catch {
    return { success: false };
  }
}
