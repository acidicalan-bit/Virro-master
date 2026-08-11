import { z } from "zod";

import { PreservationEvidenceMetricsSchema } from "@/src/domain/outcome/media/preservation";
import { StudyTaskTypeSchema, StudyTopologySchema } from "@/src/domain/outcome/media/preservation-study";
import type { OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import type { TaskSpec } from "@/src/domain/outcome/specification/task-spec";

export const FIELD_POLICY_VERSION = "preservation-policy-v0.1" as const;
export const FIELD_POLICY_STATUS = "HYPOTHESIS_BASED_INITIAL_POLICY" as const;
export const PRECISION_EDIT_OUTCOME_SKU = "precision-edit-v0" as const;
export const PRECISION_EDIT_BLUEPRINT_VERSION = 1 as const;
export const FIELD_TENANT_ID = "internal-lab" as const;
export const FIELD_ACCEPTANCE_SOURCE = "HUMAN_EVALUATOR" as const;

export const PreservationStrategyIdSchema = z.enum(["P0_RAW", "P1_SOFT", "P2_MODERATE", "P3_HARD"]);
export type PreservationStrategyId = z.infer<typeof PreservationStrategyIdSchema>;

export const PreservationStrategyParametersSchema = z.object({
  mode: z.enum(["RAW", "DETERMINISTIC_COMPOSITE"]),
  coupledBandSize: z.number().min(0).max(0.25),
  outsideSourceWeight: z.number().min(0).max(1),
  blendMode: z.enum(["NONE", "FEATHERED"]),
}).strict();
export type PreservationStrategyParameters = z.infer<typeof PreservationStrategyParametersSchema>;

export const FIELD_POLICY_DEFINITION = Object.freeze({
  policyVersion: FIELD_POLICY_VERSION,
  status: FIELD_POLICY_STATUS,
  strategies: {
    P0_RAW: { mode: "RAW", coupledBandSize: 0, outsideSourceWeight: 0, blendMode: "NONE" },
    P1_SOFT: { mode: "DETERMINISTIC_COMPOSITE", coupledBandSize: 0.16, outsideSourceWeight: 0.25, blendMode: "FEATHERED" },
    P2_MODERATE: { mode: "DETERMINISTIC_COMPOSITE", coupledBandSize: 0.08, outsideSourceWeight: 0.65, blendMode: "FEATHERED" },
    P3_HARD: { mode: "DETERMINISTIC_COMPOSITE", coupledBandSize: 0.04, outsideSourceWeight: 1, blendMode: "FEATHERED" },
  },
  topologyMatrix: {
    LOCAL_INDEPENDENT: "P3_HARD",
    LOCAL_COUPLED: "P2_MODERATE",
    STRUCTURAL: "P1_SOFT",
    GLOBAL: "P0_RAW",
  },
} satisfies FieldPolicyDefinition);

export type FieldPolicyDefinition = {
  policyVersion: typeof FIELD_POLICY_VERSION;
  status: typeof FIELD_POLICY_STATUS;
  strategies: Record<PreservationStrategyId, PreservationStrategyParameters>;
  topologyMatrix: Record<z.infer<typeof StudyTopologySchema>, PreservationStrategyId>;
};

export const FieldFailureTagSchema = z.enum([
  "UNAUTHORIZED_CHANGE",
  "REQUESTED_EDIT_FAILED",
  "ARTIFACT",
  "IDENTITY_DRIFT",
  "PRODUCT_DRIFT",
  "BOUNDARY_ARTIFACT",
  "SHADOW_CUTOFF",
  "GEOMETRY_CUTOFF",
  "TEXT_ERROR",
  "SEMANTIC_MISMATCH",
  "VISUAL_QUALITY",
  "INSTRUCTION_MISUNDERSTANDING",
  "UNDER_PRESERVATION",
  "OVER_PRESERVATION",
  "OTHER",
]);
export type FieldFailureTag = z.infer<typeof FieldFailureTagSchema>;

export const StrategyRoleSchema = z.enum(["DELIVERED", "SHADOW"]);
export type StrategyRole = z.infer<typeof StrategyRoleSchema>;

export const RunFieldEditSchema = z.object({
  tenantId: z.string().trim().min(1).max(120).default(FIELD_TENANT_ID),
  projectName: z.string().trim().min(1).max(200),
  assetName: z.string().trim().min(1).max(200),
  sourceBytes: z.instanceof(Uint8Array),
  sourceMimeType: z.literal("image/png"),
  instruction: z.string().trim().min(1).max(8_000),
  roi: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  }),
  topology: StudyTopologySchema,
  taskType: StudyTaskTypeSchema,
  chosenStrategy: PreservationStrategyIdSchema.nullable().optional().default(null),
  overrideReason: z.string().trim().max(2_000).nullable().optional().default(null),
});
export type RunFieldEditInput = z.infer<typeof RunFieldEditSchema>;

export const FieldFeedbackInputSchema = z.object({
  tenantId: z.string().trim().min(1).max(120).default(FIELD_TENANT_ID),
  fieldOutcomeId: z.uuid(),
  humanAccepted: z.boolean(),
  failureTags: z.array(FieldFailureTagSchema).max(FieldFailureTagSchema.options.length).default([]),
  humanCorrection: z.string().trim().max(8_000).nullable().optional().default(null),
  acceptanceSource: z.literal(FIELD_ACCEPTANCE_SOURCE).default(FIELD_ACCEPTANCE_SOURCE),
}).superRefine((value, context) => {
  if (value.humanAccepted && value.failureTags.length) {
    context.addIssue({ code: "custom", path: ["failureTags"], message: "Accepted outcomes cannot carry failure tags." });
  }
});

export type FieldStrategyRun = {
  id: string;
  transactionId: string;
  executionRunId: string;
  rawCandidateId: string;
  candidateId: string;
  policyVersion: string;
  strategyId: PreservationStrategyId;
  parameters: PreservationStrategyParameters;
  role: StrategyRole;
  machineMetrics: z.infer<typeof PreservationEvidenceMetricsSchema>;
  preservationLatencyMs: number;
  tenantId: string;
  outcomeSku: typeof PRECISION_EDIT_OUTCOME_SKU;
  blueprintId: string;
  blueprintVersion: number;
  blueprintHash: string;
  taskSpecId: string;
  taskSpecVersion: number;
  taskSpecHash: string;
  specCompilerVersion: string;
  createdAt: string;
};

export type FieldOutcome = {
  id: string;
  transactionId: string;
  sourceVersionId: string;
  instruction: string;
  roi: Record<string, number>;
  topology: z.infer<typeof StudyTopologySchema>;
  taskType: z.infer<typeof StudyTaskTypeSchema>;
  provider: string;
  model: string;
  rawCandidateId: string;
  deliveredCandidateId: string;
  recommendedStrategy: PreservationStrategyId;
  strategyId: PreservationStrategyId;
  policyVersion: string;
  overrideReason: string | null;
  providerLatencyMs: number;
  preservationLatencyMs: number;
  totalLatencyMs: number;
  providerCostUsd: number | null;
  createdAt: string;
  tenantId: string;
  outcomeSku: typeof PRECISION_EDIT_OUTCOME_SKU;
  blueprintId: string;
  blueprintVersion: number;
  blueprintHash: string;
  taskSpecId: string;
  taskSpecVersion: number;
  taskSpecHash: string;
  specCompilerName: string;
  specCompilerVersion: string;
  sourceSha256: string;
  machineVerificationStatus: "PASSED" | "FAILED";
  sameSpecStatus: "PASSED" | "FAILED" | "BLOCKED";
  blueprintSnapshot: OutcomeBlueprint;
  taskSpecSnapshot: TaskSpec;
};

export type FieldFeedback = {
  tenantId: string;
  id: string;
  fieldOutcomeId: string;
  humanAccepted: boolean;
  failureTags: FieldFailureTag[];
  humanCorrection: string | null;
  createdAt: string;
  acceptanceSource: typeof FIELD_ACCEPTANCE_SOURCE;
  recordedBy: "internal-evaluator";
};

export type FieldGoldenCase = {
  tenantId: string;
  id: string;
  fieldOutcomeId: string;
  goldenVersion: string;
  intentExpectation: string;
  criticalPreservationExpectation: string;
  promotionReason: string;
  provenance: Record<string, unknown>;
  regressionCandidateId: string | null;
  createdAt: string;
  usageAuthorizationStatus: "NOT_AUTHORIZED" | "AUTHORIZED_INTERNAL";
};

export type FieldRegressionCandidate = {
  tenantId: string;
  id: string;
  fieldOutcomeId: string;
  reason: string;
  createdAt: string;
};

export type FieldEvaluationSample = {
  tenantId: string;
  id: string;
  fieldOutcomeId: string;
  candidateAId: string;
  candidateAStrategy: PreservationStrategyId;
  candidateBId: string;
  candidateBStrategy: PreservationStrategyId;
  createdAt: string;
};

export type FieldEvaluationJudgment = {
  tenantId: string;
  id: string;
  sampleId: string;
  preference: "A_BETTER" | "B_BETTER" | "TIE" | "BOTH_BAD";
  createdAt: string;
};

export function recommendedStrategyFor(topology: z.infer<typeof StudyTopologySchema>): PreservationStrategyId {
  return FIELD_POLICY_DEFINITION.topologyMatrix[topology];
}

export function calculateFieldMetrics(
  outcomes: FieldOutcome[],
  feedback: FieldFeedback[],
  filters: { policyVersion?: string; provider?: string; model?: string; from?: string; to?: string } = {},
) {
  const filtered = outcomes.filter((item) =>
    (!filters.policyVersion || item.policyVersion === filters.policyVersion) &&
    (!filters.provider || item.provider === filters.provider) &&
    (!filters.model || item.model === filters.model) &&
    (!filters.from || item.createdAt >= filters.from) &&
    (!filters.to || item.createdAt <= filters.to));
  const feedbackByOutcome = new Map(feedback.map((item) => [item.fieldOutcomeId, item]));
  const observed = filtered.flatMap((item) => {
    const human = feedbackByOutcome.get(item.id);
    return human ? [{ outcome: item, feedback: human }] : [];
  });
  const accepted = observed.filter((item) => item.feedback.humanAccepted).length;
  const knownCosts = filtered.filter((item) => item.providerCostUsd !== null);
  const totalKnownCost = knownCosts.reduce((sum, item) => sum + item.providerCostUsd!, 0);
  const allCostsKnown = filtered.length > 0 && knownCosts.length === filtered.length;
  const failureTagCounts = Object.fromEntries(FieldFailureTagSchema.options.map((tag) => [tag, observed.filter((item) => item.feedback.failureTags.includes(tag)).length]));
  const acceptanceBy = <K extends "strategyId" | "topology" | "taskType" | "policyVersion">(key: K) => Object.fromEntries(
    [...new Set(filtered.map((item) => item[key]))].map((value) => {
      const group = observed.filter((item) => item.outcome[key] === value);
      return [value, { observed: group.length, accepted: group.filter((item) => item.feedback.humanAccepted).length, rate: ratio(group.filter((item) => item.feedback.humanAccepted).length, group.length) }];
    }),
  );
  return {
    totalRealEdits: filtered.length,
    observedHumanOutcomes: observed.length,
    firstPassAcceptanceRate: ratio(accepted, observed.length),
    rejectionRate: ratio(observed.length - accepted, observed.length),
    humanCorrectionRate: ratio(observed.filter((item) => Boolean(item.feedback.humanCorrection)).length, observed.length),
    strategyOverrideRate: ratio(filtered.filter((item) => item.strategyId !== item.recommendedStrategy).length, filtered.length),
    failureTagCounts,
    averageProviderLatencyMs: average(filtered.map((item) => item.providerLatencyMs)),
    averageTotalLatencyMs: average(filtered.map((item) => item.totalLatencyMs)),
    averageTimeToOutcomeMs: average(observed.map((item) => Math.max(0, Date.parse(item.feedback.createdAt) - Date.parse(item.outcome.createdAt)))),
    averageProviderCostUsd: knownCosts.length ? totalKnownCost / knownCosts.length : null,
    providerCostPerAcceptedOutcomeUsd: allCostsKnown && accepted > 0 ? totalKnownCost / accepted : null,
    totalMeasuredComputePerAcceptedOutcomeUsd: allCostsKnown && accepted > 0 ? totalKnownCost / accepted : null,
    costCoverage: { known: knownCosts.length, total: filtered.length },
    acceptanceByStrategy: acceptanceBy("strategyId"),
    acceptanceByTopology: acceptanceBy("topology"),
    acceptanceByTaskType: acceptanceBy("taskType"),
    acceptanceByPolicyVersion: acceptanceBy("policyVersion"),
  };
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator ? numerator / denominator : null;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
