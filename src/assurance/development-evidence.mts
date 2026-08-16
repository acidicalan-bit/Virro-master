import { createHash } from "node:crypto";

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

export const EvidenceEnvironmentClassSchema = z.enum([
  "STATIC_ANALYSIS",
  "LOCAL_MODEL",
  "LOCAL_APPLICATION",
  "LOCAL_REAL_BOUNDARY",
  "REMOTE_STAGING",
  "DEPLOYED_E2E",
  "NOT_EXECUTED",
]);
export type EvidenceEnvironmentClass = z.infer<typeof EvidenceEnvironmentClassSchema>;

export const AssuranceSubjectIdSchema = z.enum([
  "CANONICAL_COMMIT",
  "CANDIDATE_ASSET",
  "ASSET_VERSION",
  "CANONICAL_HEAD",
  "LEGACY_PRECISION_EDIT_ROUTE",
  "DEPLOYED_LEGACY_PRECISION_EDIT_ROUTE",
  "TENANT_DATA",
  "REQUEST_IDENTITY",
  "CANONICAL_COMMIT_RPC",
  "TENANT_STORAGE",
  "PRIVILEGED_STORAGE",
]);
export type AssuranceSubjectId = z.infer<typeof AssuranceSubjectIdSchema>;

export const AssuranceControlIdSchema = z.enum([
  "POSTGRES_ATOMIC_COMMIT",
  "POSTGRES_CANDIDATE_IMMUTABILITY",
  "POSTGRES_ASSET_VERSION_IMMUTABILITY",
  "POSTGRES_STALE_HEAD_CAS",
  "POSTGRES_COMMIT_IDEMPOTENCY",
  "NEXT_LEGACY_ROUTE_ISOLATION",
  "POSTGRES_F1_REGRESSION",
  "DEPLOYED_CACHE_RETIREMENT",
  "SUPABASE_RLS_TENANT_READ",
  "SUPABASE_AUTH_MEMBERSHIP",
  "HTTP_AUTHENTICATION",
  "SUPABASE_RPC_ACL",
  "STORAGE_TENANT_ISOLATION",
  "SERVICE_ROLE_STORAGE_ISOLATION",
  "POSTGRES_REMOTE_CONCURRENCY",
]);
export type AssuranceControlId = z.infer<typeof AssuranceControlIdSchema>;

export const AssuranceBoundaryIdSchema = z.enum([
  "REPOSITORY_STATIC_INSPECTION",
  "TRUST_HARNESS_MODEL",
  "NEXT_ROUTE_HANDLER",
  "PGLITE_POSTGRES",
  "LOCAL_HTTP_AUTH_BOUNDARY",
  "DEPLOYED_CDN_ROUTING",
  "SUPABASE_REMOTE_RLS",
  "SUPABASE_REMOTE_AUTH",
  "SUPABASE_REMOTE_RPC",
  "SUPABASE_REMOTE_STORAGE",
  "SUPABASE_REMOTE_SERVICE_ROLE_STORAGE",
  "SUPABASE_REMOTE_POSTGRES_CONCURRENCY",
  "DEPLOYED_WEB_WORKFLOW",
  "NOT_EXECUTED",
]);
export type AssuranceBoundaryId = z.infer<typeof AssuranceBoundaryIdSchema>;

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

export const DeclaredIndependenceSchema = z.enum([
  "IMPLEMENTER",
  "INDEPENDENT_VERIFIER",
  "AUTOMATED_GATE",
]);
export type DeclaredIndependence = z.infer<typeof DeclaredIndependenceSchema>;

export const AssuranceParticipantRoleSchema = z.enum([
  "EXECUTION",
  "VERIFICATION",
  "AUTOMATED_GATE",
]);
export type AssuranceParticipantRole = z.infer<typeof AssuranceParticipantRoleSchema>;

export const DerivedIndependenceStatusSchema = z.enum([
  "STRUCTURALLY_INDEPENDENT",
  "AUTOMATED_GATE",
  "NOT_STRUCTURALLY_INDEPENDENT",
]);
export type DerivedIndependenceStatus = z.infer<typeof DerivedIndependenceStatusSchema>;

export const IndependenceRequirementSchema = z.enum([
  "RECORDED_ONLY",
  "AUTOMATED_OR_INDEPENDENT",
  "INDEPENDENT_VERIFIER",
]);
export type IndependenceRequirement = z.infer<typeof IndependenceRequirementSchema>;

const GitShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const NonEmptyText = z.string().trim().min(1);
const StableAssuranceIdentifierSchema = z.string().trim().regex(/^[a-z0-9][a-z0-9._:@/-]{2,127}$/i);

export const AssuranceParticipantBindingSchema = z.object({
  actorId: StableAssuranceIdentifierSchema.nullable(),
  contextId: StableAssuranceIdentifierSchema.nullable(),
  role: AssuranceParticipantRoleSchema.nullable(),
}).strict();
export type AssuranceParticipantBinding = z.infer<typeof AssuranceParticipantBindingSchema>;

const LEVEL_ORDER: Record<EvidenceLevel, number> = {
  E0_STATIC: 0,
  E1_MODEL: 1,
  E2_APPLICATION: 2,
  E3_LOCAL_REAL_BOUNDARY: 3,
  E4_REMOTE_STAGING: 4,
  E5_DEPLOYED_E2E: 5,
};

const LEVEL_ENVIRONMENT: Record<EvidenceLevel, Exclude<EvidenceEnvironmentClass, "NOT_EXECUTED">> = {
  E0_STATIC: "STATIC_ANALYSIS",
  E1_MODEL: "LOCAL_MODEL",
  E2_APPLICATION: "LOCAL_APPLICATION",
  E3_LOCAL_REAL_BOUNDARY: "LOCAL_REAL_BOUNDARY",
  E4_REMOTE_STAGING: "REMOTE_STAGING",
  E5_DEPLOYED_E2E: "DEPLOYED_E2E",
};

const ENVIRONMENT_LEVEL: Record<Exclude<EvidenceEnvironmentClass, "NOT_EXECUTED">, EvidenceLevel> = {
  STATIC_ANALYSIS: "E0_STATIC",
  LOCAL_MODEL: "E1_MODEL",
  LOCAL_APPLICATION: "E2_APPLICATION",
  LOCAL_REAL_BOUNDARY: "E3_LOCAL_REAL_BOUNDARY",
  REMOTE_STAGING: "E4_REMOTE_STAGING",
  DEPLOYED_E2E: "E5_DEPLOYED_E2E",
};

const CriterionDefinitionInputSchema = z.object({
  criterionId: NonEmptyText,
  criterionVersion: z.number().int().positive(),
  subjectId: AssuranceSubjectIdSchema,
  controlId: AssuranceControlIdSchema,
  requiredBoundaryId: AssuranceBoundaryIdSchema.exclude(["NOT_EXECUTED"]),
  acceptedEnvironmentClasses: z.array(EvidenceEnvironmentClassSchema.exclude(["NOT_EXECUTED"])).min(1),
  minimumEvidenceLevel: EvidenceLevelSchema,
  independenceRequirement: IndependenceRequirementSchema,
}).strict().superRefine((definition, context) => {
  if (new Set(definition.acceptedEnvironmentClasses).size !== definition.acceptedEnvironmentClasses.length) {
    context.addIssue({ code: "custom", path: ["acceptedEnvironmentClasses"], message: "Environment classes must be unique." });
  }
  for (const environmentClass of definition.acceptedEnvironmentClasses) {
    if (LEVEL_ORDER[ENVIRONMENT_LEVEL[environmentClass]] < LEVEL_ORDER[definition.minimumEvidenceLevel]) {
      context.addIssue({
        code: "custom",
        path: ["acceptedEnvironmentClasses"],
        message: `${environmentClass} is below ${definition.minimumEvidenceLevel}.`,
      });
    }
  }
});
export type CriterionDefinitionInput = z.infer<typeof CriterionDefinitionInputSchema>;

export function createCriterionDefinitionHash(untrustedDefinition: CriterionDefinitionInput): string {
  const definition = CriterionDefinitionInputSchema.parse(untrustedDefinition);
  const canonical = {
    criterionId: definition.criterionId,
    criterionVersion: definition.criterionVersion,
    subjectId: definition.subjectId,
    controlId: definition.controlId,
    requiredBoundaryId: definition.requiredBoundaryId,
    acceptedEnvironmentClasses: [...definition.acceptedEnvironmentClasses].sort(),
    minimumEvidenceLevel: definition.minimumEvidenceLevel,
    independenceRequirement: definition.independenceRequirement,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export const DevelopmentEvidenceReceiptSchema = z.object({
  evidenceId: z.uuid(),
  buildId: NonEmptyText,
  specId: NonEmptyText,
  criterionId: NonEmptyText,
  criterionVersion: z.number().int().positive(),
  criterionDefinitionHash: Sha256Schema,
  subjectId: AssuranceSubjectIdSchema,
  controlId: AssuranceControlIdSchema,
  boundaryId: AssuranceBoundaryIdSchema,
  environmentClass: EvidenceEnvironmentClassSchema,
  subject: NonEmptyText,
  control: NonEmptyText,
  actualEvidenceLevel: EvidenceLevelSchema,
  boundaryTested: NonEmptyText,
  environment: NonEmptyText,
  executor: NonEmptyText,
  verifier: z.object({
    name: NonEmptyText,
    role: NonEmptyText,
  }).strict(),
  declaredIndependence: DeclaredIndependenceSchema,
  participantBindings: z.object({
    executor: AssuranceParticipantBindingSchema.nullable(),
    verifier: AssuranceParticipantBindingSchema.nullable(),
  }).strict(),
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
  if (receipt.environmentClass === "NOT_EXECUTED") {
    if (receipt.result === "PASS" || receipt.result === "FAIL") {
      context.addIssue({
        code: "custom",
        path: ["environmentClass"],
        message: "Executed PASS or FAIL evidence cannot use NOT_EXECUTED.",
      });
    }
  } else if (LEVEL_ENVIRONMENT[receipt.actualEvidenceLevel] !== receipt.environmentClass) {
    context.addIssue({
      code: "custom",
      path: ["environmentClass"],
      message: `${receipt.actualEvidenceLevel} requires ${LEVEL_ENVIRONMENT[receipt.actualEvidenceLevel]}.`,
    });
  }
});
export type DevelopmentEvidenceReceipt = z.infer<typeof DevelopmentEvidenceReceiptSchema>;

export const AssuranceClaimSchema = z.object({
  scope: z.enum(["CURRENT", "HISTORICAL"]),
  buildId: NonEmptyText,
  specId: NonEmptyText,
  criterionId: NonEmptyText,
  criterionVersion: z.number().int().positive(),
  criterionDefinitionHash: Sha256Schema,
  subjectId: AssuranceSubjectIdSchema,
  controlId: AssuranceControlIdSchema,
  requiredBoundaryId: AssuranceBoundaryIdSchema.exclude(["NOT_EXECUTED"]),
  acceptedEnvironmentClasses: z.array(EvidenceEnvironmentClassSchema.exclude(["NOT_EXECUTED"])).min(1),
  minimumEvidenceLevel: EvidenceLevelSchema,
  independenceRequirement: IndependenceRequirementSchema,
  subject: NonEmptyText,
  control: NonEmptyText,
}).strict().superRefine((claim, context) => {
  const definition = criterionDefinition(claim);
  const parsedDefinition = CriterionDefinitionInputSchema.safeParse(definition);
  if (!parsedDefinition.success) {
    for (const issue of parsedDefinition.error.issues) {
      context.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
    return;
  }
  const expectedHash = createCriterionDefinitionHash(parsedDefinition.data);
  if (claim.criterionDefinitionHash !== expectedHash) {
    context.addIssue({
      code: "custom",
      path: ["criterionDefinitionHash"],
      message: "criterionDefinitionHash does not match the authoritative criterion semantics.",
    });
  }
});
export type AssuranceClaim = z.infer<typeof AssuranceClaimSchema>;

export const AssuranceManifestSourceSchema = z.object({
  schemaVersion: z.literal("virro-development-assurance-v2"),
  generatedAt: z.string().datetime({ offset: true }),
  buildId: NonEmptyText,
  baselineSha: GitShaSchema,
  resultSha: GitShaSchema,
  claims: z.array(AssuranceClaimSchema).min(1),
  evidence: z.array(DevelopmentEvidenceReceiptSchema),
}).strict();
export type AssuranceManifestSource = z.infer<typeof AssuranceManifestSourceSchema>;

export type EvidenceIncompatibility = {
  evidenceId: string;
  reasons: string[];
};

export type StructuralIndependenceAssessment = {
  evidenceId: string;
  status: DerivedIndependenceStatus;
  reasons: string[];
};

export type ClaimEvaluation = {
  scope: "CURRENT" | "HISTORICAL";
  buildId: string;
  specId: string;
  criterionId: string;
  criterionVersion: number;
  criterionDefinitionHash: string;
  minimumEvidenceLevel: EvidenceLevel;
  highestPassingEvidenceLevel: EvidenceLevel | null;
  status: ClaimSatisfactionStatus;
  evidenceIds: string[];
  compatibleEvidenceIds: string[];
  incompatibilities: EvidenceIncompatibility[];
  independenceAssessments: StructuralIndependenceAssessment[];
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
  const compatibility = matching.map((receipt) => ({ receipt, reasons: incompatibilityReasons(claim, receipt) }));
  const compatible = compatibility.filter((item) => item.reasons.length === 0).map((item) => item.receipt);
  const passing = matching.filter((receipt) => receipt.result === "PASS");
  const highestPassing = passing
    .map((receipt) => receipt.actualEvidenceLevel)
    .sort((left, right) => LEVEL_ORDER[right] - LEVEL_ORDER[left])[0] ?? null;
  const definitionBound = matching.filter((receipt) => isDefinitionBound(claim, receipt));

  let status: ClaimSatisfactionStatus;
  if (compatible.some((receipt) => receipt.result === "FAIL")) status = "FAILED";
  else if (compatible.some((receipt) => receipt.result === "PASS")) status = "PROVEN";
  else if (definitionBound.some((receipt) => receipt.result === "SKIPPED_ENVIRONMENT")) status = "SKIPPED";
  else if (definitionBound.some((receipt) => receipt.result === "UNKNOWN" || receipt.result === "NOT_RUN")) status = "UNKNOWN";
  else status = "NOT_PROVEN";

  const incompatibilities = compatibility
    .filter((item) => item.reasons.length > 0)
    .map((item) => ({ evidenceId: item.receipt.evidenceId, reasons: item.reasons }));
  const independenceAssessments = matching.map((receipt) => deriveStructuralIndependence(receipt));
  const qualificationLimitations = incompatibilities.flatMap((item) =>
    item.reasons.map((reason) => `${item.evidenceId}: ${reason}`),
  );

  return {
    scope: claim.scope,
    buildId: claim.buildId,
    specId: claim.specId,
    criterionId: claim.criterionId,
    criterionVersion: claim.criterionVersion,
    criterionDefinitionHash: claim.criterionDefinitionHash,
    minimumEvidenceLevel: claim.minimumEvidenceLevel,
    highestPassingEvidenceLevel: highestPassing,
    status,
    evidenceIds: matching.map((receipt) => receipt.evidenceId),
    compatibleEvidenceIds: compatible.map((receipt) => receipt.evidenceId),
    incompatibilities,
    independenceAssessments,
    limitations: unique([...matching.flatMap((receipt) => receipt.limitations), ...qualificationLimitations]),
    skippedReasons: unique(definitionBound.flatMap((receipt) => receipt.skippedReason ? [receipt.skippedReason] : [])),
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

function incompatibilityReasons(claim: AssuranceClaim, receipt: DevelopmentEvidenceReceipt): string[] {
  const reasons: string[] = [];
  if (receipt.criterionVersion !== claim.criterionVersion) reasons.push("CRITERION_VERSION_MISMATCH");
  if (receipt.criterionDefinitionHash !== claim.criterionDefinitionHash) reasons.push("CRITERION_DEFINITION_HASH_MISMATCH");
  if (receipt.subjectId !== claim.subjectId) reasons.push("SUBJECT_ID_MISMATCH");
  if (receipt.controlId !== claim.controlId) reasons.push("CONTROL_ID_MISMATCH");
  if (receipt.boundaryId !== claim.requiredBoundaryId) reasons.push("BOUNDARY_ID_MISMATCH");
  if (!claim.acceptedEnvironmentClasses.includes(receipt.environmentClass as Exclude<EvidenceEnvironmentClass, "NOT_EXECUTED">)) {
    reasons.push("ENVIRONMENT_CLASS_MISMATCH");
  }
  if (!evidenceLevelSatisfies(receipt.actualEvidenceLevel, claim.minimumEvidenceLevel)) {
    reasons.push("EVIDENCE_LEVEL_BELOW_MINIMUM");
  }
  const independenceAssessment = deriveStructuralIndependence(receipt);
  if (!independenceSatisfies(independenceAssessment.status, claim.independenceRequirement)) {
    reasons.push("INDEPENDENCE_REQUIREMENT_NOT_MET");
    reasons.push(...independenceAssessment.reasons);
    if (receipt.declaredIndependence === "INDEPENDENT_VERIFIER") {
      reasons.push("DECLARED_INDEPENDENCE_CONFLICTS_WITH_DERIVED_RELATIONSHIP");
    }
  }
  return reasons;
}

function isDefinitionBound(claim: AssuranceClaim, receipt: DevelopmentEvidenceReceipt): boolean {
  return receipt.criterionVersion === claim.criterionVersion
    && receipt.criterionDefinitionHash === claim.criterionDefinitionHash
    && receipt.subjectId === claim.subjectId
    && receipt.controlId === claim.controlId;
}

function independenceSatisfies(actual: DerivedIndependenceStatus, required: IndependenceRequirement): boolean {
  if (required === "RECORDED_ONLY") return true;
  if (required === "INDEPENDENT_VERIFIER") return actual === "STRUCTURALLY_INDEPENDENT";
  return actual === "AUTOMATED_GATE" || actual === "STRUCTURALLY_INDEPENDENT";
}

export function deriveStructuralIndependence(receipt: DevelopmentEvidenceReceipt): StructuralIndependenceAssessment {
  const executor = receipt.participantBindings.executor;
  const verifier = receipt.participantBindings.verifier;
  const reasons: string[] = [];

  if (!executor) reasons.push("EXECUTOR_BINDING_MISSING");
  if (!verifier) reasons.push("VERIFIER_BINDING_MISSING");
  if (!executor || !verifier) {
    return { evidenceId: receipt.evidenceId, status: "NOT_STRUCTURALLY_INDEPENDENT", reasons };
  }

  if (!executor.actorId) reasons.push("EXECUTOR_IDENTITY_MISSING");
  if (!verifier.actorId) reasons.push("VERIFIER_IDENTITY_MISSING");
  if (!executor.contextId) reasons.push("EXECUTOR_CONTEXT_MISSING");
  if (!verifier.contextId) reasons.push("VERIFIER_CONTEXT_MISSING");
  if (executor.role !== "EXECUTION") reasons.push("EXECUTOR_ROLE_NOT_EXECUTION");
  if (executor.actorId && executor.actorId === verifier.actorId) reasons.push("EXECUTOR_VERIFIER_ACTOR_NOT_DISTINCT");
  if (executor.contextId && executor.contextId === verifier.contextId) reasons.push("EXECUTOR_VERIFIER_CONTEXT_NOT_DISTINCT");

  if (verifier.role === "AUTOMATED_GATE" && executor.role === "EXECUTION" && reasons.length === 0) {
    return { evidenceId: receipt.evidenceId, status: "AUTOMATED_GATE", reasons };
  }
  if (verifier.role !== "VERIFICATION") reasons.push("VERIFIER_ROLE_NOT_VERIFICATION");
  if (reasons.length > 0) {
    return { evidenceId: receipt.evidenceId, status: "NOT_STRUCTURALLY_INDEPENDENT", reasons: unique(reasons) };
  }
  return { evidenceId: receipt.evidenceId, status: "STRUCTURALLY_INDEPENDENT", reasons: [] };
}

function criterionDefinition(input: {
  criterionId: string;
  criterionVersion: number;
  subjectId: AssuranceSubjectId;
  controlId: AssuranceControlId;
  requiredBoundaryId: Exclude<AssuranceBoundaryId, "NOT_EXECUTED">;
  acceptedEnvironmentClasses: Exclude<EvidenceEnvironmentClass, "NOT_EXECUTED">[];
  minimumEvidenceLevel: EvidenceLevel;
  independenceRequirement: IndependenceRequirement;
}): CriterionDefinitionInput {
  return {
    criterionId: input.criterionId,
    criterionVersion: input.criterionVersion,
    subjectId: input.subjectId,
    controlId: input.controlId,
    requiredBoundaryId: input.requiredBoundaryId,
    acceptedEnvironmentClasses: input.acceptedEnvironmentClasses,
    minimumEvidenceLevel: input.minimumEvidenceLevel,
    independenceRequirement: input.independenceRequirement,
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
