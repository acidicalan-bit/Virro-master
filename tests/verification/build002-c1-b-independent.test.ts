import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { AssetRecord, AssetVersionRecord, OutcomeTransactionRecord } from "@/src/application/ports/repositories";
import {
  OutcomeDependencySnapshotResolver,
  SOURCE_ASSET_VERSION_BINDING_VERSION,
  TRANSACTION_SEMANTIC_BINDING_VERSION,
  type OutcomeDependencySnapshotRepositories,
} from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
import {
  compileSignalRequirement,
  createSignal,
  verifyDependencySnapshotHash,
  type Signal,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";

const TENANT = "11000000-0000-4000-8000-000000000001";
const FOREIGN_TENANT = "11000000-0000-4000-8000-000000000099";
const PROJECT = "22000000-0000-4000-8000-000000000001";
const ASSET = "33000000-0000-4000-8000-000000000001";
const VERSION = "44000000-0000-4000-8000-000000000001";
const NEXT_VERSION = "44000000-0000-4000-8000-000000000002";
const TRANSACTION = "55000000-0000-4000-8000-000000000001";
const BLUEPRINT = "66000000-0000-4000-8000-000000000001";
const SIGNAL_A = "77000000-0000-4000-8000-000000000001";
const SIGNAL_B = "77000000-0000-4000-8000-000000000002";
const CREATED_AT = "2026-08-20T12:00:00.000Z";
const BLUEPRINT_HASH = "a".repeat(64);
const CALLER_HASH = "b".repeat(64);
const SOURCE_HASH = "c".repeat(64);

function requirement(requirementId: string): SignalRequirement {
  return compileSignalRequirement({
    requirementId,
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "TEXT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [
      { identity: "asset.version", required: true },
      { identity: "blueprint", required: true },
      { identity: "transaction.semantic", required: true },
      { identity: "unknown.caller", required: true },
    ],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: BLUEPRINT_HASH,
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, CREATED_AT);
}

function signal(requirementId: string, signalId: string, overrides: Partial<Parameters<typeof createSignal>[0]> = {}): Signal {
  return createSignal({
    signalId,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId,
    payload: { value: signalId },
    source: { identity: "independent-fixture", version: "1", hash: SOURCE_HASH },
    provenance: "OBSERVED",
    capturedAt: CREATED_AT,
    validUntil: null,
    dependency: { identity: "asset.version", hash: CALLER_HASH },
    schemaVersion: "build002-signal-v0.2",
    ...overrides,
  });
}

function records(): { transaction: OutcomeTransactionRecord; asset: AssetRecord; version: AssetVersionRecord } {
  return {
    transaction: {
      id: TRANSACTION, ownerTenantId: TENANT, projectId: PROJECT, assetId: ASSET,
      baseVersionId: VERSION, status: "PREPARED", rawRequest: "independent semantic intent",
      createdAt: CREATED_AT, updatedAt: CREATED_AT, completedAt: null, abortReason: null,
    },
    asset: {
      id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, name: "asset", description: null,
      currentVersionId: VERSION, createdAt: CREATED_AT, updatedAt: CREATED_AT,
    },
    version: {
      id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1,
      state: { width: 100, height: 100 }, parentVersionId: null, createdAt: CREATED_AT,
    },
  };
}

function authority(requirements: SignalRequirement[]): ResolvedOutcomeRequirementAuthority {
  return {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    binding: {} as ResolvedOutcomeRequirementAuthority["binding"],
    blueprint: { hash: BLUEPRINT_HASH } as ResolvedOutcomeRequirementAuthority["blueprint"],
    requirementProfile: {} as ResolvedOutcomeRequirementAuthority["requirementProfile"],
    signalRequirements: requirements,
    resolvedAt: CREATED_AT,
  };
}

function fixture(requirements = [requirement("signal.a")], signals: Signal[][] = [[]]) {
  const data = records();
  const calls: string[] = [];
  const repositories: OutcomeDependencySnapshotRepositories = {
    transactions: { findById: async () => { calls.push("transaction"); return structuredClone(data.transaction); } },
    assets: { findById: async () => { calls.push("asset"); return structuredClone(data.asset); } },
    assetVersions: { findById: async () => { calls.push("version"); return structuredClone(data.version); } },
    signalUniverse: { listSignalsForRequirement: async () => { calls.push("signal-universe"); return []; } },
  };
  return {
    data,
    calls,
    repositories,
    authority: authority(requirements),
    universe: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, requirements: requirements.map((item, index) => ({ requirement: item, signals: signals[index] ?? [] })) } as ResolvedOutcomeSignalUniverse,
  };
}

async function resolveFixture(requirements = [requirement("signal.a")], signals: Signal[][] = [[]]) {
  const value = fixture(requirements, signals);
  const result = await new OutcomeDependencySnapshotResolver(value.repositories).resolve(value.authority, value.universe);
  return { ...value, result };
}

describe("BUILD002-C1-B independent dependency-authority verification", () => {
  it("has an authority-first server signature and ignores caller evidence selectors/hashes", () => {
    const server = readFileSync(resolve(process.cwd(), "src/server/outcome-dependency-snapshot-resolver.ts"), "utf8");
    expect(server).toMatch(/request:\s*Request,\s*\n\s*outcomeTransactionId:\s*string/);
    expect(server.indexOf("const authority = await resolveOutcomeRequirementAuthority")).toBeLessThan(server.indexOf("const repositories = createTenantBuild002DependencyRepositories"));
    expect(server).not.toMatch(/signalId|contentHash|requirementDefinitionHash|request\.json|request\.url|searchParams/);
    expect(server).toContain("authority.ownerTenantId");
  });

  it("uses the complete C0-D requirement set, zero-signal entries, and only server-derived bindings", async () => {
    const first = requirement("signal.a");
    const second = requirement("signal.b");
    const { result } = await resolveFixture([first, second], [[], [signal(second.requirementId, SIGNAL_B)]]);
    expect(result.dependencySnapshot.requirementDefinitionHashes).toEqual([first.requirementDefinitionHash, second.requirementDefinitionHash].sort());
    expect(result.dependencySnapshot.signalReferences).toEqual([{ requirementId: second.requirementId, signalId: SIGNAL_B, contentHash: expect.any(String) }]);
    expect(result.dependencySnapshot.dependencyBindings).toEqual(expect.arrayContaining([
      { identity: "asset.version", hash: expect.any(String) },
      { identity: "blueprint", hash: BLUEPRINT_HASH },
      { identity: "transaction.semantic", hash: expect.any(String) },
    ]));
    expect(result.dependencySnapshot.dependencyBindings.some((item) => item.identity === "unknown.caller")).toBe(false);
  });

  it("rejects missing, extra, wrong-hash, and cross-requirement duplicate references", async () => {
    const first = requirement("signal.a");
    const second = requirement("signal.b");
    const value = fixture([first, second], [[], []]);
    await expect(new OutcomeDependencySnapshotResolver(value.repositories).resolve(value.authority, { ...value.universe, requirements: [{ requirement: first, signals: [] }] } as ResolvedOutcomeSignalUniverse)).rejects.toMatchObject({ code: "DEPENDENCY_REQUIREMENT_UNIVERSE_MISMATCH" });
    await expect(new OutcomeDependencySnapshotResolver(value.repositories).resolve(value.authority, { ...value.universe, requirements: [{ requirement: first, signals: [] }, { requirement: { ...second, requirementDefinitionHash: "d".repeat(64) }, signals: [] }] } as ResolvedOutcomeSignalUniverse)).rejects.toMatchObject({ code: "DEPENDENCY_REQUIREMENT_UNIVERSE_MISMATCH" });
    await expect(resolveFixture([first, second], [[signal(first.requirementId, SIGNAL_A)], [signal(second.requirementId, SIGNAL_A)]])).rejects.toMatchObject({ code: "DEPENDENCY_SIGNAL_REFERENCE_INVALID" });
  });

  it.each([
    ["asset.version", "asset.version"],
    ["blueprint", "blueprint"],
    ["transaction.semantic", "transaction.semantic"],
  ])("does not promote caller signal dependency hash for %s", async (_label, identity) => {
    const value = await resolveFixture([requirement("signal.a")], [[signal("signal.a", SIGNAL_A, { dependency: { identity: identity as "asset.version", hash: CALLER_HASH } })]]);
    expect(value.result.dependencySnapshot.dependencyBindings.find((item) => item.identity === identity)?.hash).not.toBe(CALLER_HASH);
  });

  it("fails closed for foreign ownership, broken chains, and stale source heads", async () => {
    for (const mutate of [
      (data: ReturnType<typeof records>) => { data.transaction.ownerTenantId = FOREIGN_TENANT; },
      (data: ReturnType<typeof records>) => { data.asset.ownerTenantId = FOREIGN_TENANT; },
      (data: ReturnType<typeof records>) => { data.version.assetId = FOREIGN_TENANT; },
      (data: ReturnType<typeof records>) => { data.asset.currentVersionId = NEXT_VERSION; },
      (data: ReturnType<typeof records>) => { data.asset.currentVersionId = null; },
    ]) {
      const value = fixture();
      mutate(value.data);
      const repositories: OutcomeDependencySnapshotRepositories = {
        ...value.repositories,
        transactions: { findById: async () => structuredClone(value.data.transaction) },
        assets: { findById: async () => structuredClone(value.data.asset) },
        assetVersions: { findById: async () => structuredClone(value.data.version) },
      };
      const code = value.data.asset.currentVersionId === null ? "SOURCE_ASSET_HEAD_UNAVAILABLE" : value.data.asset.currentVersionId === NEXT_VERSION ? "SOURCE_ASSET_HEAD_CHANGED" : "DEPENDENCY_AUTHORITY_INVALID";
      await expect(new OutcomeDependencySnapshotResolver(repositories).resolve(value.authority, value.universe)).rejects.toMatchObject({ code });
    }
  });

  it("binds exact transaction semantics and source version material, excluding lifecycle-only fields", async () => {
    const left = await resolveFixture();
    const expectedTx = canonicalSha256({ schemaVersion: TRANSACTION_SEMANTIC_BINDING_VERSION, ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "independent semantic intent" });
    const expectedVersion = canonicalSha256({ schemaVersion: SOURCE_ASSET_VERSION_BINDING_VERSION, ownerTenantId: TENANT, assetId: ASSET, versionId: VERSION, versionNumber: 1, parentVersionId: null, state: { width: 100, height: 100 } });
    expect(left.result.dependencySnapshot.transactionSemanticHash).toBe(expectedTx);
    expect(left.result.dependencySnapshot.sourceAssetVersionHash).toBe(expectedVersion);
    const lifecycle = fixture();
    lifecycle.data.transaction.status = "READY";
    lifecycle.data.transaction.updatedAt = "2026-08-20T13:00:00.000Z";
    const lifecycleRepos = { ...lifecycle.repositories, transactions: { findById: async () => structuredClone(lifecycle.data.transaction) } };
    const lifecycleResult = await new OutcomeDependencySnapshotResolver(lifecycleRepos).resolve(lifecycle.authority, lifecycle.universe);
    expect(lifecycleResult.dependencySnapshot.transactionSemanticHash).toBe(expectedTx);
    const material = fixture();
    material.data.transaction.rawRequest = "different intent";
    const materialRepos = { ...material.repositories, transactions: { findById: async () => structuredClone(material.data.transaction) } };
    const materialResult = await new OutcomeDependencySnapshotResolver(materialRepos).resolve(material.authority, material.universe);
    expect(materialResult.dependencySnapshot.transactionSemanticHash).not.toBe(expectedTx);
  });

  it("preserves temporal references for later C1-D revalidation and rejects bad signal content", async () => {
    const req = requirement("signal.temporal");
    const future = signal(req.requirementId, SIGNAL_A, { capturedAt: "2026-08-21T12:00:00.000Z" });
    const expired = signal(req.requirementId, SIGNAL_B, { validUntil: "2026-08-19T12:00:00.000Z" });
    const value = await resolveFixture([req], [[future, expired]]);
    expect(value.result.dependencySnapshot.signalReferences).toHaveLength(2);
    const forged = { ...signal(req.requirementId, SIGNAL_A), contentHash: "e".repeat(64) } as Signal;
    await expect(resolveFixture([req], [[forged]])).rejects.toMatchObject({ code: "DEPENDENCY_SIGNAL_REFERENCE_INVALID" });
  });

  it("returns an immutable, hash-valid result and performs no write, qualification, readiness, or execution operation", async () => {
    const value = await resolveFixture();
    expect(Object.isFrozen(value.result)).toBe(true);
    expect(Object.isFrozen(value.result.dependencySnapshot)).toBe(true);
    expect(verifyDependencySnapshotHash(value.result.dependencySnapshot)).toBe(true);
    expect(value.calls).toEqual(["transaction", "asset", "version"]);
    expect(() => (value.result.dependencySnapshot as { dependencySnapshotHash: string }).dependencySnapshotHash = "f".repeat(64)).toThrow();
  });

  it("does not expose a writable privileged repository factory through the server boundary", () => {
    const source = readFileSync(resolve(process.cwd(), "src/infrastructure/persistence/supabase-repositories.ts"), "utf8");
    expect(source).toContain("createTenantBuild002DependencyRepositories(ownerTenantId: string)");
    expect(source).not.toMatch(/export\s+(?:const|let|var)\s+(?:command|registry|authority|verifier)/i);
    expect(source).toContain("requireTenantScope");
  });
});
