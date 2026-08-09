import "server-only";

import { BenchmarkService } from "@/src/application/benchmark-service";
import {
  BlindEvaluationCatalogService,
  BlindEvaluationService,
} from "@/src/application/blind-evaluation-service";
import { IntentCompiler } from "@/src/application/intent-compiler";
import {
  createBlindEvaluationCandidateModel,
  createHeuristicBaselineModel,
  createIntentModel,
} from "@/src/infrastructure/models/model-factory";
import { createRepositories } from "@/src/infrastructure/persistence/repository-factory";

export function createApplicationServices() {
  const repositories = createRepositories();
  const model = createIntentModel();
  return {
    compiler: new IntentCompiler(
      model,
      repositories.intentRuns,
      process.env.INTENT_COMPILER_VERSION?.trim() || "0.1.1",
      repositories.modelFailures,
    ),
    benchmarks: new BenchmarkService(model, repositories.benchmarks),
    repositories,
  };
}

export function createBlindEvaluationServices() {
  const repositories = createRepositories();
  return {
    blindEvaluations: new BlindEvaluationService(
      createHeuristicBaselineModel(),
      createBlindEvaluationCandidateModel(),
      repositories.blindEvaluations,
      repositories.intentRuns,
      repositories.modelFailures,
      process.env.INTENT_COMPILER_VERSION?.trim() || "0.1.1",
    ),
    repositories,
  };
}

export function createBlindEvaluationCatalogServices() {
  const repositories = createRepositories();
  return {
    repositories,
    catalog: new BlindEvaluationCatalogService(repositories.blindEvaluations),
  };
}
