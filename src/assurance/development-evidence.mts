import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

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

export const ProvenanceClassSchema = z.enum([
  "DECLARED_ONLY",
  "RUNNER_RECORDED",
  "CI_ATTESTED",
  "REMOTE_ENVIRONMENT_ATTESTED",
]);
export type ProvenanceClass = z.infer<typeof ProvenanceClassSchema>;

export const ReceiptIssuerKindSchema = z.enum([
  "AUTHORITATIVE_RUNNER",
  "AUTHORITATIVE_CI",
  "MANUAL_INPUT",
  "TEST_FIXTURE",
  "IMPORTED",
  "UNKNOWN",
]);
export type ReceiptIssuerKind = z.infer<typeof ReceiptIssuerKindSchema>;

export const ArtifactRequirementSchema = z.enum(["NONE", "AT_LEAST_ONE"]);
export type ArtifactRequirement = z.infer<typeof ArtifactRequirementSchema>;

const GitShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const NonEmptyText = z.string().trim().min(1);
const StableAssuranceIdentifierSchema = z.string().trim().regex(/^[a-z0-9][a-z0-9._:@/-]{2,127}$/i);
const RepositoryRelativePathSchema = z.string().trim().min(1).refine((value) => {
  const normalized = value.replaceAll("\\", "/");
  return !isAbsolute(value)
    && !normalized.startsWith("/")
    && !normalized.split("/").includes("..");
}, "Artifact paths must be safe repository-relative paths.");

export const AssuranceParticipantBindingSchema = z.object({
  actorId: StableAssuranceIdentifierSchema.nullable(),
  contextId: StableAssuranceIdentifierSchema.nullable(),
  role: AssuranceParticipantRoleSchema.nullable(),
}).strict();
export type AssuranceParticipantBinding = z.infer<typeof AssuranceParticipantBindingSchema>;

export const ArtifactIntegrityBindingSchema = z.object({
  path: RepositoryRelativePathSchema,
  algorithm: z.literal("SHA256"),
  integrityMode: z.literal("EXACT_BYTES"),
  digest: Sha256Schema,
  sizeBytes: z.number().int().nonnegative(),
}).strict();
export type ArtifactIntegrityBinding = z.infer<typeof ArtifactIntegrityBindingSchema>;

export const RunnerObservationSchema = z.object({
  issuerId: StableAssuranceIdentifierSchema,
  sourceSha: GitShaSchema,
  dirty: z.boolean(),
  executionId: z.uuid(),
  commandId: NonEmptyText,
  executable: NonEmptyText,
  args: z.array(z.string()),
  commandDigest: Sha256Schema,
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }),
  exitCode: z.number().int(),
  stdoutDigest: Sha256Schema,
  stderrDigest: Sha256Schema,
}).strict();
export type RunnerObservation = z.infer<typeof RunnerObservationSchema>;

export const ReceiptIntegritySchema = z.object({
  algorithm: z.literal("SHA256"),
  canonicalization: z.literal("VIRRO_CANONICAL_JSON_V1"),
  digest: Sha256Schema,
}).strict();
export type ReceiptIntegrity = z.infer<typeof ReceiptIntegritySchema>;

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
  acceptedProvenanceClasses: z.array(ProvenanceClassSchema).min(1),
  acceptedRunnerCommandIds: z.array(NonEmptyText),
  artifactRequirement: ArtifactRequirementSchema,
}).strict().superRefine((definition, context) => {
  if (new Set(definition.acceptedEnvironmentClasses).size !== definition.acceptedEnvironmentClasses.length) {
    context.addIssue({ code: "custom", path: ["acceptedEnvironmentClasses"], message: "Environment classes must be unique." });
  }
  if (new Set(definition.acceptedProvenanceClasses).size !== definition.acceptedProvenanceClasses.length) {
    context.addIssue({ code: "custom", path: ["acceptedProvenanceClasses"], message: "Provenance classes must be unique." });
  }
  if (new Set(definition.acceptedRunnerCommandIds).size !== definition.acceptedRunnerCommandIds.length) {
    context.addIssue({ code: "custom", path: ["acceptedRunnerCommandIds"], message: "Runner command IDs must be unique." });
  }
  if (definition.acceptedProvenanceClasses.includes("RUNNER_RECORDED") && definition.acceptedRunnerCommandIds.length === 0) {
    context.addIssue({ code: "custom", path: ["acceptedRunnerCommandIds"], message: "RUNNER_RECORDED criteria require an explicit runner command ID." });
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
    acceptedProvenanceClasses: [...definition.acceptedProvenanceClasses].sort(),
    acceptedRunnerCommandIds: [...definition.acceptedRunnerCommandIds].sort(),
    artifactRequirement: definition.artifactRequirement,
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
  provenanceClass: ProvenanceClassSchema,
  issuerKind: ReceiptIssuerKindSchema,
  runnerObservation: RunnerObservationSchema.nullable(),
  commandTestIdentifier: NonEmptyText,
  result: EvidenceResultSchema,
  limitations: z.array(NonEmptyText),
  skippedReason: NonEmptyText.nullable(),
  artifactRefs: z.array(NonEmptyText),
  artifactBindings: z.array(ArtifactIntegrityBindingSchema),
  receiptIntegrity: ReceiptIntegritySchema.nullable(),
  baselineSha: GitShaSchema,
  resultSha: GitShaSchema,
  timestamp: z.string().datetime({ offset: true }),
}).strict().superRefine((receipt, context) => {
  if (receipt.provenanceClass === "RUNNER_RECORDED") {
    if (receipt.issuerKind !== "AUTHORITATIVE_RUNNER") {
      context.addIssue({ code: "custom", path: ["issuerKind"], message: "RUNNER_RECORDED requires AUTHORITATIVE_RUNNER." });
    }
    if (!receipt.runnerObservation) {
      context.addIssue({ code: "custom", path: ["runnerObservation"], message: "RUNNER_RECORDED requires a runner observation." });
    }
    if (!receipt.receiptIntegrity) {
      context.addIssue({ code: "custom", path: ["receiptIntegrity"], message: "RUNNER_RECORDED requires receipt integrity." });
    }
    if (receipt.runnerObservation?.sourceSha !== receipt.resultSha) {
      context.addIssue({ code: "custom", path: ["resultSha"], message: "resultSha must match the runner-observed source SHA." });
    }
    if (receipt.runnerObservation?.dirty) {
      context.addIssue({ code: "custom", path: ["runnerObservation", "dirty"], message: "Runner-recorded evidence cannot represent a dirty source tree." });
    }
    if (receipt.runnerObservation && receipt.commandTestIdentifier !== receipt.runnerObservation.commandId) {
      context.addIssue({ code: "custom", path: ["commandTestIdentifier"], message: "Command identifier must match the runner observation." });
    }
    if (receipt.runnerObservation && receipt.provenance.source !== receipt.runnerObservation.commandId) {
      context.addIssue({ code: "custom", path: ["provenance", "source"], message: "Provenance source must match the observed command." });
    }
    if (receipt.runnerObservation && receipt.provenance.immutableRef !== receipt.runnerObservation.sourceSha) {
      context.addIssue({ code: "custom", path: ["provenance", "immutableRef"], message: "Immutable provenance ref must match the observed source SHA." });
    }
    if (receipt.runnerObservation && ((receipt.runnerObservation.exitCode === 0) !== (receipt.result === "PASS"))) {
      context.addIssue({ code: "custom", path: ["result"], message: "Runner result must be derived from the observed exit code." });
    }
    if (receipt.result !== "PASS" && receipt.result !== "FAIL") {
      context.addIssue({ code: "custom", path: ["result"], message: "RUNNER_RECORDED evidence must contain an observed PASS or FAIL." });
    }
    const boundPaths = receipt.artifactBindings.map((binding) => binding.path);
    if (JSON.stringify(boundPaths) !== JSON.stringify(receipt.artifactRefs)) {
      context.addIssue({ code: "custom", path: ["artifactBindings"], message: "Runner artifact bindings must exactly match artifactRefs." });
    }
    if (new Set(boundPaths).size !== boundPaths.length) {
      context.addIssue({ code: "custom", path: ["artifactBindings"], message: "Runner artifact paths must be unique." });
    }
  }
  if (receipt.provenanceClass === "DECLARED_ONLY" && (receipt.runnerObservation || receipt.receiptIntegrity)) {
    context.addIssue({ code: "custom", path: ["provenanceClass"], message: "DECLARED_ONLY cannot carry runner authority or receipt integrity." });
  }
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
  acceptedProvenanceClasses: z.array(ProvenanceClassSchema).min(1),
  acceptedRunnerCommandIds: z.array(NonEmptyText),
  artifactRequirement: ArtifactRequirementSchema,
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
  schemaVersion: z.literal("virro-development-assurance-v3"),
  generatedAt: z.string().datetime({ offset: true }),
  buildId: NonEmptyText,
  baselineSha: GitShaSchema,
  evidenceHistoryThroughSha: GitShaSchema,
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

export type ProvenanceAssessment = {
  evidenceId: string;
  claimedClass: ProvenanceClass;
  status: "VALID" | "INVALID";
  reasons: string[];
};

type ProvenanceAuthorityRecord = {
  receiptDigest: string;
  sourceSha: string;
  artifactBindings: ArtifactIntegrityBinding[];
};

const authorizedProvenanceAuthorities = new WeakSet<object>();
const provenanceAuthorityRecordToken = Symbol("virro-runner-record");

type InternalProvenanceAuthority = {
  verify(receipt: DevelopmentEvidenceReceipt): ProvenanceAssessment;
};

export type ProvenanceEvaluationContext = {
  authority?: object;
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
  provenanceAssessments: ProvenanceAssessment[];
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
  context: ProvenanceEvaluationContext = {},
): ClaimEvaluation {
  const claim = AssuranceClaimSchema.parse(untrustedClaim);
  const evidence = z.array(DevelopmentEvidenceReceiptSchema).parse(untrustedEvidence);
  const matching = evidence.filter((receipt) =>
    receipt.buildId === claim.buildId
    && receipt.specId === claim.specId
    && receipt.criterionId === claim.criterionId,
  );
  const qualification = matching.map((receipt) => {
    const provenanceAssessment = assessProvenance(receipt, context);
    return { receipt, provenanceAssessment, reasons: incompatibilityReasons(claim, receipt, provenanceAssessment) };
  });
  const compatibility = qualification;
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
  const provenanceAssessments = qualification.map((item) => item.provenanceAssessment);
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
    provenanceAssessments,
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
    evidenceHistoryThroughSha: source.evidenceHistoryThroughSha,
    summary: summarizeEvaluations(evaluations),
    claims: source.claims,
    evidence: source.evidence,
    evaluations,
  };
}

function incompatibilityReasons(
  claim: AssuranceClaim,
  receipt: DevelopmentEvidenceReceipt,
  provenanceAssessment: ProvenanceAssessment,
): string[] {
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
  if (!claim.acceptedProvenanceClasses.includes(receipt.provenanceClass)) {
    reasons.push("PROVENANCE_CLASS_NOT_ACCEPTED");
  }
  if (receipt.provenanceClass === "RUNNER_RECORDED"
    && !claim.acceptedRunnerCommandIds.includes(receipt.runnerObservation?.commandId ?? "")) {
    reasons.push("RUNNER_COMMAND_NOT_ACCEPTED");
  }
  if (claim.artifactRequirement === "AT_LEAST_ONE" && receipt.artifactBindings.length === 0) {
    reasons.push("REQUIRED_ARTIFACT_BINDING_MISSING");
  }
  if (provenanceAssessment.status === "INVALID") reasons.push(...provenanceAssessment.reasons);
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

function assessProvenance(
  receipt: DevelopmentEvidenceReceipt,
  context: ProvenanceEvaluationContext,
): ProvenanceAssessment {
  if (receipt.provenanceClass === "DECLARED_ONLY") {
    return { evidenceId: receipt.evidenceId, claimedClass: receipt.provenanceClass, status: "VALID", reasons: [] };
  }
  if (receipt.provenanceClass !== "RUNNER_RECORDED") {
    return {
      evidenceId: receipt.evidenceId,
      claimedClass: receipt.provenanceClass,
      status: "INVALID",
      reasons: ["ATTESTED_PROVENANCE_AUTHORITY_UNAVAILABLE"],
    };
  }
  const authority = context.authority;
  if (!authority || !authorizedProvenanceAuthorities.has(authority)) {
    return {
      evidenceId: receipt.evidenceId,
      claimedClass: receipt.provenanceClass,
      status: "INVALID",
      reasons: ["AUTHORITATIVE_ISSUANCE_RECORD_MISSING"],
    };
  }
  return (authority as InternalProvenanceAuthority).verify(receipt);
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

export type LocalEvidenceCommand = {
  id: string;
  executable: string;
  args?: string[];
};

export type LocalEvidenceRunInput = {
  claim: AssuranceClaim;
  evidenceId?: string;
  actualEvidenceLevel: EvidenceLevel;
  boundaryId: AssuranceBoundaryId;
  environmentClass: EvidenceEnvironmentClass;
  boundaryTested: string;
  environment: string;
  commandId: string;
  artifactPaths: string[];
  limitations?: string[];
  baselineSha?: string;
};

export type LocalEvidenceRunner = {
  run(input: LocalEvidenceRunInput): Promise<DevelopmentEvidenceReceipt>;
  evaluationContext(): ProvenanceEvaluationContext;
};

type GitSourceState = { sha: string; dirty: boolean };
type ObservedCommandResult = {
  exitCode: number;
  stdoutDigest: string;
  stderrDigest: string;
};

class LocalRunnerAuthority implements InternalProvenanceAuthority {
  readonly #records = new Map<string, ProvenanceAuthorityRecord>();
  readonly repositoryRoot: string;

  constructor(repositoryRoot: string) {
    this.repositoryRoot = repositoryRoot;
    authorizedProvenanceAuthorities.add(this);
  }

  record(token: symbol, receipt: DevelopmentEvidenceReceipt): void {
    if (token !== provenanceAuthorityRecordToken) throw new Error("UNAUTHORIZED_ISSUANCE_RECORD");
    this.#records.set(receipt.evidenceId, {
      receiptDigest: receipt.receiptIntegrity!.digest,
      sourceSha: receipt.runnerObservation!.sourceSha,
      artifactBindings: receipt.artifactBindings,
    });
  }

  verify(receipt: DevelopmentEvidenceReceipt): ProvenanceAssessment {
    const reasons: string[] = [];
    const record = this.#records.get(receipt.evidenceId);
    if (!record) reasons.push("AUTHORITATIVE_ISSUANCE_RECORD_MISSING");

    const computedDigest = createReceiptIntegrityDigest(receipt);
    if (!receipt.receiptIntegrity || receipt.receiptIntegrity.digest !== computedDigest) {
      reasons.push("RECEIPT_INTEGRITY_MISMATCH");
    }
    if (record && record.receiptDigest !== computedDigest) reasons.push("ISSUED_RECEIPT_MUTATED");
    if (receipt.runnerObservation) {
      const commandDigest = sha256(canonicalizeJson({
        id: receipt.runnerObservation.commandId,
        executable: receipt.runnerObservation.executable,
        args: receipt.runnerObservation.args,
      }));
      if (commandDigest !== receipt.runnerObservation.commandDigest) reasons.push("COMMAND_OBSERVATION_INTEGRITY_MISMATCH");
    }

    let sourceState: GitSourceState | null = null;
    try {
      sourceState = observeGitSource(this.repositoryRoot);
    } catch {
      reasons.push("SOURCE_STATE_UNAVAILABLE");
    }
    if (sourceState?.dirty) reasons.push("SOURCE_WORKTREE_DIRTY");
    if (sourceState && record && sourceState.sha !== record.sourceSha) reasons.push("STALE_SOURCE_REVISION");
    if (sourceState && receipt.runnerObservation?.sourceSha !== sourceState.sha) reasons.push("SOURCE_SHA_MISMATCH");

    if (record && canonicalizeJson(record.artifactBindings) !== canonicalizeJson(receipt.artifactBindings)) {
      reasons.push("ISSUED_ARTIFACT_BINDINGS_MUTATED");
    }
    for (const binding of receipt.artifactBindings) {
      try {
        const current = bindArtifact(this.repositoryRoot, binding.path);
        if (current.digest !== binding.digest || current.sizeBytes !== binding.sizeBytes) {
          reasons.push(`ARTIFACT_INTEGRITY_MISMATCH:${binding.path}`);
        }
      } catch {
        reasons.push(`ARTIFACT_MISSING_OR_UNSAFE:${binding.path}`);
      }
    }

    return {
      evidenceId: receipt.evidenceId,
      claimedClass: receipt.provenanceClass,
      status: reasons.length === 0 ? "VALID" : "INVALID",
      reasons: unique(reasons),
    };
  }
}

class RepositoryLocalEvidenceRunner implements LocalEvidenceRunner {
  readonly #repositoryRoot: string;
  readonly #issuerId: string;
  readonly #authority: LocalRunnerAuthority;
  readonly #commands: ReadonlyMap<string, { executable: string; args: string[] }>;

  constructor(repositoryRoot: string, issuerId: string, commandRegistry: Record<string, Omit<LocalEvidenceCommand, "id">>) {
    this.#repositoryRoot = realpathSync(repositoryRoot);
    this.#issuerId = StableAssuranceIdentifierSchema.parse(issuerId);
    this.#authority = new LocalRunnerAuthority(this.#repositoryRoot);
    this.#commands = new Map(Object.entries(commandRegistry).map(([id, command]) => [
      NonEmptyText.parse(id),
      { executable: NonEmptyText.parse(command.executable), args: command.args ?? [] },
    ]));
  }

  evaluationContext(): ProvenanceEvaluationContext {
    return { authority: this.#authority };
  }

  async run(input: LocalEvidenceRunInput): Promise<DevelopmentEvidenceReceipt> {
    const claim = AssuranceClaimSchema.parse(input.claim);
    const before = observeGitSource(this.#repositoryRoot);
    if (before.dirty) throw new Error("DIRTY_WORKTREE: runner-recorded evidence requires a clean source tree.");
    const baselineSha = input.baselineSha ? GitShaSchema.parse(input.baselineSha) : before.sha;
    if (!isGitAncestor(this.#repositoryRoot, baselineSha, before.sha)) {
      throw new Error("BASELINE_NOT_ANCESTOR: baselineSha must identify an ancestor of the executed source revision.");
    }

    const commandId = NonEmptyText.parse(input.commandId);
    const commandSpec = this.#commands.get(commandId);
    if (!commandSpec) throw new Error(`UNAUTHORIZED_RUNNER_COMMAND:${commandId}`);
    const command = { id: commandId, ...commandSpec };
    const startedAt = new Date().toISOString();
    const observed = await executeObservedCommand(command, this.#repositoryRoot);
    const completedAt = new Date().toISOString();
    const after = observeGitSource(this.#repositoryRoot);
    if (after.dirty) throw new Error("DIRTY_WORKTREE: the evidence command modified repository source.");
    if (after.sha !== before.sha) throw new Error("SOURCE_REVISION_CHANGED: HEAD changed during evidence execution.");

    const artifactBindings = [...new Set(input.artifactPaths.map(normalizeArtifactPath))]
      .sort()
      .map((artifactPath) => bindArtifact(this.#repositoryRoot, artifactPath));
    const executionId = randomUUID();
    const actorNamespace = createHash("sha256").update(this.#issuerId).digest("hex").slice(0, 24);
    const rawReceipt = {
      evidenceId: input.evidenceId ?? randomUUID(),
      buildId: claim.buildId,
      specId: claim.specId,
      criterionId: claim.criterionId,
      criterionVersion: claim.criterionVersion,
      criterionDefinitionHash: claim.criterionDefinitionHash,
      subjectId: claim.subjectId,
      controlId: claim.controlId,
      boundaryId: input.boundaryId,
      environmentClass: input.environmentClass,
      subject: claim.subject,
      control: claim.control,
      actualEvidenceLevel: input.actualEvidenceLevel,
      boundaryTested: input.boundaryTested,
      environment: input.environment,
      executor: "Repository local evidence runner",
      verifier: { name: "Repository assurance gate", role: "automated gate" },
      declaredIndependence: "AUTOMATED_GATE" as const,
      participantBindings: {
        executor: { actorId: `actor:runner:${actorNamespace}:executor`, contextId: `context:${executionId}:execution`, role: "EXECUTION" as const },
        verifier: { actorId: `actor:runner:${actorNamespace}:gate`, contextId: `context:${executionId}:gate`, role: "AUTOMATED_GATE" as const },
      },
      provenance: { kind: "REPOSITORY_TEST" as const, source: command.id, immutableRef: before.sha },
      provenanceClass: "RUNNER_RECORDED" as const,
      issuerKind: "AUTHORITATIVE_RUNNER" as const,
      runnerObservation: {
        issuerId: this.#issuerId,
        sourceSha: before.sha,
        dirty: false,
        executionId,
        commandId: command.id,
        executable: command.executable,
        args: command.args,
        commandDigest: sha256(canonicalizeJson(command)),
        startedAt,
        completedAt,
        exitCode: observed.exitCode,
        stdoutDigest: observed.stdoutDigest,
        stderrDigest: observed.stderrDigest,
      },
      commandTestIdentifier: command.id,
      result: observed.exitCode === 0 ? "PASS" as const : "FAIL" as const,
      limitations: input.limitations ?? ["Local runner recording is not externally attested."],
      skippedReason: null,
      artifactRefs: artifactBindings.map((binding) => binding.path),
      artifactBindings,
      receiptIntegrity: null,
      baselineSha,
      resultSha: before.sha,
      timestamp: completedAt,
    };
    const receipt = DevelopmentEvidenceReceiptSchema.parse({
      ...rawReceipt,
      receiptIntegrity: {
        algorithm: "SHA256",
        canonicalization: "VIRRO_CANONICAL_JSON_V1",
        digest: createReceiptIntegrityDigest(rawReceipt),
      },
    });
    this.#authority.record(provenanceAuthorityRecordToken, receipt);
    return receipt;
  }
}

export function createLocalEvidenceRunner(options: {
  repositoryRoot: string;
  issuerId: string;
  commandRegistry: Record<string, Omit<LocalEvidenceCommand, "id">>;
}): LocalEvidenceRunner {
  return new RepositoryLocalEvidenceRunner(options.repositoryRoot, options.issuerId, options.commandRegistry);
}

export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical JSON does not support non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`);
    return `{${entries.join(",")}}`;
  }
  throw new Error(`Canonical JSON does not support ${typeof value}.`);
}

export function canonicalizeJsonText(text: string): string {
  return canonicalizeJson(JSON.parse(text));
}

export function createReceiptIntegrityDigest(receipt: unknown): string {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) throw new Error("Receipt must be an object.");
  const payload = { ...(receipt as Record<string, unknown>) };
  delete payload.receiptIntegrity;
  return sha256(canonicalizeJson(payload));
}

export function hashExactArtifactBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function bindArtifact(repositoryRoot: string, artifactPath: string): ArtifactIntegrityBinding {
  const normalizedPath = normalizeArtifactPath(artifactPath);
  const resolvedPath = resolve(repositoryRoot, ...normalizedPath.split("/"));
  const realRoot = realpathSync(repositoryRoot);
  const realArtifact = realpathSync(resolvedPath);
  const relativePath = relative(realRoot, realArtifact);
  if (!relativePath || relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`Artifact escapes repository root: ${artifactPath}`);
  }
  const stat = statSync(realArtifact);
  if (!stat.isFile()) throw new Error(`Artifact is not a regular file: ${artifactPath}`);
  const bytes = readFileSync(realArtifact);
  return ArtifactIntegrityBindingSchema.parse({
    path: normalizedPath,
    algorithm: "SHA256",
    integrityMode: "EXACT_BYTES",
    digest: hashExactArtifactBytes(bytes),
    sizeBytes: bytes.byteLength,
  });
}

function normalizeArtifactPath(artifactPath: string): string {
  const normalized = artifactPath.replaceAll("\\", "/");
  return RepositoryRelativePathSchema.parse(normalized);
}

function observeGitSource(repositoryRoot: string): GitSourceState {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8", windowsHide: true }).trim();
  const status = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  return { sha: GitShaSchema.parse(sha), dirty: status.trim().length > 0 };
}

function isGitAncestor(repositoryRoot: string, baselineSha: string, resultSha: string): boolean {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", baselineSha, resultSha], {
      cwd: repositoryRoot,
      stdio: "ignore",
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

function executeObservedCommand(
  command: { executable: string; args: string[] },
  repositoryRoot: string,
): Promise<ObservedCommandResult> {
  return new Promise((resolveCommand, rejectCommand) => {
    const stdout = createHash("sha256");
    const stderr = createHash("sha256");
    const child = spawn(command.executable, command.args, {
      cwd: repositoryRoot,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk: Buffer) => stdout.update(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.update(chunk));
    child.once("error", rejectCommand);
    child.once("close", (code) => resolveCommand({
      exitCode: code ?? -1,
      stdoutDigest: stdout.digest("hex"),
      stderrDigest: stderr.digest("hex"),
    }));
  });
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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
  acceptedProvenanceClasses: ProvenanceClass[];
  acceptedRunnerCommandIds: string[];
  artifactRequirement: ArtifactRequirement;
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
    acceptedProvenanceClasses: input.acceptedProvenanceClasses,
    acceptedRunnerCommandIds: input.acceptedRunnerCommandIds,
    artifactRequirement: input.artifactRequirement,
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
