import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { attachBuild002MutationLeaseHash, verifyBuild002MutationLeaseHash, mutationLeaseHashMaterial } from "@/src/domain/outcome/build002-mutation-lease";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";

const migration = readFileSync("supabase/migrations/20260825080000_build_002_c1_d5_r0_mutation_lease_authority.sql", "utf8");
const base = {
  schemaVersion: "build002-mutation-lease-v0.1" as const,
  mutationLeaseId: "10000000-0000-4000-8000-000000000001",
  ownerTenantId: "20000000-0000-4000-8000-000000000001",
  principalId: "30000000-0000-4000-8000-000000000001",
  membershipId: "40000000-0000-4000-8000-000000000001",
  executionAuthorityId: "50000000-0000-4000-8000-000000000001",
  executionAuthorityContentHash: "a".repeat(64),
  delegabilityAdmissionId: "60000000-0000-4000-8000-000000000001",
  authorityCommitId: "61000000-0000-4000-8000-000000000001",
  outcomeTransactionId: "70000000-0000-4000-8000-000000000001",
  assetId: "71000000-0000-4000-8000-000000000001",
  sourceAssetVersionId: "72000000-0000-4000-8000-000000000001",
  sourceAssetVersionHash: "b".repeat(64),
  taskSpecId: "73000000-0000-4000-8000-000000000001",
  taskSpecVersion: 1,
  taskSpecHash: "c".repeat(64),
  blueprintId: "74000000-0000-4000-8000-000000000001",
  blueprintVersion: 1,
  blueprintHash: "d".repeat(64),
  currentDependencySnapshotHash: "e".repeat(64),
  capabilityGrantHash: "f".repeat(64),
  targetPath: "requested.color",
  category: "MUTABLE" as const,
  scope: "MUTATION_LEASE_ONLY" as const,
  executionStarted: false as const,
  executionAuthorityRevalidatedAt: "2026-08-25T08:00:00.000Z",
  mutationLeaseRevalidatedAt: "2026-08-25T08:00:01.000Z",
  grantedAt: "2026-08-25T08:00:01.000Z",
  validUntil: "2026-08-25T08:05:01.000Z",
  consequenceBoundary: "FRESH_PREEXECUTION_RECHECK_AND_EXECUTION_START_REQUIRED" as const,
};

describe("BUILD002-C1-D5-R0 mutation lease authority", () => {
  it("hashes every semantic field and excludes only identity/emission fields", () => {
    const lease = attachBuild002MutationLeaseHash(base);
    expect(verifyBuild002MutationLeaseHash(lease)).toBe(true);
    expect(lease.mutationLeaseContentHash).toBe(canonicalSha256(mutationLeaseHashMaterial(lease)));
    expect(verifyBuild002MutationLeaseHash({ ...lease, targetPath: "requested.other" })).toBe(false);
    expect(verifyBuild002MutationLeaseHash({ ...lease, executionAuthorityContentHash: "0".repeat(64) })).toBe(false);
  });

  it("rejects non-exact paths and keeps the legacy table out of the canonical path", () => {
    expect(() => attachBuild002MutationLeaseHash({ ...base, targetPath: "requested.*" })).toThrow();
    expect(migration).toContain("create table if not exists public.build002_mutation_leases");
    expect(migration).toContain("PATCH_NOT_AUTHORIZED_BY_TASK_SPEC");
    expect(migration).toContain("transaction_patches");
    expect(migration).not.toMatch(/insert into public\.mutation_leases/i);
    expect(migration).toContain("MUTATION_LEASE_ONLY");
  });

  it("keeps authority RPC-only, immutable and consequence-free", () => {
    for (const token of [
      "build002_mutation_lease_immutable",
      "revoke all on table public.build002_mutation_leases",
      "revoke all on function public.build002_grant_mutation_lease",
      "grant execute on function public.build002_grant_mutation_lease",
      "set_config('build002.mutation_lease'",
      "execution_started = false",
      "valid_until timestamptz not null",
    ]) expect(migration).toContain(token);
    expect(migration).not.toMatch(/insert into public\.(execution_runs|evidence_receipts|state_commits|cost_records)/i);
    expect(migration).not.toContain("pg_net");
  });
});
