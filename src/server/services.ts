import "server-only";

import { BenchmarkService } from "@/src/application/benchmark-service";
import { IntentCompiler } from "@/src/application/intent-compiler";
import { createIntentModel } from "@/src/infrastructure/models/model-factory";
import { createRepositories } from "@/src/infrastructure/persistence/repository-factory";

export function createApplicationServices() {
  const repositories = createRepositories();
  const model = createIntentModel();
  return {
    compiler: new IntentCompiler(model, repositories.intentRuns),
    benchmarks: new BenchmarkService(model, repositories.benchmarks),
    repositories,
  };
}
