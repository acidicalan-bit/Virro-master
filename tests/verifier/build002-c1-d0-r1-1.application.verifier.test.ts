// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  compileSignalRequirement,
  createDependencySnapshot,
  createSignal,
  currentDefaultEvaluator,
  evaluateDelegationReadiness,
  evaluateSignalQualification,
  type DelegationReadiness,
  type DependencySnapshot,
  type Signal,
  type SignalQualification,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";
import { createSupabaseReadinessAuthorityCommitRepository } from "@/src/infrastructure/persistence/outcome/supabase-readiness-authority-commit-repository";
import type { ReadinessAuthorityCommitInput } from "@/src/application/ports/outcome/readiness-authority-commit-repository";

const TENANT = "b2000000-0000-4000-8000-000000000001";
const TRANSACTION = "f2000000-0000-4000-8000-000000000001";
const BLUEPRINT = "a1000000-0000-4000-8000-000000000101";
const ASSET = "d2000000-0000-4000-8000-000000000001";
const VERSION = "e2000000-0000-4000-8000-000000000001";
const ACTOR = "a2000000-0000-4000-8000-000000000101";

type Fixture = ReadinessAuthorityCommitInput & {
  requirement: SignalRequirement;
  signal: Signal;
  qualification: SignalQualification;
  readiness: DelegationReadiness;
  dependencySnapshot: DependencySnapshot;
};

function makeFixture(suffix: string, semanticType = "TEXT"): Fixture {
  const createdAt = new Date(Date.now() - 60_000).toISOString();
  const requirement = compileSignalRequirement({
    requirementId: `signal.verifier.${suffix}`,
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType,
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: "1".repeat(64),
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, createdAt);
  const signal = createSignal({
    signalId: `a2000000-0000-4000-8000-000000000${suffix}`,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId: requirement.requirementId,
    payload: { observed: suffix },
    source: { identity: "verifier", version: "1", hash: "2".repeat(64) },
    provenance: "OBSERVED",
    capturedAt: new Date(Date.parse(createdAt) - 60_000).toISOString(),
    validUntil: new Date(Date.parse(createdAt) + 3_600_000).toISOString(),
    dependency: { identity: "asset.version", hash: "3".repeat(64) },
    schemaVersion: "build002-signal-v0.2",
  });
  const dependencySnapshot = createDependencySnapshot({
    schemaVersion: "build002-dependency-snapshot-v0.2",
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementDefinitionHashes: [requirement.requirementDefinitionHash],
    signalReferences: [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }],
    dependencyBindings: [{ identity: "asset.version", hash: "3".repeat(64) }, { identity: "blueprint", hash: "1".repeat(64) }],
    blueprintHash: "1".repeat(64),
    policyHash: null,
    taskSpecHash: null,
    transactionSemanticHash: null,
    sourceAssetVersionHash: "3".repeat(64),
    contextLensHash: null,
  });
  const evaluator = currentDefaultEvaluator();
  const qualification = evaluateSignalQualification({ requirement, signals: [signal], currentDependencySnapshot: dependencySnapshot, evaluator, evaluationTime: createdAt, idFactory: () => `a3000000-0000-4000-8000-000000000${suffix}` });
  const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TRANSACTION }, requirements: [requirement], qualifications: [qualification], dependencySnapshot, evaluator, evaluationTime: createdAt, idFactory: () => `a4000000-0000-4000-8000-000000000${suffix}` });
  return {
    principalId: ACTOR,
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    transaction: { ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: "c2000000-0000-4000-8000-000000000001", assetId: ASSET, baseVersionId: VERSION, rawRequest: "independent verifier" },
    asset: { id: ASSET, ownerTenantId: TENANT, projectId: "c2000000-0000-4000-8000-000000000001", currentVersionId: VERSION },
    sourceVersion: { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, parentVersionId: null, state: { width: 1 } },
    binding: { bindingHash: "4".repeat(64), blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: "1".repeat(64), requirementProfileId: "a1000000-0000-4000-8000-000000000102", requirementProfileVersion: 1, requirementProfileHash: "5".repeat(64) },
    requirements: [requirement],
    dependencySnapshot,
    qualifications: [qualification],
    readiness,
    requirement,
    signal,
    qualification,
  };
}

function fakeClient(fixture?: Fixture) {
  let rpcCalls = 0;
  const client = {
    rpc: async () => { rpcCalls += 1; return { data: { authority_commit_id: "a5000000-0000-4000-8000-000000000001", dependency_snapshot_id: "a6000000-0000-4000-8000-000000000001" }, error: null }; },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => {
          if (!fixture) return { data: null, error: null };
          if (table === "build002_readiness_authority_commits") return { data: { id: "a5000000-0000-4000-8000-000000000001", owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, principal_id: ACTOR, dependency_snapshot_id: "a6000000-0000-4000-8000-000000000001", dependency_snapshot_hash: fixture.dependencySnapshot.dependencySnapshotHash, readiness_id: fixture.readiness.id, readiness_content_hash: fixture.readiness.readinessContentHash, evaluation_time: fixture.readiness.createdAt, committed_at: fixture.readiness.createdAt, schema_version: "build002-readiness-authority-commit-v0.1" }, error: null };
          if (table === "build002_delegation_readiness") return { data: { id: fixture.readiness.id }, error: null };
          return { data: { dependency_snapshot_hash: fixture.dependencySnapshot.dependencySnapshotHash }, error: null };
        } })
      })
    }),
  };
  return { client, calls: () => rpcCalls };
}

describe("BUILD002-C1-D0 R1-1 independent application attacks", () => {
  it("accepts an independently constructed valid graph and invokes authority exactly once", async () => {
    const fixture = makeFixture("011");
    const fake = fakeClient(fixture);
    const repo = createSupabaseReadinessAuthorityCommitRepository(fake.client as never, TENANT);
    const result = await repo.commit(fixture);
    expect(result.authorityCommitId).toBe("a5000000-0000-4000-8000-000000000001");
    expect(fake.calls()).toBe(1);
  });

  it.each([
    ["READINESS_QA_QUALIFICATION_QB", (f: Fixture) => ({ ...f, qualifications: [makeFixture("012").qualification] })],
    ["WRONG_SIGNAL_CONTENT_HASH", (f: Fixture) => ({ ...f, qualifications: [{ ...f.qualification, signalContentHashes: ["6".repeat(64)], qualificationContentHash: f.qualification.qualificationContentHash }] })],
    ["DUPLICATE_REQUIREMENT_ID", (f: Fixture) => ({ ...f, requirements: [f.requirement, { ...makeFixture("013").requirement, requirementId: f.requirement.requirementId }] })],
    ["DUPLICATE_REQUIREMENT_HASH", (f: Fixture) => ({ ...f, requirements: [f.requirement, { ...makeFixture("014").requirement, requirementDefinitionHash: f.requirement.requirementDefinitionHash }] })],
    ["MISSING_QUALIFICATION", (f: Fixture) => ({ ...f, qualifications: [] })],
    ["EXTRA_QUALIFICATION", (f: Fixture) => ({ ...f, qualifications: [f.qualification, makeFixture("015").qualification] })],
    ["STALE_EVALUATOR", (f: Fixture) => ({ ...f, readiness: { ...f.readiness, evaluator: { ...f.readiness.evaluator, version: "0.1.0", definitionHash: "7".repeat(64) } } })],
  ] as const)("rejects %s before any authoritative RPC", async (_name, mutate) => {
    const fixture = makeFixture("016");
    const fake = fakeClient();
    const repo = createSupabaseReadinessAuthorityCommitRepository(fake.client as never, TENANT);
    await expect(repo.commit(mutate(fixture))).rejects.toThrow();
    expect(fake.calls()).toBe(0);
  });
});
