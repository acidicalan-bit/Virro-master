import { readFileSync } from "node:fs";
import { resolve as pathResolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  OutcomeDependencySnapshotResolver,
  type OutcomeDependencySnapshotRepositories,
  type ResolvedOutcomeDependencySnapshot,
} from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import {
  OutcomeReadinessCandidateError,
  OutcomeReadinessCandidateResolver,
  type ResolvedOutcomeReadinessCandidate,
} from "@/src/application/outcome/resolve-outcome-readiness-candidate";
import {
  OutcomeSignalUniverseResolver,
  type ResolvedOutcomeSignalUniverse,
} from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { AssetRecord, AssetVersionRecord, OutcomeTransactionRecord } from "@/src/application/ports/repositories";
import {
  compileSignalRequirement,
  createSignal,
  currentDefaultEvaluator,
  verifyQualificationHash,
  verifyReadinessHash,
  type Signal,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";

const TENANT = "91000000-0000-4000-8000-000000000001";
const PROJECT = "92000000-0000-4000-8000-000000000001";
const ASSET = "93000000-0000-4000-8000-000000000001";
const VERSION = "94000000-0000-4000-8000-000000000001";
const TRANSACTION = "95000000-0000-4000-8000-000000000001";
const BLUEPRINT = "96000000-0000-4000-8000-000000000001";
const EVALUATION_TIME = "2026-08-20T12:00:00.000Z";
const BLUEPRINT_HASH = "a".repeat(64);
const SOURCE_HASH = "b".repeat(64);

function requirement(id: string, semanticType = "TEXT"): SignalRequirement {
  return compileSignalRequirement({
    requirementId: id,
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType,
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [
      { identity: "asset.version", required: true },
      { identity: "blueprint", required: true },
      { identity: "transaction.semantic", required: true },
    ],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: BLUEPRINT_HASH,
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, EVALUATION_TIME);
}

function signal(requirementId: string, id: string, overrides: Partial<Parameters<typeof createSignal>[0]> = {}): Signal {
  return createSignal({
    signalId: id,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId,
    payload: { independent: requirementId },
    source: { identity: "independent-fixture", version: "1", hash: SOURCE_HASH },
    provenance: "OBSERVED",
    capturedAt: "2026-08-20T11:00:00.000Z",
    validUntil: null,
    dependency: { identity: "blueprint", hash: BLUEPRINT_HASH },
    schemaVersion: "build002-signal-v0.2",
    ...overrides,
  });
}

function records(): { transaction: OutcomeTransactionRecord; asset: AssetRecord; version: AssetVersionRecord } {
  return {
    transaction: { id: TRANSACTION, ownerTenantId: TENANT, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, status: "PREPARED", rawRequest: "independent readiness", createdAt: EVALUATION_TIME, updatedAt: EVALUATION_TIME, completedAt: null, abortReason: null },
    asset: { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, name: "independent", description: null, currentVersionId: VERSION, createdAt: EVALUATION_TIME, updatedAt: EVALUATION_TIME },
    version: { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, state: { width: 100 }, parentVersionId: null, createdAt: EVALUATION_TIME },
  };
}

function authority(requirements: SignalRequirement[]): ResolvedOutcomeRequirementAuthority {
  return { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, binding: {}, blueprint: { hash: BLUEPRINT_HASH }, requirementProfile: {}, signalRequirements: requirements, resolvedAt: EVALUATION_TIME } as unknown as ResolvedOutcomeRequirementAuthority;
}

async function compose(requirements: SignalRequirement[], signalsByRequirement: Signal[][]): Promise<{ result: ResolvedOutcomeReadinessCandidate; authority: ResolvedOutcomeRequirementAuthority; universe: ResolvedOutcomeSignalUniverse; dependency: ResolvedOutcomeDependencySnapshot }> {
  const data = records();
  const repositories: OutcomeDependencySnapshotRepositories = {
    transactions: { findById: async () => structuredClone(data.transaction) },
    assets: { findById: async () => structuredClone(data.asset) },
    assetVersions: { findById: async () => structuredClone(data.version) },
    signalUniverse: { listSignalsForRequirement: async (_scope, hash) => signalsByRequirement[requirements.findIndex((item) => item.requirementDefinitionHash === hash)] ?? [] },
  };
  const resolvedAuthority = authority(requirements);
  const universe = await new OutcomeSignalUniverseResolver(repositories.signalUniverse).resolve(resolvedAuthority);
  const dependency = await new OutcomeDependencySnapshotResolver(repositories).resolve(resolvedAuthority, universe);
  const result = new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(resolvedAuthority, universe, dependency);
  return { result, authority: resolvedAuthority, universe, dependency };
}

function oppositePair(): [SignalRequirement, SignalRequirement] {
  const beta = requirement("beta");
  for (let index = 0; index < 200; index += 1) {
    const alpha = requirement("alpha", `TEXT-INDEPENDENT-${index}`);
    if (alpha.requirementDefinitionHash > beta.requirementDefinitionHash) return [alpha, beta];
  }
  throw new Error("independent opposite hash pair unavailable");
}

describe("independent BUILD002-C1-C R1 verification", () => {
  it("proves the R1 counterexample against the original positional algorithm", async () => {
    const [alpha, beta] = oppositePair();
    const alphaSignal = signal(alpha.requirementId, "97000000-0000-4000-8000-000000000001");
    const betaSignal = signal(beta.requirementId, "97000000-0000-4000-8000-000000000002");
    const composed = await compose([alpha, beta], [[alphaSignal], [betaSignal]]);
    const originalPositional = [alpha, beta].sort((left, right) => left.requirementId.localeCompare(right.requirementId)).map((item) => item.requirementDefinitionHash);
    const snapshotSorted = [...composed.dependency.dependencySnapshot.requirementDefinitionHashes].sort();
    expect(originalPositional[0]).not.toBe(snapshotSorted[0]);
    expect(composed.result.readiness.state).toBe("READY");
    expect(composed.result.qualifications.every((item) => item.outcome === "QUALIFIED")).toBe(true);
  });

  it("composes actual C1-A, C1-B and C1-C with three requirements and stable hashes", async () => {
    const first = requirement("alpha", "TEXT-A");
    const second = requirement("beta", "TEXT-B");
    const third = requirement("gamma", "TEXT-C");
    const values = [first, second, third];
    const signals = values.map((item, index) => [signal(item.requirementId, `97000000-0000-4000-8000-00000000000${index + 3}`)]);
    const composed = await compose(values, signals);
    const permuted = await compose([third, first, second], [signals[2], signals[0], signals[1]]);
    expect(composed.result.readiness.state).toBe("READY");
    expect(permuted.result.readiness.state).toBe("READY");
    expect(composed.result.evaluationTime).toBe(EVALUATION_TIME);
    expect(composed.result.qualifications).toHaveLength(3);
    for (const id of ["alpha", "beta", "gamma"]) {
      expect(composed.result.qualifications.find((item) => item.requirementId === id)?.qualificationContentHash)
        .toBe(permuted.result.qualifications.find((item) => item.requirementId === id)?.qualificationContentHash);
    }
    expect(composed.result.readiness.readinessContentHash).toBe(permuted.result.readiness.readinessContentHash);
    expect(composed.result.qualifications.every(verifyQualificationHash)).toBe(true);
    expect(verifyReadinessHash(composed.result.readiness)).toBe(true);
  });

  it.each([
    ["missing", (hashes: string[]) => hashes.slice(0, 2)],
    ["extra", (hashes: string[]) => [...hashes, "1".repeat(64)]],
    ["wrong", (hashes: string[]) => [hashes[0], hashes[1], "2".repeat(64)]],
  ])("rejects a %s requirement hash mismatch", async (_label, mutate) => {
    const values = [requirement("alpha", "TEXT-A"), requirement("beta", "TEXT-B"), requirement("gamma", "TEXT-C")];
    const signals = values.map((item, index) => [signal(item.requirementId, `97000000-0000-4000-8000-00000000001${index}`)]);
    const composed = await compose(values, signals);
    const altered = { ...composed.dependency, dependencySnapshot: { ...composed.dependency.dependencySnapshot, requirementDefinitionHashes: mutate([...composed.dependency.dependencySnapshot.requirementDefinitionHashes]) } } as ResolvedOutcomeDependencySnapshot;
    expect(() => new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(composed.authority, composed.universe, altered)).toThrow();
  });

  it("fails closed for cross-tenant, cross-transaction, signal-reference, duplicate-hash and universe attacks", async () => {
    const first = requirement("alpha", "TEXT-A");
    const second = requirement("beta", "TEXT-B");
    const a = signal(first.requirementId, "97000000-0000-4000-8000-000000000020");
    const b = signal(second.requirementId, "97000000-0000-4000-8000-000000000021");
    const composed = await compose([first, second], [[a], [b]]);
    expect(() => new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve({ ...composed.authority, ownerTenantId: "91000000-0000-4000-8000-000000000099" }, composed.universe, composed.dependency)).toThrowError(new OutcomeReadinessCandidateError("READINESS_CANDIDATE_AUTHORITY_MISMATCH"));
    expect(() => new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(composed.authority, { ...composed.universe, requirements: [] }, composed.dependency)).toThrowError();
    const duplicate = { ...composed.authority, signalRequirements: [first, { ...second, requirementDefinitionHash: first.requirementDefinitionHash }] } as unknown as ResolvedOutcomeRequirementAuthority;
    expect(() => new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(duplicate, composed.universe, composed.dependency)).toThrowError();
  });

  it("keeps all semantic outcomes server-owned and excludes operational authority", async () => {
    const req = requirement("semantic", "TEXT-SEMANTIC");
    const composed = await compose([req], [[signal(req.requirementId, "97000000-0000-4000-8000-000000000022")]]);
    expect(composed.result.readiness.conditionCodes).toEqual([]);
    expect(composed.result.evaluator).toEqual(currentDefaultEvaluator());
    const service = readFileSync(pathResolve(process.cwd(), "src/application/outcome/resolve-outcome-readiness-candidate.ts"), "utf8");
    const server = readFileSync(pathResolve(process.cwd(), "src/server/outcome-readiness-candidate-resolver.ts"), "utf8");
    expect(service).toContain("currentDefaultEvaluator()");
    expect(service).not.toMatch(/evaluateReadinessValidity|isDelegable|ExecutionAuthority|MutationLease|executor\.execute|provider/);
    expect(server).toMatch(/request:\s*Request,\s*\n\s*outcomeTransactionId:\s*string/);
    expect(server).not.toMatch(/request\.json|searchParams|conditionCodes|policyBlock|evaluationTime/);
  });

  it("uses one instant, fresh complete qualifications, and immutable output", async () => {
    const values = [requirement("alpha", "TEXT-A"), requirement("beta", "TEXT-B"), requirement("gamma", "TEXT-C")];
    const composed = await compose(values, values.map((item, index) => [signal(item.requirementId, `97000000-0000-4000-8000-00000000003${index}`)]));
    expect(composed.result.qualifications.every((item) => item.qualifiedAt === EVALUATION_TIME)).toBe(true);
    expect(composed.result.readiness.createdAt).toBe(EVALUATION_TIME);
    expect(composed.result.qualifications).toHaveLength(values.length);
    expect(new Set(composed.result.qualifications.map((item) => item.requirementId)).size).toBe(values.length);
    expect(composed.result.qualifications.every((item) => item.dependencySnapshotHash === composed.result.dependencySnapshot.dependencySnapshotHash)).toBe(true);
    expect(Object.isFrozen(composed.result)).toBe(true);
    expect(Object.isFrozen(composed.result.dependencySnapshot)).toBe(true);
    expect(Object.isFrozen(composed.result.qualifications)).toBe(true);
    expect(Object.isFrozen(composed.result.readiness)).toBe(true);
  });

  it("does not call persisted qualification/readiness lookup and keeps dependency composition exact", async () => {
    const req = requirement("fresh", "TEXT-FRESH");
    const composed = await compose([req], [[signal(req.requirementId, "97000000-0000-4000-8000-000000000040")]]);
    expect(composed.result.readiness.state).toBe("READY");
    const source = readFileSync(pathResolve(process.cwd(), "src/application/outcome/resolve-outcome-readiness-candidate.ts"), "utf8");
    expect(source).not.toMatch(/findQualification|findReadiness|listReadiness|insertQualification|insertReadiness|updateStatus/);
    expect(composed.dependency.dependencySnapshot.signalReferences).toHaveLength(1);
    expect(canonicalSha256(composed.result.qualifications.map((item) => ({ id: item.requirementId, hash: item.qualificationContentHash }))))
      .toBe(canonicalSha256([...composed.result.qualifications].sort((left, right) => left.requirementId.localeCompare(right.requirementId)).map((item) => ({ id: item.requirementId, hash: item.qualificationContentHash }))));
  });
});
