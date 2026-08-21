// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  OutcomeReadinessAuthorityOrchestrationError,
  OutcomeReadinessAuthorityOrchestrator,
  type OutcomeReadinessAuthorityOrchestratorDependencies,
} from "@/src/application/outcome/outcome-readiness-authority-orchestrator";
import {
  OutcomeReadinessAuthorityCommitMaterialError,
  OutcomeReadinessAuthorityCommitMaterialResolver,
} from "@/src/application/outcome/resolve-outcome-readiness-authority-commit-material";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { ResolvedOutcomeDependencySnapshot } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import type { ResolvedOutcomeReadinessCandidate } from "@/src/application/outcome/resolve-outcome-readiness-candidate";
import type { AuthorityContext } from "@/src/domain/auth/authority";
import type { ReadinessAuthorityCommitInput, ReadinessAuthorityCommitRecord } from "@/src/application/ports/outcome/readiness-authority-commit-repository";
import type { AssetRecord, AssetVersionRecord, OutcomeTransactionRecord } from "@/src/application/ports/repositories";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
import {
  BUILD002_DEPENDENCY_IDENTITIES,
  BUILD002_DEPENDENCY_SCHEMA_VERSION,
  compileSignalRequirement,
  createDependencySnapshot,
  createSignal,
  currentDefaultEvaluator,
  evaluateDelegationReadiness,
  evaluateSignalQualification,
  verifyQualificationHash,
  verifyReadinessHash,
} from "@/src/domain/outcome/signal-readiness";
import {
  SOURCE_ASSET_VERSION_BINDING_VERSION,
  TRANSACTION_SEMANTIC_BINDING_VERSION,
} from "@/src/application/outcome/resolve-outcome-dependency-snapshot";

const TENANT = "10000000-0000-4000-8000-000000000001";
const ATTACKER = "10000000-0000-4000-8000-000000000099";
const PRINCIPAL = "20000000-0000-4000-8000-000000000001";
const MEMBERSHIP = "30000000-0000-4000-8000-000000000001";
const TRANSACTION = "40000000-0000-4000-8000-000000000001";
const PROJECT = "50000000-0000-4000-8000-000000000001";
const ASSET = "60000000-0000-4000-8000-000000000001";
const VERSION = "70000000-0000-4000-8000-000000000001";
const BLUEPRINT = "80000000-0000-4000-8000-000000000001";
const PROFILE = "90000000-0000-4000-8000-000000000001";
const SNAPSHOT_ID = "a0000000-0000-4000-8000-000000000001";
const HASH = "a".repeat(64);
const EVALUATION_TIME = "2026-08-21T10:01:00.000Z";

const authorityContext: AuthorityContext = {
  principalId: PRINCIPAL,
  tenantId: TENANT,
  membershipId: MEMBERSHIP,
  membershipRole: "OWNER",
  authoritySource: "SUPABASE_AUTH",
  authorizationTimestamp: "2026-08-21T10:00:00.000Z",
};

type Assessment = ReturnType<typeof assessment>;

describe("BUILD002-C1-D1-R1 independent adversarial verifier", () => {
  it("proves the server-only composition and no alternate consequence path", () => {
    const server = readFileSync(resolve("src/server/outcome-readiness-authority-orchestrator.ts"), "utf8");
    const application = readFileSync(resolve("src/application/outcome/outcome-readiness-authority-orchestrator.ts"), "utf8");
    expect(server).toContain('import "server-only"');
    expect(server).toContain("authority");
    expect(server).toContain("outcomeTransactionId");
    for (const construction of [
      "createTenantOutcomeRequirementAuthorityRepositories",
      "createTenantBuild002EvaluationRepositories",
      "createTenantBuild002DependencyRepositories",
      "createTenantReadinessAuthorityCommitRepository",
      "requirementAuthority",
      "signalUniverse",
      "dependencySnapshot",
      "readinessCandidate",
      "material",
      "commit",
    ]) expect(server).toContain(construction);
    expect(server).not.toMatch(/Request|request\.json|searchParams/);
    expect(application).not.toMatch(/isDelegable|ExecutionAuthority|MutationLease|StateCommit|executor\.execute|provider\./);
    expect(application).not.toMatch(/readiness\.state\s*!==|state\s*===\s*['"]READY['"]|READY_WITH_CONDITIONS|BLOCKED_BY_POLICY/);
    const routeFiles = collectFiles(resolve("app"));
    expect(routeFiles.some((file) => readFileSync(file, "utf8").includes("resolveOutcomeReadinessAuthorityCommit"))).toBe(false);
  });

  it("keeps a caller AuthorityContext mutation outside the copied trust path", async () => {
    const ready = assessment("READY");
    let release!: () => void;
    const gate = new Promise<void>((resolveGate) => { release = resolveGate; });
    let c0Input: { authority: AuthorityContext } | undefined;
    const fixture = fixtureFor(ready, {
      requirementAuthority: { resolve: async (input) => { c0Input = input; await gate; return ready.authority; } },
    });
    const orchestrator = new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies);
    const mutable = { ...authorityContext };
    const running = orchestrator.run({ authority: mutable, outcomeTransactionId: TRANSACTION });
    mutable.tenantId = ATTACKER;
    mutable.principalId = ATTACKER;
    mutable.membershipId = ATTACKER;
    release();
    await running;
    expect(c0Input?.authority).toMatchObject({ tenantId: TENANT, principalId: PRINCIPAL, membershipId: MEMBERSHIP });
    expect(fixture.d0Input[0]).toMatchObject({ ownerTenantId: TENANT, principalId: PRINCIPAL });
  });

  it("captures every dependency operation at construction", async () => {
    const ready = assessment("READY");
    const fixture = fixtureFor(ready);
    const orchestrator = new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies);
    for (const dependency of Object.values(fixture.dependencies)) {
      if (dependency && typeof dependency === "object" && "resolve" in dependency) (dependency as unknown as { resolve: () => never }).resolve = () => { throw new Error("rebound"); };
      if (dependency && typeof dependency === "object" && "commit" in dependency) (dependency as unknown as { commit: () => never }).commit = () => { throw new Error("rebound"); };
    }
    await expect(orchestrator.run({ authority: authorityContext, outcomeTransactionId: TRANSACTION })).resolves.toMatchObject({
      authorityScope: "COMMIT_TIME_SERIALIZED",
    });
  });

  it("ignores caller-owned readiness, tenant, signal, evaluator and material extras", async () => {
    const nonReady = assessment("NONREADY");
    const fixture = fixtureFor(nonReady);
    const result = await new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({
      authority: authorityContext,
      outcomeTransactionId: TRANSACTION,
      ownerTenantId: ATTACKER,
      principalId: ATTACKER,
      signals: [ATTACKER],
      signalIds: [ATTACKER],
      readiness: { state: "READY" },
      qualifications: [{ ownerTenantId: ATTACKER }],
      dependencySnapshot: { ownerTenantId: ATTACKER },
      evaluator: { version: "attacker" },
      evaluationTime: "1900-01-01T00:00:00.000Z",
      validUntil: "1900-01-01T00:00:00.000Z",
      asset: { ownerTenantId: ATTACKER },
      sourceVersion: { ownerTenantId: ATTACKER },
      binding: { ownerTenantId: ATTACKER },
    } as never);
    expect(result.readiness.state).toBe("INSUFFICIENT_SIGNAL");
    expect(fixture.d0Input[0]).toMatchObject({ ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, principalId: PRINCIPAL });
    expect(fixture.d0Input[0].readiness.state).toBe("INSUFFICIENT_SIGNAL");
  });

  it("does not let a caller downgrade a canonical READY assessment", async () => {
    const fixture = fixtureFor(assessment("READY"));
    const result = await new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({
      authority: authorityContext,
      outcomeTransactionId: TRANSACTION,
      readiness: { state: "INSUFFICIENT_SIGNAL" },
    } as never);
    expect(result.readiness.state).toBe("READY");
  });

  it("runs the six phases exactly once and short-circuits every failed phase", async () => {
    const ready = assessment("READY");
    const normal = fixtureFor(ready);
    await new OutcomeReadinessAuthorityOrchestrator(normal.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION });
    expect(normal.calls).toEqual(["C0_D", "C1_A", "C1_B", "C1_C", "MATERIAL", "C1_D0"]);
    const phases = [
      ["AUTHORITY_PHASE_FAILED", "C0_D", []],
      ["SIGNAL_UNIVERSE_PHASE_FAILED", "C1_A", ["C0_D"]],
      ["DEPENDENCY_PHASE_FAILED", "C1_B", ["C0_D", "C1_A"]],
      ["READINESS_PHASE_FAILED", "C1_C", ["C0_D", "C1_A", "C1_B"]],
      ["MATERIAL_PHASE_FAILED", "MATERIAL", ["C0_D", "C1_A", "C1_B", "C1_C"]],
    ] as const;
    for (const [errorCode, failCall, expectedCalls] of phases) {
      const fixture = fixtureFor(ready, {
        [phaseKey(failCall)]: { resolve: async () => { throw new Error("raw database detail"); } },
      } as never);
      await expect(new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION }))
        .rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError(errorCode));
      expect(fixture.calls).toEqual(expectedCalls);
      expect(fixture.d0Input).toHaveLength(0);
    }
  });

  it.each(["READY", "NONREADY", "HUMAN"]) ("commits valid production-semantic %s assessment once", async (kind) => {
    const candidate = assessment(kind as "READY" | "NONREADY" | "HUMAN");
    const fixture = fixtureFor(candidate);
    const result = await new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION });
    expect(fixture.d0Input).toHaveLength(1);
    expect(result.authorityCommit.readinessContentHash).toBe(result.readiness.readinessContentHash);
    expect(result.authorityCommit.readinessId).toBe(result.readiness.id);
    expect(result.authorityScope).toBe("COMMIT_TIME_SERIALIZED");
    expect(result.postCommitCurrentness).toBe("REVALIDATION_REQUIRED_FOR_CONSEQUENCE");
    if (kind === "READY") expect(result.readiness.state).toBe("READY");
    if (kind === "NONREADY") expect(result.readiness.state).toBe("INSUFFICIENT_SIGNAL");
    if (kind === "HUMAN") expect(result.readiness.state).toBe("HUMAN_REVIEW_REQUIRED");
  });

  it("proves a canonical requirement with zero signals, not zero requirements", async () => {
    const candidate = assessment("NONREADY");
    expect(candidate.universe.requirements).toHaveLength(1);
    expect(candidate.universe.requirements[0].signals).toHaveLength(0);
    expect(verifyQualificationHash(candidate.candidate.qualifications[0])).toBe(true);
    expect(verifyReadinessHash(candidate.candidate.readiness)).toBe(true);
    const fixture = fixtureFor(candidate);
    await expect(new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION })).resolves.toBeDefined();
    expect(fixture.d0Input).toHaveLength(1);
  });

  it.each(["READINESS_AUTHORITY_SIGNAL_UNIVERSE_CHANGED", "READINESS_AUTHORITY_MEMBERSHIP_INVALID", "SOURCE_ASSET_HEAD_CHANGED", "READINESS_AUTHORITY_EXPIRED_BEFORE_COMMIT", "READINESS_AUTHORITY_READBACK_FAILED"])
    ("maps D0 %s to one bounded rejection", async (reason) => {
      const fixture = fixtureFor(assessment("READY"), { commit: { commit: async () => { fixture.attempts += 1; throw new Error(reason); }, findById: async () => null, findByReadinessId: async () => null } });
      await expect(new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION }))
        .rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
      expect(fixture.attempts).toBe(1);
      expect(fixture.calls).toEqual(["C0_D", "C1_A", "C1_B", "C1_C", "MATERIAL"]);
    });

  it("deeply freezes result semantics and exposes no consequence boolean", async () => {
    const fixture = fixtureFor(assessment("READY"));
    const result = await new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.authorityCommit)).toBe(true);
    expect(Object.isFrozen(result.readiness)).toBe(true);
    expect(() => { (result.authorityCommit as { ownerTenantId: string }).ownerTenantId = ATTACKER; }).toThrow();
    expect(() => { (result.readiness as { state: string }).state = "INSUFFICIENT_SIGNAL"; }).toThrow();
    expect(() => { (result.readiness.evaluator as { version: string }).version = "attacker"; }).toThrow();
    expect(result).not.toHaveProperty("isDelegable");
    expect(result).not.toHaveProperty("canExecute");
    expect(result).not.toHaveProperty("currentAuthority");
  });

  it.each(["ownerTenantId", "outcomeTransactionId", "principalId", "dependencySnapshotHash", "readinessContentHash"])
    ("rejects a contradictory D0 %s record", async (field) => {
      const candidate = assessment("READY");
      const base = recordFor(candidate);
      const bad = { ...base, [field]: field === "principalId" || field === "ownerTenantId" || field === "outcomeTransactionId" ? ATTACKER : HASH } as ReadinessAuthorityCommitRecord;
      const fixture = fixtureFor(candidate, { commit: { commit: async () => bad, findById: async () => null, findByReadinessId: async () => null } });
      await expect(new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION }))
        .rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
      expect(fixture.calls).toEqual(["C0_D", "C1_A", "C1_B", "C1_C", "MATERIAL"]);
    });

  it("rejects a D0 record whose readiness ID contradicts the returned readiness", async () => {
    const candidate = assessment("READY");
    const fixture = fixtureFor(candidate, {
      commit: { commit: async () => ({ ...recordFor(candidate), readinessId: "a0000000-0000-4000-8000-000000000099" }), findById: async () => null, findByReadinessId: async () => null },
    });
    await expect(new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION }))
      .rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
  });

  it("rejects a D0 record whose evaluation time contradicts readiness creation", async () => {
    const candidate = assessment("READY");
    const fixture = fixtureFor(candidate, {
      commit: { commit: async () => ({ ...recordFor(candidate), evaluationTime: "2026-08-21T11:01:00.000Z" }), findById: async () => null, findByReadinessId: async () => null },
    });
    await expect(new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION }))
      .rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
  });

  it("proves material drift fails before D0 for all frozen binding dimensions", async () => {
    const base = materialFixture();
    const cases = [
      ["foreign tenant", { transaction: { ...base.transaction, ownerTenantId: ATTACKER } }, "MATERIAL_AUTHORITY_INVALID"],
      ["foreign asset tenant", { asset: { ...base.asset, ownerTenantId: ATTACKER } }, "MATERIAL_AUTHORITY_INVALID"],
      ["foreign version tenant", { version: { ...base.version, ownerTenantId: ATTACKER } }, "MATERIAL_AUTHORITY_INVALID"],
      ["asset project mismatch", { asset: { ...base.asset, projectId: ATTACKER } }, "MATERIAL_AUTHORITY_INVALID"],
      ["version asset mismatch", { version: { ...base.version, assetId: ATTACKER } }, "MATERIAL_AUTHORITY_INVALID"],
      ["head drift", { asset: { ...base.asset, currentVersionId: ATTACKER } }, "MATERIAL_HEAD_CHANGED"],
      ["transaction hash drift", { snapshot: { ...base.snapshot, transactionSemanticHash: HASH } }, "MATERIAL_SNAPSHOT_MISMATCH"],
      ["version hash drift", { snapshot: { ...base.snapshot, sourceAssetVersionHash: HASH } }, "MATERIAL_SNAPSHOT_MISMATCH"],
      ["blueprint hash drift", { snapshot: { ...base.snapshot, blueprintHash: "b".repeat(64) } }, "MATERIAL_SNAPSHOT_MISMATCH"],
    ] as const;
    for (const [label, override, code] of cases) {
      const current = { ...base, ...override };
      const resolver = new OutcomeReadinessAuthorityCommitMaterialResolver({
        transactions: { findById: async () => current.transaction },
        assets: { findById: async () => current.asset },
        assetVersions: { findById: async () => current.version },
      });
      await expect(resolver.resolve({ authority: current.authority, dependency: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, dependencySnapshot: current.snapshot } }))
        .rejects.toEqual(new OutcomeReadinessAuthorityCommitMaterialError(code as never));
      expect(label).toBeTruthy();
    }
  });
});

function phaseKey(call: string): keyof OutcomeReadinessAuthorityOrchestratorDependencies {
  return ({ C0_D: "requirementAuthority", C1_A: "signalUniverse", C1_B: "dependencySnapshot", C1_C: "readinessCandidate", MATERIAL: "material" } as const)[call as "C0_D" | "C1_A" | "C1_B" | "C1_C" | "MATERIAL"];
}

function fixtureFor(candidate: Assessment, overrides: Partial<OutcomeReadinessAuthorityOrchestratorDependencies> = {}) {
  const calls: string[] = [];
  const d0Input: ReadinessAuthorityCommitInput[] = [];
  const fixture = {
    calls,
    d0Input,
    attempts: 0,
    dependencies: {
      requirementAuthority: { resolve: async () => { calls.push("C0_D"); return candidate.authority; } },
      signalUniverse: { resolve: async () => { calls.push("C1_A"); return candidate.universe; } },
      dependencySnapshot: { resolve: async () => { calls.push("C1_B"); return candidate.dependency; } },
      readinessCandidate: { resolve: () => { calls.push("C1_C"); return candidate.candidate; } },
      material: { resolve: async () => { calls.push("MATERIAL"); return material(); } },
      commit: { commit: async (input: ReadinessAuthorityCommitInput) => { calls.push("C1_D0"); d0Input.push(input); fixture.attempts += 1; return recordFor(candidate); }, findById: async () => null, findByReadinessId: async () => null },
      ...overrides,
    } as OutcomeReadinessAuthorityOrchestratorDependencies,
  };
  return fixture;
}

function assessment(kind: "READY" | "NONREADY" | "HUMAN") {
  const requirement = compileSignalRequirement({
    requirementId: `signal.${kind.toLowerCase()}`,
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "TEXT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: kind === "HUMAN" },
    dependencySelectors: [
      { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, required: true },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, required: true },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, required: true },
    ],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: HASH,
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, EVALUATION_TIME);
  const signal = kind === "NONREADY" ? null : createSignal({
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId: requirement.requirementId,
    payload: { value: "verified" },
    source: { identity: "fixture", version: "1", hash: HASH },
    provenance: "OBSERVED",
    capturedAt: EVALUATION_TIME,
    validUntil: null,
    dependency: { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: HASH },
    schemaVersion: "build002-signal-v0.2",
    signalId: kind === "HUMAN" ? "b0000000-0000-4000-8000-000000000002" : "b0000000-0000-4000-8000-000000000001",
  });
  const snapshot = createDependencySnapshot({
    schemaVersion: BUILD002_DEPENDENCY_SCHEMA_VERSION,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementDefinitionHashes: [requirement.requirementDefinitionHash],
    signalReferences: signal ? [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }] : [],
    dependencyBindings: [
      { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: HASH },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: HASH },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, hash: HASH },
    ],
    blueprintHash: HASH,
    policyHash: null,
    taskSpecHash: null,
    transactionSemanticHash: HASH,
    sourceAssetVersionHash: HASH,
    contextLensHash: null,
  });
  const evaluator = currentDefaultEvaluator();
  const qualification = evaluateSignalQualification({ requirement, signals: signal ? [signal] : [], currentDependencySnapshot: snapshot, evaluator, evaluationTime: EVALUATION_TIME, idFactory: () => "c0000000-0000-4000-8000-000000000001" });
  const readiness = evaluateDelegationReadiness({
    subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TRANSACTION },
    requirements: [requirement],
    qualifications: [qualification],
    dependencySnapshot: snapshot,
    taskSpecHash: null,
    sourceAssetVersionHash: HASH,
    blueprintHash: HASH,
    policyHash: null,
    evaluator,
    evaluationTime: EVALUATION_TIME,
    idFactory: () => kind === "HUMAN" ? "d0000000-0000-4000-8000-000000000003" : kind === "NONREADY" ? "d0000000-0000-4000-8000-000000000002" : "d0000000-0000-4000-8000-000000000001",
  });
  expect(verifyQualificationHash(qualification)).toBe(true);
  expect(verifyReadinessHash(readiness)).toBe(true);
  const resolvedAuthority = {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    binding: { schemaVersion: "outcome-transaction-requirement-binding-v0.1", ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, blueprint: { id: BLUEPRINT, version: 1, hash: HASH }, requirementProfile: { id: PROFILE, version: 1, hash: HASH }, policy: { id: null, hash: null }, bindingHash: HASH, boundAt: "2026-08-21T10:00:00.000Z" },
    blueprint: { id: BLUEPRINT, version: 1, hash: HASH },
    requirementProfile: { id: PROFILE, version: 1, hash: HASH },
    signalRequirements: [requirement],
    resolvedAt: "2026-08-21T10:00:00.000Z",
  } as ResolvedOutcomeRequirementAuthority;
  const resolvedDependency = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, dependencySnapshot: snapshot } as ResolvedOutcomeDependencySnapshot;
  const resolvedUniverse = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, requirements: [{ requirement, signals: signal ? [signal] : [] }] } as ResolvedOutcomeSignalUniverse;
  const resolvedCandidate = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, evaluationTime: EVALUATION_TIME, evaluator, dependencySnapshot: snapshot, qualifications: [qualification], readiness, consistency: "NON_ATOMIC_CANDIDATE_EVALUATION" } as ResolvedOutcomeReadinessCandidate;
  return { authority: resolvedAuthority, dependency: resolvedDependency, universe: resolvedUniverse, candidate: resolvedCandidate };
}

function material(): ReadinessAuthorityCommitInput["transaction"] {
  return { ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "preserve source" };
}

function recordFor(candidate: Assessment): ReadinessAuthorityCommitRecord {
  return { authorityCommitId: "e0000000-0000-4000-8000-000000000001", ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, principalId: PRINCIPAL, dependencySnapshotId: SNAPSHOT_ID, dependencySnapshotHash: candidate.candidate.dependencySnapshot.dependencySnapshotHash, readinessId: candidate.candidate.readiness.id, readinessContentHash: candidate.candidate.readiness.readinessContentHash, evaluationTime: candidate.candidate.readiness.createdAt, committedAt: "2026-08-21T10:01:01.000Z", schemaVersion: "build002-readiness-authority-commit-v0.1" };
}

function materialFixture() {
  const transaction: OutcomeTransactionRecord = { id: TRANSACTION, ownerTenantId: TENANT, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, status: "PREPARED", rawRequest: "preserve source", createdAt: "2026-08-21T10:00:00.000Z", updatedAt: "2026-08-21T10:00:00.000Z", completedAt: null, abortReason: null };
  const asset: AssetRecord = { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, name: "source", description: null, currentVersionId: VERSION, createdAt: transaction.createdAt, updatedAt: transaction.updatedAt };
  const version: AssetVersionRecord = { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, state: { width: 10 }, parentVersionId: null, createdAt: transaction.createdAt };
  const txHash = canonicalSha256({ schemaVersion: TRANSACTION_SEMANTIC_BINDING_VERSION, ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: transaction.rawRequest });
  const versionHash = canonicalSha256({ schemaVersion: SOURCE_ASSET_VERSION_BINDING_VERSION, ownerTenantId: TENANT, assetId: ASSET, versionId: VERSION, versionNumber: 1, parentVersionId: null, state: version.state });
  const snapshot = createDependencySnapshot({ schemaVersion: BUILD002_DEPENDENCY_SCHEMA_VERSION, ownerTenantId: TENANT, transactionId: TRANSACTION, requirementDefinitionHashes: [], signalReferences: [], dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: HASH }, { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: versionHash }, { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, hash: txHash }], blueprintHash: HASH, policyHash: null, taskSpecHash: null, transactionSemanticHash: txHash, sourceAssetVersionHash: versionHash, contextLensHash: null });
  const auth = assessment("NONREADY").authority;
  return { transaction, asset, version, snapshot, authority: auth };
}

function collectFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}
