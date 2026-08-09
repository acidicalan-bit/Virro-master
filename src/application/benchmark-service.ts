import type { IntentModel } from "@/src/application/ports/intent-model";
import type { BenchmarkRepository } from "@/src/application/ports/repositories";
import { evaluateBenchmark, type BenchmarkRunResult } from "@/src/domain/benchmark";
import { analyzePragmatics } from "@/src/domain/human-pragmatics";

export type BenchmarkSummary = {
  total: number;
  passed: number;
  failed: number;
  interactionModeAccuracy: number;
  forbiddenQuestionViolations: number;
  expectedConceptCoverage: number;
  assumptionViolations: number;
  manualReview: number;
};

export class BenchmarkService {
  constructor(
    private readonly model: IntentModel,
    private readonly repository: BenchmarkRepository,
    private readonly compilerVersion = process.env.INTENT_COMPILER_VERSION?.trim() || "0.1.0",
  ) {}

  async run(slugs?: string[]): Promise<{ results: BenchmarkRunResult[]; summary: BenchmarkSummary }> {
    const allCases = await this.repository.listActive();
    const cases = slugs?.length ? allCases.filter((item) => slugs.includes(item.slug)) : allCases;
    const results: BenchmarkRunResult[] = [];

    for (const benchmarkCase of cases) {
      const input = { rawInput: benchmarkCase.input, context: benchmarkCase.context };
      const compiled = await this.model.compile(input, analyzePragmatics(input));
      const evaluation = evaluateBenchmark(benchmarkCase, compiled.contract);
      await this.repository.saveRun({
        benchmarkCaseId: benchmarkCase.id ?? null,
        compilerVersion: this.compilerVersion,
        modelProvider: compiled.provider,
        modelName: compiled.modelName,
        compiledContract: compiled.contract,
        evaluation,
        passed: evaluation.passed,
      });
      results.push({ benchmarkCase, contract: compiled.contract, evaluation });
    }

    return { results, summary: summarize(results) };
  }
}

export function summarize(results: BenchmarkRunResult[]): BenchmarkSummary {
  const totalExpectedConcepts = results.reduce(
    (sum, result) => sum + result.benchmarkCase.expectedConcepts.length,
    0,
  );
  const foundConcepts = results.reduce(
    (sum, result) => sum + result.evaluation.expectedConceptsFound.length,
    0,
  );
  const percent = (value: number, denominator: number) =>
    denominator === 0 ? 0 : Math.round((value / denominator) * 100);

  return {
    total: results.length,
    passed: results.filter((result) => result.evaluation.passed).length,
    failed: results.filter((result) => !result.evaluation.passed).length,
    interactionModeAccuracy: percent(
      results.filter((result) => result.evaluation.interactionModeMatch).length,
      results.length,
    ),
    forbiddenQuestionViolations: results.reduce(
      (sum, result) => sum + result.evaluation.forbiddenQuestionViolations.length,
      0,
    ),
    expectedConceptCoverage: percent(foundConcepts, totalExpectedConcepts),
    assumptionViolations: results.reduce(
      (sum, result) => sum + result.evaluation.assumptionViolations.length,
      0,
    ),
    manualReview: results.filter((result) => result.evaluation.manualReview).length,
  };
}
