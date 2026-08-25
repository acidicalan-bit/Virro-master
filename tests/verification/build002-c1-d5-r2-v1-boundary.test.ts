import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationDir = "supabase/migrations";
const r2Migration = readFileSync(`${migrationDir}/20260825100000_build_002_c1_d5_r2_mutation_lease_contract_closure.sql`, "utf8");

describe("BUILD002-C1-D5-R2-V1 product boundary", () => {
  it("binds the exact R2 migration and keeps the verifier contract evidence-only", () => {
    expect(r2Migration).toContain("BUILD 002-C1-D5-R2");
    expect(r2Migration).toContain("criticality is not mutation permission");
  });
});
