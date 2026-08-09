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
  latencyMs: 12,
  usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
};

describe("repository mapping", () => {
  it("serializes application names to database columns and restores them", () => {
    const insert = toIntentRunInsert(createInput);
    expect(insert.raw_input).toBe("Más limpio.");
    expect(insert.total_tokens).toBe(30);

    const restored = fromIntentRunRow({
      id: "09016489-1647-4f3b-9e9a-c7f1d8d858c2",
      ...insert,
      created_at: "2026-08-09T12:00:00.000Z",
    });
    expect(restored.compiledContract.interpretedIntent).toBe("Simplificar el diseño.");
    expect(restored.usage?.totalTokens).toBe(30);
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
