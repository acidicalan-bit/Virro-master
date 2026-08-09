import { describe, expect, it } from "vitest";

import { InMemoryIntentFeedbackRepository, InMemoryIntentRunRepository } from "@/src/infrastructure/persistence/in-memory-repositories";
import { fromIntentRunRow, toIntentRunInsert } from "@/src/infrastructure/persistence/database-mappers";
import { validContract } from "@/tests/helpers";

const createInput = {
  rawInput: "Más limpio.",
  context: "diseño",
  compiledContract: validContract(),
  compilerVersion: "0.1.0",
  modelProvider: "test",
  modelName: "mock",
  modelVersion: null,
  systemInstructionVersion: "test-system-1",
  latencyMs: 12,
  providerLatencyMs: 10,
  usage: { inputTokens: 10, cachedInputTokens: 2, outputTokens: 20, reasoningTokens: 4, totalTokens: 30 },
  estimatedCostUsd: 0.000026,
  pricingVersion: "test-pricing",
};

describe("repository mapping", () => {
  it("serializes application names to database columns and restores them", () => {
    const insert = toIntentRunInsert(createInput);
    expect(insert.raw_input).toBe("Más limpio.");
    expect(insert.total_tokens).toBe(30);
    expect(insert.cached_input_tokens).toBe(2);
    expect(insert.reasoning_tokens).toBe(4);
    expect(insert.system_instruction_version).toBe("test-system-1");

    const restored = fromIntentRunRow({
      id: "09016489-1647-4f3b-9e9a-c7f1d8d858c2",
      ...insert,
      created_at: "2026-08-09T12:00:00.000Z",
    });
    expect(restored.compiledContract.interpretedIntent).toBe("Simplificar el diseño.");
    expect(restored.usage?.totalTokens).toBe(30);
    expect(restored.usage?.reasoningTokens).toBe(4);
    expect(restored.estimatedCostUsd).toBe(0.000026);
  });

  it("persists intent runs and feedback through repository contracts", async () => {
    const runs = new InMemoryIntentRunRepository();
    const feedback = new InMemoryIntentFeedbackRepository();
    const run = await runs.create(createInput);
    const record = await feedback.create({
      intentRunId: run.id,
      accepted: false,
      correctedInterpretation: "Era un cambio de tipografía.",
      feedbackTags: ["wrong_context"],
      notes: null,
    });
    expect(runs.records).toHaveLength(1);
    expect(record.intentRunId).toBe(run.id);
    expect(feedback.records[0].feedbackTags).toEqual(["wrong_context"]);
  });
});
