import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
import type { ReadinessAuthorityCommitInput } from "@/src/application/ports/outcome/readiness-authority-commit-repository";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
import type { AssetRecord, AssetVersionRecord, OutcomeTransactionRecord } from "@/src/application/ports/repositories";
import {
  SOURCE_ASSET_VERSION_BINDING_VERSION,
  TRANSACTION_SEMANTIC_BINDING_VERSION,
} from "@/src/application/outcome/resolve-outcome-dependency-snapshot";

const TENANT = "10000000-0000-4000-8000-000000000001";
const PRINCIPAL = "20000000-0000-4000-8000-000000000001";
const MEMBERSHIP = "30000000-0000-4000-8000-000000000001";
const TRANSACTION = "40000000-0000-4000-8000-000000000001";
const PROJECT = "50000000-0000-4000-8000-000000000001";
const ASSET = "60000000-0000-4000-8000-000000000001";
const VERSION = "70000000-0000-4000-8000-000000000001";
const BLUEPRINT = "80000000-0000-4000-8000-000000000001";
const PROFILE = "90000000-0000-4000-8000-000000000001";
const HASH = "a".repeat(64);

const authorityContext: AuthorityContext = Object.freeze({
  principalId: PRINCIPAL,
  tenantId: TENANT,
  membershipId: MEMBERSHIP,
  membershipRole: "OWNER",
  authoritySource: "SUPABASE_AUTH",
  authorizationTimestamp: "2026-08-21T10:00:00.000Z",
});

function authority(): ResolvedOutcomeRequirementAuthority {
  return {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    binding: {
      schemaVersion: "outcome-transaction-requirement-binding-v0.1",
      ownerTenantId: TENANT,
      outcomeTransactionId: TRANSACTION,
      blueprint: { id: BLUEPRINT, version: 1, hash: HASH },
      requirementProfile: { id: PROFILE, version: 1, hash: HASH },
      policy: { id: null, hash: null },
      bindingHash: HASH,
      boundAt: "2026-08-21T10:00:00.000Z",
    },
    blueprint: { id: BLUEPRINT, version: 1, hash: HASH } as ResolvedOutcomeRequirementAuthority["blueprint"],
    requirementProfile: { id: PROFILE, version: 1, hash: HASH } as ResolvedOutcomeRequirementAuthority["requirementProfile"],
    signalRequirements: [],
    resolvedAt: "2026-08-21T10:00:00.000Z",
  };
}

function dependency(): ResolvedOutcomeDependencySnapshot {
  return {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    dependencySnapshot: {
      schemaVersion: "build002-dependency-snapshot-v0.2",
      ownerTenantId: TENANT,
      transactionId: TRANSACTION,
      requirementDefinitionHashes: [],
      signalReferences: [],
      dependencyBindings: [],
      blueprintHash: HASH,
      policyHash: null,
      taskSpecHash: null,
      transactionSemanticHash: HASH,
      sourceAssetVersionHash: HASH,
      contextLensHash: null,
      dependencySnapshotHash: HASH,
    },
  } as ResolvedOutcomeDependencySnapshot;
}

function universe(): ResolvedOutcomeSignalUniverse {
  return { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, requirements: [] };
}

function candidate(): ResolvedOutcomeReadinessCandidate {
  return {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    evaluationTime: "2026-08-21T10:01:00.000Z",
    evaluator: { schemaVersion: "build002-qualification-evaluator-v0.1", version: "0.2.0", definitionHash: HASH },
    dependencySnapshot: dependency().dependencySnapshot,
    qualifications: [],
    readiness: {
      schemaVersion: "build002-signal-readiness-v0.3",
      id: "a0000000-0000-4000-8000-000000000001",
      ownerTenantId: TENANT,
      transactionId: TRANSACTION,
      requirementSetHash: HASH,
      qualificationSetHash: HASH,
      dependencySnapshotHash: HASH,
      taskSpecHash: null,
      sourceAssetVersionHash: HASH,
      blueprintHash: HASH,
      policyHash: null,
      evaluator: { schemaVersion: "build002-qualification-evaluator-v0.1", version: "0.2.0", definitionHash: HASH },
      state: "READY",
      blockingCodes: [],
      conditionCodes: [],
      createdAt: "2026-08-21T10:01:00.000Z",
      validUntil: null,
      readinessContentHash: HASH,
    },
    consistency: "NON_ATOMIC_CANDIDATE_EVALUATION",
  } as ResolvedOutcomeReadinessCandidate;
}

function material(): ReadinessAuthorityCommitInput["transaction"] {
  return {
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    projectId: PROJECT,
    assetId: ASSET,
    baseVersionId: VERSION,
    rawRequest: "preserve source",
  };
}

function orchestratorFixture(overrides: Partial<OutcomeReadinessAuthorityOrchestratorDependencies> = {}) {
  const calls: string[] = [];
  const record = {
    authorityCommitId: "b0000000-0000-4000-8000-000000000001",
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    principalId: PRINCIPAL,
    dependencySnapshotId: "c0000000-0000-4000-8000-000000000001",
    dependencySnapshotHash: HASH,
    readinessId: "a0000000-0000-4000-8000-000000000001",
    readinessContentHash: HASH,
    evaluationTime: "2026-08-21T10:01:00.000Z",
    committedAt: "2026-08-21T10:01:01.000Z",
    schemaVersion: "build002-readiness-authority-commit-v0.1" as const,
  };
  const dependencies: OutcomeReadinessAuthorityOrchestratorDependencies = {
    requirementAuthority: { resolve: async () => { calls.push("C0-D"); return authority(); } },
    signalUniverse: { resolve: async () => { calls.push("C1-A"); return universe(); } },
    dependencySnapshot: { resolve: async () => { calls.push("C1-B"); return dependency(); } },
    readinessCandidate: { resolve: () => { calls.push("C1-C"); return candidate(); } },
    material: { resolve: async () => { calls.push("MATERIAL"); return { transaction: material(), asset: { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, currentVersionId: VERSION }, sourceVersion: { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, parentVersionId: null, state: {} }, binding: { bindingHash: HASH, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: HASH, requirementProfileId: PROFILE, requirementProfileVersion: 1, requirementProfileHash: HASH } }; } },
    commit: { commit: async (input) => { calls.push("D0"); expect(input.principalId).toBe(PRINCIPAL); return record; }, findById: async () => null, findByReadinessId: async () => null },
    ...overrides,
  };
  return { calls, dependencies, record };
}

describe("BUILD002-C1-D1 server-owned readiness authority orchestration", () => {
  it("runs C0-D, C1-A, C1-B, C1-C, material and D0 exactly once", async () => {
    const fixture = orchestratorFixture();
    const result = await new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION });
    expect(fixture.calls).toEqual(["C0-D", "C1-A", "C1-B", "C1-C", "MATERIAL", "D0"]);
    expect(result.authorityScope).toBe("COMMIT_TIME_SERIALIZED");
    expect(result.postCommitCurrentness).toBe("REVALIDATION_REQUIRED_FOR_CONSEQUENCE");
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("derives the D0 input from trusted phases, ignoring tenant, signal, readiness, evaluator and time injection", async () => {
    let received: ReadinessAuthorityCommitInput | undefined;
    const fixture = orchestratorFixture({
      commit: { commit: async (input) => { received = input; return fixtureRecord(); }, findById: async () => null, findByReadinessId: async () => null },
    });
    await new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({
      authority: authorityContext,
      outcomeTransactionId: TRANSACTION,
      tenantId: "attacker",
      signalIds: ["attacker"],
      readiness: { state: "READY" },
      evaluator: { id: "attacker" },
      evaluationTime: "1900-01-01T00:00:00.000Z",
    } as never);
    expect(received?.ownerTenantId).toBe(TENANT);
    expect(received?.outcomeTransactionId).toBe(TRANSACTION);
    expect(received?.transaction.rawRequest).toBe("preserve source");
  });

  it("captures the provenance operations so later caller rebinding cannot replace them", async () => {
    const fixture = orchestratorFixture();
    (fixture.dependencies.requirementAuthority as { resolve: OutcomeReadinessAuthorityOrchestratorDependencies["requirementAuthority"]["resolve"] }).resolve = async () => { throw new Error("replaced"); };
    await expect(new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION }))
      .rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("AUTHORITY_PHASE_FAILED"));
    const stable = orchestratorFixture();
    const orchestrator = new OutcomeReadinessAuthorityOrchestrator(stable.dependencies);
    (stable.dependencies.requirementAuthority as { resolve: OutcomeReadinessAuthorityOrchestratorDependencies["requirementAuthority"]["resolve"] }).resolve = async () => { throw new Error("replaced"); };
    await expect(orchestrator.run({ authority: authorityContext, outcomeTransactionId: TRANSACTION })).resolves.toMatchObject({ authorityScope: "COMMIT_TIME_SERIALIZED" });
  });

  it("rejects a non-ready C1-C candidate before the atomic commit", async () => {
    const fixture = orchestratorFixture({
      readinessCandidate: { resolve: () => { fixture.calls.push("C1-C"); return { ...candidate(), readiness: { ...candidate().readiness, state: "INSUFFICIENT_SIGNAL" } } as unknown as ResolvedOutcomeReadinessCandidate; } },
    });
    await expect(new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION }))
      .rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("READINESS_PHASE_FAILED"));
    expect(fixture.calls).toEqual(["C0-D", "C1-A", "C1-B", "C1-C"]);
  });

  it.each([
    ["signal", "READINESS_AUTHORITY_SIGNAL_UNIVERSE_CHANGED"],
    ["membership", "READINESS_AUTHORITY_MEMBERSHIP_INVALID"],
    ["asset", "SOURCE_ASSET_HEAD_CHANGED"],
    ["expiry", "READINESS_AUTHORITY_EXPIRED_BEFORE_COMMIT"],
  ])("maps D0 %s rejection without retry or consequence", async (_label, reason) => {
    let attempts = 0;
    const fixture = orchestratorFixture({
      commit: { commit: async () => { attempts += 1; throw new Error(reason); }, findById: async () => null, findByReadinessId: async () => null },
    });
    await expect(new OutcomeReadinessAuthorityOrchestrator(fixture.dependencies).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION }))
      .rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED"));
    expect(attempts).toBe(1);
    expect(fixture.calls).toEqual(["C0-D", "C1-A", "C1-B", "C1-C", "MATERIAL"]);
  });

  it("fails closed at each phase and never leaks raw repository errors", async () => {
    for (const phase of ["AUTHORITY_PHASE_FAILED", "SIGNAL_UNIVERSE_PHASE_FAILED", "DEPENDENCY_PHASE_FAILED", "READINESS_PHASE_FAILED", "MATERIAL_PHASE_FAILED"] as const) {
      const fixture = orchestratorFixture();
      const failing = { ...fixture.dependencies };
      if (phase === "AUTHORITY_PHASE_FAILED") failing.requirementAuthority = { resolve: async () => { throw new Error("raw database detail"); } };
      if (phase === "SIGNAL_UNIVERSE_PHASE_FAILED") failing.signalUniverse = { resolve: async () => { throw new Error("raw database detail"); } };
      if (phase === "DEPENDENCY_PHASE_FAILED") failing.dependencySnapshot = { resolve: async () => { throw new Error("raw database detail"); } };
      if (phase === "READINESS_PHASE_FAILED") failing.readinessCandidate = { resolve: () => { throw new Error("raw evaluator detail"); } };
      if (phase === "MATERIAL_PHASE_FAILED") failing.material = { resolve: async () => { throw new Error("raw database detail"); } };
      await expect(new OutcomeReadinessAuthorityOrchestrator(failing).run({ authority: authorityContext, outcomeTransactionId: TRANSACTION }))
        .rejects.toEqual(new OutcomeReadinessAuthorityOrchestrationError(phase));
    }
  });

  it("keeps the public result immutable and exposes no authority capability", () => {
    const source = readFileSync(resolve(process.cwd(), "src/application/outcome/outcome-readiness-authority-orchestrator.ts"), "utf8");
    const material = readFileSync(resolve(process.cwd(), "src/application/outcome/resolve-outcome-readiness-authority-commit-material.ts"), "utf8");
    expect(source).not.toMatch(/LocalRunnerAuthority|ExecutionAuthority|MutationLease|StateCommit|isDelegable|provider\.|executor\./);
    expect(material).not.toMatch(/LocalRunnerAuthority|ExecutionAuthority|MutationLease|StateCommit|isDelegable|provider\.|executor\./);
    expect(source).toContain("authorityScope");
    expect(source).toContain("REVALIDATION_REQUIRED_FOR_CONSEQUENCE");
    const server = readFileSync(resolve(process.cwd(), "src/server/outcome-readiness-authority-orchestrator.ts"), "utf8");
    expect(server).not.toMatch(/Request|request\.json|searchParams|isDelegable|ExecutionAuthority|MutationLease|StateCommit|provider\.|executor\./);
    expect(server).toContain("createTenantReadinessAuthorityCommitRepository");
  });

  it("material resolver rereads the authoritative transaction, asset and base version", async () => {
    const transaction: OutcomeTransactionRecord = { id: TRANSACTION, ownerTenantId: TENANT, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, status: "PREPARED", rawRequest: "preserve source", createdAt: "2026-08-21T10:00:00.000Z", updatedAt: "2026-08-21T10:00:00.000Z", completedAt: null, abortReason: null };
    const asset: AssetRecord = { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, name: "source", description: null, currentVersionId: VERSION, createdAt: transaction.createdAt, updatedAt: transaction.updatedAt };
    const version: AssetVersionRecord = { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, state: { width: 10 }, parentVersionId: null, createdAt: transaction.createdAt };
    const transactionHash = canonicalSha256({ schemaVersion: TRANSACTION_SEMANTIC_BINDING_VERSION, ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: transaction.rawRequest });
    const versionHash = canonicalSha256({ schemaVersion: SOURCE_ASSET_VERSION_BINDING_VERSION, ownerTenantId: TENANT, assetId: ASSET, versionId: VERSION, versionNumber: 1, parentVersionId: null, state: version.state });
    const input = { authority: authority(), dependency: { ...dependency(), dependencySnapshot: { ...dependency().dependencySnapshot, transactionSemanticHash: transactionHash, sourceAssetVersionHash: versionHash } } };
    const resolver = new OutcomeReadinessAuthorityCommitMaterialResolver({ transactions: { findById: async () => transaction }, assets: { findById: async () => asset }, assetVersions: { findById: async () => version } });
    const result = await resolver.resolve(input);
    expect(result.transaction.rawRequest).toBe("preserve source");
    expect(result.asset.currentVersionId).toBe(VERSION);
    expect(result.sourceVersion.id).toBe(VERSION);
  });

  it.each([
    ["head drift", (data: { asset: { currentVersionId: string | null } }) => { data.asset.currentVersionId = "70000000-0000-4000-8000-000000000099"; }, "MATERIAL_HEAD_CHANGED"],
    ["semantic drift", (data: { transaction: { rawRequest: string } }) => { data.transaction.rawRequest = "attacker"; }, "MATERIAL_SNAPSHOT_MISMATCH"],
  ])("rejects material %s before D0", async (_label, mutate, code) => {
    const transaction: OutcomeTransactionRecord = { id: TRANSACTION, ownerTenantId: TENANT, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, status: "PREPARED", rawRequest: "preserve source", createdAt: "2026-08-21T10:00:00.000Z", updatedAt: "2026-08-21T10:00:00.000Z", completedAt: null, abortReason: null };
    const asset: AssetRecord = { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, name: "source", description: null, currentVersionId: VERSION, createdAt: transaction.createdAt, updatedAt: transaction.updatedAt };
    const version: AssetVersionRecord = { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, state: { width: 10 }, parentVersionId: null, createdAt: transaction.createdAt };
    const data = { transaction, asset };
    mutate(data as never);
    const resolver = new OutcomeReadinessAuthorityCommitMaterialResolver({ transactions: { findById: async () => data.transaction }, assets: { findById: async () => data.asset }, assetVersions: { findById: async () => version } });
    await expect(resolver.resolve({ authority: authority(), dependency: dependency() })).rejects.toEqual(new OutcomeReadinessAuthorityCommitMaterialError(code as never));
  });
});

function fixtureRecord() {
  return {
    authorityCommitId: "b0000000-0000-4000-8000-000000000001",
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    principalId: PRINCIPAL,
    dependencySnapshotId: "c0000000-0000-4000-8000-000000000001",
    dependencySnapshotHash: HASH,
    readinessId: "a0000000-0000-4000-8000-000000000001",
    readinessContentHash: HASH,
    evaluationTime: "2026-08-21T10:01:00.000Z",
    committedAt: "2026-08-21T10:01:01.000Z",
    schemaVersion: "build002-readiness-authority-commit-v0.1" as const,
  };
}
