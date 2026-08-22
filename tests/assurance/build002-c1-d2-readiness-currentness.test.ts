import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  OutcomeReadinessAuthorityCurrentnessRevalidator,
  OutcomeReadinessCurrentnessError,
  type OutcomeReadinessCurrentnessDependencies,
} from "@/src/application/outcome/revalidate-outcome-readiness-authority-currentness";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import {
  OutcomeDependencySnapshotError,
  type ResolvedOutcomeDependencySnapshot,
} from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
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
import type { ReadinessAuthorityCommitRecord } from "@/src/application/ports/outcome/readiness-authority-commit-repository";

const TENANT = "10000000-0000-4000-8000-000000000001";
const FOREIGN_TENANT = "10000000-0000-4000-8000-000000000002";
const PRINCIPAL = "20000000-0000-4000-8000-000000000001";
const MEMBERSHIP = "30000000-0000-4000-8000-000000000001";
const TRANSACTION = "40000000-0000-4000-8000-000000000001";
const FOREIGN_TRANSACTION = "40000000-0000-4000-8000-000000000002";
const BLUEPRINT = "50000000-0000-4000-8000-000000000001";
const READINESS = "60000000-0000-4000-8000-000000000001";
const COMMIT = "70000000-0000-4000-8000-000000000001";
const DEPENDENCY_ID = "80000000-0000-4000-8000-000000000001";
const ASSESSMENT_TIME = "2026-08-21T10:00:00.000Z";
const REVALIDATION_TIME = "2026-08-21T11:00:00.000Z";
const BLUEPRINT_HASH = "a".repeat(64);
const SOURCE_HASH = "b".repeat(64);
const TRANSACTION_HASH = "c".repeat(64);

const authorityContext: AuthorityContext = Object.freeze({
  principalId: PRINCIPAL,
  tenantId: TENANT,
  membershipId: MEMBERSHIP,
  membershipRole: "OWNER",
  authoritySource: "SUPABASE_AUTH",
  authorizationTimestamp: "2026-08-21T09:00:00.000Z",
});

type Fixture = ReturnType<typeof makeFixture>;
type MutableDependencies = {
  -readonly [K in keyof OutcomeReadinessCurrentnessDependencies]: OutcomeReadinessCurrentnessDependencies[K];
};

function makeAssessment(options: { state?: "READY" | "INSUFFICIENT_SIGNAL" | "HUMAN_REVIEW_REQUIRED"; validUntil?: string | null } = {}) {
  const state = options.state ?? "INSUFFICIENT_SIGNAL";
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
      source: { identity: "fixture", version: "1", hash: null },
      provenance: "OBSERVED",
      capturedAt: "2026-08-21T09:59:00.000Z",
      validUntil: options.validUntil ?? "2026-08-22T00:00:00.000Z",
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
  return { requirement, signal, dependency, readiness };
}

function makeFixture(options: { state?: "READY" | "INSUFFICIENT_SIGNAL" | "HUMAN_REVIEW_REQUIRED"; validUntil?: string | null } = {}) {
  const assessment = makeAssessment(options);
  const calls: string[] = [];
  const commit: ReadinessAuthorityCommitRecord = {
    authorityCommitId: COMMIT,
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    principalId: PRINCIPAL,
    dependencySnapshotId: DEPENDENCY_ID,
    dependencySnapshotHash: assessment.dependency.dependencySnapshotHash,
    readinessId: READINESS,
    readinessContentHash: assessment.readiness.readinessContentHash,
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
    signalRequirements: [assessment.requirement],
    resolvedAt: ASSESSMENT_TIME,
  } as ResolvedOutcomeRequirementAuthority;
  const universe: ResolvedOutcomeSignalUniverse = {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    requirements: [{ requirement: assessment.requirement, signals: assessment.signal ? [assessment.signal] : [] }],
  };
  const resolvedDependency = (snapshot: DependencySnapshot = assessment.dependency): ResolvedOutcomeDependencySnapshot => ({ ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, dependencySnapshot: snapshot });
  const dependencies = {
    scopedCommitReader: { findByScopedId: async (input) => { calls.push("SCOPED_COMMIT_READ"); return input.ownerTenantId === TENANT && input.authorityCommitId === COMMIT ? commit : null; } },
    requirementAuthority: { resolve: async (input) => { calls.push("C0-D"); return input.outcomeTransactionId === TRANSACTION ? resolvedAuthority : { ...resolvedAuthority, outcomeTransactionId: input.outcomeTransactionId }; } },
    signalUniverse: { resolve: async () => { calls.push("C1-A"); return universe; } },
    dependencySnapshot: { resolve: async () => { calls.push("C1-B"); return resolvedDependency(); } },
    persistence: {
      findReadiness: async () => { calls.push("HISTORICAL_READINESS_READ"); return assessment.readiness; },
      findDependencySnapshot: async () => { calls.push("HISTORICAL_DEPENDENCY_READ"); return assessment.dependency; },
    },
    clock: { now: () => REVALIDATION_TIME },
  } as MutableDependencies;
  return { assessment, commit, resolvedAuthority, universe, resolvedDependency, dependencies, calls };
}

function run(fixture: Fixture, input: Record<string, unknown> = { authority: authorityContext, authorityCommitId: COMMIT }) {
  return new OutcomeReadinessAuthorityCurrentnessRevalidator(fixture.dependencies).run(input as never);
}

describe("BUILD002-C1-D2 post-commit readiness currentness", () => {
  it.each([
    ["READY", "READY"],
    ["non-ready", "INSUFFICIENT_SIGNAL"],
    ["human review", "HUMAN_REVIEW_REQUIRED"],
  ] as const)("returns CURRENT for unchanged %s historical readiness", async (_label, state) => {
    const fixture = makeFixture({ state });
    const result = await run(fixture);
    expect(result.currentness).toBe("CURRENT");
    expect(result.historicalReadiness.state).toBe(state);
    expect(result.reasonCodes).toEqual([]);
    expect(result.assessmentScope).toBe("NON_ATOMIC_POST_COMMIT_CURRENTNESS");
    expect(result.consequenceBoundary).toBe("SERIALIZED_RECHECK_REQUIRED_FOR_CONSEQUENCE");
  });

  it("uses the server clock and accepts only the narrow public input", async () => {
    const fixture = makeFixture();
    const result = await run(fixture, {
      authority: authorityContext,
      authorityCommitId: COMMIT,
      ownerTenantId: FOREIGN_TENANT,
      outcomeTransactionId: FOREIGN_TRANSACTION,
      readinessId: "attacker",
      dependencySnapshot: {},
      evaluator: { version: "attacker" },
      revalidationTime: "1900-01-01T00:00:00.000Z",
      currentness: "CURRENT",
      isDelegable: true,
      canExecute: true,
    });
    expect(result.currentness).toBe("CURRENT");
    expect(result.revalidatedAt).toBe(REVALIDATION_TIME);
  });

  it("copies authority before the first await", async () => {
    const fixture = makeFixture();
    let release!: () => void;
    const parked = new Promise<void>((resolve) => { release = resolve; });
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => { await parked; return fixture.commit; } };
    const mutable = { ...authorityContext } as { -readonly [K in keyof AuthorityContext]: AuthorityContext[K] };
    const pending = run(fixture, { authority: mutable, authorityCommitId: COMMIT });
    mutable.tenantId = FOREIGN_TENANT;
    mutable.principalId = "20000000-0000-4000-8000-000000000002";
    release();
    await expect(pending).resolves.toMatchObject({ currentness: "CURRENT" });
  });

  it("rejects cross-tenant and nonexistent commit IDs without later calls", async () => {
    const fixture = makeFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => { fixture.calls.push("SCOPED_COMMIT_READ"); return null; } };
    await expect(run(fixture, { authority: authorityContext, authorityCommitId: "foreign-id" })).rejects.toEqual(new OutcomeReadinessCurrentnessError("AUTHORITY_COMMIT_NOT_FOUND"));
    expect(fixture.calls).toEqual(["SCOPED_COMMIT_READ"]);
  });

  it("rejects a same-tenant marker that substitutes a different requested commit ID", async () => {
    const fixture = makeFixture();
    fixture.dependencies.scopedCommitReader = {
      findByScopedId: async () => {
        fixture.calls.push("SCOPED_COMMIT_READ");
        return { ...fixture.commit, authorityCommitId: "70000000-0000-4000-8000-000000000002" };
      },
    };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID"));
    expect(fixture.calls).toEqual(["SCOPED_COMMIT_READ"]);
  });

  it("accepts the exact requested commit ID as the positive control", async () => {
    const fixture = makeFixture();
    const result = await run(fixture);
    expect(result.currentness).toBe("CURRENT");
    expect(result.authorityCommit.authorityCommitId).toBe(COMMIT);
  });

  it.each([
    ["wrong schema version", { schemaVersion: "build002-readiness-authority-commit-v9.9" }],
    ["blank dependency snapshot ID", { dependencySnapshotId: "   " }],
  ])("rejects marker shape corruption: %s", async (_label, override) => {
    const fixture = makeFixture();
    fixture.dependencies.scopedCommitReader = {
      findByScopedId: async () => {
        fixture.calls.push("SCOPED_COMMIT_READ");
        return { ...fixture.commit, ...override } as ReadinessAuthorityCommitRecord;
      },
    };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID"));
    expect(fixture.calls).toEqual(["SCOPED_COMMIT_READ"]);
  });

  it("rejects a marker committed before its evaluation instant", async () => {
    const fixture = makeFixture();
    fixture.dependencies.scopedCommitReader = {
      findByScopedId: async () => {
        fixture.calls.push("SCOPED_COMMIT_READ");
        return { ...fixture.commit, committedAt: "2026-08-21T09:59:59.999Z" };
      },
    };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID"));
    expect(fixture.calls).toEqual(["SCOPED_COMMIT_READ"]);
  });

  it("accepts a marker committed after its evaluation instant", async () => {
    const fixture = makeFixture();
    const result = await run(fixture);
    expect(result.currentness).toBe("CURRENT");
  });

  it("accepts equal evaluation and commit instants", async () => {
    const fixture = makeFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, committedAt: ASSESSMENT_TIME }) };
    const result = await run(fixture);
    expect(result.currentness).toBe("CURRENT");
  });

  it("rejects revalidation before marker commit without current graph reads", async () => {
    const fixture = makeFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, committedAt: "2026-08-21T11:00:01.000Z" }) };
    fixture.dependencies.clock = { now: () => "2026-08-21T11:00:00.500Z" };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED"));
    expect(fixture.calls).not.toContain("C1-A");
    expect(fixture.calls).not.toContain("C1-B");
  });

  it("accepts revalidation exactly at marker commit", async () => {
    const fixture = makeFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, committedAt: REVALIDATION_TIME }) };
    fixture.dependencies.clock = { now: () => REVALIDATION_TIME };
    const result = await run(fixture);
    expect(result.currentness).toBe("CURRENT");
  });

  it("fails closed when an application reader returns a foreign marker", async () => {
    const fixture = makeFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, ownerTenantId: FOREIGN_TENANT, outcomeTransactionId: FOREIGN_TRANSACTION }) };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID"));
    expect(fixture.calls).toEqual([]);
  });

  it.each([
    ["readiness ID", { readinessId: "60000000-0000-4000-8000-000000000099" }],
    ["readiness hash", { readinessContentHash: "d".repeat(64) }],
    ["tenant", { ownerTenantId: FOREIGN_TENANT }],
    ["transaction", { outcomeTransactionId: FOREIGN_TRANSACTION }],
    ["dependency hash", { dependencySnapshotHash: "e".repeat(64) }],
    ["evaluation time", { evaluationTime: "2026-08-21T10:01:00.000Z" }],
    ["malformed evaluation time", { evaluationTime: "invalid" }],
  ])("rejects wrong historical marker %s", async (_label, override) => {
    const fixture = makeFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, ...override }) };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID"));
  });

  it.each([
    ["wrong readiness ID", (r: DelegationReadiness) => ({ ...r, id: "60000000-0000-4000-8000-000000000099" })],
    ["wrong readiness hash", (r: DelegationReadiness) => ({ ...r, readinessContentHash: "f".repeat(64) })],
    ["wrong tenant", (r: DelegationReadiness) => ({ ...r, ownerTenantId: FOREIGN_TENANT })],
    ["wrong transaction", (r: DelegationReadiness) => ({ ...r, transactionId: FOREIGN_TRANSACTION })],
    ["wrong dependency", (r: DelegationReadiness) => ({ ...r, dependencySnapshotHash: "f".repeat(64) })],
    ["wrong createdAt", (r: DelegationReadiness) => ({ ...r, createdAt: "2026-08-21T10:01:00.000Z" })],
    ["malformed createdAt", (r: DelegationReadiness) => ({ ...r, createdAt: "invalid" })],
  ])("rejects historical readiness corruption: %s", async (_label, mutate) => {
    const fixture = makeFixture();
    fixture.dependencies.persistence = { ...fixture.dependencies.persistence, findReadiness: async () => mutate(fixture.assessment.readiness) };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID"));
  });

  it("rejects invalid historical readiness hash", async () => {
    const fixture = makeFixture();
    fixture.dependencies.persistence = { ...fixture.dependencies.persistence, findReadiness: async () => ({ ...fixture.assessment.readiness, readinessContentHash: "f".repeat(64) }) };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID"));
  });

  it.each([
    ["missing", null],
    ["bad hash", { ...makeFixture().assessment.dependency, dependencySnapshotHash: "f".repeat(64) }],
    ["foreign tenant", { ...makeFixture().assessment.dependency, ownerTenantId: FOREIGN_TENANT }],
    ["foreign transaction", { ...makeFixture().assessment.dependency, transactionId: FOREIGN_TRANSACTION }],
    ["marker mismatch", { ...makeFixture().assessment.dependency, dependencySnapshotHash: "e".repeat(64) }],
  ])("rejects historical dependency corruption: %s", async (_label, dependency) => {
    const fixture = makeFixture();
    fixture.dependencies.persistence = { ...fixture.dependencies.persistence, findDependencySnapshot: async () => dependency as DependencySnapshot | null };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID"));
  });

  it.each([
    ["signal added", () => changedSnapshot(makeFixture().assessment.dependency, [{ requirementId: "signal.readiness", signalId: "90000000-0000-4000-8000-000000000099", contentHash: "1".repeat(64) }])],
    ["signal removed", () => changedSnapshot(makeFixture().assessment.dependency, [])],
    ["signal content changed", () => changedSnapshot(makeFixture().assessment.dependency, [{ requirementId: "signal.readiness", signalId: "90000000-0000-4000-8000-000000000001", contentHash: "2".repeat(64) }])],
  ])("classifies %s as STALE without recommit", async (_label, snapshotFactory) => {
    const fixture = makeFixture({ state: "READY" });
    const snapshot = snapshotFactory();
    fixture.dependencies.dependencySnapshot = { resolve: async () => { fixture.calls.push("C1-B"); return fixture.resolvedDependency(snapshot); } };
    const result = await run(fixture);
    expect(result.currentness).toBe("STALE");
    expect(result.reasonCodes).toEqual(["DEPENDENCY_SNAPSHOT_CHANGED"]);
  });

  it("classifies an asset head change as STALE at C1-B", async () => {
    const fixture = makeFixture();
    fixture.dependencies.dependencySnapshot = { resolve: async () => { throw new OutcomeDependencySnapshotError("SOURCE_ASSET_HEAD_CHANGED"); } };
    const result = await run(fixture);
    expect(result.currentness).toBe("STALE");
    expect(result.reasonCodes).toEqual(["SOURCE_ASSET_HEAD_CHANGED"]);
    expect(result.currentDependencySnapshotHash).toBeNull();
  });

  it("fails closed for unavailable or malformed current dependency", async () => {
    const fixture = makeFixture();
    fixture.dependencies.dependencySnapshot = { resolve: async () => { throw new OutcomeDependencySnapshotError("SOURCE_ASSET_HEAD_UNAVAILABLE"); } };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED"));
    const malformed = makeFixture();
    malformed.dependencies.dependencySnapshot = { resolve: async () => malformed.resolvedDependency({ ...malformed.assessment.dependency, dependencySnapshotHash: "f".repeat(64) }) };
    await expect(run(malformed)).rejects.toEqual(new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED"));
  });

  it("classifies evaluator revocation as STALE without requiring historical evaluator to be current", async () => {
    const fixture = makeFixture({ state: "READY" });
    const revoked: EvaluatorIdentity = { ...currentDefaultEvaluator(), version: "0.3.0", definitionHash: canonicalSha256({ schemaVersion: currentDefaultEvaluator().schemaVersion, version: "0.3.0" }) };
    fixture.dependencies.evaluator = { current: () => revoked };
    const result = await run(fixture);
    expect(result.currentness).toBe("STALE");
    expect(result.reasonCodes).toEqual(["EVALUATOR_CHANGED"]);
  });

  it.each([
    ["before", "2026-08-21T23:59:59.999Z", "CURRENT"],
    ["at", "2026-08-22T00:00:00.000Z", "EXPIRED"],
    ["after", "2026-08-22T00:00:00.001Z", "EXPIRED"],
  ] as const)("honors expiry boundary %s", async (_label, clockTime, expected) => {
    const fixture = makeFixture({ state: "READY", validUntil: "2026-08-22T00:00:00.000Z" });
    fixture.dependencies.clock = { now: () => clockTime };
    const result = await run(fixture);
    expect(result.currentness).toBe(expected);
    if (expected === "EXPIRED") expect(result.reasonCodes).toEqual(["READINESS_EXPIRED"]);
  });

  it("preserves canonical precedence when dependency changed and readiness is expired", async () => {
    const fixture = makeFixture({ state: "READY", validUntil: "2026-08-22T00:00:00.000Z" });
    fixture.dependencies.clock = { now: () => "2026-08-22T01:00:00.000Z" };
    const changed = changedSnapshot(fixture.assessment.dependency, []);
    fixture.dependencies.dependencySnapshot = { resolve: async () => fixture.resolvedDependency(changed) };
    const result = await run(fixture);
    expect(result.currentness).toBe("STALE");
    expect(result.reasonCodes).toEqual(["DEPENDENCY_SNAPSHOT_CHANGED"]);
  });

  it("executes the exact successful order once and never calls C1-C or D0", async () => {
    const fixture = makeFixture();
    const result = await run(fixture);
    expect(result.currentness).toBe("CURRENT");
    expect(fixture.calls).toEqual(["SCOPED_COMMIT_READ", "C0-D", "HISTORICAL_READINESS_READ", "HISTORICAL_DEPENDENCY_READ", "C1-A", "C1-B"]);
  });

  it.each([
    ["C0-D", "resolveAuthority"],
    ["C1-A", "resolveUniverse"],
    ["C1-B", "resolveDependency"],
  ] as const)("short-circuits after %s failure", async (_label, operation) => {
    const fixture = makeFixture();
    if (operation === "resolveAuthority") fixture.dependencies.requirementAuthority = { resolve: async () => { throw new Error("raw"); } };
    if (operation === "resolveUniverse") fixture.dependencies.signalUniverse = { resolve: async () => { throw new Error("raw"); } };
    if (operation === "resolveDependency") fixture.dependencies.dependencySnapshot = { resolve: async () => { throw new Error("raw"); } };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED"));
    expect(fixture.calls).not.toContain("C1-B");
  });

  it("returns an immutable historical result", async () => {
    const fixture = makeFixture({ state: "READY" });
    const result = await run(fixture);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.authorityCommit)).toBe(true);
    expect(Object.isFrozen(result.historicalReadiness)).toBe(true);
    expect(Object.isFrozen(result.reasonCodes)).toBe(true);
    expect(() => { (result as { currentness: string }).currentness = "STALE"; }).toThrow();
    expect(result.currentness).toBe("CURRENT");
  });

  it("has no fresh readiness, consequence or retry capability", () => {
    const source = readFileSync(resolve(process.cwd(), "src/application/outcome/revalidate-outcome-readiness-authority-currentness.ts"), "utf8");
    expect(source).not.toMatch(/OutcomeReadinessCandidate|evaluateDelegationReadiness|isDelegable|ExecutionAuthority|MutationLease|StateCommit|executor|provider|\.commit\(/);
    expect(source).toContain("NON_ATOMIC_POST_COMMIT_CURRENTNESS");
    expect(source).toContain("SERIALIZED_RECHECK_REQUIRED_FOR_CONSEQUENCE");
    expect(source).toContain("findByScopedId");
  });

  it("keeps D2 server-only and exposes no HTTP route", () => {
    const source = readFileSync(resolve(process.cwd(), "src/server/outcome-readiness-authority-currentness.ts"), "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).not.toMatch(/Request|request\.json|searchParams|route|isDelegable|ExecutionAuthority|MutationLease|StateCommit/);
  });
});

function changedSnapshot(base: DependencySnapshot, signalReferences: DependencySnapshot["signalReferences"]): DependencySnapshot {
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
