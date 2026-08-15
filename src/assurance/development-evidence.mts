import { z } from "zod";

export const EvidenceLevelSchema = z.enum([
  "E0_STATIC",
  "E1_MODEL",
  "E2_APPLICATION",
  "E3_LOCAL_REAL_BOUNDARY",
  "E4_REMOTE_STAGING",
  "E5_DEPLOYED_E2E",
]);
export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;

export const EvidenceResultSchema = z.enum([
  "PASS",
  "FAIL",
  "SKIPPED_ENVIRONMENT",
  "NOT_RUN",
  "UNKNOWN",
]);
export type EvidenceResult = z.infer<typeof EvidenceResultSchema>;

export const ClaimSatisfactionStatusSchema = z.enum([
  "PROVEN",
  "FAILED",
  "NOT_PROVEN",
  "SKIPPED",
  "UNKNOWN",
]);
export type ClaimSatisfactionStatus = z.infer<typeof ClaimSatisfactionStatusSchema>;

export const EvidenceIndependenceSchema = z.enum([
  "IMPLEMENTER",
  "INDEPENDENT_VERIFIER",
  "AUTOMATED_GATE",
]);

const GitShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const NonEmptyText = z.string().trim().min(1);

export const DevelopmentEvidenceReceiptSchema = z.object({
  evidenceId: z.uuid(),
  buildId: NonEmptyText,
  specId: NonEmptyText,
  criterionId: NonEmptyText,
  subject: NonEmptyText,
  control: NonEmptyText,
  requiredEvidenceLevel: EvidenceLevelSchema,
  actualEvidenceLevel: EvidenceLevelSchema,
  boundaryTested: NonEmptyText,
  environment: NonEmptyText,
  executor: NonEmptyText,
  verifier: z.object({
    name: NonEmptyText,
    role: NonEmptyText,
  }).strict(),
  independence: EvidenceIndependenceSchema,
  provenance: z.object({
    kind: z.enum(["REPOSITORY_TEST", "DOCUMENTED_HISTORICAL", "REMOTE_RUN", "MANUAL_INSPECTION"]),
    source: NonEmptyText,
    immutableRef: NonEmptyText,
  }).strict(),
  commandTestIdentifier: NonEmptyText,
  result: EvidenceResultSchema,
  limitations: z.array(NonEmptyText),
  skippedReason: NonEmptyText.nullable(),
  artifactRefs: z.array(NonEmptyText),
  baselineSha: GitShaSchema,
  resultSha: GitShaSchema,
  timestamp: z.string().datetime({ offset: true }),
}).strict().superRefine((receipt, context) => {
  if (receipt.result === "SKIPPED_ENVIRONMENT" && !receipt.skippedReason) {
    context.addIssue({
      code: "custom",
      path: ["skippedReason"],
      message: "SKIPPED_ENVIRONMENT requires a reason that states what is missing.",
    });
  }
  if (receipt.result !== "SKIPPED_ENVIRONMENT" && receipt.skippedReason) {
    context.addIssue({
      code: "custom",
      path: ["skippedReason"],
      message: "skippedReason is only valid for SKIPPED_ENVIRONMENT evidence.",
    });
  }
});
export type DevelopmentEvidenceReceipt = z.infer<typeof DevelopmentEvidenceReceiptSchema>;

export const AssuranceClaimSchema = z.object({
  scope: z.enum(["CURRENT", "HISTORICAL"]),
  buildId: NonEmptyText,
  specId: NonEmptyText,
  criterionId: NonEmptyText,
  subject: NonEmptyText,
  control: NonEmptyText,
  requiredEvidenceLevel: EvidenceLevelSchema,
}).strict();
export type AssuranceClaim = z.infer<typeof AssuranceClaimSchema>;

export const AssuranceManifestSourceSchema = z.object({
  schemaVersion: z.literal("virro-development-assurance-v1"),
  generatedAt: z.string().datetime({ offset: true }),
  buildId: NonEmptyText,
  baselineSha: GitShaSchema,
  resultSha: GitShaSchema,
  claims: z.array(AssuranceClaimSchema).min(1),
  evidence: z.array(DevelopmentEvidenceReceiptSchema),
}).strict();
export type AssuranceManifestSource = z.infer<typeof AssuranceManifestSourceSchema>;

const LEVEL_ORDER: Record<EvidenceLevel, number> = {
  E0_STATIC: 0,
  E1_MODEL: 1,
  E2_APPLICATION: 2,
  E3_LOCAL_REAL_BOUNDARY: 3,
  E4_REMOTE_STAGING: 4,
  E5_DEPLOYED_E2E: 5,
};

export type ClaimEvaluation = {
  scope: "CURRENT" | "HISTORICAL";
  buildId: string;
  specId: string;
  criterionId: string;
  requiredEvidenceLevel: EvidenceLevel;
  highestPassingEvidenceLevel: EvidenceLevel | null;
  status: ClaimSatisfactionStatus;
  evidenceIds: string[];
  limitations: string[];
  skippedReasons: string[];
  consideredEvidence: DevelopmentEvidenceReceipt[];
};

export function evidenceLevelSatisfies(actual: EvidenceLevel, required: EvidenceLevel): boolean {
  return LEVEL_ORDER[actual] >= LEVEL_ORDER[required];
}

export function evaluateClaim(
  untrustedClaim: AssuranceClaim,
  untrustedEvidence: DevelopmentEvidenceReceipt[],
): ClaimEvaluation {
  const claim = AssuranceClaimSchema.parse(untrustedClaim);
  const evidence = z.array(DevelopmentEvidenceReceiptSchema).parse(untrustedEvidence);
  const matching = evidence.filter((receipt) =>
    receipt.buildId === claim.buildId
    && receipt.specId === claim.specId
    && receipt.criterionId === claim.criterionId,
  );
  const passing = matching.filter((receipt) => receipt.result === "PASS");
  const highestPassing = passing
    .map((receipt) => receipt.actualEvidenceLevel)
    .sort((left, right) => LEVEL_ORDER[right] - LEVEL_ORDER[left])[0] ?? null;
  const qualifyingPass = passing.some((receipt) =>
    receipt.requiredEvidenceLevel === claim.requiredEvidenceLevel
    && evidenceLevelSatisfies(receipt.actualEvidenceLevel, claim.requiredEvidenceLevel),
  );

  let status: ClaimSatisfactionStatus;
  if (matching.some((receipt) => receipt.result === "FAIL")) status = "FAILED";
  else if (qualifyingPass) status = "PROVEN";
  else if (matching.some((receipt) => receipt.result === "SKIPPED_ENVIRONMENT")) status = "SKIPPED";
  else if (passing.length > 0) status = "NOT_PROVEN";
  else if (matching.some((receipt) => receipt.result === "UNKNOWN" || receipt.result === "NOT_RUN")) status = "UNKNOWN";
  else status = "NOT_PROVEN";

  const tierLimitations = passing
    .filter((receipt) => !evidenceLevelSatisfies(receipt.actualEvidenceLevel, claim.requiredEvidenceLevel))
    .map((receipt) => `${receipt.actualEvidenceLevel} cannot satisfy ${claim.requiredEvidenceLevel}.`);

  return {
    scope: claim.scope,
    buildId: claim.buildId,
    specId: claim.specId,
    criterionId: claim.criterionId,
    requiredEvidenceLevel: claim.requiredEvidenceLevel,
    highestPassingEvidenceLevel: highestPassing,
    status,
    evidenceIds: matching.map((receipt) => receipt.evidenceId),
    limitations: unique([...matching.flatMap((receipt) => receipt.limitations), ...tierLimitations]),
    skippedReasons: unique(matching.flatMap((receipt) => receipt.skippedReason ? [receipt.skippedReason] : [])),
    consideredEvidence: matching,
  };
}

export function createAssuranceManifest(untrustedSource: AssuranceManifestSource) {
  const source = AssuranceManifestSourceSchema.parse(untrustedSource);
  const evaluations = source.claims.map((claim) => evaluateClaim(claim, source.evidence));
  return {
    schemaVersion: source.schemaVersion,
    generatedAt: source.generatedAt,
    buildId: source.buildId,
    baselineSha: source.baselineSha,
    resultSha: source.resultSha,
    summary: summarizeEvaluations(evaluations),
    claims: source.claims,
    evidence: source.evidence,
    evaluations,
  };
}

function summarizeEvaluations(evaluations: ClaimEvaluation[]) {
  const current = evaluations.filter((evaluation) => evaluation.scope === "CURRENT");
  const historical = evaluations.filter((evaluation) => evaluation.scope === "HISTORICAL");
  return {
    currentCounts: countStatuses(current),
    historicalCounts: countStatuses(historical),
    allCurrentCriteriaProven: current.length > 0 && current.every((item) => item.status === "PROVEN"),
  };
}

function countStatuses(evaluations: ClaimEvaluation[]) {
  const counts: Record<ClaimSatisfactionStatus, number> = {
    PROVEN: 0,
    FAILED: 0,
    NOT_PROVEN: 0,
    SKIPPED: 0,
    UNKNOWN: 0,
  };
  for (const evaluation of evaluations) counts[evaluation.status] += 1;
  return counts;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
