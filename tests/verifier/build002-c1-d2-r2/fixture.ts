import type { ReadinessAuthorityCommitRecord } from "@/src/application/ports/outcome/readiness-authority-commit-repository";
import type { OutcomeReadinessCurrentnessDependencies } from "@/src/application/outcome/revalidate-outcome-readiness-authority-currentness";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { ResolvedOutcomeDependencySnapshot } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import type { AuthorityContext } from "@/src/domain/auth/authority";
import {
  BUILD002_DEPENDENCY_IDENTITIES,
  BUILD002_DEPENDENCY_SCHEMA_VERSION,
  compileSignalRequirement,
  createDependencySnapshot,
  createSignal,
  currentDefaultEvaluator,
  evaluateDelegationReadiness,
  evaluateSignalQualification,
  type DelegationReadiness,
  type DependencySnapshot,
  type EvaluatorIdentity,
} from "@/src/domain/outcome/signal-readiness";

export const TENANT = "10000000-0000-4000-8000-000000000001";
export const FOREIGN_TENANT = "10000000-0000-4000-8000-000000000002";
export const PRINCIPAL = "20000000-0000-4000-8000-000000000001";
export const MEMBERSHIP = "30000000-0000-4000-8000-000000000001";
export const TRANSACTION = "40000000-0000-4000-8000-000000000001";
export const FOREIGN_TRANSACTION = "40000000-0000-4000-8000-000000000002";
export const BLUEPRINT = "50000000-0000-4000-8000-000000000001";
export const READINESS = "60000000-0000-4000-8000-000000000001";
export const COMMIT = "70000000-0000-4000-8000-000000000001";
export const FOREIGN_COMMIT = "70000000-0000-4000-8000-000000000002";
export const DEPENDENCY_ID = "80000000-0000-4000-8000-000000000001";
export const ASSESSMENT_TIME = "2026-08-21T10:00:00.000Z";
export const REVALIDATION_TIME = "2026-08-21T11:00:00.000Z";
export const BLUEPRINT_HASH = "a".repeat(64);
export const SOURCE_HASH = "b".repeat(64);
export const TRANSACTION_HASH = "c".repeat(64);

export const authorityContext: AuthorityContext = Object.freeze({
  principalId: PRINCIPAL,
  tenantId: TENANT,
  membershipId: MEMBERSHIP,
  membershipRole: "OWNER",
  authoritySource: "SUPABASE_AUTH",
  authorizationTimestamp: "2026-08-21T09:00:00.000Z",
});

type MutableDependencies = {
  -readonly [K in keyof OutcomeReadinessCurrentnessDependencies]: OutcomeReadinessCurrentnessDependencies[K];
};

export type VerifierFixture = {
  assessment: { readiness: DelegationReadiness; dependency: DependencySnapshot };
  commit: ReadinessAuthorityCommitRecord;
  resolvedAuthority: ResolvedOutcomeRequirementAuthority;
  resolvedDependency: (snapshot?: DependencySnapshot) => ResolvedOutcomeDependencySnapshot;
  dependencies: MutableDependencies;
  calls: string[];
  setCommit: (commit: ReadinessAuthorityCommitRecord) => void;
};

export function makeVerifierFixture(state: "READY" | "INSUFFICIENT_SIGNAL" | "HUMAN_REVIEW_REQUIRED" = "INSUFFICIENT_SIGNAL"): VerifierFixture {
  const requirement = compileSignalRequirement({
    requirementId: "signal.readiness",
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "TEXT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: state === "HUMAN_REVIEW_REQUIRED" },
    dependencySelectors: [
      { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, required: true },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, required: true },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, required: true },
    ],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: BLUEPRINT_HASH,
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, ASSESSMENT_TIME);
  const signal = state === "READY" || state === "HUMAN_REVIEW_REQUIRED"
    ? createSignal({
      signalId: "90000000-0000-4000-8000-000000000001",
      ownerTenantId: TENANT,
      transactionId: TRANSACTION,
      requirementId: requirement.requirementId,
      payload: { value: "observed" },
      source: { identity: "verifier", version: "1", hash: null },
      provenance: "OBSERVED",
      capturedAt: "2026-08-21T09:59:00.000Z",
      validUntil: "2026-08-22T00:00:00.000Z",
      dependency: { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: SOURCE_HASH },
      schemaVersion: "build002-signal-v0.2",
    })
    : null;
  const dependency = createDependencySnapshot({
    schemaVersion: BUILD002_DEPENDENCY_SCHEMA_VERSION,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementDefinitionHashes: [requirement.requirementDefinitionHash],
    signalReferences: signal ? [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }] : [],
    dependencyBindings: [
      { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: BLUEPRINT_HASH },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: SOURCE_HASH },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, hash: TRANSACTION_HASH },
    ],
    blueprintHash: BLUEPRINT_HASH,
    policyHash: null,
    taskSpecHash: null,
    transactionSemanticHash: TRANSACTION_HASH,
    sourceAssetVersionHash: SOURCE_HASH,
    contextLensHash: null,
  });
  const evaluator = currentDefaultEvaluator();
  const qualification = evaluateSignalQualification({ requirement, signals: signal ? [signal] : [], currentDependencySnapshot: dependency, evaluator, evaluationTime: ASSESSMENT_TIME });
  const readiness = evaluateDelegationReadiness({
    subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TRANSACTION },
    requirements: [requirement],
    qualifications: [qualification],
    dependencySnapshot: dependency,
    taskSpecHash: null,
    sourceAssetVersionHash: SOURCE_HASH,
    blueprintHash: BLUEPRINT_HASH,
    policyHash: null,
    policyBlock: null,
    conditionCodes: [],
    evaluator,
    evaluationTime: ASSESSMENT_TIME,
    idFactory: () => READINESS,
  });
  const assessment = { readiness, dependency };
  let commit: ReadinessAuthorityCommitRecord = {
    authorityCommitId: COMMIT,
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    principalId: PRINCIPAL,
    dependencySnapshotId: DEPENDENCY_ID,
    dependencySnapshotHash: dependency.dependencySnapshotHash,
    readinessId: READINESS,
    readinessContentHash: readiness.readinessContentHash,
    evaluationTime: ASSESSMENT_TIME,
    committedAt: "2026-08-21T10:00:01.000Z",
    schemaVersion: "build002-readiness-authority-commit-v0.1",
  };
  const resolvedAuthority = {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    binding: {} as ResolvedOutcomeRequirementAuthority["binding"],
    blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH } as ResolvedOutcomeRequirementAuthority["blueprint"],
    requirementProfile: {} as ResolvedOutcomeRequirementAuthority["requirementProfile"],
    signalRequirements: [requirement],
    resolvedAt: ASSESSMENT_TIME,
  } as ResolvedOutcomeRequirementAuthority;
  const universe: ResolvedOutcomeSignalUniverse = {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    requirements: [{ requirement, signals: signal ? [signal] : [] }],
  };
  const currentDependency = dependency;
  const currentEvaluator: EvaluatorIdentity = evaluator;
  const now = REVALIDATION_TIME;
  const calls: string[] = [];
  const resolvedDependency = (snapshot: DependencySnapshot = currentDependency): ResolvedOutcomeDependencySnapshot => ({ ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, dependencySnapshot: snapshot });
  const dependencies = {
    scopedCommitReader: { findByScopedId: async () => { calls.push("SCOPED_COMMIT_READ"); return commit; } },
    requirementAuthority: { resolve: async () => { calls.push("C0-D"); return resolvedAuthority; } },
    signalUniverse: { resolve: async () => { calls.push("C1-A"); return universe; } },
    dependencySnapshot: { resolve: async () => { calls.push("C1-B"); return resolvedDependency(); } },
    persistence: {
      findReadiness: async () => { calls.push("HISTORICAL_READINESS_READ"); return assessment.readiness; },
      findDependencySnapshot: async () => { calls.push("HISTORICAL_DEPENDENCY_READ"); return assessment.dependency; },
    },
    clock: { now: () => now },
    evaluator: { current: () => currentEvaluator },
  } as MutableDependencies;
  return {
    assessment,
    commit,
    resolvedAuthority,
    resolvedDependency,
    dependencies,
    calls,
    setCommit: (value) => { commit = value; },
  };
}

export function setCurrentDependency(fixture: VerifierFixture, dependency: DependencySnapshot): void {
  fixture.dependencies.dependencySnapshot = { resolve: async () => { fixture.calls.push("C1-B"); return fixture.resolvedDependency(dependency); } };
}

export function setClock(fixture: VerifierFixture, value: string): void {
  fixture.dependencies.clock = { now: () => value };
}

export function setCurrentEvaluator(fixture: VerifierFixture, evaluator: EvaluatorIdentity): void {
  fixture.dependencies.evaluator = { current: () => evaluator };
}

export function changedSnapshot(base: DependencySnapshot, signalReferences: DependencySnapshot["signalReferences"]): DependencySnapshot {
  return createDependencySnapshot({
    schemaVersion: base.schemaVersion,
    ownerTenantId: base.ownerTenantId,
    transactionId: base.transactionId,
    requirementDefinitionHashes: base.requirementDefinitionHashes,
    signalReferences,
    dependencyBindings: base.dependencyBindings,
    blueprintHash: base.blueprintHash,
    policyHash: base.policyHash,
    taskSpecHash: base.taskSpecHash,
    transactionSemanticHash: base.transactionSemanticHash,
    sourceAssetVersionHash: base.sourceAssetVersionHash,
    contextLensHash: base.contextLensHash,
  });
}
