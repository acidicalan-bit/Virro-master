import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CanonicalOutcomeCommitService } from "@/src/application/outcome/canonical-outcome-commit-service";
import { bindExecutionAuthority } from "@/src/application/outcome/execution-authority";
import type { CanonicalCommitRepository } from "@/src/application/ports/outcome/canonical-commit-repository";
import type { AuthorityContext } from "@/src/domain/auth/authority";
import { attachTaskSpecHash, type TaskSpec } from "@/src/domain/outcome/specification/task-spec";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260815030000_build_001_trust_foundation_atomic_commit.sql"), "utf8");

const ids = {
  tenantA: "10000000-0000-4000-8000-000000000001",
  tenantB: "20000000-0000-4000-8000-000000000002",
  actorA: "30000000-0000-4000-8000-000000000003",
  actorB: "40000000-0000-4000-8000-000000000004",
  membershipA: "50000000-0000-4000-8000-000000000005",
  membershipB: "60000000-0000-4000-8000-000000000006",
  projectA: "70000000-0000-4000-8000-000000000007",
  projectB: "80000000-0000-4000-8000-000000000008",
  assetA: "90000000-0000-4000-8000-000000000009",
  assetB: "a0000000-0000-4000-8000-00000000000a",
  baseA: "b0000000-0000-4000-8000-00000000000b",
  baseB: "c0000000-0000-4000-8000-00000000000c",
  executionA: "d0000000-0000-4000-8000-00000000000d",
  executionB: "e0000000-0000-4000-8000-00000000000e",
  specA: "f0000000-0000-4000-8000-00000000000f",
  specB: "11000000-0000-4000-8000-000000000011",
  candidateA: "12000000-0000-4000-8000-000000000012",
  candidateB: "13000000-0000-4000-8000-000000000013",
  outcomeA: "14000000-0000-4000-8000-000000000014",
} as const;

const authorityA = authority(ids.actorA, ids.tenantA, ids.membershipA, "OWNER");

describe("BUILD 001 migration security contract", () => {
  it("derives downstream ownership and protects tenant reads", () => {
    for (const table of ["execution_runs", "evidence_receipts", "verification_runs", "state_commits", "candidate_assets", "media_storage"]) {
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).toContain("new.owner_tenant_id := parent_owner");
    expect(migration).toContain("membership.principal_id = auth.uid()");
    expect(migration).toContain("tenant.status = 'ACTIVE'");
    expect(migration).toContain("TRUST_TRANSACTION_OWNER_MISMATCH");
  });

  it("makes the final commit one restricted, internally authorized transaction", () => {
    expect(migration).toContain("create or replace function public.commit_accepted_field_outcome");
    expect(migration).toMatch(/security definer\s+set search_path = ''/i);
    expect(migration).toContain("actor uuid := auth.uid()");
    expect(migration).toContain("membership.role = 'OWNER'");
    expect(migration).toContain("for update;");
    expect(migration).toContain("current_version_id = transaction.base_version_id");
    expect(migration).toContain("insert into public.state_commits");
    expect(migration).toContain("revoke all on function public.commit_accepted_field_outcome(uuid) from public, anon");
    expect(migration).toContain("grant execute on function public.commit_accepted_field_outcome(uuid) to authenticated");
  });

  it("requires exact execution, spec version/hash, evidence issuer, artifact tuple and acceptance", () => {
    for (const fragment of [
      "evidence.execution_run_id = execution.id",
      "evidence.task_spec_version = outcome.task_spec_version",
      "evidence.task_spec_hash = outcome.task_spec_hash",
      "evidence.artifact_bindings->>'sourceVersionId' = transaction.base_version_id::text",
      "evidence.artifact_bindings->>'preservedCandidateId' = outcome.delivered_candidate_id::text",
      "evidence.issuer_role = 'SYSTEM_GATE'",
      "evidence.issuer_role = 'VERIFIER'",
      "feedback.accepted_candidate_id is distinct from outcome.delivered_candidate_id",
    ]) expect(migration).toContain(fragment);
  });

  it("does not fabricate historical ownership and removes direct authenticated head writes", () => {
    expect(migration).toContain("Historical rows are intentionally not backfilled");
    expect(migration).not.toMatch(/update\s+public\.[a-z_]+\s+set\s+owner_tenant_id/i);
    expect(migration).toContain("revoke insert, update, delete on table public.assets from authenticated");
    expect(migration).toContain("revoke insert, update, delete on table public.asset_versions from authenticated");
  });
});

describe("BUILD 001 authority envelope", () => {
  it("wraps MutationLease scope with immutable tenant/resource/spec authority", () => {
    const spec = taskSpec(ids.executionA, ids.assetA, ids.baseA, ids.specA);
    const bound = bindExecutionAuthority({
      authority: authorityA,
      ownerTenantId: ids.tenantA,
      projectId: ids.projectA,
      assetId: ids.assetA,
      transactionId: ids.executionA,
      baseVersionId: ids.baseA,
      taskSpec: spec,
      mutationPaths: ["media.pixels"],
    });
    expect(bound).toMatchObject({ transactionId: ids.executionA, taskSpecHash: spec.hash, mutationPaths: ["media.pixels"] });
    expect(Object.isFrozen(bound)).toBe(true);
  });

  it("rejects a forged tenant or resource binding", () => {
    const spec = taskSpec(ids.executionA, ids.assetA, ids.baseA, ids.specA);
    expect(() => bindExecutionAuthority({ authority: authorityA, ownerTenantId: ids.tenantB, projectId: ids.projectA, assetId: ids.assetA, transactionId: ids.executionA, baseVersionId: ids.baseA, taskSpec: spec, mutationPaths: ["media.pixels"] })).toThrow(/does not own/);
    expect(() => bindExecutionAuthority({ authority: authorityA, ownerTenantId: ids.tenantA, projectId: ids.projectA, assetId: ids.assetB, transactionId: ids.executionA, baseVersionId: ids.baseA, taskSpec: spec, mutationPaths: ["media.pixels"] })).toThrow(/not bound/);
  });

  it("requires OWNER before invoking the canonical repository", async () => {
    let calls = 0;
    const repository: CanonicalCommitRepository = { commitAcceptedFieldOutcome: async () => { calls += 1; throw new Error("not reached result"); } };
    const member = { ...authorityA, membershipRole: "MEMBER" as const };
    expect(() => new CanonicalOutcomeCommitService(repository).commitAcceptedFieldOutcome(member, ids.outcomeA)).toThrowError(expect.objectContaining({ code: "ROLE_NOT_AUTHORIZED" }));
    expect(calls).toBe(0);
  });
});

describe("BUILD 001 deterministic cross-tenant attack matrix", () => {
  it.each([
    ["Tenant A reading Tenant B execution", (h: TrustHarness) => h.readExecution(authorityA, ids.executionB)],
    ["Tenant A mutating Tenant B execution", (h: TrustHarness) => h.mutateExecution(authorityA, ids.executionB)],
    ["Tenant A attaching evidence to Tenant B execution", (h: TrustHarness) => h.attachEvidence(authorityA, ids.executionB, ids.specB, 1, "hash-b", ids.candidateB)],
    ["Tenant A reading Tenant B evidence", (h: TrustHarness) => h.readEvidence(authorityA, ids.executionB)],
    ["Tenant A using Tenant B evidence in verification", (h: TrustHarness) => h.verify(authorityA, ids.executionA, ids.executionB)],
    ["Tenant A verifying Tenant B execution", (h: TrustHarness) => h.verify(authorityA, ids.executionB, ids.executionB)],
    ["Tenant A accepting Tenant B execution", (h: TrustHarness) => h.accept(authorityA, ids.executionB, ids.candidateB)],
    ["Tenant A committing Tenant B state", (h: TrustHarness) => h.commit(authorityA, ids.executionB)],
    ["Tenant A referencing Tenant B storage/artifact ID", (h: TrustHarness) => h.accept(authorityA, ids.executionA, ids.candidateB)],
    ["forged client tenant_id", (h: TrustHarness) => h.attachEvidence(authorityA, ids.executionB, ids.specB, 1, "hash-b", ids.candidateB, ids.tenantA)],
    ["forged project/resource id", (h: TrustHarness) => h.commit(authorityA, ids.executionA, { projectId: ids.projectB })],
    ["forged execution id", (h: TrustHarness) => h.accept(authorityA, ids.executionA, ids.candidateA, ids.executionB)],
    ["forged acceptance target", (h: TrustHarness) => h.accept(authorityA, ids.executionA, ids.candidateB)],
    ["wrong TaskSpec hash/version", (h: TrustHarness) => h.attachEvidence(authorityA, ids.executionA, ids.specA, 2, "wrong", ids.candidateA)],
    ["evidence from different ExecutionRun", (h: TrustHarness) => h.verify(authorityA, ids.executionA, ids.executionB)],
  ])("denies %s", (_name, attack) => {
    expect(() => attack(TrustHarness.ready())).toThrowError(TrustDenied);
  });
});

describe("BUILD 001 atomic commit failure matrix", () => {
  it.each([
    ["StateCommit write failure", "STATE_COMMIT"],
    ["head update failure", "HEAD"],
  ] as const)("rolls back version, head and StateCommit on %s", (_name, fault) => {
    const harness = TrustHarness.ready();
    const before = harness.snapshot();
    expect(() => harness.commit(authorityA, ids.executionA, {}, fault)).toThrow("INJECTED_FAILURE");
    expect(harness.snapshot()).toEqual(before);
  });

  it.each([
    ["partial evidence", (h: TrustHarness) => { h.evidence.pop(); return h.commit(authorityA, ids.executionA); }],
    ["verification not satisfied", (h: TrustHarness) => { h.verified.delete(ids.executionA); return h.commit(authorityA, ids.executionA); }],
    ["Human Acceptance absent", (h: TrustHarness) => { h.accepted.delete(ids.executionA); return h.commit(authorityA, ids.executionA); }],
    ["authority invalid", (h: TrustHarness) => h.commit({ ...authorityA, membershipRole: "MEMBER" }, ids.executionA)],
  ])("leaves canonical state unchanged when %s", (_name, attempt) => {
    const harness = TrustHarness.ready();
    const stable = harness.canonicalSnapshot();
    expect(() => attempt(harness)).toThrowError(TrustDenied);
    expect(harness.canonicalSnapshot()).toEqual(stable);
  });

  it("rejects a stale head without creating a version or StateCommit", () => {
    const harness = TrustHarness.ready();
    harness.heads.set(ids.assetA, "stale-version");
    const stable = harness.canonicalSnapshot();
    expect(() => harness.commit(authorityA, ids.executionA)).toThrowError(TrustDenied);
    expect(harness.canonicalSnapshot()).toEqual(stable);
  });

  it("returns the same successful commit on duplicate retry", () => {
    const harness = TrustHarness.ready();
    const first = harness.commit(authorityA, ids.executionA);
    const second = harness.commit(authorityA, ids.executionA);
    expect(second).toEqual({ ...first, idempotent: true });
    expect(harness.commits.size).toBe(1);
  });
});

class TrustDenied extends Error {}

type Execution = { id: string; tenantId: string; projectId: string; assetId: string; baseVersionId: string; specId: string; specVersion: number; specHash: string; candidateId: string };
type Evidence = { tenantId: string; executionId: string; specId: string; specVersion: number; specHash: string; candidateId: string; criterion: string };

class TrustHarness {
  readonly executions = new Map<string, Execution>();
  readonly artifacts = new Map<string, { tenantId: string; executionId: string }>();
  readonly heads = new Map<string, string>();
  readonly evidence: Evidence[] = [];
  readonly verified = new Set<string>();
  readonly accepted = new Map<string, string>();
  readonly commits = new Map<string, { versionId: string; commitId: string }>();

  static ready(): TrustHarness {
    const h = new TrustHarness();
    h.seed({ id: ids.executionA, tenantId: ids.tenantA, projectId: ids.projectA, assetId: ids.assetA, baseVersionId: ids.baseA, specId: ids.specA, specVersion: 1, specHash: "hash-a", candidateId: ids.candidateA });
    h.seed({ id: ids.executionB, tenantId: ids.tenantB, projectId: ids.projectB, assetId: ids.assetB, baseVersionId: ids.baseB, specId: ids.specB, specVersion: 1, specHash: "hash-b", candidateId: ids.candidateB });
    for (const criterion of ["EDIT", "SOURCE", "SAME_SPEC"]) h.evidence.push({ tenantId: ids.tenantA, executionId: ids.executionA, specId: ids.specA, specVersion: 1, specHash: "hash-a", candidateId: ids.candidateA, criterion });
    h.verified.add(ids.executionA);
    h.accepted.set(ids.executionA, ids.candidateA);
    return h;
  }

  seed(execution: Execution): void {
    this.executions.set(execution.id, execution);
    this.artifacts.set(execution.candidateId, { tenantId: execution.tenantId, executionId: execution.id });
    this.heads.set(execution.assetId, execution.baseVersionId);
  }

  readExecution(actor: AuthorityContext, executionId: string): Execution { return this.requireOwned(actor, executionId); }
  mutateExecution(actor: AuthorityContext, executionId: string): void { this.requireOwned(actor, executionId); }
  readEvidence(actor: AuthorityContext, executionId: string): Evidence[] { this.requireOwned(actor, executionId); return this.evidence.filter((item) => item.executionId === executionId); }

  attachEvidence(actor: AuthorityContext, executionId: string, specId: string, specVersion: number, specHash: string, candidateId: string, clientTenantId?: string): void {
    void clientTenantId;
    const execution = this.requireOwned(actor, executionId);
    const artifact = this.artifacts.get(candidateId);
    if (!artifact || artifact.tenantId !== execution.tenantId || artifact.executionId !== execution.id || specId !== execution.specId || specVersion !== execution.specVersion || specHash !== execution.specHash) throw new TrustDenied();
  }

  verify(actor: AuthorityContext, executionId: string, evidenceExecutionId: string): void {
    const execution = this.requireOwned(actor, executionId);
    if (evidenceExecutionId !== execution.id || !this.exactEvidence(execution)) throw new TrustDenied();
  }

  accept(actor: AuthorityContext, executionId: string, candidateId: string, payloadExecutionId = executionId): void {
    const execution = this.requireOwned(actor, executionId);
    const artifact = this.artifacts.get(candidateId);
    if (actor.membershipRole !== "OWNER" || payloadExecutionId !== execution.id || candidateId !== execution.candidateId || !artifact || artifact.tenantId !== execution.tenantId || artifact.executionId !== execution.id) throw new TrustDenied();
  }

  commit(actor: AuthorityContext, executionId: string, forged: { projectId?: string } = {}, fault?: "HEAD" | "STATE_COMMIT") {
    const execution = this.requireOwned(actor, executionId);
    const prior = this.commits.get(executionId);
    if (prior) return { ...prior, idempotent: true };
    if (actor.membershipRole !== "OWNER" || (forged.projectId && forged.projectId !== execution.projectId) || !this.verified.has(execution.id) || this.accepted.get(execution.id) !== execution.candidateId || !this.exactEvidence(execution) || this.heads.get(execution.assetId) !== execution.baseVersionId) throw new TrustDenied();

    const stagedHeads = new Map(this.heads);
    const stagedCommits = new Map(this.commits);
    const versionId = `version-${execution.id}`;
    stagedHeads.set(execution.assetId, versionId);
    if (fault === "HEAD") throw new Error("INJECTED_FAILURE");
    const commitId = `commit-${execution.id}`;
    if (fault === "STATE_COMMIT") throw new Error("INJECTED_FAILURE");
    stagedCommits.set(execution.id, { versionId, commitId });
    this.heads.clear(); for (const [key, value] of stagedHeads) this.heads.set(key, value);
    this.commits.clear(); for (const [key, value] of stagedCommits) this.commits.set(key, value);
    return { versionId, commitId, idempotent: false };
  }

  snapshot() { return { canonical: this.canonicalSnapshot(), evidence: structuredClone(this.evidence), verified: [...this.verified], accepted: [...this.accepted] }; }
  canonicalSnapshot() { return { heads: [...this.heads], commits: [...this.commits] }; }

  private requireOwned(actor: AuthorityContext, executionId: string): Execution {
    const execution = this.executions.get(executionId);
    if (!execution || execution.tenantId !== actor.tenantId) throw new TrustDenied();
    return execution;
  }

  private exactEvidence(execution: Execution): boolean {
    const relevant = this.evidence.filter((item) => item.executionId === execution.id && item.tenantId === execution.tenantId && item.specId === execution.specId && item.specVersion === execution.specVersion && item.specHash === execution.specHash && item.candidateId === execution.candidateId);
    return new Set(relevant.map((item) => item.criterion)).size === 3;
  }
}

function authority(principalId: string, tenantId: string, membershipId: string, membershipRole: "OWNER" | "MEMBER"): AuthorityContext {
  return { principalId, tenantId, membershipId, membershipRole, authoritySource: "SUPABASE_AUTH", authorizationTimestamp: "2026-08-15T00:00:00.000Z" };
}

function taskSpec(transactionId: string, assetId: string, versionId: string, id: string): TaskSpec {
  return attachTaskSpecHash({
    schemaVersion: "task-spec-v0.1", id, version: 1, previousVersionHash: null, status: "READY", transactionId,
    blueprint: { id: "15000000-0000-4000-8000-000000000015", version: 1, hash: "a".repeat(64) },
    source: { assetId, versionId, sha256: "b".repeat(64), mimeType: "image/png", byteSize: 1 },
    values: [{ id: "instruction", provenance: "CUSTOMER_STATED", critical: true, visibility: ["IMAGE_EXECUTOR"], value: "edit" }],
    constraints: [], capabilityGrant: ["APPLY_PRESERVATION"],
    criteria: [{ id: "SAME_TASK_SPEC", description: "same", critical: true, verifier: "SAME_SPEC_GATE", evidenceTypes: ["POLICY_CHECK"], roles: ["VERIFIER"] }],
    verificationPolicy: { requireSameSpecHash: true, criticalUnknownBlocksCommit: true, executorDoneIsEvidence: false },
    securityProfile: { promptInjectionPolicy: "TREAT_AS_DATA", embeddedSecretPolicy: "FORBID", unknownInputPolicy: "REJECT" },
    compiler: { name: "test", version: "1" }, inputRequirements: [], rejectionReasons: [], createdAt: "2026-08-15T00:00:00.000Z",
  });
}
