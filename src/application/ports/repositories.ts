import type { BenchmarkCase, BenchmarkEvaluation } from "@/src/domain/benchmark";
import type { IntentContract } from "@/src/domain/intent-contract";
import type { ModelUsage } from "@/src/application/ports/intent-model";

export type IntentRunRecord = {
  id: string;
  rawInput: string;
  context: string | null;
  compiledContract: IntentContract;
  compilerVersion: string;
  modelProvider: string;
  modelName: string;
  modelVersion: string | null;
  latencyMs: number;
  usage: ModelUsage | null;
  createdAt: string;
};

export type CreateIntentRun = Omit<IntentRunRecord, "id" | "createdAt">;

export type IntentFeedbackRecord = {
  id: string;
  intentRunId: string;
  accepted: boolean;
  correctedInterpretation: string | null;
  feedbackTags: string[];
  notes: string | null;
  createdAt: string;
};

export type CreateIntentFeedback = Omit<IntentFeedbackRecord, "id" | "createdAt">;

export type CreateBenchmarkRun = {
  benchmarkCaseId: string | null;
  compilerVersion: string;
  modelProvider: string;
  modelName: string;
  compiledContract: IntentContract;
  evaluation: BenchmarkEvaluation;
  passed: boolean;
};

export interface IntentRunRepository {
  create(input: CreateIntentRun): Promise<IntentRunRecord>;
}

export interface IntentFeedbackRepository {
  create(input: CreateIntentFeedback): Promise<IntentFeedbackRecord>;
}

export interface BenchmarkRepository {
  listActive(): Promise<BenchmarkCase[]>;
  saveRun(input: CreateBenchmarkRun): Promise<void>;
}

export type RepositoryBundle = {
  intentRuns: IntentRunRepository;
  feedback: IntentFeedbackRepository;
  benchmarks: BenchmarkRepository;
  storageMode: "supabase" | "memory";
};
