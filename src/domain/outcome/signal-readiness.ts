import { z } from "zod";

import { canonicalSha256, immutableCopy, SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";

export const BUILD002_SIGNAL_READINESS_SCHEMA_VERSION = "build002-signal-readiness-v0.1" as const;
export const BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION = "build002-signal-requirement-v0.1" as const;
export const BUILD002_SIGNAL_SCHEMA_VERSION = "build002-signal-v0.1" as const;
export const BUILD002_QUALIFICATION_SCHEMA_VERSION = "build002-signal-qualification-v0.1" as const;
export const BUILD002_DEPENDENCY_SCHEMA_VERSION = "build002-dependency-snapshot-v0.1" as const;
export const BUILD002_EVALUATOR_SCHEMA_VERSION = "build002-qualification-evaluator-v0.1" as const;

const HashSchema = z.string().regex(SHA256_PATTERN);
const UuidSchema = z.uuid();

export const ReadinessSubjectKindSchema = z.literal("OUTCOME_TRANSACTION");
export type ReadinessSubjectKind = z.infer<typeof ReadinessSubjectKindSchema>;

export const ReadinessSubjectSchema = z.object({
  kind: ReadinessSubjectKindSchema,
  ownerTenantId: UuidSchema,
  transactionId: UuidSchema,
}).strict();
export type ReadinessSubject = z.infer<typeof ReadinessSubjectSchema>;

export const SignalProvenanceSchema = z.enum([
  "CUSTOMER_STATED",
  "OBSERVED",
  "SYSTEM_DERIVED",
  "INFERRED",
  "APPROVED",
  "UNKNOWN",
]);
export type SignalProvenance = z.infer<typeof SignalProvenanceSchema>;

export const QualificationOutcomeSchema = z.enum([
  "QUALIFIED",
  "MISSING",
  "UNKNOWN",
  "INCOMPATIBLE_PROVENANCE",
  "CONTRADICTORY",
  "STALE_SOURCE",
  "INVALID",
  "REQUIRES_HUMAN_REVIEW",
]);
export type QualificationOutcome = z.infer<typeof QualificationOutcomeSchema>;

export const ReadinessAssessmentStateSchema = z.enum([
  "NEEDS_CONTEXT",
  "INSUFFICIENT_SIGNAL",
  "READY_WITH_CONDITIONS",
  "READY",
  "HUMAN_REVIEW_REQUIRED",
  "BLOCKED_BY_POLICY",
]);
export type ReadinessAssessmentState = z.infer<typeof ReadinessAssessmentStateSchema>;

export const ReadinessValidityStateSchema = z.enum(["CURRENT", "STALE", "EXPIRED"]);
export type ReadinessValidityState = z.infer<typeof ReadinessValidityStateSchema>;

const DefinitionInputSchema = z.object({
  requirementId: z.string().trim().min(1).max(120).regex(/^[a-z][A-Za-z0-9_.-]*$/),
  subjectKind: ReadinessSubjectKindSchema,
  semanticType: z.string().trim().min(1).max(160),
  critical: z.boolean(),
  acceptedProvenance: z.array(SignalProvenanceSchema).min(1),
  qualificationRule: z.object({
    version: z.string().trim().min(1).max(80),
    cardinality: z.enum(["SINGLE_VALUED", "MULTI_VALUED"]),
    humanReviewRequired: z.boolean(),
  }).strict(),
  dependencySelectors: z.array(z.object({
    identity: z.string().trim().min(1).max(160),
    required: z.boolean(),
  }).strict()),
  blueprintId: UuidSchema,
  blueprintVersion: z.number().int().positive(),
  blueprintHash: HashSchema,
  policyId: z.string().trim().min(1).max(160).nullable(),
  policyHash: HashSchema.nullable(),
  definitionSchemaVersion: z.literal(BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION),
}).strict();

export const SignalRequirementSchema = DefinitionInputSchema.extend({
  requirementDefinitionHash: HashSchema,
  createdAt: z.string().datetime(),
}).strict();
export type SignalRequirement = z.infer<typeof SignalRequirementSchema>;
export type SignalRequirementDefinitionInput = z.infer<typeof DefinitionInputSchema>;

function normalizeRequirementDefinition(input: SignalRequirementDefinitionInput): SignalRequirementDefinitionInput {
  return {
    ...input,
    acceptedProvenance: [...new Set(input.acceptedProvenance)].sort(),
    dependencySelectors: [...input.dependencySelectors]
      .sort((left, right) => left.identity.localeCompare(right.identity) || Number(left.required) - Number(right.required)),
  };
}

export function compileSignalRequirement(input: SignalRequirementDefinitionInput, createdAt = new Date().toISOString()): SignalRequirement {
  const parsed = normalizeRequirementDefinition(DefinitionInputSchema.parse(input));
  const requirementDefinitionHash = canonicalSha256({
    schemaVersion: parsed.definitionSchemaVersion,
    ...parsed,
  });
  return immutableCopy(SignalRequirementSchema.parse({ ...parsed, requirementDefinitionHash, createdAt }));
}

export function verifySignalRequirementHash(requirement: SignalRequirement): boolean {
  const parsed = SignalRequirementSchema.parse(requirement);
  const { requirementDefinitionHash: _hash, createdAt: _createdAt, ...definition } = parsed;
  void _hash;
  void _createdAt;
  return canonicalSha256({ schemaVersion: parsed.definitionSchemaVersion, ...normalizeRequirementDefinition(definition) }) === parsed.requirementDefinitionHash;
}

const SignalInputSchema = z.object({
  signalId: UuidSchema.optional(),
  ownerTenantId: UuidSchema,
  transactionId: UuidSchema,
  requirementId: z.string().trim().min(1).max(120),
  payload: z.unknown(),
  source: z.object({
    identity: z.string().trim().min(1).max(240),
    version: z.string().trim().min(1).max(160).nullable(),
    hash: HashSchema.nullable(),
  }).strict(),
  provenance: SignalProvenanceSchema,
  capturedAt: z.string().datetime(),
  validUntil: z.string().datetime().nullable(),
  dependency: z.object({
    identity: z.string().trim().min(1).max(240),
    hash: HashSchema,
  }).strict(),
  schemaVersion: z.literal(BUILD002_SIGNAL_SCHEMA_VERSION),
}).strict();

export const SignalSchema = SignalInputSchema.extend({
  signalId: UuidSchema,
  contentHash: HashSchema,
}).strict();
export type Signal = z.infer<typeof SignalSchema>;
export type SignalInput = z.infer<typeof SignalInputSchema>;

export function createSignal(input: SignalInput): Signal {
  const parsed = SignalInputSchema.parse(input);
  const signalId = parsed.signalId ?? crypto.randomUUID();
  const { signalId: _signalId, capturedAt: _capturedAt, ...semantic } = parsed;
  void _signalId;
  void _capturedAt;
  const contentHash = canonicalSha256(semantic);
  return immutableCopy(SignalSchema.parse({ ...parsed, signalId, contentHash }));
}

export function verifySignalContentHash(signal: Signal): boolean {
  const parsed = SignalSchema.parse(signal);
  const { signalId: _signalId, capturedAt: _capturedAt, contentHash: _hash, ...semantic } = parsed;
  void _signalId;
  void _capturedAt;
  void _hash;
  return canonicalSha256(semantic) === parsed.contentHash;
}

const DependencyInputSchema = z.object({
  schemaVersion: z.literal(BUILD002_DEPENDENCY_SCHEMA_VERSION),
  ownerTenantId: UuidSchema,
  transactionId: UuidSchema,
  requirementDefinitionHashes: z.array(HashSchema),
  signalReferences: z.array(z.object({ signalId: UuidSchema, contentHash: HashSchema }).strict()),
  blueprintHash: HashSchema.nullable(),
  policyHash: HashSchema.nullable(),
  taskSpecHash: HashSchema.nullable(),
  transactionSemanticHash: HashSchema.nullable(),
  sourceAssetVersionHash: HashSchema.nullable(),
  contextLensHash: HashSchema.nullable(),
}).strict();

export const DependencySnapshotSchema = DependencyInputSchema.extend({ dependencySnapshotHash: HashSchema }).strict();
export type DependencySnapshot = z.infer<typeof DependencySnapshotSchema>;
export type DependencySnapshotInput = z.infer<typeof DependencyInputSchema>;

export function createDependencySnapshot(input: DependencySnapshotInput): DependencySnapshot {
  const parsed = DependencyInputSchema.parse(input);
  const normalized = {
    ...parsed,
    requirementDefinitionHashes: [...new Set(parsed.requirementDefinitionHashes)].sort(),
    signalReferences: [...new Map(parsed.signalReferences.map((reference) => [`${reference.signalId}:${reference.contentHash}`, reference])).values()]
      .sort((left, right) => left.signalId.localeCompare(right.signalId) || left.contentHash.localeCompare(right.contentHash)),
  };
  const dependencySnapshotHash = canonicalSha256(normalized);
  return immutableCopy(DependencySnapshotSchema.parse({ ...normalized, dependencySnapshotHash }));
}

export function verifyDependencySnapshotHash(snapshot: DependencySnapshot): boolean {
  const parsed = DependencySnapshotSchema.parse(snapshot);
  const { dependencySnapshotHash: _hash, ...material } = parsed;
  void _hash;
  return canonicalSha256({
    ...material,
    requirementDefinitionHashes: [...new Set(material.requirementDefinitionHashes)].sort(),
    signalReferences: [...new Map(material.signalReferences.map((reference) => [`${reference.signalId}:${reference.contentHash}`, reference])).values()]
      .sort((left, right) => left.signalId.localeCompare(right.signalId) || left.contentHash.localeCompare(right.contentHash)),
  }) === parsed.dependencySnapshotHash;
}

const EvaluatorInputSchema = z.object({
  schemaVersion: z.literal(BUILD002_EVALUATOR_SCHEMA_VERSION),
  version: z.string().trim().min(1).max(80),
  definitionHash: HashSchema,
}).strict();

export const SignalQualificationSchema = z.object({
  schemaVersion: z.literal(BUILD002_QUALIFICATION_SCHEMA_VERSION),
  id: UuidSchema,
  ownerTenantId: UuidSchema,
  transactionId: UuidSchema,
  requirementId: z.string().trim().min(1).max(120),
  requirementDefinitionHash: HashSchema,
  signalIds: z.array(UuidSchema),
  signalContentHashes: z.array(HashSchema),
  dependencySnapshotHash: HashSchema,
  evaluator: EvaluatorInputSchema,
  outcome: QualificationOutcomeSchema,
  reasonCode: z.string().trim().min(1).max(160),
  qualificationContentHash: HashSchema,
  qualifiedAt: z.string().datetime(),
}).strict();
export type SignalQualification = z.infer<typeof SignalQualificationSchema>;

export type EvaluateQualificationInput = {
  requirement: SignalRequirement;
  signals: Signal[];
  currentDependencySnapshot: DependencySnapshot;
  evaluator?: z.infer<typeof EvaluatorInputSchema>;
  qualifiedAt?: string;
  idFactory?: () => string;
};

function qualificationReason(outcome: QualificationOutcome): string {
  return `SIGNAL_${outcome}`;
}

function signalValueKey(signal: Signal): string {
  return canonicalSha256({ payload: signal.payload, source: signal.source, provenance: signal.provenance, validUntil: signal.validUntil });
}

export function evaluateSignalQualification(input: EvaluateQualificationInput): SignalQualification {
  const requirement = SignalRequirementSchema.parse(input.requirement);
  const signals = input.signals.map((signal) => SignalSchema.parse(signal));
  const currentDependencySnapshot = DependencySnapshotSchema.parse(input.currentDependencySnapshot);
  if (!verifySignalRequirementHash(requirement) || !verifyDependencySnapshotHash(currentDependencySnapshot)) {
    return buildQualification({ requirement, signals: [], dependency: currentDependencySnapshot, outcome: "INVALID", reasonCode: "INVALID_DEFINITION_OR_DEPENDENCY", evaluator: input.evaluator, qualifiedAt: input.qualifiedAt, idFactory: input.idFactory });
  }
  const applicable = signals.filter((signal) => signal.requirementId === requirement.requirementId && signal.ownerTenantId === currentDependencySnapshot.ownerTenantId && signal.transactionId === currentDependencySnapshot.transactionId);
  if (applicable.length === 0) return buildQualification({ requirement, signals: [], dependency: currentDependencySnapshot, outcome: "MISSING", reasonCode: qualificationReason("MISSING"), evaluator: input.evaluator, qualifiedAt: input.qualifiedAt, idFactory: input.idFactory });
  if (applicable.some((signal) => !verifySignalContentHash(signal))) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "INVALID", reasonCode: "SIGNAL_CONTENT_HASH_INVALID", evaluator: input.evaluator, qualifiedAt: input.qualifiedAt, idFactory: input.idFactory });
  const currentSourceDependencyHash = currentDependencySnapshot.sourceAssetVersionHash ?? currentDependencySnapshot.transactionSemanticHash ?? currentDependencySnapshot.dependencySnapshotHash;
  if (applicable.some((signal) => signal.dependency.hash !== currentSourceDependencyHash)) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "STALE_SOURCE", reasonCode: qualificationReason("STALE_SOURCE"), evaluator: input.evaluator, qualifiedAt: input.qualifiedAt, idFactory: input.idFactory });
  if (applicable.some((signal) => !requirement.acceptedProvenance.includes(signal.provenance))) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "INCOMPATIBLE_PROVENANCE", reasonCode: qualificationReason("INCOMPATIBLE_PROVENANCE"), evaluator: input.evaluator, qualifiedAt: input.qualifiedAt, idFactory: input.idFactory });
  if (applicable.some((signal) => signal.provenance === "UNKNOWN" || signal.payload === undefined || signal.payload === null)) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "UNKNOWN", reasonCode: qualificationReason("UNKNOWN"), evaluator: input.evaluator, qualifiedAt: input.qualifiedAt, idFactory: input.idFactory });
  if (requirement.qualificationRule.humanReviewRequired) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "REQUIRES_HUMAN_REVIEW", reasonCode: qualificationReason("REQUIRES_HUMAN_REVIEW"), evaluator: input.evaluator, qualifiedAt: input.qualifiedAt, idFactory: input.idFactory });
  const uniqueValues = new Set(applicable.map(signalValueKey));
  if (requirement.qualificationRule.cardinality === "SINGLE_VALUED" && uniqueValues.size > 1) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "CONTRADICTORY", reasonCode: qualificationReason("CONTRADICTORY"), evaluator: input.evaluator, qualifiedAt: input.qualifiedAt, idFactory: input.idFactory });
  return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "QUALIFIED", reasonCode: qualificationReason("QUALIFIED"), evaluator: input.evaluator, qualifiedAt: input.qualifiedAt, idFactory: input.idFactory });
}

function buildQualification(input: { requirement: SignalRequirement; signals: Signal[]; dependency: DependencySnapshot; outcome: QualificationOutcome; reasonCode: string; evaluator?: z.infer<typeof EvaluatorInputSchema>; qualifiedAt?: string; idFactory?: () => string }): SignalQualification {
  const evaluator = EvaluatorInputSchema.parse(input.evaluator ?? { schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: "0.1.0", definitionHash: canonicalSha256({ schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: "0.1.0" }) });
  const signalIds = [...new Set(input.signals.map((signal) => signal.signalId))].sort();
  const signalContentHashes = [...new Set(input.signals.map((signal) => signal.contentHash))].sort();
  const material = { schemaVersion: BUILD002_QUALIFICATION_SCHEMA_VERSION, ownerTenantId: input.dependency.ownerTenantId, transactionId: input.dependency.transactionId, requirementId: input.requirement.requirementId, requirementDefinitionHash: input.requirement.requirementDefinitionHash, signalIds, signalContentHashes, dependencySnapshotHash: input.dependency.dependencySnapshotHash, evaluator, outcome: input.outcome, reasonCode: input.reasonCode };
  return immutableCopy(SignalQualificationSchema.parse({ ...material, id: input.idFactory?.() ?? crypto.randomUUID(), qualifiedAt: input.qualifiedAt ?? new Date().toISOString(), qualificationContentHash: canonicalSha256(material) }));
}

export function verifyQualificationHash(qualification: SignalQualification): boolean {
  const parsed = SignalQualificationSchema.parse(qualification);
  const { id: _id, qualifiedAt: _at, qualificationContentHash: _hash, ...material } = parsed;
  void _id;
  void _at;
  void _hash;
  return canonicalSha256(material) === parsed.qualificationContentHash;
}

export type EvaluateReadinessInput = {
  subject: ReadinessSubject | null;
  requirements: SignalRequirement[];
  qualifications: SignalQualification[];
  dependencySnapshot: DependencySnapshot;
  taskSpecHash?: string | null;
  sourceAssetVersionHash?: string | null;
  blueprintHash?: string | null;
  policyHash?: string | null;
  policyBlock?: string | null;
  conditionCodes?: string[];
  evaluator?: z.infer<typeof EvaluatorInputSchema>;
  createdAt?: string;
  validUntil?: string | null;
  idFactory?: () => string;
};

export const DelegationReadinessSchema = z.object({
  schemaVersion: z.literal(BUILD002_SIGNAL_READINESS_SCHEMA_VERSION),
  id: UuidSchema,
  ownerTenantId: UuidSchema,
  transactionId: UuidSchema,
  requirementSetHash: HashSchema,
  qualificationSetHash: HashSchema,
  dependencySnapshotHash: HashSchema,
  taskSpecHash: HashSchema.nullable(),
  sourceAssetVersionHash: HashSchema.nullable(),
  blueprintHash: HashSchema.nullable(),
  policyHash: HashSchema.nullable(),
  evaluator: EvaluatorInputSchema,
  state: ReadinessAssessmentStateSchema,
  blockingCodes: z.array(z.string().min(1)),
  conditionCodes: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
  validUntil: z.string().datetime().nullable(),
  readinessContentHash: HashSchema,
}).strict();
export type DelegationReadiness = z.infer<typeof DelegationReadinessSchema>;

export function evaluateDelegationReadiness(input: EvaluateReadinessInput): DelegationReadiness {
  const dependency = DependencySnapshotSchema.parse(input.dependencySnapshot);
  const requirements = input.requirements.map((requirement) => SignalRequirementSchema.parse(requirement)).sort((left, right) => left.requirementId.localeCompare(right.requirementId));
  const qualifications = input.qualifications.map((qualification) => SignalQualificationSchema.parse(qualification)).sort((left, right) => left.requirementId.localeCompare(right.requirementId));
  const evaluator = EvaluatorInputSchema.parse(input.evaluator ?? { schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: "0.1.0", definitionHash: canonicalSha256({ schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: "0.1.0" }) });
  const ownerTenantId = input.subject?.ownerTenantId ?? dependency.ownerTenantId;
  const transactionId = input.subject?.transactionId ?? dependency.transactionId;
  const requirementSetHash = canonicalSha256(requirements.map((requirement) => ({ id: requirement.requirementId, hash: requirement.requirementDefinitionHash })).sort((left, right) => left.id.localeCompare(right.id)));
  const qualificationSetHash = canonicalSha256(qualifications.map((qualification) => ({ id: qualification.requirementId, hash: qualification.qualificationContentHash })).sort((left, right) => left.id.localeCompare(right.id)));
  const blockingCodes: string[] = [];
  let state: ReadinessAssessmentState;
  if (input.policyBlock) {
    state = "BLOCKED_BY_POLICY";
    blockingCodes.push(input.policyBlock);
  } else if (!input.subject || input.subject.ownerTenantId !== dependency.ownerTenantId || input.subject.transactionId !== dependency.transactionId) {
    state = "NEEDS_CONTEXT";
    blockingCodes.push("SUBJECT_CONTEXT_REQUIRED");
  } else {
    const byId = new Map(qualifications.map((qualification) => [qualification.requirementId, qualification]));
    const missing = requirements.filter((requirement) => !byId.has(requirement.requirementId));
    const critical = requirements.filter((requirement) => requirement.critical).map((requirement) => byId.get(requirement.requirementId));
    const invalidDefinitions = requirements.some((requirement) => !verifySignalRequirementHash(requirement));
    const invalidQualifications = qualifications.some((qualification) => {
      const requirement = requirements.find((candidate) => candidate.requirementId === qualification.requirementId);
      return !verifyQualificationHash(qualification) || !requirement || qualification.requirementDefinitionHash !== requirement.requirementDefinitionHash || qualification.ownerTenantId !== ownerTenantId || qualification.transactionId !== transactionId;
    });
    const review = critical.find((qualification) => qualification?.outcome === "REQUIRES_HUMAN_REVIEW");
    const nonQualifiedCritical = critical.filter((qualification) => !qualification || qualification.outcome !== "QUALIFIED");
    if (invalidDefinitions || invalidQualifications) {
      state = "INSUFFICIENT_SIGNAL";
      if (invalidDefinitions) blockingCodes.push("INVALID_REQUIREMENT_DEFINITION");
      if (invalidQualifications) blockingCodes.push("INVALID_QUALIFICATION");
    } else if (review) {
      state = "HUMAN_REVIEW_REQUIRED";
      blockingCodes.push("CRITICAL_REVIEW_REQUIRED");
    } else if (missing.length > 0 || nonQualifiedCritical.length > 0) {
      state = "INSUFFICIENT_SIGNAL";
      blockingCodes.push(...missing.map((requirement) => `MISSING_QUALIFICATION:${requirement.requirementId}`));
      blockingCodes.push(...nonQualifiedCritical.filter(Boolean).map((qualification) => `${qualification!.outcome}:${qualification!.requirementId}`));
    } else if ((input.conditionCodes ?? []).length > 0) {
      state = "READY_WITH_CONDITIONS";
    } else {
      state = "READY";
    }
  }
  const conditionCodes = [...new Set(input.conditionCodes ?? [])].sort();
  const material = { schemaVersion: BUILD002_SIGNAL_READINESS_SCHEMA_VERSION, ownerTenantId, transactionId, requirementSetHash, qualificationSetHash, dependencySnapshotHash: dependency.dependencySnapshotHash, taskSpecHash: input.taskSpecHash ?? null, sourceAssetVersionHash: input.sourceAssetVersionHash ?? null, blueprintHash: input.blueprintHash ?? null, policyHash: input.policyHash ?? null, evaluator, state, blockingCodes: [...new Set(blockingCodes)].sort(), conditionCodes };
  return immutableCopy(DelegationReadinessSchema.parse({ ...material, id: input.idFactory?.() ?? crypto.randomUUID(), createdAt: input.createdAt ?? new Date().toISOString(), validUntil: input.validUntil ?? null, readinessContentHash: canonicalSha256(material) }));
}

export function verifyReadinessHash(readiness: DelegationReadiness): boolean {
  const parsed = DelegationReadinessSchema.parse(readiness);
  const { id: _id, createdAt: _createdAt, validUntil: _validUntil, readinessContentHash: _hash, ...material } = parsed;
  void _id;
  void _createdAt;
  void _validUntil;
  void _hash;
  return canonicalSha256(material) === parsed.readinessContentHash;
}

export function evaluateReadinessValidity(readiness: DelegationReadiness, currentDependencySnapshot: DependencySnapshot, evaluationTime = new Date().toISOString()): ReadinessValidityState {
  const parsed = DelegationReadinessSchema.parse(readiness);
  const current = DependencySnapshotSchema.parse(currentDependencySnapshot);
  if (!verifyReadinessHash(parsed) || !verifyDependencySnapshotHash(current)) return "STALE";
  if (parsed.ownerTenantId !== current.ownerTenantId || parsed.transactionId !== current.transactionId || parsed.dependencySnapshotHash !== current.dependencySnapshotHash) return "STALE";
  if (parsed.validUntil !== null && parsed.validUntil <= evaluationTime) return "EXPIRED";
  return "CURRENT";
}

export function isDelegable(readiness: DelegationReadiness, currentValidity: ReadinessValidityState): boolean {
  try {
    return verifyReadinessHash(readiness) && readiness.state === "READY" && currentValidity === "CURRENT";
  } catch {
    return false;
  }
}
