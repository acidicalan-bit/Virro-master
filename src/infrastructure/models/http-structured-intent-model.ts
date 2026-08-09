import { z } from "zod";

import type { IntentModel, ModelCompilation } from "@/src/application/ports/intent-model";
import type { PragmaticAnalysis } from "@/src/domain/human-pragmatics";
import {
  IntentContractSchema,
  intentContractJsonSchema,
  type CompileIntentInput,
} from "@/src/domain/intent-contract";

const ProviderResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string() }),
    }),
  ).min(1),
  model: z.string().optional(),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

export type HttpStructuredModelConfig = {
  baseUrl: string;
  apiKey: string;
  provider: string;
  modelName: string;
  modelVersion: string | null;
  fetchImplementation?: typeof fetch;
};

export class IntentModelError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IntentModelError";
  }
}

export class HttpStructuredIntentModel implements IntentModel {
  private readonly request: typeof fetch;

  constructor(private readonly config: HttpStructuredModelConfig) {
    this.request = config.fetchImplementation ?? fetch;
  }

  async compile(input: CompileIntentInput, pragmatics: PragmaticAnalysis): Promise<ModelCompilation> {
    let invalidOutput: string | null = null;
    let validationSummary: string | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const raw = await this.callProvider(input, pragmatics, invalidOutput, validationSummary);
      const parsedJson = parseJson(raw.content);
      if (!parsedJson.success) {
        invalidOutput = raw.content.slice(0, 16_000);
        validationSummary = "La salida no es JSON válido.";
        continue;
      }
      const validated = IntentContractSchema.safeParse(parsedJson.value);

      if (validated.success) {
        return {
          contract: validated.data,
          provider: this.config.provider,
          modelName: raw.model ?? this.config.modelName,
          modelVersion: this.config.modelVersion,
          usage: raw.usage
            ? {
                inputTokens: raw.usage.prompt_tokens ?? null,
                cachedInputTokens: null,
                outputTokens: raw.usage.completion_tokens ?? null,
                reasoningTokens: null,
                totalTokens: raw.usage.total_tokens ?? null,
              }
            : null,
        };
      }

      invalidOutput = raw.content.slice(0, 16_000);
      validationSummary = z.prettifyError(validated.error).slice(0, 4_000);
    }

    throw new IntentModelError("El proveedor devolvió un Intent Contract inválido después del intento de reparación.");
  }

  private async callProvider(
    input: CompileIntentInput,
    pragmatics: PragmaticAnalysis,
    invalidOutput: string | null,
    validationSummary: string | null,
  ) {
    const response = await this.request(`${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTIONS },
          {
            role: "user",
            content: JSON.stringify({
              case: {
                rawInput: input.rawInput,
                context: input.context,
                domain: input.domain ?? null,
              },
              pragmaticSignals: pragmatics,
              ...(invalidOutput
                ? { repair: { invalidOutput, validationSummary } }
                : {}),
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "intent_contract",
            strict: true,
            schema: intentContractJsonSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new IntentModelError(`El proveedor rechazó la compilación (${response.status}).`);
    }

    const json: unknown = await response.json();
    const parsed = ProviderResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new IntentModelError("La respuesta del proveedor no tiene el formato esperado.");
    }
    return {
      content: parsed.data.choices[0].message.content,
      model: parsed.data.model,
      usage: parsed.data.usage,
    };
  }
}

const SYSTEM_INSTRUCTIONS = `Eres el Intent Compiler de Intent Lab.
Convierte lenguaje humano natural, coloquial, incompleto o figurado en un contrato estructurado.
Interpreta siempre texto + contexto + dominio + señales pragmáticas.
No traduzcas slang literalmente. Preguntar es costoso: usa ASK solo para ambigüedades bloqueantes de alto impacto.
Las suposiciones de bajo impacto deben ser reversibles y las decisiones provisionales no son hechos permanentes.
Una edición local implica cambiar solo lo solicitado y preservar lo demás.
No incluyas razonamiento privado. Devuelve únicamente el objeto JSON válido y completo solicitado por el schema.`;

function parseJson(value: string): { success: true; value: unknown } | { success: false } {
  try {
    return { success: true, value: JSON.parse(value) as unknown };
  } catch {
    return { success: false };
  }
}
