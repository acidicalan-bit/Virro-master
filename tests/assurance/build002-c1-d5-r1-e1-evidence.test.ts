import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const r1Migration = readFileSync("supabase/migrations/20260825090000_build_002_c1_d5_r1_mutation_lease_freshness_semantic_binding.sql", "utf8");
const r0Migration = readFileSync("supabase/migrations/20260825080000_build_002_c1_d5_r0_mutation_lease_authority.sql", "utf8");
const repository = readFileSync("src/infrastructure/persistence/outcome/supabase-build002-mutation-lease-repository.ts", "utf8");

describe("BUILD002-C1-D5-R1-E1 authored evidence boundary", () => {
  it("keeps the exact product boundary and does not rewrite R0", () => {
    expect(r0Migration).toContain("BUILD 002-C1-D5-R0");
    expect(r1Migration).toContain("BUILD 002-C1-D5-R1");
    expect(r1Migration).toContain("rename to build002_grant_mutation_lease_r0");
    expect(r1Migration).not.toMatch(/create table.*mutation_leases/i);
    expect(r1Migration).not.toMatch(/create table.*execution_runs/i);
  });

  it("records the fail-closed freshness and semantic boundaries", () => {
    expect(r1Migration).toContain("MUTATION_LEASE_EXPIRED");
    expect(r1Migration).toContain("r.valid_until <= clock_timestamp()");
    expect(r1Migration).toContain("v_patch.operation is distinct from v_patch.intent_operation");
    expect(r1Migration).toContain("v_patch.parameters->'value' is distinct from v_patch.desired_value");
    expect(r1Migration).toContain("v_patch.desired_value is distinct from v_value");
    expect(r1Migration).toContain("PATCH_NOT_AUTHORIZED_BY_TASK_SPEC");
  });

  it("keeps canonical readback scoped and hashed", () => {
    expect(repository).toContain('.eq("mutation_lease_id", id)');
    expect(repository).toContain('.eq("owner_tenant_id", this.ownerTenantId)');
    expect(repository).toContain("verifyBuild002MutationLeaseHash(lease)");
  });
});
