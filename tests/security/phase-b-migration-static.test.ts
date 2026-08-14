import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase B core lineage migration", () => {
  it("is additive, owner-enforcing and RLS-protected", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260814203203_phase_b_build_001_tenant_authority_envelope_core_lineage.sql"), "utf8");
    expect(migration).toContain("add column if not exists owner_tenant_id uuid");
    expect(migration).toContain("CORE_LINEAGE_OWNER_REQUIRED");
    expect(migration).toContain("CORE_LINEAGE_PARENT_TENANT_MISMATCH");
    expect(migration).toContain("alter table public.projects enable row level security");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("HISTORICAL");
    expect(migration).not.toMatch(/update\s+public\.(projects|assets|asset_versions|outcome_transactions)\s+set\s+owner_tenant_id/i);
  });
});
