import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  OutcomeDependencySnapshotResolver,
  SOURCE_ASSET_VERSION_BINDING_VERSION,
  TRANSACTION_SEMANTIC_BINDING_VERSION,
  type OutcomeDependencySnapshotRepositories,
} from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import { compileSignalRequirement, createSignal, type Signal, type SignalRequirement } from "@/src/domain/outcome/signal-readiness";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
import type { AssetRecord, AssetVersionRecord, OutcomeTransactionRecord } from "@/src/application/ports/repositories";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";

const TENANT = "10000000-0000-4000-8000-000000000001";
const FOREIGN_TENANT = "10000000-0000-4000-8000-000000000002";
const PROJECT = "20000000-0000-4000-8000-000000000001";
const ASSET = "30000000-0000-4000-8000-000000000001";
const VERSION = "40000000-0000-4000-8000-000000000001";
const VERSION_B = "40000000-0000-4000-8000-000000000002";
const TRANSACTION = "50000000-0000-4000-8000-000000000001";
const BLUEPRINT = "60000000-0000-4000-8000-000000000001";
const SIGNAL_A = "70000000-0000-4000-8000-000000000001";
const SIGNAL_B = "70000000-0000-4000-8000-000000000002";
const BLUEPRINT_HASH = "a".repeat(64);
const ATTACKER_HASH = "b".repeat(64);
const SOURCE_HASH = "c".repeat(64);
const CREATED_AT = "2026-08-20T12:00:00.000Z";

function requirement(requirementId: string, dependencySelectors = [
  { identity: "asset.version", required: true },
  { identity: "blueprint", required: true },
  { identity: "transaction.semantic", required: true },
  { identity: "unknown.current", required: true },
]): SignalRequirement {
  return compileSignalRequirement({
    requirementId,
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "TEXT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors,
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
    source: { identity: "fixture", version: "1", hash: SOURCE_HASH },
    provenance: "OBSERVED",
    capturedAt: CREATED_AT,
    validUntil: null,
    dependency: { identity: "asset.version", hash: ATTACKER_HASH },
    schemaVersion: "build002-signal-v0.2",
    ...overrides,
  });
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

function records(): { transaction: OutcomeTransactionRecord; asset: AssetRecord; version: AssetVersionRecord } {
  return {
    transaction: {
      id: TRANSACTION,
      ownerTenantId: TENANT,
      projectId: PROJECT,
      assetId: ASSET,
      baseVersionId: VERSION,
      status: "PREPARED",
      rawRequest: "preserve the source asset",
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      completedAt: null,
      abortReason: null,
    },
    asset: {
      id: ASSET,
      ownerTenantId: TENANT,
      projectId: PROJECT,
      name: "fixture",
      description: null,
      currentVersionId: VERSION,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    },
    version: {
      id: VERSION,
      ownerTenantId: TENANT,
      assetId: ASSET,
      versionNumber: 1,
      state: { width: 100, height: 100 },
      parentVersionId: null,
      createdAt: CREATED_AT,
    },
  };
}

function fixture(
  requirements: SignalRequirement[] = [requirement("signal.a")],
  signals: Signal[][] = [[signal(requirements[0].requirementId, SIGNAL_A)]],
): { repositories: OutcomeDependencySnapshotRepositories; authority: ResolvedOutcomeRequirementAuthority; universe: ResolvedOutcomeSignalUniverse; data: ReturnType<typeof records> } {
  const data = records();
  const calls = { transactions: 0, assets: 0, versions: 0 };
  const repositories: OutcomeDependencySnapshotRepositories = {
    transactions: { findById: async () => { calls.transactions += 1; return structuredClone(data.transaction); } },
    assets: { findById: async () => { calls.assets += 1; return structuredClone(data.asset); } },
    assetVersions: { findById: async () => { calls.versions += 1; return structuredClone(data.version); } },
    signalUniverse: { listSignalsForRequirement: async () => [] },
  };
  const result = {
    repositories,
    authority: authority(requirements),
    universe: {
      ownerTenantId: TENANT,
      outcomeTransactionId: TRANSACTION,
      requirements: requirements.map((item, index) => ({ requirement: item, signals: signals[index] ?? [] })),
    } as ResolvedOutcomeSignalUniverse,
    data,
  };
  void calls;
  return result;
}

async function resolveWith(
  requirements: SignalRequirement[] = [requirement("signal.a")],
  signals: Signal[][] = [[signal(requirements[0].requirementId, SIGNAL_A)]],
) {
  const value = fixture(requirements, signals);
  const result = await new OutcomeDependencySnapshotResolver(value.repositories).resolve(value.authority, value.universe);
  return { ...value, result };
}

describe("BUILD002-C1-B server-derived dependency snapshot", () => {
  it("binds the exact complete requirement set and complete signal reference set", async () => {
    const first = requirement("signal.a");
    const second = requirement("signal.b");
    const { result } = await resolveWith([first, second], [[signal(first.requirementId, SIGNAL_A)], [signal(second.requirementId, SIGNAL_B)]]);
    expect(result.dependencySnapshot.requirementDefinitionHashes).toEqual([first.requirementDefinitionHash, second.requirementDefinitionHash].sort());
    expect(result.dependencySnapshot.signalReferences).toHaveLength(2);
    expect(result.dependencySnapshot.signalReferences.map((item) => item.signalId).sort()).toEqual([SIGNAL_A, SIGNAL_B]);
  });

  it("accepts a zero-signal requirement and keeps future, expired and contradictory signals", async () => {
    const empty = requirement("signal.empty");
    const { result: emptyResult } = await resolveWith([empty], [[]]);
    expect(emptyResult.dependencySnapshot.requirementDefinitionHashes).toContain(empty.requirementDefinitionHash);
    expect(emptyResult.dependencySnapshot.signalReferences).toEqual([]);
    const populated = requirement("signal.temporal");
    const future = signal(populated.requirementId, SIGNAL_A, { capturedAt: "2026-08-21T12:00:00.000Z" });
    const expired = signal(populated.requirementId, SIGNAL_B, { validUntil: "2026-08-19T12:00:00.000Z" });
    const { result } = await resolveWith([populated], [[future, expired]]);
    expect(result.dependencySnapshot.signalReferences).toHaveLength(2);
  });

  it("is stable under input order and verifies its hash", async () => {
    const first = requirement("signal.a");
    const second = requirement("signal.b");
    const left = await resolveWith([first, second], [[signal(first.requirementId, SIGNAL_A)], [signal(second.requirementId, SIGNAL_B)]]);
    const right = await resolveWith([second, first], [[signal(second.requirementId, SIGNAL_B)], [signal(first.requirementId, SIGNAL_A)]]);
    expect(left.result.dependencySnapshot.dependencySnapshotHash).toBe(right.result.dependencySnapshot.dependencySnapshotHash);
  });

  it("binds Blueprint from C0-D, policy/task/context as null, and omits unknown identities", async () => {
    const { result } = await resolveWith();
    const snapshot = result.dependencySnapshot;
    expect(snapshot.blueprintHash).toBe(BLUEPRINT_HASH);
    expect(snapshot.policyHash).toBeNull();
    expect(snapshot.taskSpecHash).toBeNull();
    expect(snapshot.contextLensHash).toBeNull();
    expect(snapshot.dependencyBindings).toEqual(expect.arrayContaining([
      { identity: "blueprint", hash: BLUEPRINT_HASH },
      { identity: "asset.version", hash: expect.any(String) },
      { identity: "transaction.semantic", hash: expect.any(String) },
    ]));
    expect(snapshot.dependencyBindings.some((binding) => binding.identity === "unknown.current")).toBe(false);
  });

  it("derives transaction.semantic and asset.version from reread persisted state", async () => {
    const { result } = await resolveWith();
    const transactionHash = canonicalSha256({ schemaVersion: TRANSACTION_SEMANTIC_BINDING_VERSION, ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "preserve the source asset" });
    const versionHash = canonicalSha256({ schemaVersion: SOURCE_ASSET_VERSION_BINDING_VERSION, ownerTenantId: TENANT, assetId: ASSET, versionId: VERSION, versionNumber: 1, parentVersionId: null, state: { width: 100, height: 100 } });
    expect(result.dependencySnapshot.transactionSemanticHash).toBe(transactionHash);
    expect(result.dependencySnapshot.sourceAssetVersionHash).toBe(versionHash);
  });

  it("never promotes Signal dependency hashes to current authority", async () => {
    const { result } = await resolveWith();
    expect(result.dependencySnapshot.dependencyBindings.find((binding) => binding.identity === "asset.version")?.hash).not.toBe(ATTACKER_HASH);
    expect(result.dependencySnapshot.dependencyBindings.find((binding) => binding.identity === "blueprint")?.hash).toBe(BLUEPRINT_HASH);
  });

  it.each([
    ["source head changed", (value: ReturnType<typeof records>) => { value.asset.currentVersionId = VERSION_B; }, "SOURCE_ASSET_HEAD_CHANGED"],
    ["source head missing", (value: ReturnType<typeof records>) => { value.asset.currentVersionId = null; }, "SOURCE_ASSET_HEAD_UNAVAILABLE"],
    ["foreign tenant", (value: ReturnType<typeof records>) => { value.asset.ownerTenantId = FOREIGN_TENANT; }, "DEPENDENCY_AUTHORITY_INVALID"],
    ["wrong project chain", (value: ReturnType<typeof records>) => { value.asset.projectId = FOREIGN_TENANT; }, "DEPENDENCY_AUTHORITY_INVALID"],
    ["wrong version chain", (value: ReturnType<typeof records>) => { value.version.assetId = FOREIGN_TENANT; }, "DEPENDENCY_AUTHORITY_INVALID"],
  ])("fails closed for %s", async (_label, mutate, code) => {
    const value = fixture();
    mutate(value.data);
    const repositories: OutcomeDependencySnapshotRepositories = {
      ...value.repositories,
      transactions: { findById: async () => structuredClone(value.data.transaction) },
      assets: { findById: async () => structuredClone(value.data.asset) },
      assetVersions: { findById: async () => structuredClone(value.data.version) },
    };
    await expect(new OutcomeDependencySnapshotResolver(repositories).resolve(value.authority, value.universe)).rejects.toMatchObject({ code });
  });

  it("rejects cross-requirement duplicate signal IDs and requirement/universe mismatch", async () => {
    const first = requirement("signal.a");
    const second = requirement("signal.b");
    await expect(resolveWith([first, second], [[signal(first.requirementId, SIGNAL_A)], [signal(second.requirementId, SIGNAL_A)]])).rejects.toMatchObject({ code: "DEPENDENCY_SIGNAL_REFERENCE_INVALID" });
    const value = fixture([first], [[]]);
    const universe = { ...value.universe, requirements: [{ requirement: second, signals: [] }] } as ResolvedOutcomeSignalUniverse;
    await expect(new OutcomeDependencySnapshotResolver(value.repositories).resolve(value.authority, universe)).rejects.toMatchObject({ code: "DEPENDENCY_REQUIREMENT_UNIVERSE_MISMATCH" });
  });

  it("changes on material state and remains stable for lifecycle-only transaction fields", async () => {
    const left = await resolveWith();
    const rightValue = fixture();
    rightValue.data.transaction.rawRequest = "different semantic intent";
    const rightRepositories: OutcomeDependencySnapshotRepositories = { ...rightValue.repositories, transactions: { findById: async () => structuredClone(rightValue.data.transaction) } };
    const right = await new OutcomeDependencySnapshotResolver(rightRepositories).resolve(rightValue.authority, rightValue.universe);
    expect(right.dependencySnapshot.transactionSemanticHash).not.toBe(left.result.dependencySnapshot.transactionSemanticHash);
    const lifecycleValue = fixture();
    lifecycleValue.data.transaction.status = "READY";
    lifecycleValue.data.transaction.updatedAt = "2026-08-21T12:00:00.000Z";
    lifecycleValue.data.transaction.completedAt = "2026-08-21T12:00:00.000Z";
    lifecycleValue.data.transaction.abortReason = "ignored lifecycle field";
    const lifecycleRepositories: OutcomeDependencySnapshotRepositories = { ...lifecycleValue.repositories, transactions: { findById: async () => structuredClone(lifecycleValue.data.transaction) } };
    const lifecycle = await new OutcomeDependencySnapshotResolver(lifecycleRepositories).resolve(lifecycleValue.authority, lifecycleValue.universe);
    expect(lifecycle.dependencySnapshot.transactionSemanticHash).toBe(left.result.dependencySnapshot.transactionSemanticHash);
  });

  it("returns a deeply immutable result and performs no writes or later-phase calls", async () => {
    const { result } = await resolveWith();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.dependencySnapshot)).toBe(true);
    expect(Object.isFrozen(result.dependencySnapshot.signalReferences)).toBe(true);
    expect(() => result.dependencySnapshot.requirementDefinitionHashes.push(ATTACKER_HASH)).toThrow();
    const source = readFileSync(resolve(process.cwd(), "src/application/outcome/resolve-outcome-dependency-snapshot.ts"), "utf8");
    expect(source).not.toContain("insertDependencySnapshot");
    expect(source).not.toContain("evaluateSignalQualification");
    expect(source).not.toContain("evaluateDelegationReadiness");
    expect(source).not.toContain("updateStatus");
    expect(source).not.toContain("ExecutionAuthority");
  });

  it("keeps the server boundary authority-first and locator-only", () => {
    const source = readFileSync(resolve(process.cwd(), "src/server/outcome-dependency-snapshot-resolver.ts"), "utf8");
    expect(source.indexOf("const authority = await resolveOutcomeRequirementAuthority")).toBeLessThan(source.indexOf("const repositories = createTenantBuild002DependencyRepositories"));
    expect(source).toMatch(/resolveOutcomeDependencySnapshot\(\s*request:\s*Request,\s*outcomeTransactionId:\s*string/);
    expect(source).not.toMatch(/dependencyHash|signalIds|requirementDefinitionHashes|rawRequest|TaskSpec|evaluator/);
  });
});
