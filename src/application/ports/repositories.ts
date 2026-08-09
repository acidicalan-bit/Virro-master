import type { BenchmarkCase, BenchmarkEvaluation } from "@/src/domain/benchmark";
import type { IntentContract } from "@/src/domain/intent-contract";
import type { ModelUsage } from "@/src/application/ports/intent-model";
import type {
  BlindEvaluationErrorTag,
  BlindEvaluationSetImport,
  BlindPreference,
  BlindRatings,
} from "@/src/domain/blind-evaluation";

export type IntentRunRecord = {
  id: string;
  rawInput: string;
  context: string | null;
  compiledContract: IntentContract;
  compilerVersion: string;
  modelProvider: string;
  modelName: string;
  modelVersion: string | null;
  systemInstructionVersion: string;
  latencyMs: number;
  providerLatencyMs: number | null;
  usage: ModelUsage | null;
  estimatedCostUsd: number | null;
  pricingVersion: string | null;
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

export type IntentModelFailureRecord = {
  id: string;
  rawInput: string;
  context: string | null;
  compilerVersion: string;
  modelProvider: string;
  modelName: string;
  modelVersion: string | null;
  systemInstructionVersion: string;
  latencyMs: number;
  failureType: string;
  failureMessage: string;
  createdAt: string;
};

export type CreateIntentModelFailure = Omit<IntentModelFailureRecord, "id" | "createdAt">;

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
  findById(id: string): Promise<IntentRunRecord | null>;
}

export interface IntentModelFailureRepository {
  create(input: CreateIntentModelFailure): Promise<IntentModelFailureRecord>;
  findById(id: string): Promise<IntentModelFailureRecord | null>;
}

export interface IntentFeedbackRepository {
  create(input: CreateIntentFeedback): Promise<IntentFeedbackRecord>;
}

export interface BenchmarkRepository {
  listActive(): Promise<BenchmarkCase[]>;
  saveRun(input: CreateBenchmarkRun): Promise<void>;
}

export type BlindEvaluationSetRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sourceLabel: string;
  isDemo: boolean;
  contentHash: string;
  caseCount: number;
  importedAt: string;
  frozenAt: string;
};

export type BlindEvaluationCaseRecord = {
  id: string;
  evaluationSetId: string;
  externalId: string;
  rawInput: string;
  context: string | null;
  domain: string | null;
  privateEvaluatorNotes: string | null;
  expectedHighLevelBehavior: string | null;
  position: number;
};

export type BlindEvaluationSessionRecord = {
  id: string;
  evaluationSetId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  compilerVersion: string;
  baselineProvider: string;
  baselineModel: string;
  baselineModelVersion: string | null;
  baselineRevision: string;
  baselineSystemInstructionVersion: string;
  candidateProvider: string;
  candidateModel: string;
  candidateModelVersion: string | null;
  candidateSystemInstructionVersion: string;
  createdAt: string;
  completedAt: string | null;
};

export type CreateBlindEvaluationSession = Omit<
  BlindEvaluationSessionRecord,
  "id" | "status" | "createdAt" | "completedAt"
>;

export type BlindEvaluationComparisonRecord = {
  id: string;
  sessionId: string;
  evaluationCaseId: string;
  responseARunId: string | null;
  responseAFailureId: string | null;
  responseASource: "BASELINE" | "CANDIDATE";
  responseBRunId: string | null;
  responseBFailureId: string | null;
  responseBSource: "BASELINE" | "CANDIDATE";
  createdAt: string;
};

export type CreateBlindEvaluationComparison = Omit<
  BlindEvaluationComparisonRecord,
  "id" | "createdAt"
>;

export type BlindEvaluationJudgmentRecord = {
  id: string;
  comparisonId: string;
  preference: BlindPreference;
  ratingsA: BlindRatings;
  ratingsB: BlindRatings;
  evaluatorNotes: string | null;
  errorTags: BlindEvaluationErrorTag[];
  correctedIntent: string | null;
  createdAt: string;
};

export type CreateBlindEvaluationJudgment = Omit<
  BlindEvaluationJudgmentRecord,
  "id" | "createdAt"
>;

export interface BlindEvaluationRepository {
  importSet(input: BlindEvaluationSetImport, contentHash: string): Promise<BlindEvaluationSetRecord>;
  listSets(): Promise<BlindEvaluationSetRecord[]>;
  findSetById(id: string): Promise<BlindEvaluationSetRecord | null>;
  listCases(setId: string): Promise<BlindEvaluationCaseRecord[]>;
  createSession(input: CreateBlindEvaluationSession): Promise<BlindEvaluationSessionRecord>;
  findSessionById(id: string): Promise<BlindEvaluationSessionRecord | null>;
  completeSession(id: string): Promise<BlindEvaluationSessionRecord>;
  listComparisons(sessionId: string): Promise<BlindEvaluationComparisonRecord[]>;
  findComparisonById(id: string): Promise<BlindEvaluationComparisonRecord | null>;
  createComparison(input: CreateBlindEvaluationComparison): Promise<BlindEvaluationComparisonRecord>;
  findJudgmentByComparisonId(comparisonId: string): Promise<BlindEvaluationJudgmentRecord | null>;
  createJudgment(input: CreateBlindEvaluationJudgment): Promise<BlindEvaluationJudgmentRecord>;
}

export type RepositoryBundle = {
  intentRuns: IntentRunRepository;
  modelFailures: IntentModelFailureRepository;
  feedback: IntentFeedbackRepository;
  benchmarks: BenchmarkRepository;
  blindEvaluations: BlindEvaluationRepository;
  storageMode: "supabase" | "memory";
};
