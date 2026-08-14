import type {
  FieldEvaluationJudgment,
  FieldEvaluationSample,
  FieldFeedback,
  FieldGoldenCase,
  FieldOutcome,
  FieldPolicyDefinition,
  FieldRegressionCandidate,
  FieldStrategyRun,
} from "@/src/domain/outcome/media/field-beta";

export type FieldPolicyRecord = {
  policyVersion: string;
  status: string;
  definition: FieldPolicyDefinition;
  createdAt: string;
};

export interface FieldBetaRepository {
  findPolicy(policyVersion: string): Promise<FieldPolicyRecord | null>;
  createPolicy(input: Omit<FieldPolicyRecord, "createdAt">): Promise<FieldPolicyRecord>;
  createStrategyRun(input: Omit<FieldStrategyRun, "id" | "createdAt">): Promise<FieldStrategyRun>;
  findStrategyRunByKey(transactionId: string, strategyId: FieldStrategyRun["strategyId"]): Promise<FieldStrategyRun | null>;
  findStrategyRun(input: Pick<FieldStrategyRun, "transactionId" | "strategyId" | "taskSpecHash" | "policyVersion">): Promise<FieldStrategyRun | null>;
  listStrategyRuns(transactionId: string): Promise<FieldStrategyRun[]>;
  createOutcome(input: Omit<FieldOutcome, "id" | "createdAt">): Promise<FieldOutcome>;
  findOutcomeByIdentity(input: Pick<FieldOutcome, "transactionId" | "taskSpecHash" | "policyVersion" | "strategyId">): Promise<FieldOutcome | null>;
  findOutcome(id: string): Promise<FieldOutcome | null>;
  findOutcomeByTransactionId(transactionId: string): Promise<FieldOutcome | null>;
  listOutcomes(): Promise<FieldOutcome[]>;
  createFeedback(input: Omit<FieldFeedback, "id" | "createdAt">): Promise<FieldFeedback>;
  findFeedbackByOutcomeId(fieldOutcomeId: string): Promise<FieldFeedback | null>;
  listFeedback(): Promise<FieldFeedback[]>;
  createRegressionCandidate(input: Omit<FieldRegressionCandidate, "id" | "createdAt">): Promise<FieldRegressionCandidate>;
  findRegressionByOutcomeId(fieldOutcomeId: string): Promise<FieldRegressionCandidate | null>;
  createGoldenCase(input: Omit<FieldGoldenCase, "id" | "createdAt">): Promise<FieldGoldenCase>;
  findGoldenByOutcomeId(fieldOutcomeId: string): Promise<FieldGoldenCase | null>;
  listGoldenCases(): Promise<FieldGoldenCase[]>;
  createEvaluationSample(input: Omit<FieldEvaluationSample, "id" | "createdAt">): Promise<FieldEvaluationSample>;
  findEvaluationSample(id: string): Promise<FieldEvaluationSample | null>;
  findEvaluationSampleByOutcomeId(fieldOutcomeId: string): Promise<FieldEvaluationSample | null>;
  createEvaluationJudgment(input: Omit<FieldEvaluationJudgment, "id" | "createdAt">): Promise<FieldEvaluationJudgment>;
  findEvaluationJudgment(sampleId: string): Promise<FieldEvaluationJudgment | null>;
}
