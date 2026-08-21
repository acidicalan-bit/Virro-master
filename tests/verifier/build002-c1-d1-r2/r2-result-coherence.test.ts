import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  OutcomeReadinessAuthorityOrchestrationError,
  OutcomeReadinessAuthorityOrchestrator,
  type OutcomeReadinessAuthorityOrchestratorDependencies,
} from "@/src/application/outcome/outcome-readiness-authority-orchestrator";
import type { ReadinessAuthorityCommitInput, ReadinessAuthorityCommitRecord } from "@/src/application/ports/outcome/readiness-authority-commit-repository";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { ResolvedOutcomeDependencySnapshot } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import type { ResolvedOutcomeReadinessCandidate } from "@/src/application/outcome/resolve-outcome-readiness-candidate";
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
  instantEquals,
  verifyQualificationHash,
  verifyReadinessHash,
} from "@/src/domain/outcome/signal-readiness";

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
const SNAPSHOT = "a0000000-0000-4000-8000-000000000001";
const HASH = "a".repeat(64);
const EVALUATION = "2026-08-21T11:00:00.000Z";

const authorityContext: AuthorityContext = {
  principalId: PRINCIPAL,
  tenantId: TENANT,
  membershipId: MEMBERSHIP,
  membershipRole: "OWNER",
  authoritySource: "SUPABASE_AUTH",
  authorizationTimestamp: "2026-08-21T10:00:00.000Z",
};

type Assessment = ReturnType<typeof assessment>;

describe("BUILD002-C1-D1 R2 independent result-coherence verifier", () => {
  it("confirms the server boundary remains server-only and consequence-free", () => {
    const server = readFileSync(resolve("src/server/outcome-readiness-authority-orchestrator.ts"), "utf8");
    const application = readFileSync(resolve("src/application/outcome/outcome-readiness-authority-orchestrator.ts"), "utf8");
    expect(server).toContain('import "server-only"');
    expect(server).toContain("authority");
    expect(server).toContain("outcomeTransactionId");
    expect(server).not.toMatch(/Request|request\.json|searchParams/);
    expect(application).not.toMatch(/isDelegable|ExecutionAuthority|MutationLease|StateCommit|executor\.execute|provider\./);
    expect(collectFiles(resolve("app")).some((file) => readFileSync(file, "utf8").includes("resolveOutcomeReadinessAuthorityCommit"))).toBe(false);
  });

  it("accepts the exact readiness identity and a semantically equal canonical instant", async () => {
    const candidate = assessment("READY");
    const fixture = fixtureFor(candidate, {
      commit: { commit: async () => ({ ...recordFor(candidate), evaluationTime: "2026-08-21T11:00:00Z" }), findById: async () => null, findByReadinessId: async () => null },
    });
    const result = await new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION });
    expect(result.authorityCommit.readinessId).toBe(result.readiness.id);
    expect(instantEquals(result.authorityCommit.evaluationTime, result.readiness.createdAt)).toBe(true);
    expect(result.authorityCommit.committedAt).not.toBe(result.readiness.createdAt);
  });

  it("rejects a different readiness identity while preserving every other field", async () => {
    const candidate = assessment("READY");
    let attempts = 0;
    const fixture = fixtureFor(candidate, { commit: { commit: async () => { attempts += 1; return { ...recordFor(candidate), readinessId: "a0000000-0000-4000-8000-000000000099" }; }, findById: async () => null, findByReadinessId: async () => null } });
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
    expect(attempts).toBe(1);
  });

  it("rejects a different valid evaluation instant", async () => {
    const candidate = assessment("READY");
    let attempts = 0;
    const fixture = fixtureFor(candidate, { commit: { commit: async () => { attempts += 1; return { ...recordFor(candidate), evaluationTime: "2026-08-21T11:01:00.000Z" }; }, findById: async () => null, findByReadinessId: async () => null } });
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
    expect(attempts).toBe(1);
  });

  it("rejects malformed evaluation time as bounded COMMIT_REJECTED", async () => {
    const candidate = assessment("READY");
    let attempts = 0;
    const fixture = fixtureFor(candidate, { commit: { commit: async () => { attempts += 1; return { ...recordFor(candidate), evaluationTime: "not-an-instant" } as ReadinessAuthorityCommitRecord; }, findById: async () => null, findByReadinessId: async () => null } });
    const error = await run(fixture).catch((value: unknown) => value);
    expect(error).toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
    expect(String(error)).not.toMatch(/BUILD002_INVALID_INSTANT|Zod|RangeError|Date/);
    expect(attempts).toBe(1);
  });

  it("rejects sub-millisecond semantic drift without truncation", async () => {
    const candidate = assessment("READY", "2026-08-21T11:00:00.001Z");
    const fixture = fixtureFor(candidate, { commit: { commit: async () => ({ ...recordFor(candidate), evaluationTime: "2026-08-21T11:00:00.002Z" }), findById: async () => null, findByReadinessId: async () => null } });
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
  });

  it.each(["ownerTenantId", "outcomeTransactionId", "principalId", "dependencySnapshotHash", "readinessContentHash"])("retains existing %s binding", async (field) => {
    const candidate = assessment("READY");
    const bad = { ...recordFor(candidate), [field]: field === "ownerTenantId" || field === "outcomeTransactionId" || field === "principalId" ? ATTACKER : HASH } as ReadinessAuthorityCommitRecord;
    const fixture = fixtureFor(candidate, { commit: { commit: async () => bad, findById: async () => null, findByReadinessId: async () => null } });
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
  });

  it.each(["READY", "NONREADY", "HUMAN"])("accepts production-semantic %s exactly once", async (kind) => {
    const candidate = assessment(kind as "READY" | "NONREADY" | "HUMAN");
    const fixture = fixtureFor(candidate);
    const result = await run(fixture);
    expect(fixture.attempts).toBe(1);
    expect(result.authorityCommit.readinessId).toBe(result.readiness.id);
    expect(instantEquals(result.authorityCommit.evaluationTime, result.readiness.createdAt)).toBe(true);
    if (kind === "READY") expect(result.readiness.state).toBe("READY");
    if (kind === "NONREADY") expect(result.readiness.state).toBe("INSUFFICIENT_SIGNAL");
    if (kind === "HUMAN") expect(result.readiness.state).toBe("HUMAN_REVIEW_REQUIRED");
  });

  it("proves zero signals is a non-empty canonical requirement universe", async () => {
    const candidate = assessment("NONREADY");
    expect(candidate.universe.requirements).toHaveLength(1);
    expect(candidate.universe.requirements[0].signals).toHaveLength(0);
    const fixture = fixtureFor(candidate);
    await expect(run(fixture)).resolves.toMatchObject({ readiness: { state: "INSUFFICIENT_SIGNAL" } });
  });

  it("ignores caller readiness, tenant, signal, evaluator and time injection", async () => {
    const candidate = assessment("NONREADY");
    const fixture = fixtureFor(candidate);
    const result = await new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({
      authority: authorityContext,
      outcomeTransactionId: TRANSACTION,
      readiness: { state: "READY" }, ownerTenantId: ATTACKER, signals: [ATTACKER], evaluator: { version: "attacker" }, evaluationTime: "1900-01-01T00:00:00Z",
    } as never);
    expect(result.readiness.state).toBe("INSUFFICIENT_SIGNAL");
    expect(fixture.d0Input[0]).toMatchObject({ ownerTenantId: TENANT, principalId: PRINCIPAL });
  });

  it("does not allow a caller fake non-ready value to downgrade READY", async () => {
    const fixture = fixtureFor(assessment("READY"));
    const result = await new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION, readiness: { state: "INSUFFICIENT_SIGNAL" } } as never);
    expect(result.readiness.state).toBe("READY");
  });

  it("copies AuthorityContext before asynchronous C0-D", async () => {
    const candidate = assessment("READY");
    let release!: () => void;
    const parked = new Promise<void>((resolveGate) => { release = resolveGate; });
    const fixture = fixtureFor(candidate, { requirementAuthority: { resolve: async (input) => { await parked; expect(input.authority.tenantId).toBe(TENANT); return candidate.authority; } } });
    const mutable = { ...authorityContext };
    const running = new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: mutable, outcomeTransactionId: TRANSACTION });
    mutable.tenantId = ATTACKER;
    mutable.principalId = ATTACKER;
    release();
    await running;
    expect(fixture.d0Input[0]).toMatchObject({ ownerTenantId: TENANT, principalId: PRINCIPAL });
  });

  it("captures the exact phase chain and short-circuits before D0", async () => {
    const normal = fixtureFor(assessment("READY"));
    await run(normal);
    expect(normal.calls).toEqual(["C0_D", "C1_A", "C1_B", "C1_C", "MATERIAL", "C1_D0"]);
    for (const [phase, expected] of [["C0_D", []], ["C1_B", ["C0_D", "C1_A"]], ["MATERIAL", ["C0_D", "C1_A", "C1_B", "C1_C"]]] as const) {
      const failing = fixtureFor(assessment("READY"), { [phaseKey(phase)]: { resolve: async () => { throw new Error("raw"); } } } as never);
      await expect(run(failing)).rejects.toBeInstanceOf(OutcomeReadinessAuthorityOrchestrationError);
      expect(failing.calls).toEqual(expected);
      expect(failing.d0Input).toHaveLength(0);
    }
  });

  it.each(["READINESS_AUTHORITY_SIGNAL_UNIVERSE_CHANGED", "READINESS_AUTHORITY_MEMBERSHIP_INVALID", "SOURCE_ASSET_HEAD_CHANGED", "READINESS_AUTHORITY_EXPIRED_BEFORE_COMMIT", "READINESS_AUTHORITY_READBACK_FAILED"])("maps D0 %s once without retry", async (reason) => {
    const fixture = fixtureFor(assessment("READY"), { commit: { commit: async () => { fixture.attempts += 1; throw new Error(reason); }, findById: async () => null, findByReadinessId: async () => null } });
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
    expect(fixture.attempts).toBe(1);
  });

  it("deeply freezes the coherent result pair", async () => {
    const result = await run(fixtureFor(assessment("READY")));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.readiness)).toBe(true);
    expect(Object.isFrozen(result.authorityCommit)).toBe(true);
    expect(() => { (result.readiness as { id: string }).id = ATTACKER; }).toThrow();
    expect(() => { (result.readiness as { state: string }).state = "INSUFFICIENT_SIGNAL"; }).toThrow();
    expect(() => { (result.authorityCommit as { readinessId: string }).readinessId = ATTACKER; }).toThrow();
    expect(() => { (result.authorityCommit as { evaluationTime: string }).evaluationTime = "1900-01-01T00:00:00Z"; }).toThrow();
  });
});

function run(fixture: ReturnType<typeof fixtureFor>) {
  return new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION });
}

function phaseKey(call: string): keyof OutcomeReadinessAuthorityOrchestratorDependencies {
  return ({ C0_D: "requirementAuthority", C1_B: "dependencySnapshot", MATERIAL: "material" } as const)[call as "C0_D" | "C1_B" | "MATERIAL"];
}

function fixtureFor(candidate: Assessment, overrides: Partial<OutcomeReadinessAuthorityOrchestratorDependencies> = {}) {
  const calls: string[] = [];
  const d0Input: ReadinessAuthorityCommitInput[] = [];
  const fixture = {
    calls, d0Input, attempts: 0,
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

function assessment(kind: "READY" | "NONREADY" | "HUMAN", evaluationTime = EVALUATION) {
  const requirement = compileSignalRequirement({ requirementId: `signal.${kind.toLowerCase()}`, subjectKind: "OUTCOME_TRANSACTION", semanticType: "TEXT", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: kind === "HUMAN" }, dependencySelectors: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, required: true }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, required: true }, { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, required: true }], blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: HASH, policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, evaluationTime);
  const signal = kind === "NONREADY" ? null : createSignal({ ownerTenantId: TENANT, transactionId: TRANSACTION, requirementId: requirement.requirementId, payload: { value: "verified" }, source: { identity: "fixture", version: "1", hash: HASH }, provenance: "OBSERVED", capturedAt: evaluationTime, validUntil: null, dependency: { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: HASH }, schemaVersion: "build002-signal-v0.2", signalId: `b0000000-0000-4000-8000-00000000000${kind === "HUMAN" ? "2" : "1"}` });
  const snapshot = createDependencySnapshot({ schemaVersion: BUILD002_DEPENDENCY_SCHEMA_VERSION, ownerTenantId: TENANT, transactionId: TRANSACTION, requirementDefinitionHashes: [requirement.requirementDefinitionHash], signalReferences: signal ? [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }] : [], dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: HASH }, { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: HASH }, { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, hash: HASH }], blueprintHash: HASH, policyHash: null, taskSpecHash: null, transactionSemanticHash: HASH, sourceAssetVersionHash: HASH, contextLensHash: null });
  const evaluator = currentDefaultEvaluator();
  const qualification = evaluateSignalQualification({ requirement, signals: signal ? [signal] : [], currentDependencySnapshot: snapshot, evaluator, evaluationTime, idFactory: () => "c0000000-0000-4000-8000-000000000001" });
  const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TRANSACTION }, requirements: [requirement], qualifications: [qualification], dependencySnapshot: snapshot, taskSpecHash: null, sourceAssetVersionHash: HASH, blueprintHash: HASH, policyHash: null, evaluator, evaluationTime, idFactory: () => kind === "HUMAN" ? "d0000000-0000-4000-8000-000000000003" : kind === "NONREADY" ? "d0000000-0000-4000-8000-000000000002" : "d0000000-0000-4000-8000-000000000001" });
  expect(verifyQualificationHash(qualification)).toBe(true);
  expect(verifyReadinessHash(readiness)).toBe(true);
  const resolvedAuthority = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, binding: { schemaVersion: "outcome-transaction-requirement-binding-v0.1", ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, blueprint: { id: BLUEPRINT, version: 1, hash: HASH }, requirementProfile: { id: PROFILE, version: 1, hash: HASH }, policy: { id: null, hash: null }, bindingHash: HASH, boundAt: "2026-08-21T10:00:00.000Z" }, blueprint: { id: BLUEPRINT, version: 1, hash: HASH }, requirementProfile: { id: PROFILE, version: 1, hash: HASH }, signalRequirements: [requirement], resolvedAt: "2026-08-21T10:00:00.000Z" } as ResolvedOutcomeRequirementAuthority;
  const resolvedDependency = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, dependencySnapshot: snapshot } as ResolvedOutcomeDependencySnapshot;
  const resolvedUniverse = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, requirements: [{ requirement, signals: signal ? [signal] : [] }] } as ResolvedOutcomeSignalUniverse;
  const resolvedCandidate = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, evaluationTime, evaluator, dependencySnapshot: snapshot, qualifications: [qualification], readiness, consistency: "NON_ATOMIC_CANDIDATE_EVALUATION" } as ResolvedOutcomeReadinessCandidate;
  return { authority: resolvedAuthority, dependency: resolvedDependency, universe: resolvedUniverse, candidate: resolvedCandidate };
}

function material(): ReadinessAuthorityCommitInput["transaction"] {
  return { ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "preserve source" };
}

function recordFor(candidate: Assessment): ReadinessAuthorityCommitRecord {
  return { authorityCommitId: "e0000000-0000-4000-8000-000000000001", ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, principalId: PRINCIPAL, dependencySnapshotId: SNAPSHOT, dependencySnapshotHash: candidate.candidate.dependencySnapshot.dependencySnapshotHash, readinessId: candidate.candidate.readiness.id, readinessContentHash: candidate.candidate.readiness.readinessContentHash, evaluationTime: candidate.candidate.readiness.createdAt, committedAt: "2026-08-21T11:00:01.000Z", schemaVersion: "build002-readiness-authority-commit-v0.1" };
}

function collectFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}
