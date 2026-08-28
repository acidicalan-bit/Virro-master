import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const migrationName = "20260828140000_build_002_r4_f1_trigger_guard_acl_closure.sql";
const migration = readFileSync(resolve(migrationsDir, migrationName), "utf8");
const normalized = migration.replace(/\r\n/g, "\n").toLowerCase();
const guards = [
  "build002_delegability_admission_immutable",
  "build002_execution_authority_immutable",
  "build002_mutation_lease_immutable",
  "build002_readiness_authority_commit_immutable",
  "build002_readiness_authority_marker_graph_coherent",
];

function gitBlob(value: Buffer): string {
  const header = Buffer.from(`blob ${value.length}\0`);
  return createHash("sha1").update(Buffer.concat([header, value])).digest("hex");
}

describe("BUILD002 002-R R4-F1 trigger guard ACL closure", () => {
  it("adds exactly the single final-schema migration45", () => {
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    expect(migrations).toHaveLength(45);
    expect(migrations.at(-1)).toBe(migrationName);
  });

  it("fails closed on exact pg_catalog identities and trigger bindings", () => {
    expect(normalized).toContain("pg_catalog.pg_get_function_identity_arguments(p.oid) = ''");
    expect(normalized).toContain("p.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype");
    expect(normalized).toContain("and p.prosecdef");
    expect(normalized).toContain("search_path=pg_catalog, public");
    expect(normalized).toContain("from pg_catalog.pg_trigger t");
    expect(normalized).toContain("not t.tgisinternal");
    expect(normalized).toContain("build002_r4_f1_trigger_guard_identity_invalid");
    expect(normalized).toContain("build002_r4_f1_trigger_guard_structure_invalid");
    expect(normalized).toContain("build002_r4_f1_trigger_guard_binding_missing");
  });

  it("revokes only the five trigger guard entry points from every client role", () => {
    for (const guard of guards) {
      expect(normalized).toContain(
        `revoke execute on function public.${guard}()\nfrom public, anon, authenticated, service_role;`,
      );
    }
    expect(normalized.match(/revoke execute on function/g)).toHaveLength(5);
    expect(normalized).not.toMatch(/create\s+(or\s+replace\s+)?function/);
    expect(normalized).not.toMatch(/create\s+trigger|alter\s+table|create\s+policy|alter\s+policy|grant\s+/);
  });

  it("checks all fifteen effective privileges after revocation", () => {
    expect(normalized).toContain("array['anon', 'authenticated', 'service_role']");
    expect(normalized).toContain("pg_catalog.has_function_privilege(v_role_name, v_function_oid, 'execute')");
    expect(normalized).toContain("build002_r4_f1_trigger_guard_execute_still_granted");
  });

  it("preserves the three authority migration blobs", () => {
    const expected = new Map([
      ["20260823125000_build_002_r3_f1_pgcrypto_schema_bridge.sql", "f051c75043e367523e3ec58ca641451cfefda581"],
      ["20260826120000_build_002_002e_r10_stale_concurrency_hardening.sql", "3b8a090f2e530089a51080047088c64d35e46509"],
      ["20260826130000_build_002_r3_f1_pgcrypto_schema_closure.sql", "14ec41cd5439f4e21b2bf7ea95124baeda3f36d8"],
    ]);
    for (const [name, expectedBlob] of expected) {
      expect(gitBlob(readFileSync(resolve(migrationsDir, name))), name).toBe(expectedBlob);
    }
  });
});
