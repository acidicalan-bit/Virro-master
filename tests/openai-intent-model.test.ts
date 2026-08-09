import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { describe, expect, it, vi } from "vitest";

import { analyzePragmatics } from "@/src/domain/human-pragmatics";
import { intentContractJsonSchema } from "@/src/domain/intent-contract";
import { IntentModelError } from "@/src/infrastructure/models/http-structured-intent-model";
import { OpenAIIntentModel } from "@/src/infrastructure/models/openai-intent-model";
import { INTENT_COMPILER_SYSTEM_INSTRUCTION } from "@/src/infrastructure/models/system-instructions/intent-compiler-v1";
import { validContract } from "@/tests/helpers";

function response(outputText: string): Response {
  return {
    output_text: outputText,
    model: "gpt-5.6-luna",
    usage: {
      input_tokens: 120,
      input_tokens_details: { cached_tokens: 20, cache_write_tokens: 0 },
      output_tokens: 80,
      output_tokens_details: { reasoning_tokens: 15 },
      total_tokens: 200,
    },
  } as unknown as Response;
}

describe("OpenAI Responses IntentModel", () => {
  it("uses the domain JSON schema and captures real usage fields", async () => {
    const createResponse = vi.fn(async (params: ResponseCreateParamsNonStreaming) => {
      void params;
      return response(JSON.stringify(validContract()));
    });
    const model = new OpenAIIntentModel({ apiKey: "test", createResponse });
    const input = {
      rawInput: "Hazlo más limpio.",
      context: "diseño",
      domain: "graphic_design",
    };

    const result = await model.compile(input, analyzePragmatics(input));
    const request = createResponse.mock.calls[0][0];

    expect(request.model).toBe("gpt-5.6-luna");
    expect(request.store).toBe(false);
    expect(request.text?.format).toMatchObject({
      type: "json_schema",
      strict: true,
      schema: intentContractJsonSchema,
    });
    expect(JSON.stringify(request.input)).toContain("Preguntar tiene un costo");
    const messages = request.input as Array<{ role: string; content: string }>;
    const userPayload = JSON.parse(messages[1].content) as {
      case: { rawInput: string; context: string | null; domain: string | null };
    };
    expect(userPayload.case).toEqual({
      rawInput: "Hazlo más limpio.",
      context: "diseño",
      domain: "graphic_design",
    });
    expect(result.systemInstructionVersion).toBe("intent-compiler-system-1.0.0");
    expect(result.usage).toEqual({
      inputTokens: 120,
      cachedInputTokens: 20,
      outputTokens: 80,
      reasoningTokens: 15,
      totalTokens: 200,
    });
  });

  it("performs only one bounded repair and validates the second output", async () => {
    const createResponse = vi
      .fn<(params: ResponseCreateParamsNonStreaming) => Promise<Response>>()
      .mockResolvedValueOnce(response("not-json"))
      .mockResolvedValueOnce(response(JSON.stringify(validContract())));
    const model = new OpenAIIntentModel({ apiKey: "test", createResponse });
    const input = { rawInput: "Más limpio.", context: "diseño" };

    await expect(model.compile(input, analyzePragmatics(input))).resolves.toMatchObject({
      provider: "openai",
    });
    expect(createResponse).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(createResponse.mock.calls[1][0].input)).toContain("invalidOutput");
  });

  it("records an explicit provider error after two invalid outputs", async () => {
    const createResponse = vi.fn(async () => response("not-json"));
    const model = new OpenAIIntentModel({ apiKey: "test", createResponse });
    const input = { rawInput: "Más limpio.", context: "diseño" };

    await expect(model.compile(input, analyzePragmatics(input))).rejects.toBeInstanceOf(IntentModelError);
    expect(createResponse).toHaveBeenCalledTimes(2);
  });

  it("keeps the versioned instruction free of the demo and benchmark cases", () => {
    expect(INTENT_COMPILER_SYSTEM_INSTRUCTION).not.toContain("presentación de banco");
    expect(INTENT_COMPILER_SYSTEM_INSTRUCTION).not.toContain("Hizo magia con el balón");
  });
});
