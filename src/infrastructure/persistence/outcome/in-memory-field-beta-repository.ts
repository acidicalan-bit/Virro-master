import type { FieldBetaRepository, FieldPolicyRecord } from "@/src/application/ports/outcome/field-beta-repository";
import type { FieldEvaluationJudgment, FieldEvaluationSample, FieldFeedback, FieldGoldenCase, FieldOutcome, FieldRegressionCandidate, FieldStrategyRun } from "@/src/domain/outcome/media/field-beta";
import { OutcomeBlueprintSchema, verifyOutcomeBlueprintHash } from "@/src/domain/outcome/specification/outcome-blueprint";
import { TaskSpecSchema, verifyTaskSpecHash } from "@/src/domain/outcome/specification/task-spec";

export class InMemoryFieldBetaRepository implements FieldBetaRepository {
  constructor(private readonly tenantId = "internal-lab") {}
  policies: FieldPolicyRecord[] = [];
  strategyRuns: FieldStrategyRun[] = [];
  outcomes: FieldOutcome[] = [];
  feedback: FieldFeedback[] = [];
  regressionCandidates: FieldRegressionCandidate[] = [];
  goldenCases: FieldGoldenCase[] = [];
  samples: FieldEvaluationSample[] = [];
  judgments: FieldEvaluationJudgment[] = [];

  async findPolicy(policyVersion: string) { return clone(this.policies.find((item) => item.policyVersion === policyVersion) ?? null); }
  async createPolicy(input: Omit<FieldPolicyRecord, "createdAt">) {
    if (this.policies.some((item) => item.policyVersion === input.policyVersion)) throw new Error("Policy versions are immutable.");
    const value = { ...clone(input), createdAt: now() };
    this.policies.push(value);
    return clone(value);
  }
  async createStrategyRun(input: Omit<FieldStrategyRun, "id" | "createdAt">) {
    if (this.strategyRuns.some((item) => item.transactionId === input.transactionId && item.strategyId === input.strategyId)) throw new Error("Strategy run already exists.");
    if (input.tenantId !== this.tenantId) throw new Error("Tenant boundary violation.");
    const value = { ...clone(input), id: crypto.randomUUID(), createdAt: now() };
    this.strategyRuns.push(value);
    return clone(value);
  }
  async findStrategyRunByKey(transactionId: string, strategyId: FieldStrategyRun["strategyId"]) { return clone(this.strategyRuns.find((item) => item.tenantId === this.tenantId && item.transactionId === transactionId && item.strategyId === strategyId) ?? null); }
  async findStrategyRun(input: Pick<FieldStrategyRun, "transactionId" | "strategyId" | "taskSpecHash" | "policyVersion">) { return clone(this.strategyRuns.find((item) => item.tenantId === this.tenantId && item.transactionId === input.transactionId && item.strategyId === input.strategyId && item.taskSpecHash === input.taskSpecHash && item.policyVersion === input.policyVersion) ?? null); }
  async listStrategyRuns(transactionId: string) { return clone(this.strategyRuns.filter((item) => item.tenantId === this.tenantId && item.transactionId === transactionId)); }
  async createOutcome(input: Omit<FieldOutcome, "id" | "createdAt">) {
    if (this.outcomes.some((item) => item.transactionId === input.transactionId)) throw new Error("Field outcome already exists.");
    if (input.tenantId !== this.tenantId) throw new Error("Tenant boundary violation.");
    const blueprint = OutcomeBlueprintSchema.parse(input.blueprintSnapshot);
    const taskSpec = TaskSpecSchema.parse(input.taskSpecSnapshot);
    if (!verifyOutcomeBlueprintHash(blueprint) || blueprint.id !== input.blueprintId || blueprint.version !== input.blueprintVersion || blueprint.hash !== input.blueprintHash) throw new Error("Blueprint snapshot does not match persisted provenance.");
    if (!verifyTaskSpecHash(taskSpec) || taskSpec.id !== input.taskSpecId || taskSpec.version !== input.taskSpecVersion || taskSpec.hash !== input.taskSpecHash || taskSpec.blueprint.hash !== input.blueprintHash) throw new Error("Task Spec snapshot does not match persisted provenance.");
    const value = { ...clone(input), id: crypto.randomUUID(), createdAt: now() };
    this.outcomes.push(value);
    return clone(value);
  }
  async findOutcomeByIdentity(input: Pick<FieldOutcome, "transactionId" | "taskSpecHash" | "policyVersion" | "strategyId">) { return clone(this.outcomes.find((item) => item.tenantId === this.tenantId && item.transactionId === input.transactionId && item.taskSpecHash === input.taskSpecHash && item.policyVersion === input.policyVersion && item.strategyId === input.strategyId) ?? null); }
  async findOutcome(id: string) { return clone(this.outcomes.find((item) => item.tenantId === this.tenantId && item.id === id) ?? null); }
  async findOutcomeByTransactionId(transactionId: string) { return clone(this.outcomes.find((item) => item.tenantId === this.tenantId && item.transactionId === transactionId) ?? null); }
  async listOutcomes() { return clone(this.outcomes.filter((item) => item.tenantId === this.tenantId)); }
  async createFeedback(input: Omit<FieldFeedback, "id" | "createdAt">) {
    if (this.feedback.some((item) => item.fieldOutcomeId === input.fieldOutcomeId)) throw new Error("Field feedback is immutable.");
    if (input.tenantId !== this.tenantId) throw new Error("Tenant boundary violation.");
    const value = { ...clone(input), id: crypto.randomUUID(), createdAt: now() };
    this.feedback.push(value);
    return clone(value);
  }
  async findFeedbackByOutcomeId(fieldOutcomeId: string) { return clone(this.feedback.find((item) => item.tenantId === this.tenantId && item.fieldOutcomeId === fieldOutcomeId) ?? null); }
  async listFeedback() { return clone(this.feedback.filter((item) => item.tenantId === this.tenantId)); }
  async createRegressionCandidate(input: Omit<FieldRegressionCandidate, "id" | "createdAt">) {
    if (this.regressionCandidates.some((item) => item.fieldOutcomeId === input.fieldOutcomeId)) throw new Error("Regression candidate already exists.");
    if (input.tenantId !== this.tenantId) throw new Error("Tenant boundary violation.");
    const value = { ...clone(input), id: crypto.randomUUID(), createdAt: now() };
    this.regressionCandidates.push(value);
    return clone(value);
  }
  async findRegressionByOutcomeId(fieldOutcomeId: string) { return clone(this.regressionCandidates.find((item) => item.tenantId === this.tenantId && item.fieldOutcomeId === fieldOutcomeId) ?? null); }
  async createGoldenCase(input: Omit<FieldGoldenCase, "id" | "createdAt">) {
    if (this.goldenCases.some((item) => item.fieldOutcomeId === input.fieldOutcomeId)) throw new Error("Golden cases are immutable.");
    if (input.tenantId !== this.tenantId) throw new Error("Tenant boundary violation.");
    const value = { ...clone(input), id: crypto.randomUUID(), createdAt: now() };
    this.goldenCases.push(value);
    return clone(value);
  }
  async findGoldenByOutcomeId(fieldOutcomeId: string) { return clone(this.goldenCases.find((item) => item.tenantId === this.tenantId && item.fieldOutcomeId === fieldOutcomeId) ?? null); }
  async listGoldenCases() { return clone(this.goldenCases.filter((item) => item.tenantId === this.tenantId)); }
  async createEvaluationSample(input: Omit<FieldEvaluationSample, "id" | "createdAt">) {
    if (this.samples.some((item) => item.fieldOutcomeId === input.fieldOutcomeId)) throw new Error("Evaluation sample already exists.");
    if (input.tenantId !== this.tenantId) throw new Error("Tenant boundary violation.");
    const value = { ...clone(input), id: crypto.randomUUID(), createdAt: now() };
    this.samples.push(value);
    return clone(value);
  }
  async findEvaluationSampleByOutcomeId(fieldOutcomeId: string) { return clone(this.samples.find((item) => item.tenantId === this.tenantId && item.fieldOutcomeId === fieldOutcomeId) ?? null); }
  async findEvaluationSample(id: string) { return clone(this.samples.find((item) => item.tenantId === this.tenantId && item.id === id) ?? null); }
  async createEvaluationJudgment(input: Omit<FieldEvaluationJudgment, "id" | "createdAt">) {
    if (this.judgments.some((item) => item.sampleId === input.sampleId)) throw new Error("Evaluation judgment is immutable.");
    if (input.tenantId !== this.tenantId) throw new Error("Tenant boundary violation.");
    const value = { ...clone(input), id: crypto.randomUUID(), createdAt: now() };
    this.judgments.push(value);
    return clone(value);
  }
  async findEvaluationJudgment(sampleId: string) { return clone(this.judgments.find((item) => item.tenantId === this.tenantId && item.sampleId === sampleId) ?? null); }
}

function now() { return new Date().toISOString(); }
function clone<T>(value: T): T { return structuredClone(value); }
