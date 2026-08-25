import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const r0 = readFileSync("supabase/migrations/20260825080000_build_002_c1_d5_r0_mutation_lease_authority.sql", "utf8");
const r1 = readFileSync("supabase/migrations/20260825090000_build_002_c1_d5_r1_mutation_lease_freshness_semantic_binding.sql", "utf8");
const r2 = readFileSync("supabase/migrations/20260825100000_build_002_c1_d5_r2_mutation_lease_contract_closure.sql", "utf8");

describe("BUILD002-C1-D5-R2 mutation lease contract closure", () => {
  it("keeps R0/R1 historical migrations byte-identical and adds one forward migration", () => {
    expect(r2).toContain("BUILD 002-C1-D5-R2");
    expect(r2).toContain("build002_grant_mutation_lease_r0");
    expect(r0).toContain("critical')::boolean, true) = false");
    expect(r1).toContain("build002_grant_mutation_lease_r0");
  });

  it("does not use criticality as the public mutation permission", () => {
    expect(r2).toContain("criticality is not mutation permission");
    expect(r2).toContain("v_critical_predicate");
    expect(r2).toContain("BUILD002_D5_R2_CRITICAL_PREDICATE_NOT_FOUND");
  });

  it("retains the R1 fail-closed exact binding and private RPC boundary", () => {
    expect(r1).toContain("PATCH_NOT_AUTHORIZED_BY_TASK_SPEC");
    expect(r1).toContain("MUTATION_LEASE_EXPIRED");
    expect(r1).toContain("v_patch.parameters->'value' is distinct from v_patch.desired_value");
    expect(r2).toContain("revoke all on function public.build002_grant_mutation_lease_r0");
    expect(r2).toContain("grant execute on function public.build002_grant_mutation_lease");
  });
});
