import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  BlindEvaluationCatalogService,
  BlindEvaluationService,
  type BlindSessionView,
} from "@/src/application/blind-evaluation-service";
import type { IntentModel } from "@/src/application/ports/intent-model";
import type { CompileIntentInput } from "@/src/domain/intent-contract";
import { BlindEvaluationSetImportSchema } from "@/src/domain/blind-evaluation";
import { analyzePragmatics } from "@/src/domain/human-pragmatics";
import { FrozenHeuristicBaselineModel } from "@/src/infrastructure/models/frozen-heuristic-baseline-model";
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

const technicalSet = BlindEvaluationSetImportSchema.parse(
  JSON.parse(readFileSync("fixtures/blind-eval-rendering-audit-demo.json", "utf8")) as unknown,
);

function recordingModel(
  role: "baseline" | "candidate",
  calls: CompileIntentInput[],
): IntentModel {
  const isBaseline = role === "baseline";
  return {
    descriptor: {
      provider: isBaseline ? "intent-lab" : "openai",
      modelName: isBaseline ? "contextual-heuristic" : "gpt-5.6-luna",
      modelVersion: isBaseline ? "0.1.0" : null,
      systemInstructionVersion: isBaseline
        ? "heuristic-baseline-0.1.0"
        : "intent-compiler-system-1.0.0",
    },
    compile: async (input) => {
      calls.push({ ...input });
      return {
        contract: validContract({
          rawInput: input.rawInput,
          context: input.context,
          domain: input.domain ?? "general",
          interpretedIntent: `${isBaseline ? "Lectura X" : "Lectura Y"}: ${input.rawInput}`,
          interpretedMeaning: `Significado aislado para ${input.rawInput}`,
        }),
        provider: isBaseline ? "intent-lab" : "openai",
        modelName: isBaseline ? "contextual-heuristic" : "gpt-5.6-luna",
        modelVersion: isBaseline ? "0.1.0" : null,
        systemInstructionVersion: isBaseline
          ? "heuristic-baseline-0.1.0"
          : "intent-compiler-system-1.0.0",
        providerLatencyMs: 1,
        usage: null,
      };
    },
  };
}

async function createHarness(randomizeAFirst: () => boolean) {
  const evaluations = new InMemoryBlindEvaluationRepository();
  const set = await new BlindEvaluationCatalogService(evaluations).importSet(technicalSet);
  const runs = new InMemoryIntentRunRepository();
  const failures = new InMemoryIntentModelFailureRepository();
  const baselineCalls: CompileIntentInput[] = [];
  const candidateCalls: CompileIntentInput[] = [];
  const service = new BlindEvaluationService(
    recordingModel("baseline", baselineCalls),
    recordingModel("candidate", candidateCalls),
    evaluations,
    runs,
    failures,
    "0.1.1",
    randomizeAFirst,
  );
  return { service, set, evaluations, runs, baselineCalls, candidateCalls };
}

async function prepareCurrent(service: BlindEvaluationService, session: BlindSessionView) {
  if (session.step !== "HUMAN_INTENT" || !session.evaluationCaseId || !session.case) {
    throw new Error("Expected a human-intent step.");
  }
  return service.submitHumanIntent({
    sessionId: session.sessionId,
    evaluationCaseId: session.evaluationCaseId,
    intendedMeaning: `Human meaning for ${session.case.rawInput}`,
    expectedNextAction: "EXECUTE",
    preservationNotes: null,
  });
}

async function judgeCurrent(service: BlindEvaluationService, session: BlindSessionView) {
  const prepared = await prepareCurrent(service, session);
  if (!prepared.comparison) throw new Error("Expected an open comparison.");
  const comparisonId = prepared.comparison.id;
  await service.submitStepRating({
    comparisonId,
    outputPosition: 1,
    ratings,
    evaluatorNotes: null,
    errorTags: [],
  });
  await service.submitStepRating({
    comparisonId,
    outputPosition: 2,
    ratings,
    evaluatorNotes: null,
    errorTags: [],
  });
  const next = await service.submitJudgment({
    comparisonId,
    preference: "TIE",
    evaluatorNotes: null,
    errorTags: [],
    correctedIntent: null,
  });
  return { prepared, next };
}

describe("blind evaluation data and rendering integrity", () => {
  it("isolates three cases, advances in order and propagates raw input, context and domain to both models", async () => {
    const assignments = [true, false, true];
    let assignmentIndex = 0;
    const harness = await createHarness(() => assignments[assignmentIndex++]);

    const first = await harness.service.startSession(harness.set.id);
    const firstResult = await judgeCurrent(harness.service, first);
    const secondResult = await judgeCurrent(harness.service, firstResult.next);
    const thirdResult = await judgeCurrent(harness.service, secondResult.next);
    const completed = thirdResult.next;
    const displayed = [
      firstResult.prepared.comparison,
      secondResult.prepared.comparison,
      thirdResult.prepared.comparison,
    ];

    expect(displayed.map((comparison) => comparison?.case.rawInput)).toEqual(
      technicalSet.cases.map((item) => item.raw_input),
    );
    expect(new Set(displayed.map((comparison) => comparison?.id)).size).toBe(3);
    expect(new Set(displayed.map((comparison) => comparison?.evaluationCaseId)).size).toBe(3);
    expect(displayed.every((comparison) => comparison?.sessionId === first.sessionId)).toBe(true);
    expect(displayed.map((comparison) =>
      comparison?.responseA.status === "SUCCESS"
        ? comparison.responseA.contract.interpretedIntent.split(":", 1)[0]
        : "FAILURE",
    )).toEqual(["Lectura X", "Lectura Y", "Lectura X"]);
    expect(displayed.map((comparison) =>
      comparison?.responseB.status === "SUCCESS"
        ? comparison.responseB.contract.interpretedIntent.split(":", 1)[0]
        : "FAILURE",
    )).toEqual(["Lectura Y", "Lectura X", "Lectura Y"]);

    const expectedInputs = technicalSet.cases.map((item) => ({
      rawInput: item.raw_input,
      context: item.context,
      domain: item.domain,
    }));
    expect(harness.baselineCalls).toEqual(expectedInputs);
    expect(harness.candidateCalls).toEqual(expectedInputs);
    expect(completed.status).toBe("COMPLETED");
    expect(harness.evaluations.judgments.map((item) => item.comparisonId)).toEqual(
      harness.evaluations.comparisons.map((item) => item.id),
    );
  });

  it("stores two distinct runs per case and rejects a run linked to a different case", async () => {
    const harness = await createHarness(() => true);
    const first = await harness.service.startSession(harness.set.id);
    const firstResult = await judgeCurrent(harness.service, first);
    const second = await prepareCurrent(harness.service, firstResult.next);

    expect(harness.runs.records).toHaveLength(4);
    expect(new Set(harness.runs.records.map((run) => run.id)).size).toBe(4);
    for (const comparison of harness.evaluations.comparisons) {
      const evaluationCase = harness.evaluations.cases.find(
        (item) => item.id === comparison.evaluationCaseId,
      );
      const linkedRuns = [comparison.responseARunId, comparison.responseBRunId].map((id) =>
        harness.runs.records.find((run) => run.id === id),
      );
      expect(linkedRuns).toHaveLength(2);
      expect(linkedRuns.every((run) => run?.rawInput === evaluationCase?.rawInput)).toBe(true);
      expect(linkedRuns.every((run) => run?.compiledContract.rawInput === evaluationCase?.rawInput)).toBe(true);
    }

    const firstComparison = harness.evaluations.comparisons[0];
    const secondComparison = harness.evaluations.comparisons[1];
    secondComparison.responseARunId = firstComparison.responseARunId;
    await expect(harness.service.getSessionView(second.sessionId)).rejects.toThrow(
      "pertenece a un caso de evaluación distinto",
    );
  });

  it("keeps per-case A/B identity hidden before judgment and reveals the persisted mapping at completion", async () => {
    const assignments = [true, false, true];
    let assignmentIndex = 0;
    const harness = await createHarness(() => assignments[assignmentIndex++]);
    let session = await harness.service.startSession(harness.set.id);

    for (let index = 0; index < technicalSet.cases.length; index += 1) {
      const blindPayload = JSON.stringify(session);
      expect(blindPayload).not.toContain("responseASource");
      expect(blindPayload).not.toContain("responseBSource");
      expect(blindPayload).not.toContain("gpt-5.6-luna");
      const result = await judgeCurrent(harness.service, session);
      const outputPayload = JSON.stringify(result.prepared);
      expect(outputPayload).not.toContain("responseASource");
      expect(outputPayload).not.toContain("responseBSource");
      expect(outputPayload).not.toContain("gpt-5.6-luna");
      session = result.next;
    }

    expect(session.reveal?.cases.map((item) => item.responseASource)).toEqual([
      "BASELINE",
      "CANDIDATE",
      "BASELINE",
    ]);
    expect(session.reveal?.cases.map((item) => item.responseBSource)).toEqual([
      "CANDIDATE",
      "BASELINE",
      "CANDIDATE",
    ]);
  });

  it("shows that the frozen baseline reuses a fallback template, not an actual previous contract", async () => {
    const baseline = new FrozenHeuristicBaselineModel();
    const contracts = await Promise.all(
      technicalSet.cases.map(async (item) => {
        const input = {
          rawInput: item.raw_input,
          context: item.context,
          domain: item.domain,
        };
        return (await baseline.compile(input, analyzePragmatics(input))).contract;
      }),
    );

    expect(new Set(contracts.map((contract) => contract.interpretedMeaning)).size).toBe(1);
    expect(new Set(contracts.map((contract) => contract.rawInput)).size).toBe(3);
    expect(new Set(contracts.map((contract) => contract.interpretedIntent)).size).toBe(3);
    expect(new Set(contracts.map((contract) => JSON.stringify(contract))).size).toBe(3);
  });
});
