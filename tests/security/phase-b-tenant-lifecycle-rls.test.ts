import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260814221620_phase_b_build_001_tenant_lifecycle_rls_coherence.sql",
);
const migration = readFileSync(migrationPath, "utf8");

const resourceTables = [
  "projects",
  "assets",
  "asset_versions",
  "outcome_transactions",
  "preservation_policy_versions",
  "preservation_strategy_runs",
  "field_outcomes",
  "field_feedback",
  "field_regression_candidates",
  "field_golden_cases",
  "field_evaluation_samples",
  "field_evaluation_judgments",
  "verification_criterion_evidence",
] as const;

describe("Phase B tenant lifecycle RLS repair migration", () => {
  it("covers every existing tenant-owned resource select policy", () => {
    for (const table of resourceTables) {
      expect(migration).toContain(`'${table}'`);
      expect(migration).toContain("m.status = 'ACTIVE'");
      expect(migration).toContain("t.status = 'ACTIVE'");
    }
  });

  it("keeps core insert and asset update checks lifecycle-coherent", () => {
    for (const table of ["projects", "assets", "asset_versions", "outcome_transactions"]) {
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).toContain("table_name || '_tenant_insert'");
    expect(migration).toContain("assets_tenant_update");
    expect(migration).toContain("for update to authenticated");
    expect(migration).toContain("with check (");
    expect(migration).toContain("join public.tenants t on t.id = m.tenant_id");
  });

  it("does not backfill ownership or alter authority metadata policies", () => {
    expect(migration).not.toMatch(/insert\s+into\s+public\./i);
    expect(migration).not.toMatch(/update\s+public\./i);
    expect(migration).not.toContain("tenants_read_active_member");
    expect(migration).not.toContain("memberships_read_self");
  });
});
