import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BlindEvaluationCatalogService, BlindEvaluationService } from "@/src/application/blind-evaluation-service";
import type { IntentModel } from "@/src/application/ports/intent-model";
import type { BlindSessionView } from "@/src/application/blind-evaluation-service";
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

async function completeCase(
  service: BlindEvaluationService,
  session: BlindSessionView,
): Promise<BlindSessionView> {
  if (session.step !== "HUMAN_INTENT" || !session.evaluationCaseId) {
    throw new Error("Se esperaba STEP 1 para completar un caso.");
  }
  const afterIntent = await service.submitHumanIntent({
    sessionId: session.sessionId,
    evaluationCaseId: session.evaluationCaseId,
    intendedMeaning: "Quiere mejorar la explicación del producto.",
    expectedNextAction: "EXPLORE",
    preservationNotes: null,
  });
  if (!afterIntent.comparison || afterIntent.step !== "RATING_OUTPUT_1") {
    throw new Error("Se esperaba STEP 2 después del intent humano.");
  }

  const afterRating1 = await service.submitStepRating({
    comparisonId: afterIntent.comparison.id,
    outputPosition: 1,
    ratings,
    errorTags: [],
    evaluatorNotes: null,
  });
  if (!afterRating1.comparison || afterRating1.step !== "RATING_OUTPUT_2") {
    throw new Error("Se esperaba STEP 3 después de la primera calificación.");
  }

  const afterRating2 = await service.submitStepRating({
    comparisonId: afterRating1.comparison.id,
    outputPosition: 2,
    ratings,
    errorTags: [],
    evaluatorNotes: null,
  });
  if (!afterRating2.comparison || afterRating2.step !== "PREFERENCE") {
    throw new Error("Se esperaba STEP 4 después de la segunda calificación.");
  }

  return service.submitJudgment({
    comparisonId: afterRating2.comparison.id,
    preference: "A_CLEARLY_BETTER",
    evaluatorNotes: "Human judgment",
    errorTags: [],
    correctedIntent: "Human intended interpretation",
  });
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

    expect(started.step).toBe("HUMAN_INTENT");
    expect(started.comparison).toBeNull();
    expect(started.case).toMatchObject({
      rawInput: "No termina de caerme el veinte.",
      context: "explicación de producto",
      domain: "comunicación",
    });

    const step1Payload = JSON.stringify(started);
    expect(step1Payload).not.toContain("responseA");
    expect(step1Payload).not.toContain("gpt-5.6-luna");
    expect(step1Payload).not.toContain("contextual-heuristic");
    expect(step1Payload).not.toContain("private-marker");
    expect(step1Payload).not.toContain("expected-marker");

    const completed = await completeCase(service, started);

    expect(completed.status).toBe("COMPLETED");
    const revealCase = completed.reveal?.cases[0];
    expect(revealCase).toMatchObject({
      responseASource: "CANDIDATE",
      responseBSource: "BASELINE",
      privateEvaluatorNotes: "private-marker",
      expectedHighLevelBehavior: "expected-marker",
    });
    expect(revealCase?.responseAMetadata?.estimatedCostUsd).toBeGreaterThan(0);
    expect(evaluations.judgments[0].correctedIntent).toBe("Human intended interpretation");
    expect(runs.records).toHaveLength(2);
  });

  it("model outputs are not visible before human intent is submitted", async () => {
    const evaluations = new InMemoryBlindEvaluationRepository();
    const set = await new BlindEvaluationCatalogService(evaluations).importSet(importedSet());
    const service = new BlindEvaluationService(
      model("baseline"),
      model("candidate"),
      evaluations,
      new InMemoryIntentRunRepository(),
      new InMemoryIntentModelFailureRepository(),
      "0.1.1",
      () => false,
    );

    const started = await service.startSession(set.id);
    expect(started.step).toBe("HUMAN_INTENT");
    expect(started.comparison).toBeNull();

    const humanIntentPayload = JSON.stringify(started);
    expect(humanIntentPayload).not.toContain("interpretedIntent");
    expect(humanIntentPayload).not.toContain("interpretedMeaning");
    expect(humanIntentPayload).not.toContain("recommendedInteractionMode");
    expect(humanIntentPayload).not.toContain("Baseline output");
    expect(humanIntentPayload).not.toContain("Candidate output");

    expect(evaluations.humanIntents).toHaveLength(0);
    expect(evaluations.comparisons).toHaveLength(0);
  });

  it("human intent becomes immutable before outputs are shown", async () => {
    const evaluations = new InMemoryBlindEvaluationRepository();
    const set = await new BlindEvaluationCatalogService(evaluations).importSet(importedSet());
    const service = new BlindEvaluationService(
      model("baseline"),
      model("candidate"),
      evaluations,
      new InMemoryIntentRunRepository(),
      new InMemoryIntentModelFailureRepository(),
      "0.1.1",
      () => false,
    );

    const started = await service.startSession(set.id);

    await service.submitHumanIntent({
      sessionId: started.sessionId,
      evaluationCaseId: started.evaluationCaseId!,
      intendedMeaning: "Primer intent",
      expectedNextAction: "EXPLORE",
      preservationNotes: null,
    });

    expect(evaluations.humanIntents).toHaveLength(1);
    expect(evaluations.humanIntents[0].intendedMeaning).toBe("Primer intent");
    expect(evaluations.humanIntents[0].lockedAt).toBe(evaluations.humanIntents[0].recordedAt);

    await expect(
      service.submitHumanIntent({
        sessionId: started.sessionId,
        evaluationCaseId: started.evaluationCaseId!,
        intendedMeaning: "Intento modificado",
        expectedNextAction: "ASSUME",
        preservationNotes: "nota",
      }),
    ).rejects.toThrow("inmutable");
  });

  it("allows independent human intent records for the same case in separate sessions", async () => {
    const evaluations = new InMemoryBlindEvaluationRepository();
    const set = await new BlindEvaluationCatalogService(evaluations).importSet(importedSet());
    const service = new BlindEvaluationService(
      model("baseline"),
      model("candidate"),
      evaluations,
      new InMemoryIntentRunRepository(),
      new InMemoryIntentModelFailureRepository(),
      "0.1.1",
      () => false,
    );

    const firstSession = await service.startSession(set.id);
    const secondSession = await service.startSession(set.id);

    await service.submitHumanIntent({
      sessionId: firstSession.sessionId,
      evaluationCaseId: firstSession.evaluationCaseId!,
      intendedMeaning: "Interpretación de la primera sesión",
      expectedNextAction: "EXPLORE",
      preservationNotes: null,
    });
    await service.submitHumanIntent({
      sessionId: secondSession.sessionId,
      evaluationCaseId: secondSession.evaluationCaseId!,
      intendedMeaning: "Interpretación independiente de la segunda sesión",
      expectedNextAction: "ASK",
      preservationNotes: null,
    });

    expect(evaluations.humanIntents).toHaveLength(2);
    expect(new Set(evaluations.humanIntents.map((item) => item.sessionId)).size).toBe(2);
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
    expect(started.step).toBe("HUMAN_INTENT");
    expect(started.comparison).toBeNull();

    const afterIntent = await service.submitHumanIntent({
      sessionId: started.sessionId,
      evaluationCaseId: started.evaluationCaseId!,
      intendedMeaning: "Test intent",
      expectedNextAction: "EXPLORE",
      preservationNotes: null,
    });

    expect(afterIntent.step).toBe("RATING_OUTPUT_1");
    expect(afterIntent.comparison).not.toBeNull();
    expect(afterIntent.comparison!.responseA.status).toBe("SUCCESS");
    expect(afterIntent.comparison!.responseB.status).toBe("PROVIDER_FAILURE");
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

  it("score for one output cannot contaminate or reset the other", async () => {
    const evaluations = new InMemoryBlindEvaluationRepository();
    const set = await new BlindEvaluationCatalogService(evaluations).importSet(importedSet());
    const service = new BlindEvaluationService(
      model("baseline"),
      model("candidate"),
      evaluations,
      new InMemoryIntentRunRepository(),
      new InMemoryIntentModelFailureRepository(),
      "0.1.1",
      () => false,
    );

    const started = await service.startSession(set.id);
    const afterIntent = await service.submitHumanIntent({
      sessionId: started.sessionId,
      evaluationCaseId: started.evaluationCaseId!,
      intendedMeaning: "Test",
      expectedNextAction: "EXPLORE",
      preservationNotes: null,
    });

    const ratingA = { ...ratings, intendedMeaning: 2, contextualUnderstanding: 1 };
    const ratingB = { ...ratings, intendedMeaning: 0, contextualUnderstanding: 2 };

    const afterRating1 = await service.submitStepRating({
      comparisonId: afterIntent.comparison!.id,
      outputPosition: 1,
      ratings: ratingA,
      errorTags: [],
      evaluatorNotes: null,
    });

    expect(afterRating1.stepRating1?.ratings).toMatchObject(ratingA);
    expect(afterRating1.stepRating2).toBeNull();

    const afterRating2 = await service.submitStepRating({
      comparisonId: afterRating1.comparison!.id,
      outputPosition: 2,
      ratings: ratingB,
      errorTags: [],
      evaluatorNotes: null,
    });

    expect(afterRating2.stepRating1?.ratings).toMatchObject(ratingA);
    expect(afterRating2.stepRating2?.ratings).toMatchObject(ratingB);

    await expect(
      service.submitStepRating({
        comparisonId: afterRating1.comparison!.id,
        outputPosition: 1,
        ratings,
        errorTags: [],
        evaluatorNotes: null,
      }),
    ).rejects.toThrow("fuera de secuencia");

    const completed = await service.submitJudgment({
      comparisonId: afterRating2.comparison!.id,
      preference: "A_CLEARLY_BETTER",
      evaluatorNotes: null,
      errorTags: [],
      correctedIntent: null,
    });
    expect(completed.reveal?.metrics.humanIntentMatchScore).toEqual({
      baseline: 0,
      candidate: 2,
    });
    expect(completed.reveal?.metrics.humanPreservationScore).toEqual({
      baseline: 2,
      candidate: 2,
    });
    expect(completed.reveal?.metrics.interactionModeAccuracy).toEqual({
      baseline: 0,
      candidate: 0,
    });

  });

  it("human-intent reference belongs to the correct case/session", async () => {
    const evaluations = new InMemoryBlindEvaluationRepository();
    const set = await new BlindEvaluationCatalogService(evaluations).importSet(importedSet());
    const service = new BlindEvaluationService(
      model("baseline"),
      model("candidate"),
      evaluations,
      new InMemoryIntentRunRepository(),
      new InMemoryIntentModelFailureRepository(),
      "0.1.1",
      () => false,
    );

    const started = await service.startSession(set.id);
    await service.submitHumanIntent({
      sessionId: started.sessionId,
      evaluationCaseId: started.evaluationCaseId!,
      intendedMeaning: "Test intent",
      expectedNextAction: "EXPLORE",
      preservationNotes: "preservar X",
    });

    await service.submitStepRating({
      comparisonId: (await service.getSessionView(started.sessionId)).comparison!.id,
      outputPosition: 1,
      ratings,
      errorTags: [],
      evaluatorNotes: null,
    });
    await service.submitStepRating({
      comparisonId: (await service.getSessionView(started.sessionId)).comparison!.id,
      outputPosition: 2,
      ratings,
      errorTags: [],
      evaluatorNotes: null,
    });
    const completed = await service.submitJudgment({
      comparisonId: (await service.getSessionView(started.sessionId)).comparison!.id,
      preference: "TIE",
      evaluatorNotes: null,
      errorTags: [],
      correctedIntent: null,
    });

    expect(completed.status).toBe("COMPLETED");
    expect(completed.reveal!.cases[0].humanIntent).toMatchObject({
      intendedMeaning: "Test intent",
      expectedNextAction: "EXPLORE",
      preservationNotes: "preservar X",
    });
  });
});
