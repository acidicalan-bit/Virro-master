import { z } from "zod";

import { canonicalSha256, immutableCopy, SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";

export const BUILD002_SIGNAL_READINESS_SCHEMA_VERSION = "build002-signal-readiness-v0.3" as const;
export const BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION = "build002-signal-requirement-v0.1" as const;
export const BUILD002_SIGNAL_SCHEMA_VERSION = "build002-signal-v0.2" as const;
export const BUILD002_QUALIFICATION_SCHEMA_VERSION = "build002-signal-qualification-v0.3" as const;
// R3 keeps dependency snapshots stable while canonicalizing all temporal decisions.
export const BUILD002_DEPENDENCY_SCHEMA_VERSION = "build002-dependency-snapshot-v0.2" as const;
export const BUILD002_EVALUATOR_SCHEMA_VERSION = "build002-qualification-evaluator-v0.1" as const;
export const BUILD002_DEFAULT_EVALUATOR_VERSION = "0.2.0" as const;

const HashSchema = z.string().regex(SHA256_PATTERN);
const UuidSchema = z.uuid();
const CanonicalInstantPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/;

export function parseInstant(input: string): string {
  const parsed = z.string().datetime().parse(input);
  const match = CanonicalInstantPattern.exec(parsed);
  if (!match) throw new Error("BUILD002_INSTANT_PRECISION_OR_OFFSET_UNSUPPORTED");
  const epochMilliseconds = Date.parse(parsed);
  if (!Number.isFinite(epochMilliseconds)) throw new Error("BUILD002_INVALID_INSTANT");
  return new Date(epochMilliseconds).toISOString();
}

function instantEpoch(input: string): number {
  const canonical = parseInstant(input);
  const epoch = Date.parse(canonical);
  if (!Number.isFinite(epoch)) throw new Error("BUILD002_INVALID_INSTANT");
  return epoch;
}

export function instantEquals(left: string, right: string): boolean {
  return instantEpoch(left) === instantEpoch(right);
}

export function instantBefore(left: string, right: string): boolean {
  return instantEpoch(left) < instantEpoch(right);
}

export function instantBeforeOrEqual(left: string, right: string): boolean {
  return instantEpoch(left) <= instantEpoch(right);
}

export function earliestInstant(values: Array<string | null>): string | null {
  const present = values.filter((value): value is string => value !== null).map(parseInstant);
  if (present.length === 0) return null;
  return present.reduce((earliest, value) => instantBefore(value, earliest) ? value : earliest);
}

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

function normalizeSignalTemporal(signal: Signal): Signal {
  return {
    ...signal,
    capturedAt: parseInstant(signal.capturedAt),
    validUntil: signal.validUntil === null ? null : parseInstant(signal.validUntil),
  };
}

export const BUILD002_DEPENDENCY_IDENTITIES = {
  SOURCE_ASSET_VERSION: "asset.version",
  TRANSACTION_SEMANTIC: "transaction.semantic",
  BLUEPRINT: "blueprint",
  POLICY: "policy",
  TASK_SPEC: "task.spec",
  CONTEXT_LENS: "context.lens",
} as const;
export type Build002DependencyIdentity = typeof BUILD002_DEPENDENCY_IDENTITIES[keyof typeof BUILD002_DEPENDENCY_IDENTITIES];

export function createSignal(input: SignalInput): Signal {
  const parsed = SignalInputSchema.parse({
    ...input,
    capturedAt: parseInstant(input.capturedAt),
    validUntil: input.validUntil === null ? null : parseInstant(input.validUntil),
  });
  const signalId = parsed.signalId ?? crypto.randomUUID();
  const { signalId: _signalId, capturedAt: _capturedAt, ...semantic } = parsed;
  void _signalId;
  void _capturedAt;
  const contentHash = canonicalSha256(semantic);
  return immutableCopy(SignalSchema.parse({ ...parsed, signalId, contentHash }));
}

export function verifySignalContentHash(signal: Signal): boolean {
  const parsed = normalizeSignalTemporal(SignalSchema.parse(signal));
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
  signalReferences: z.array(z.object({ requirementId: z.string().trim().min(1).max(120), signalId: UuidSchema, contentHash: HashSchema }).strict()),
  dependencyBindings: z.array(z.object({ identity: z.string().trim().min(1).max(240), hash: HashSchema }).strict()),
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

function normalizeDependencyInput(parsed: DependencySnapshotInput): DependencySnapshotInput {
  const bindings = new Map<string, string>();
  for (const binding of parsed.dependencyBindings) {
    const previous = bindings.get(binding.identity);
    if (previous && previous !== binding.hash) throw new Error(`Conflicting dependency binding: ${binding.identity}`);
    bindings.set(binding.identity, binding.hash);
  }
  const references = new Map<string, typeof parsed.signalReferences[number]>();
  const referencesBySignalId = new Map<string, typeof parsed.signalReferences[number]>();
  for (const reference of parsed.signalReferences) {
    const key = reference.signalId;
    const previous = referencesBySignalId.get(key);
    if (previous && (previous.contentHash !== reference.contentHash || previous.requirementId !== reference.requirementId)) throw new Error(`Conflicting signal reference: ${reference.signalId}`);
    referencesBySignalId.set(key, reference);
    references.set(`${reference.requirementId}:${reference.signalId}:${reference.contentHash}`, reference);
  }
  return {
    ...parsed,
    requirementDefinitionHashes: [...new Set(parsed.requirementDefinitionHashes)].sort(),
    signalReferences: [...references.values()].sort((left, right) => left.requirementId.localeCompare(right.requirementId) || left.signalId.localeCompare(right.signalId) || left.contentHash.localeCompare(right.contentHash)),
    dependencyBindings: [...bindings.entries()].map(([identity, hash]) => ({ identity, hash })).sort((left, right) => left.identity.localeCompare(right.identity)),
  };
}

const dependencyProjectionFields: ReadonlyArray<readonly [Build002DependencyIdentity, keyof DependencySnapshotInput]> = [
  [BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, "sourceAssetVersionHash"],
  [BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, "transactionSemanticHash"],
  [BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, "blueprintHash"],
  [BUILD002_DEPENDENCY_IDENTITIES.POLICY, "policyHash"],
  [BUILD002_DEPENDENCY_IDENTITIES.TASK_SPEC, "taskSpecHash"],
  [BUILD002_DEPENDENCY_IDENTITIES.CONTEXT_LENS, "contextLensHash"],
];

function assertCanonicalDependencyConsistency(snapshot: DependencySnapshotInput): void {
  const bindings = new Map(snapshot.dependencyBindings.map((binding) => [binding.identity, binding.hash]));
  for (const [identity, field] of dependencyProjectionFields) {
    const projection = snapshot[field] as string | null;
    const binding = bindings.get(identity);
    if (projection !== null && (binding === undefined || binding !== projection)) {
      throw new Error(`Canonical dependency projection mismatch: ${identity}`);
    }
    if (binding !== undefined && projection !== binding) {
      throw new Error(`Canonical dependency binding mismatch: ${identity}`);
    }
  }
}

export function createDependencySnapshot(input: DependencySnapshotInput): DependencySnapshot {
  const normalized = normalizeDependencyInput(DependencyInputSchema.parse(input));
  assertCanonicalDependencyConsistency(normalized);
  const dependencySnapshotHash = canonicalSha256(normalized);
  return immutableCopy(DependencySnapshotSchema.parse({ ...normalized, dependencySnapshotHash }));
}

export function verifyDependencySnapshotHash(snapshot: DependencySnapshot): boolean {
  const parsed = DependencySnapshotSchema.parse(snapshot);
  const { dependencySnapshotHash: _hash, ...material } = parsed;
  void _hash;
  try {
    const normalized = normalizeDependencyInput(material);
    assertCanonicalDependencyConsistency(normalized);
    return canonicalSha256(normalized) === parsed.dependencySnapshotHash;
  } catch {
    return false;
  }
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
  evidenceValidUntil: z.string().datetime().nullable(),
  qualificationContentHash: HashSchema,
  qualifiedAt: z.string().datetime(),
}).strict();
export type SignalQualification = z.infer<typeof SignalQualificationSchema>;

function normalizeQualificationTemporal(qualification: SignalQualification): SignalQualification {
  return {
    ...qualification,
    qualifiedAt: parseInstant(qualification.qualifiedAt),
    evidenceValidUntil: qualification.evidenceValidUntil === null ? null : parseInstant(qualification.evidenceValidUntil),
  };
}

function qualificationTemporalCoherent(qualification: SignalQualification): boolean {
  try {
    const normalized = normalizeQualificationTemporal(qualification);
    return normalized.outcome !== "QUALIFIED"
      || normalized.evidenceValidUntil === null
      || instantBefore(normalized.qualifiedAt, normalized.evidenceValidUntil);
  } catch {
    return false;
  }
}

export type EvaluateQualificationInput = {
  requirement: SignalRequirement;
  signals: Signal[];
  currentDependencySnapshot: DependencySnapshot;
  evaluator?: z.infer<typeof EvaluatorInputSchema>;
  evaluationTime?: string;
  idFactory?: () => string;
};

function qualificationReason(outcome: QualificationOutcome): string {
  return `SIGNAL_${outcome}`;
}

function signalValueKey(signal: Signal): string {
  return canonicalSha256(signal.payload);
}

export function evaluateSignalQualification(input: EvaluateQualificationInput): SignalQualification {
  const requirement = SignalRequirementSchema.parse(input.requirement);
  const signals = input.signals.map((signal) => normalizeSignalTemporal(SignalSchema.parse(signal)));
  const currentDependencySnapshot = DependencySnapshotSchema.parse(input.currentDependencySnapshot);
  const evaluationTime = parseInstant(input.evaluationTime ?? new Date().toISOString());
  const invalid = (reasonCode: string) => buildQualification({ requirement, signals, dependency: currentDependencySnapshot, outcome: "INVALID", reasonCode, evaluationTime, evaluator: input.evaluator, idFactory: input.idFactory });
  if (!verifySignalRequirementHash(requirement) || !verifyDependencySnapshotHash(currentDependencySnapshot)) {
    return invalid("INVALID_DEFINITION_OR_DEPENDENCY");
  }
  if (requirement.blueprintHash !== currentDependencySnapshot.blueprintHash) return invalid("REQUIREMENT_BLUEPRINT_MISMATCH");
  if (requirement.policyHash !== currentDependencySnapshot.policyHash) return invalid("REQUIREMENT_POLICY_MISMATCH");
  if (!currentDependencySnapshot.requirementDefinitionHashes.includes(requirement.requirementDefinitionHash)) return invalid("REQUIREMENT_NOT_BOUND");
  const requiredBindings = requirement.dependencySelectors.filter((selector) => selector.required).map((selector) => selector.identity);
  if (requiredBindings.some((identity) => !currentDependencySnapshot.dependencyBindings.some((binding) => binding.identity === identity))) return invalid("DEPENDENCY_BINDING_MISSING");
  if (signals.some((signal) => signal.requirementId !== requirement.requirementId || signal.ownerTenantId !== currentDependencySnapshot.ownerTenantId || signal.transactionId !== currentDependencySnapshot.transactionId)) return invalid("SIGNAL_SUBJECT_MISMATCH");
  const applicable = signals;
  if (applicable.length === 0) return buildQualification({ requirement, signals: [], dependency: currentDependencySnapshot, outcome: "MISSING", reasonCode: qualificationReason("MISSING"), evaluator: input.evaluator, evaluationTime, idFactory: input.idFactory });
  if (applicable.some((signal) => !verifySignalContentHash(signal))) return invalid("SIGNAL_CONTENT_HASH_INVALID");
  const expectedReferences = currentDependencySnapshot.signalReferences.filter((reference) => reference.requirementId === requirement.requirementId);
  const expectedKeys = new Set(expectedReferences.map((reference) => `${reference.signalId}:${reference.contentHash}`));
  const suppliedKeys = new Set(applicable.map((signal) => `${signal.signalId}:${signal.contentHash}`));
  if (expectedKeys.size !== expectedReferences.length || suppliedKeys.size !== applicable.length || expectedKeys.size !== suppliedKeys.size || [...expectedKeys].some((key) => !suppliedKeys.has(key))) return invalid("SIGNAL_SET_NOT_BOUND");
  if (applicable.some((signal) => signal.validUntil !== null && !instantBefore(signal.capturedAt, signal.validUntil))) return invalid("SIGNAL_TEMPORAL_INVALID");
  if (applicable.some((signal) => instantEpoch(signal.capturedAt) > instantEpoch(evaluationTime))) return invalid("SIGNAL_FROM_FUTURE");
  if (applicable.some((signal) => signal.validUntil !== null && instantBeforeOrEqual(signal.validUntil, evaluationTime))) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "STALE_SOURCE", reasonCode: "SIGNAL_EXPIRED", evaluator: input.evaluator, evaluationTime, idFactory: input.idFactory });
  const allowedDependencyIdentities = new Set(requirement.dependencySelectors.map((selector) => selector.identity));
  if (applicable.some((signal) => !allowedDependencyIdentities.has(signal.dependency.identity) || !currentDependencySnapshot.dependencyBindings.some((binding) => binding.identity === signal.dependency.identity && binding.hash === signal.dependency.hash))) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "STALE_SOURCE", reasonCode: "DEPENDENCY_IDENTITY_MISMATCH", evaluator: input.evaluator, evaluationTime, idFactory: input.idFactory });
  if (applicable.some((signal) => !requirement.acceptedProvenance.includes(signal.provenance))) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "INCOMPATIBLE_PROVENANCE", reasonCode: qualificationReason("INCOMPATIBLE_PROVENANCE"), evaluator: input.evaluator, evaluationTime, idFactory: input.idFactory });
  if (applicable.some((signal) => signal.provenance === "UNKNOWN" || signal.payload === undefined || signal.payload === null)) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "UNKNOWN", reasonCode: qualificationReason("UNKNOWN"), evaluator: input.evaluator, evaluationTime, idFactory: input.idFactory });
  if (requirement.qualificationRule.humanReviewRequired) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "REQUIRES_HUMAN_REVIEW", reasonCode: qualificationReason("REQUIRES_HUMAN_REVIEW"), evaluator: input.evaluator, evaluationTime, idFactory: input.idFactory });
  const uniqueValues = new Set(applicable.map(signalValueKey));
  if (requirement.qualificationRule.cardinality === "SINGLE_VALUED" && uniqueValues.size > 1) return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "CONTRADICTORY", reasonCode: qualificationReason("CONTRADICTORY"), evaluator: input.evaluator, evaluationTime, idFactory: input.idFactory });
  return buildQualification({ requirement, signals: applicable, dependency: currentDependencySnapshot, outcome: "QUALIFIED", reasonCode: qualificationReason("QUALIFIED"), evaluator: input.evaluator, evaluationTime, idFactory: input.idFactory });
}

function buildQualification(input: { requirement: SignalRequirement; signals: Signal[]; dependency: DependencySnapshot; outcome: QualificationOutcome; reasonCode: string; evaluator?: z.infer<typeof EvaluatorInputSchema>; evaluationTime: string; idFactory?: () => string }): SignalQualification {
  const evaluator = EvaluatorInputSchema.parse(input.evaluator ?? { schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: BUILD002_DEFAULT_EVALUATOR_VERSION, definitionHash: canonicalSha256({ schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: BUILD002_DEFAULT_EVALUATOR_VERSION }) });
  const signalIds = [...new Set(input.signals.map((signal) => signal.signalId))].sort();
  const signalContentHashes = [...new Set(input.signals.map((signal) => signal.contentHash))].sort();
  const evidenceValidUntil = earliestInstant(input.signals.map((signal) => signal.validUntil));
  const material = { schemaVersion: BUILD002_QUALIFICATION_SCHEMA_VERSION, ownerTenantId: input.dependency.ownerTenantId, transactionId: input.dependency.transactionId, requirementId: input.requirement.requirementId, requirementDefinitionHash: input.requirement.requirementDefinitionHash, signalIds, signalContentHashes, dependencySnapshotHash: input.dependency.dependencySnapshotHash, evaluator, outcome: input.outcome, reasonCode: input.reasonCode, evidenceValidUntil, qualifiedAt: input.evaluationTime };
  return immutableCopy(SignalQualificationSchema.parse({ ...material, id: input.idFactory?.() ?? crypto.randomUUID(), qualificationContentHash: canonicalSha256(material) }));
}

export function verifyQualificationHash(qualification: SignalQualification): boolean {
  const parsed = normalizeQualificationTemporal(SignalQualificationSchema.parse(qualification));
  const { id: _id, qualificationContentHash: _hash, ...material } = parsed;
  void _id;
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
  evaluationTime?: string;
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
  const evaluationTime = parseInstant(input.evaluationTime ?? new Date().toISOString());
  const requirements = input.requirements.map((requirement) => SignalRequirementSchema.parse(requirement)).sort((left, right) => left.requirementId.localeCompare(right.requirementId));
  const qualifications = input.qualifications.map((qualification) => normalizeQualificationTemporal(SignalQualificationSchema.parse(qualification))).sort((left, right) => left.requirementId.localeCompare(right.requirementId));
  const evaluator = EvaluatorInputSchema.parse(input.evaluator ?? { schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: BUILD002_DEFAULT_EVALUATOR_VERSION, definitionHash: canonicalSha256({ schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: BUILD002_DEFAULT_EVALUATOR_VERSION }) });
  const ownerTenantId = input.subject?.ownerTenantId ?? dependency.ownerTenantId;
  const transactionId = input.subject?.transactionId ?? dependency.transactionId;
  const requirementSetHash = canonicalSha256(requirements.map((requirement) => ({ id: requirement.requirementId, hash: requirement.requirementDefinitionHash })).sort((left, right) => left.id.localeCompare(right.id)));
  const qualificationSetHash = canonicalSha256(qualifications.map((qualification) => ({ id: qualification.requirementId, hash: qualification.qualificationContentHash })).sort((left, right) => left.id.localeCompare(right.id) || left.hash.localeCompare(right.hash)));
  const blockingCodes: string[] = [];
  let state: ReadinessAssessmentState;
  const requirementIds = requirements.map((requirement) => requirement.requirementId);
  const qualificationIds = qualifications.map((qualification) => qualification.requirementId);
  const duplicateRequirementIds = new Set(requirementIds).size !== requirementIds.length;
  const duplicateQualificationIds = new Set(qualificationIds).size !== qualificationIds.length;
  const requiredDefinitionHashes = [...new Set(requirements.map((requirement) => requirement.requirementDefinitionHash))].sort();
  const snapshotDefinitionHashes = [...new Set(dependency.requirementDefinitionHashes)].sort();
  const requirementSetMismatch = requiredDefinitionHashes.length !== snapshotDefinitionHashes.length || requiredDefinitionHashes.some((hash, index) => hash !== snapshotDefinitionHashes[index]);
  const unknownSnapshotSignalRequirement = dependency.signalReferences.some((reference) => !requirementIds.includes(reference.requirementId));
  const invalidDefinitions = requirements.some((requirement) => !verifySignalRequirementHash(requirement));
  const requirementDependencyMismatch = requirements.some((requirement) => requirement.blueprintHash !== dependency.blueprintHash || requirement.policyHash !== dependency.policyHash);
  const invalidQualifications = qualifications.some((qualification) => {
    const requirement = requirements.find((candidate) => candidate.requirementId === qualification.requirementId);
    return qualification.outcome === "INVALID"
      || !verifyQualificationHash(qualification)
      || !qualificationTemporalCoherent(qualification)
      || !requirement
      || qualification.requirementDefinitionHash !== requirement.requirementDefinitionHash
      || qualification.ownerTenantId !== ownerTenantId
      || qualification.transactionId !== transactionId
      || qualification.dependencySnapshotHash !== dependency.dependencySnapshotHash;
  });
  const qualificationSetMismatch = requirementIds.length !== qualificationIds.length
    || new Set(requirementIds).size !== new Set(qualificationIds).size
    || requirementIds.some((id) => !qualificationIds.includes(id));
  const bindingMismatch = (input.taskSpecHash !== undefined && input.taskSpecHash !== dependency.taskSpecHash)
    || (input.sourceAssetVersionHash !== undefined && input.sourceAssetVersionHash !== dependency.sourceAssetVersionHash)
    || (input.blueprintHash !== undefined && input.blueprintHash !== dependency.blueprintHash)
    || (input.policyHash !== undefined && input.policyHash !== dependency.policyHash);
  const futureQualification = qualifications.some((qualification) => instantEpoch(qualification.qualifiedAt) > instantEpoch(evaluationTime));
  const structuralInvalid = duplicateRequirementIds || duplicateQualificationIds || requirementSetMismatch || unknownSnapshotSignalRequirement || invalidDefinitions || requirementDependencyMismatch || invalidQualifications || qualificationSetMismatch || bindingMismatch || futureQualification;
  if (input.policyBlock) {
    state = "BLOCKED_BY_POLICY";
    blockingCodes.push(input.policyBlock);
  } else if (!input.subject || input.subject.ownerTenantId !== dependency.ownerTenantId || input.subject.transactionId !== dependency.transactionId) {
    state = "NEEDS_CONTEXT";
    blockingCodes.push("SUBJECT_CONTEXT_REQUIRED");
  } else if (requirements.length === 0) {
    state = "INSUFFICIENT_SIGNAL";
    blockingCodes.push("REQUIREMENT_SET_EMPTY");
  } else if (structuralInvalid) {
    state = "INSUFFICIENT_SIGNAL";
    if (duplicateRequirementIds) blockingCodes.push("DUPLICATE_REQUIREMENT_ID");
    if (duplicateQualificationIds) blockingCodes.push("DUPLICATE_QUALIFICATION_ID");
    if (requirementSetMismatch) blockingCodes.push("REQUIREMENT_SET_MISMATCH");
    if (unknownSnapshotSignalRequirement) blockingCodes.push("UNKNOWN_SNAPSHOT_SIGNAL_REQUIREMENT");
    if (invalidDefinitions) blockingCodes.push("INVALID_REQUIREMENT_DEFINITION");
    if (requirementDependencyMismatch) blockingCodes.push("REQUIREMENT_DEPENDENCY_MISMATCH");
    if (invalidQualifications) blockingCodes.push("INVALID_QUALIFICATION");
    if (qualificationSetMismatch) blockingCodes.push("QUALIFICATION_SET_MISMATCH");
    if (bindingMismatch) blockingCodes.push("READINESS_BINDING_MISMATCH");
    if (futureQualification) blockingCodes.push("QUALIFICATION_FROM_FUTURE");
  } else {
    const byId = new Map(qualifications.map((qualification) => [qualification.requirementId, qualification]));
    const missing = requirements.filter((requirement) => !byId.has(requirement.requirementId));
    const critical = requirements.filter((requirement) => requirement.critical).map((requirement) => byId.get(requirement.requirementId));
    const review = critical.find((qualification) => qualification?.outcome === "REQUIRES_HUMAN_REVIEW");
    const nonQualifiedCritical = critical.filter((qualification) => !qualification || qualification.outcome !== "QUALIFIED");
    if (review) {
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
  const criticalEvidenceHorizons = qualifications
    .filter((qualification) => requirements.find((requirement) => requirement.requirementId === qualification.requirementId)?.critical && qualification.outcome === "QUALIFIED")
    .map((qualification) => qualification.evidenceValidUntil)
    .filter((validUntil): validUntil is string => validUntil !== null);
  const validUntil = earliestInstant(criticalEvidenceHorizons);
  const expiredCriticalQualification = qualifications.some((qualification) => qualification.outcome === "QUALIFIED" && requirements.find((requirement) => requirement.requirementId === qualification.requirementId)?.critical === true && qualification.evidenceValidUntil !== null && instantBeforeOrEqual(qualification.evidenceValidUntil, evaluationTime));
  const causallyInvalidQualification = qualifications.some((qualification) => qualification.outcome === "QUALIFIED" && !qualificationTemporalCoherent(qualification));
  const futureCriticalQualification = qualifications.some((qualification) => qualification.outcome === "QUALIFIED" && instantEpoch(qualification.qualifiedAt) > instantEpoch(evaluationTime) && requirements.find((requirement) => requirement.requirementId === qualification.requirementId)?.critical);
  if ((expiredCriticalQualification || causallyInvalidQualification || futureCriticalQualification) && (state === "READY" || state === "READY_WITH_CONDITIONS")) {
    state = "INSUFFICIENT_SIGNAL";
    blockingCodes.push(causallyInvalidQualification ? "QUALIFICATION_TEMPORAL_INVALID" : futureCriticalQualification ? "QUALIFICATION_FROM_FUTURE" : "STALE_SOURCE");
  }
  const material = { schemaVersion: BUILD002_SIGNAL_READINESS_SCHEMA_VERSION, ownerTenantId, transactionId, requirementSetHash, qualificationSetHash, dependencySnapshotHash: dependency.dependencySnapshotHash, taskSpecHash: dependency.taskSpecHash, sourceAssetVersionHash: dependency.sourceAssetVersionHash, blueprintHash: dependency.blueprintHash, policyHash: dependency.policyHash, evaluator, state, blockingCodes: [...new Set(blockingCodes)].sort(), conditionCodes, validUntil };
  return immutableCopy(DelegationReadinessSchema.parse({ ...material, id: input.idFactory?.() ?? crypto.randomUUID(), createdAt: evaluationTime, readinessContentHash: canonicalSha256(material) }));
}

export function verifyReadinessHash(readiness: DelegationReadiness): boolean {
  const parsed = DelegationReadinessSchema.parse(readiness);
  const normalized = { ...parsed, validUntil: parsed.validUntil === null ? null : parseInstant(parsed.validUntil) };
  const { id: _id, createdAt: _createdAt, readinessContentHash: _hash, ...material } = normalized;
  void _id;
  void _createdAt;
  void _hash;
  return canonicalSha256(material) === parsed.readinessContentHash;
}

export function evaluateReadinessValidity(readiness: DelegationReadiness, currentDependencySnapshot: DependencySnapshot, evaluationTime = new Date().toISOString()): ReadinessValidityState {
  const base = DelegationReadinessSchema.parse(readiness);
  const parsed = { ...base, validUntil: base.validUntil === null ? null : parseInstant(base.validUntil) };
  const current = DependencySnapshotSchema.parse(currentDependencySnapshot);
  if (!verifyReadinessHash(parsed) || !verifyDependencySnapshotHash(current)) return "STALE";
  if (parsed.ownerTenantId !== current.ownerTenantId || parsed.transactionId !== current.transactionId || parsed.dependencySnapshotHash !== current.dependencySnapshotHash) return "STALE";
  if (parsed.validUntil !== null && instantBeforeOrEqual(parsed.validUntil, parseInstant(evaluationTime))) return "EXPIRED";
  return "CURRENT";
}

export function isDelegable(readiness: DelegationReadiness, currentValidity: ReadinessValidityState): boolean {
  try {
    return verifyReadinessHash(readiness) && readiness.state === "READY" && currentValidity === "CURRENT";
  } catch {
    return false;
  }
}
