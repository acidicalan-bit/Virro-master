import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { attachExecutionAuthorityHash, capabilityGrantHash, normalizeExecutionCapabilities, verifyExecutionAuthorityHash, type Build002ExecutionAuthority } from "@/src/domain/outcome/build002-execution-authority";
import { GrantExecutionAuthorityService } from "@/src/application/outcome/grant-execution-authority";

const base = {
  schemaVersion: "build002-execution-authority-v0.1" as const,
  executionAuthorityId: "10000000-0000-4000-8000-000000000001",
  ownerTenantId: "20000000-0000-4000-8000-000000000001",
  principalId: "30000000-0000-4000-8000-000000000001",
  membershipId: "40000000-0000-4000-8000-000000000001",
  delegabilityAdmissionId: "50000000-0000-4000-8000-000000000001",
  delegabilityAdmissionContentHash: "9".repeat(64),
  authorityCommitId: "51000000-0000-4000-8000-000000000001",
  outcomeTransactionId: "60000000-0000-4000-8000-000000000001",
  assetId: "61000000-0000-4000-8000-000000000001",
  sourceAssetVersionId: "62000000-0000-4000-8000-000000000001",
  sourceAssetVersionHash: "8".repeat(64),
  taskSpecId: "70000000-0000-4000-8000-000000000001",
  taskSpecVersion: 1,
  taskSpecHash: "a".repeat(64),
  blueprintId: "80000000-0000-4000-8000-000000000001",
  blueprintVersion: 1,
  blueprintHash: "b".repeat(64),
  capabilityGrant: ["READ_SOURCE", "WRITE_CANDIDATE"] as ("READ_SOURCE" | "WRITE_CANDIDATE")[],
  capabilityGrantHash: "", // filled below
  historicalDependencySnapshotHash: "d".repeat(64),
  currentDependencySnapshotHash: "c".repeat(64),
  evaluatorSchemaVersion: "build002-qualification-evaluator-v0.1",
  evaluatorVersion: "0.2.0",
  evaluatorDefinitionHash: "7".repeat(64),
  mutationPaths: [] as string[],
  scope: "EXECUTION_AUTHORITY_ONLY" as const,
  mutationLeaseGranted: false as const,
  executionStarted: false as const,
  consequenceBoundary: "FRESH_MUTATION_LEASE_AND_PREEXECUTION_RECHECK_REQUIRED" as const,
  delegabilityRevalidatedAt: "2026-08-23T11:59:00.000Z",
  executionAuthorityRevalidatedAt: "2026-08-23T12:00:00.000Z",
  grantedAt: "2026-08-23T12:00:00.000Z",
  validUntil: "2026-08-23T13:00:00.000Z",
};

describe("BUILD002-C1-D4-R0 execution authority fact", () => {
  it("normalizes capability grants and verifies a stable content hash", () => {
    expect(normalizeExecutionCapabilities(["WRITE_CANDIDATE", "READ_SOURCE", "READ_SOURCE"])).toEqual(["READ_SOURCE", "WRITE_CANDIDATE"]);
    const authority = attachExecutionAuthorityHash({ ...base, capabilityGrantHash: capabilityGrantHash(base.capabilityGrant) });
    expect(verifyExecutionAuthorityHash(authority)).toBe(true);
    expect(verifyExecutionAuthorityHash({ ...authority, capabilityGrant: ["WRITE_CANDIDATE", "READ_SOURCE"] } as unknown as Build002ExecutionAuthority)).toBe(false);
  });

  it("exposes only identity selectors to the public operation", async () => {
    const calls: unknown[] = [];
    const repository = { grant: async (request: unknown) => { calls.push(request); return attachExecutionAuthorityHash({ ...base, capabilityGrantHash: capabilityGrantHash(base.capabilityGrant) }); }, findById: async () => null };
    await new GrantExecutionAuthorityService(repository).grant({ principalId: base.principalId, membershipId: base.membershipId, admissionId: base.delegabilityAdmissionId, taskSpecId: base.taskSpecId, taskSpecHash: base.taskSpecHash });
    expect(calls).toEqual([{ principalId: base.principalId, membershipId: base.membershipId, admissionId: base.delegabilityAdmissionId, taskSpecId: base.taskSpecId, taskSpecHash: base.taskSpecHash }]);
  });

  it("does not use the legacy caller-bound execution capability", () => {
    const files = [
      "src/domain/outcome/build002-execution-authority.ts",
      "src/application/outcome/grant-execution-authority.ts",
      "src/infrastructure/persistence/outcome/supabase-execution-authority-repository.ts",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("bindExecutionAuthority");
      expect(source).not.toContain("MutationLease");
      expect(source).not.toContain("ExecutionRun");
    }
    const migration = readFileSync("supabase/migrations/20260823120000_build_002_c1_d4_r0_execution_authority.sql", "utf8");
    expect(migration).toContain("digest((v_spec - 'id' - 'hash' - 'createdAt')::text, 'sha256')");
    expect(migration).not.toMatch(/insert into public\.(execution_runs|mutation_leases|evidence_receipts|state_commits)/i);
    expect(migration).not.toContain("bindExecutionAuthority");
  });
});
