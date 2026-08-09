import { describe, expect, it, vi } from "vitest";

import { IntentCompiler } from "@/src/application/intent-compiler";
import type { IntentModel } from "@/src/application/ports/intent-model";
import { analyzePragmatics } from "@/src/domain/human-pragmatics";
import { HttpStructuredIntentModel, IntentModelError } from "@/src/infrastructure/models/http-structured-intent-model";
import { InMemoryIntentRunRepository } from "@/src/infrastructure/persistence/in-memory-repositories";
import { validContract } from "@/tests/helpers";

const successfulModel: IntentModel = {
  compile: async () => ({
    contract: validContract(),
    provider: "test",
    modelName: "mock",
    modelVersion: null,
    usage: null,
  }),
};

describe("IntentModel abstraction", () => {
  it("compiles through a mock provider and persists only the validated contract", async () => {
    const runs = new InMemoryIntentRunRepository();
    const compiler = new IntentCompiler(successfulModel, runs, "test-1");
    const result = await compiler.compile({ rawInput: "Más limpio.", context: "diseño" });
    expect(result.metadata.provider).toBe("test");
    expect(runs.records).toHaveLength(1);
  });

  it("propagates provider failure without persisting a run", async () => {
    const runs = new InMemoryIntentRunRepository();
    const model: IntentModel = { compile: async () => { throw new Error("provider unavailable"); } };
    await expect(new IntentCompiler(model, runs).compile({ rawInput: "Hola", context: null })).rejects.toThrow("provider unavailable");
    expect(runs.records).toHaveLength(0);
  });

  it("rejects an invalid structured contract without persisting it", async () => {
    const runs = new InMemoryIntentRunRepository();
    const model: IntentModel = {
      compile: async () => ({
        contract: { ...validContract(), confidence: 4 } as ReturnType<typeof validContract>,
        provider: "test",
        modelName: "broken",
        modelVersion: null,
        usage: null,
      }),
    };
    await expect(new IntentCompiler(model, runs).compile({ rawInput: "Hola", context: null })).rejects.toThrow();
    expect(runs.records).toHaveLength(0);
  });

  it("repairs one invalid provider response and validates the second", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }], model: "remote" }), { status: 200 }));
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(validContract()) } }], model: "remote" }), { status: 200 }));
    const model = new HttpStructuredIntentModel({ baseUrl: "https://provider.test/v1", apiKey: "test-key", provider: "remote", modelName: "remote", modelVersion: null, fetchImplementation: fetchMock });
    const input = { rawInput: "Más limpio.", context: "diseño" };
    const result = await model.compile(input, analyzePragmatics(input));
    expect(result.contract.schemaVersion).toBe("1.0.0");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails after two invalid structured responses", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 }));
    const model = new HttpStructuredIntentModel({ baseUrl: "https://provider.test/v1", apiKey: "test-key", provider: "remote", modelName: "remote", modelVersion: null, fetchImplementation: fetchMock });
    const input = { rawInput: "Más limpio.", context: "diseño" };
    await expect(model.compile(input, analyzePragmatics(input))).rejects.toBeInstanceOf(IntentModelError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
