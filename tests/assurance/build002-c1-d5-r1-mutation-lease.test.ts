import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260825090000_build_002_c1_d5_r1_mutation_lease_freshness_semantic_binding.sql", "utf8");
const repository = readFileSync("src/infrastructure/persistence/outcome/supabase-build002-mutation-lease-repository.ts", "utf8");

describe("BUILD002-C1-D5-R1 mutation lease closure", () => {
  it("fails closed for expired immutable authority and forbids same-D4 reuse", () => {
    expect(migration).toContain("r.valid_until <= clock_timestamp()");
    expect(migration).toContain("MUTATION_LEASE_EXPIRED");
    expect(migration).toContain("rename to build002_grant_mutation_lease_r0");
    expect(migration).toContain("build002_validate_mutation_lease_row(v_existing)");
    expect(migration).toContain("valid_until is null");
    expect(migration).toContain("execution_started is distinct from false");
  });

  it("requires exact TaskSpec, intent, and patch operation/value identity", () => {
    expect(migration).toContain("p.transaction_id = v_tx");
    expect(migration).toContain("p.partial_intent_id");
    expect(migration).toContain("v_patch.operation is distinct from v_patch.intent_operation");
    expect(migration).toContain("v_patch.operation is distinct from 'SET_ATTRIBUTE'");
    expect(migration).toContain("v_patch.parameters->'value' is distinct from v_patch.desired_value");
    expect(migration).toContain("v_patch.desired_value is distinct from v_value");
    expect(migration).toContain("PATCH_NOT_AUTHORIZED_BY_TASK_SPEC");
    expect(migration).toContain("lock table public.transaction_patches in share mode");
  });

  it("reads canonical leases through the trusted tenant scope", () => {
    expect(repository).toContain('.eq("owner_tenant_id", this.ownerTenantId)');
    expect(repository).toContain("lease.ownerTenantId !== this.ownerTenantId");
    expect(repository).toContain("Date.parse(lease.validUntil) <= Date.now()");
    expect(repository).toContain("MUTATION_LEASE_EXPIRED");
  });
});
