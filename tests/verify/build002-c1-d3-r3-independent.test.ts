// @vitest-environment node

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PRODUCT_SHA = "40a954a88612e0af04fc6cdafd102d594d9163a4";
const PRODUCT_TREE = "b9274346e4b6724694bf0c01896b9b9c9b14aac6";
const R2_SHA = "46c13bda83b7743bf11412e9005e2c374c7b88d2";
const R0 = "supabase/migrations/20260823090000_build_002_c1_d3_delegability_admission.sql";
const R1 = "supabase/migrations/20260823100000_build_002_c1_d3_r1_serialized_closure.sql";
const R3 = "supabase/migrations/20260823110000_build_002_c1_d3_r3_retry_admissibility.sql";
const migrationDir = resolve(process.cwd(), "supabase/migrations");
const r3Sql = readFileSync(resolve(process.cwd(), R3), "utf8");
const r1Sql = readFileSync(resolve(process.cwd(), R1), "utf8");
const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/build002-c1-d3-r3.yml"), "utf8");

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function requiredOrder(sql: string): boolean {
  const markers = [
    "select status into v_tenant_status from public.tenants where id = v_tenant for update",
    "select * into v_membership from public.tenant_memberships",
    "select * into v_commit from public.build002_readiness_authority_commits",
    "select * into v_tx from public.outcome_transactions",
    "select * into v_asset from public.assets",
    "select * into v_version from public.asset_versions",
    "select * into v_binding from public.outcome_transaction_requirement_bindings",
    "lock table public.build002_signal_requirements in share mode",
    "select * into v_snapshot from public.build002_dependency_snapshots",
    "select * into v_readiness from public.build002_delegation_readiness",
    "v_readiness.valid_until <= v_now",
    "v_readiness.evaluator->>'schemaVersion'",
    "validate the complete caller envelope before any idempotent lookup",
    "p_admission->>'revalidatedAt'",
    "select * into v_existing from public.build002_delegability_admissions",
    "return jsonb_build_object('admission_id', v_existing.admission_id",
  ];
  let previous = -1;
  for (const marker of markers) {
    const position = sql.toLowerCase().indexOf(marker.toLowerCase());
    if (position <= previous) return false;
    previous = position;
  }
  return true;
}

function attackDetector(sql: string, workflowText = workflow): boolean {
  return requiredOrder(sql)
    && /p_admission->>'readinessState'\s+is distinct from\s+'READY'/i.test(sql)
    && /v_readiness\.valid_until\s+is not null\s+and\s+v_readiness\.valid_until\s+<=\s+v_now/i.test(sql)
    && /v_membership\.status\s+is distinct from\s+'ACTIVE'/i.test(sql)
    && /lock table public\.build002_signals in share mode/i.test(sql)
    && /revoke all on function public\.build002_admit_delegability\(uuid, uuid, uuid, jsonb, jsonb\) from public, anon, authenticated/i.test(sql)
    && /grant execute on function public\.build002_admit_delegability\(uuid, uuid, uuid, jsonb, jsonb\) to service_role\s*;/i.test(sql)
    && !/grant execute on function public\.build002_admit_delegability\(uuid, uuid, uuid, jsonb, jsonb\) to service_role,\s*authenticated/i.test(sql)
    && /revoke all on function public\.build002_admit_delegability_legacy\(uuid, uuid, uuid, jsonb\) from public, anon, authenticated, service_role/i.test(sql)
    && /DELEGABILITY_ADMISSION_READBACK_FAILED/.test(sql)
    && /length\(v_existing\.admission_content_hash\)\s*<>\s*64/.test(sql)
    && /build002-c1-d3-postgres\.e3\.test\.ts/.test(workflowText)
    && /image:\s*postgres:17/.test(workflowText);
}

describe("BUILD002-C1-D3-R3 independent verifier", () => {
  it("pins product ancestry, tree and forward-only migration history", () => {
    expect(git("rev-parse", PRODUCT_SHA)).toBe(PRODUCT_SHA);
    expect(git("rev-parse", `${PRODUCT_SHA}^{tree}`)).toBe(PRODUCT_TREE);
    expect(git("merge-base", "--is-ancestor", R2_SHA, PRODUCT_SHA)).toBe("");
    const migrations = readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort();
    expect(migrations).toHaveLength(34);
    expect(migrations).toContain(R3.split("/").pop());
    expect(git("diff", "--quiet", R2_SHA, PRODUCT_SHA, "--", R0)).toBe("");
    expect(git("diff", "--quiet", R2_SHA, PRODUCT_SHA, "--", R1)).toBe("");
  });

  it("requires current admissibility before idempotent lookup and return", () => {
    expect(requiredOrder(r3Sql)).toBe(true);
    expect(r3Sql.indexOf("Validate the complete caller envelope")).toBeLessThan(r3Sql.indexOf("select * into v_existing"));
    expect(r3Sql.indexOf("p_admission->>'revalidatedAt'")).toBeLessThan(r3Sql.indexOf("select * into v_existing"));
    expect(attackDetector(`${r3Sql}\n${r1Sql}`, workflow)).toBe(true);
  });

  const attacks: Array<{ name: string; sql: (r3: string, r1: string) => string; workflow?: (value: string) => string }> = [
    { name: "A move lookup before envelope", sql: (r3, r1) => r3.replace("  -- Validate the complete caller envelope before any idempotent lookup.", "  select * into v_existing from public.build002_delegability_admissions where false;\n\n  -- Validate the complete caller envelope before any idempotent lookup.") + r1 },
    { name: "B accept READY_WITH_CONDITIONS", sql: (r3, r1) => r3.replace(/p_admission->>'readinessState'\s+is distinct from\s+'READY'/, "p_admission->>'readinessState' is distinct from 'READY_WITH_CONDITIONS'") + r1 },
    { name: "C remove expiration", sql: (r3, r1) => r3.replace(/\s*if v_readiness\.valid_until is not null and v_readiness\.valid_until <= v_now then raise exception 'READINESS_EXPIRED'; end if;/, "") + r1 },
    { name: "D remove membership recheck", sql: (r3, r1) => r3.replace(/\s+or v_membership\.status is distinct from 'ACTIVE'/, "") + r1 },
    { name: "E remove signal SHARE lock", sql: (r3, r1) => r3.replace(/\s*lock table public\.build002_signals in share mode;\r?\n/, "") + r1 },
    { name: "F allow authenticated RPC", sql: (r3, r1) => r3.replace("to service_role;", "to service_role, authenticated;") + r1 },
    { name: "G allow legacy RPC", sql: (r3, r1) => r3 + r1.replace(/from public, anon,\s*authenticated, service_role;/g, "from public, anon, authenticated;") },
    { name: "H skip persisted hash verification", sql: (r3, r1) => r3.replace("or length(v_existing.admission_content_hash) <> 64", "or false") + r1 },
    { name: "I disable native race", sql: (r3, r1) => r3 + r1, workflow: (value) => value.replace("pnpm exec vitest run tests/native/build002-c1-d3-postgres.e3.test.ts --reporter=verbose", "echo skipped") },
    { name: "J skip PostgreSQL 17", sql: (r3, r1) => r3 + r1, workflow: (value) => value.replace("image: postgres:17", "image: postgres:latest") },
  ];
  for (const attack of attacks) {
    it(`rejects verifier attack: ${attack.name}`, () => {
      const mutatedSql = attack.sql(r3Sql, r1Sql);
      const mutatedWorkflow = attack.workflow?.(workflow) ?? workflow;
      switch (attack.name[0]) {
        case "A": expect(requiredOrder(mutatedSql)).toBe(false); break;
        case "B": expect(/p_admission->>'readinessState'\s+is distinct from\s+'READY'/i.test(mutatedSql.split(r1Sql)[0])).toBe(false); break;
        case "C": expect(/v_readiness\.valid_until\s+is not null\s+and\s+v_readiness\.valid_until\s+<=\s+v_now/i.test(mutatedSql.split(r1Sql)[0])).toBe(false); break;
        case "D": expect(/v_membership\.status\s+is distinct from\s+'ACTIVE'/i.test(mutatedSql.split(r1Sql)[0])).toBe(false); break;
        case "E": expect(/lock table public\.build002_signals in share mode/i.test(mutatedSql.split(r1Sql)[0])).toBe(false); break;
        case "F": expect(/grant execute on function public\.build002_admit_delegability\([\s\S]*to service_role,\s*authenticated/i.test(mutatedSql)).toBe(true); break;
        case "G": expect(/revoke all on function public\.build002_admit_delegability_legacy\([\s\S]*from public, anon, authenticated, service_role/i.test(mutatedSql)).toBe(false); break;
        case "H": expect(/length\(v_existing\.admission_content_hash\)\s*<>\s*64/i.test(mutatedSql.split(r1Sql)[0])).toBe(false); break;
        case "I": expect(/build002-c1-d3-postgres\.e3\.test\.ts/.test(mutatedWorkflow)).toBe(false); break;
        case "J": expect(/image:\s*postgres:17/.test(mutatedWorkflow)).toBe(false); break;
      }
    });
  }

  it("classifies only verifier-owned paths in the verifier delta", () => {
    const allowed = new Set([
      ".github/workflows/verify-build002-c1-d3-r3.yml",
      "tests/verify/build002-c1-d3-r3-independent.test.ts",
      "docs/verification/build002-c1-d3-r3-independent.md",
    ]);
    const changed = git("diff", "--name-only", PRODUCT_SHA, "HEAD").split(/\r?\n/).filter(Boolean);
    expect(changed.every((path) => allowed.has(path.replaceAll("\\", "/")))).toBe(true);
    expect(changed.some((path) => path.startsWith("src/"))).toBe(false);
    expect(changed.some((path) => path.startsWith("supabase/migrations/"))).toBe(false);
    expect(changed.some((path) => path.startsWith("tests/native/"))).toBe(false);
  });
});
