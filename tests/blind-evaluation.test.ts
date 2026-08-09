import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BlindEvaluationCatalogService, BlindEvaluationService } from "@/src/application/blind-evaluation-service";
import type { IntentModel } from "@/src/application/ports/intent-model";
import { BlindEvaluationSetImportSchema } from "@/src/domain/blind-evaluation";
import {
  InMemoryBlindEvaluationRepository,
  InMemoryIntentModelFailureRepository,
  InMemoryIntentRunRepository,
} from "@/src/infrastructure/persistence/in-memory-repositories";
import { validContract } from "@/tests/helpers";

const ratings = {
  intendedMeaning: 2,
  contextualUnderstanding: 2,
  implicitExpectations: 2,
  assumptionSafety: 2,
  clarificationQuality: 2,
  interactionMode: 2,
  preservationIntent: 2,
  overallUsefulness: 2,
} as const;

function model(role: "baseline" | "candidate", fail = false): IntentModel {
  const isBaseline = role === "baseline";
  return {
    descriptor: {
      provider: isBaseline ? "intent-lab" : "openai",
      modelName: isBaseline ? "contextual-heuristic" : "gpt-5.6-luna",
      modelVersion: isBaseline ? "0.1.0" : null,
      systemInstructionVersion: isBaseline ? "heuristic-baseline-0.1.0" : "intent-compiler-system-1.0.0",
    },
    compile: async (input) => {
      if (fail) throw new Error("provider unavailable");
      return {
        contract: validContract({
          rawInput: input.rawInput,
          context: input.context,
          interpretedIntent: isBaseline ? "Baseline output" : "Candidate output",
        }),
        provider: isBaseline ? "intent-lab" : "openai",
        modelName: isBaseline ? "contextual-heuristic" : "gpt-5.6-luna",
        modelVersion: isBaseline ? "0.1.0" : null,
        systemInstructionVersion: isBaseline ? "heuristic-baseline-0.1.0" : "intent-compiler-system-1.0.0",
        providerLatencyMs: 5,
        usage: isBaseline ? null : {
          inputTokens: 100,
          cachedInputTokens: 0,
          outputTokens: 50,
          reasoningTokens: 10,
          totalTokens: 150,
        },
      };
    },
  };
}

function importedSet() {
  return {
    schema_version: "1.0.0" as const,
    slug: "external-blind-set",
    name: "External blind set",
    description: null,
    source_label: "external evaluator",
    is_demo: false,
    cases: [{
      id: "unseen-1",
      raw_input: "No termina de caerme el veinte.",
      context: "explicación de producto",
      domain: "comunicación",
      private_evaluator_notes: "private-marker",
      expected_high_level_behavior: "expected-marker",
    }],
  };
}

describe("blind human evaluation", () => {
  it("keeps mapping and private evaluator guidance hidden until submission", async () => {
    const evaluations = new InMemoryBlindEvaluationRepository();
    const set = await new BlindEvaluationCatalogService(evaluations).importSet(importedSet());
    const runs = new InMemoryIntentRunRepository();
    const failures = new InMemoryIntentModelFailureRepository();
    const service = new BlindEvaluationService(
      model("baseline"),
      model("candidate"),
      evaluations,
      runs,
      failures,
      "0.1.1",
      () => false,
    );

    const started = await service.startSession(set.id);
    expect(started.comparison?.responseA).toMatchObject({
      status: "SUCCESS",
      contract: { interpretedIntent: "Candidate output" },
    });
    const blindPayload = JSON.stringify(started);
    expect(blindPayload).not.toContain("responseASource");
    expect(blindPayload).not.toContain("private-marker");
    expect(blindPayload).not.toContain("expected-marker");
    expect(blindPayload).not.toContain("gpt-5.6-luna");

    const completed = await service.submitJudgment({
      comparisonId: started.comparison?.id,
      preference: "A_CLEARLY_BETTER",
      ratingsA: ratings,
      ratingsB: ratings,
      evaluatorNotes: "Human judgment",
      errorTags: [],
      correctedIntent: "Human intended interpretation",
    });
    expect(completed.status).toBe("COMPLETED");
    expect(completed.reveal?.cases[0]).toMatchObject({
      responseASource: "CANDIDATE",
      responseBSource: "BASELINE",
      privateEvaluatorNotes: "private-marker",
      expectedHighLevelBehavior: "expected-marker",
    });
    expect(completed.reveal?.cases[0].responseAMetadata?.estimatedCostUsd).toBeGreaterThan(0);
    expect(evaluations.judgments[0].correctedIntent).toBe("Human intended interpretation");
    expect(runs.records).toHaveLength(2);
  });

  it("records a candidate provider failure instead of silently using the heuristic", async () => {
    const evaluations = new InMemoryBlindEvaluationRepository();
    const set = await new BlindEvaluationCatalogService(evaluations).importSet(importedSet());
    const runs = new InMemoryIntentRunRepository();
    const failures = new InMemoryIntentModelFailureRepository();
    const service = new BlindEvaluationService(
      model("baseline"),
      model("candidate", true),
      evaluations,
      runs,
      failures,
      "0.1.1",
      () => true,
    );

    const started = await service.startSession(set.id);
    expect(started.comparison?.responseA.status).toBe("SUCCESS");
    expect(started.comparison?.responseB.status).toBe("PROVIDER_FAILURE");
    expect(runs.records).toHaveLength(1);
    expect(failures.records).toHaveLength(1);
    expect(failures.records[0]).toMatchObject({ modelProvider: "openai", failureType: "Error" });
  });

  it("rejects duplicate imports by immutable slug or content hash", async () => {
    const catalog = new BlindEvaluationCatalogService(new InMemoryBlindEvaluationRepository());
    await catalog.importSet(importedSet());
    await expect(catalog.importSet(importedSet())).rejects.toThrow("inmutable");
  });

  it("parses the checked-in DEMO file through the external import contract", () => {
    const file = readFileSync("fixtures/blind-eval-demo.json", "utf8");
    const parsed = BlindEvaluationSetImportSchema.parse(JSON.parse(file) as unknown);
    expect(parsed.is_demo).toBe(true);
    expect(parsed.cases).toHaveLength(1);
    expect(parsed.description).toContain("No es el set ciego real");
  });
});
