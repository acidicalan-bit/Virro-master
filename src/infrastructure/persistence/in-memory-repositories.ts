import { benchmarkFixtures } from "@/src/fixtures/benchmark-cases";
import type {
  BenchmarkRepository,
  CreateBenchmarkRun,
  CreateIntentFeedback,
  CreateIntentRun,
  IntentFeedbackRecord,
  IntentFeedbackRepository,
  IntentRunRecord,
  IntentRunRepository,
  RepositoryBundle,
} from "@/src/application/ports/repositories";

export class InMemoryIntentRunRepository implements IntentRunRepository {
  readonly records: IntentRunRecord[] = [];

  async create(input: CreateIntentRun): Promise<IntentRunRecord> {
    const record = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }
}

export class InMemoryIntentFeedbackRepository implements IntentFeedbackRepository {
  readonly records: IntentFeedbackRecord[] = [];

  async create(input: CreateIntentFeedback): Promise<IntentFeedbackRecord> {
    const record = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }
}

export class InMemoryBenchmarkRepository implements BenchmarkRepository {
  readonly runs: CreateBenchmarkRun[] = [];

  async listActive() {
    return benchmarkFixtures.filter((item) => item.active);
  }

  async saveRun(input: CreateBenchmarkRun): Promise<void> {
    this.runs.push(input);
  }
}

const memoryBundle: RepositoryBundle = {
  intentRuns: new InMemoryIntentRunRepository(),
  feedback: new InMemoryIntentFeedbackRepository(),
  benchmarks: new InMemoryBenchmarkRepository(),
  storageMode: "memory",
};

export function getInMemoryRepositories(): RepositoryBundle {
  return memoryBundle;
}
