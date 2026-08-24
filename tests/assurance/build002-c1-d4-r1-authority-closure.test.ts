import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalJson, canonicalSha256 } from "@/src/domain/outcome/specification/canonical";

const migration = readFileSync("supabase/migrations/20260823130000_build_002_c1_d4_r1_authority_closure.sql", "utf8");

describe("BUILD002-C1-D4-R1 authority closure contract", () => {
  it("uses the explicit canonical JSON contract for nested cross-runtime values", () => {
    const fixture = {
      z: null,
      a: { uuid: "10000000-0000-4000-8000-000000000001", timestamp: "2026-08-23T12:00:00.000Z", integer: 7, bool: true, text: "x" },
      capabilities: ["WRITE_CANDIDATE", "READ_SOURCE"],
      array: [{ b: 2, a: 1 }, false],
    };
    expect(canonicalJson(fixture)).toBe('{"a":{"bool":true,"integer":7,"text":"x","timestamp":"2026-08-23T12:00:00.000Z","uuid":"10000000-0000-4000-8000-000000000001"},"array":[{"a":1,"b":2},false],"capabilities":["WRITE_CANDIDATE","READ_SOURCE"],"z":null}');
    expect(canonicalSha256(fixture)).toMatch(/^[a-f0-9]{64}$/);
    expect(migration).toContain("build002_canonical_json");
    expect(migration).toContain("build002_canonical_sha256");
    expect(migration).not.toContain("jsonb::text");
  });

  it("binds every identity and rechecks current material before idempotency", () => {
    for (const token of [
      "EXECUTION_AUTHORITY_IDENTITY_MISMATCH",
      "v_admission.principal_id",
      "v_admission.membership_id",
      "v_commit.principal_id",
      "v_commit.outcome_transaction_id",
      "v_snapshot.transaction_semantic_hash",
      "v_snapshot.source_asset_version_hash",
      "outcome_requirement_profiles",
      "TASK_SPEC_AUTHORITY_INVALID",
    ]) expect(migration).toContain(token);
    expect(migration.indexOf("build002_validate_execution_authority_row(v_existing.execution_authority_id")).toBeGreaterThan(-1);
    expect(migration.indexOf("build002_validate_execution_authority_row(v_existing.execution_authority_id")).toBeLessThan(migration.indexOf("return jsonb_build_object('execution_authority_id', v_existing.execution_authority_id"));
  });

  it("keeps the authority boundary consequence-free and denies direct writes", () => {
    expect(migration).toContain("grant execute on function public.build002_grant_execution_authority");
    expect(migration).toContain("revoke all on function public.build002_grant_execution_authority");
    expect(migration).not.toMatch(/insert into public\.(mutation_leases|execution_runs|evidence_receipts|state_commits)/i);
    expect(migration).not.toContain("C1-D5");
  });
});
