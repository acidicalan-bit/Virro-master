import { describe, expect, it } from "vitest";

import { BenchmarkService } from "@/src/application/benchmark-service";
import { evaluateBenchmark } from "@/src/domain/benchmark";
import { parseBenchmarkFixtures } from "@/src/fixtures/benchmark-cases";
import { HeuristicIntentModel } from "@/src/infrastructure/models/heuristic-intent-model";
import { InMemoryBenchmarkRepository } from "@/src/infrastructure/persistence/in-memory-repositories";
import { validContract } from "@/tests/helpers";

describe("benchmark fixtures and deterministic scoring", () => {
  it("parses at least 30 active, uniquely named fixtures", () => {
    const fixtures = parseBenchmarkFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(30);
    expect(new Set(fixtures.map((item) => item.slug)).size).toBe(fixtures.length);
    expect(fixtures.every((item) => item.active)).toBe(true);
  });

  it("requires exact interaction mode matching", () => {
    const benchmarkCase = parseBenchmarkFixtures().find((item) => item.slug === "mas-limpio-poster")!;
    expect(evaluateBenchmark(benchmarkCase, validContract()).interactionModeMatch).toBe(true);
    expect(evaluateBenchmark(benchmarkCase, validContract({ recommendedInteractionMode: "ASK" })).interactionModeMatch).toBe(false);
  });

  it("detects forbidden questions and reports missing concepts for manual review", () => {
    const benchmarkCase = parseBenchmarkFixtures().find((item) => item.slug === "magia-foto")!;
    const evaluation = evaluateBenchmark(
      benchmarkCase,
      validContract({ clarificationRequirements: [{ question: "¿Qué seed quieres?", reason: "test", blocking: true }] }),
    );
    expect(evaluation.forbiddenQuestionViolations).toContain("seed");
    expect(evaluation.expectedConceptsMissing.length).toBeGreaterThan(0);
    expect(evaluation.manualReview).toBe(true);
  });

  it("does not count a forbidden interpretation when the contract explicitly negates it", () => {
    const benchmarkCase = parseBenchmarkFixtures().find((item) => item.slug === "magia-balon")!;
    const evaluation = evaluateBenchmark(
      benchmarkCase,
      validContract({
        interpretedMeaning: "Es habilidad extraordinaria, no magia sobrenatural.",
        interpretedIntent: "Interpretar un elogio futbolístico.",
        explicitFacts: ["La frase habla de creatividad y control."],
        safeAssumptions: [{ assumption: "Tratarlo como elogio figurado.", reason: "El contexto es fútbol.", reversible: true }],
        recommendedInteractionMode: "ASSUME",
      }),
    );
    expect(evaluation.forbiddenInterpretationViolations).toEqual([]);
  });

  it("runs the complete deterministic benchmark suite through the model abstraction", async () => {
    const repository = new InMemoryBenchmarkRepository();
    const { summary } = await new BenchmarkService(
      new HeuristicIntentModel(),
      repository,
      "test-compiler",
    ).run();

    expect(summary.total).toBe(32);
    expect(summary.interactionModeAccuracy).toBe(100);
    expect(summary.forbiddenQuestionViolations).toBe(0);
    expect(summary.assumptionViolations).toBe(0);
    expect(repository.runs).toHaveLength(32);
  });
});
