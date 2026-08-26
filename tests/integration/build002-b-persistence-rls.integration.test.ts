// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = {
  exec(sql: string): Promise<unknown>;
  query<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close(): Promise<void>;
};

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const ACTOR_A = "10000000-0000-4000-8000-000000000001";
const ACTOR_B = "10000000-0000-4000-8000-000000000002";
const TENANT_A = "20000000-0000-4000-8000-000000000001";
const TENANT_B = "20000000-0000-4000-8000-000000000002";
const TX_A = "40000000-0000-4000-8000-000000000001";
const TX_B = "40000000-0000-4000-8000-000000000002";
const PROJECT_A = "50000000-0000-4000-8000-000000000001";
const PROJECT_B = "50000000-0000-4000-8000-000000000002";
const ASSET_A = "60000000-0000-4000-8000-000000000001";
const ASSET_B = "60000000-0000-4000-8000-000000000002";
const VERSION_A = "70000000-0000-4000-8000-000000000001";
const VERSION_B = "70000000-0000-4000-8000-000000000002";
const SIGNAL_A = "80000000-0000-4000-8000-000000000001";
const SIGNAL_B = "80000000-0000-4000-8000-000000000002";
const REQUIREMENT_HASH = "a".repeat(64);
const SIGNAL_HASH = "b".repeat(64);
const DEPENDENCY_HASH = "c".repeat(64);
const QUALIFICATION_HASH = "d".repeat(64);
const READINESS_HASH = "e".repeat(64);
const WRONG_HASH = "1".repeat(64);
const SECOND_QUALIFICATION_HASH = "e".repeat(64);
const ATOMIC_DEPENDENCY_HASH = "9".repeat(64);
const ATOMIC_INVALID_HASH = "8".repeat(64);
const RPC_QUALIFICATION_ID = "90000000-0000-4000-8000-000000000098";
const RPC_QUALIFICATION_HASH = "4".repeat(64);
const RPC_READINESS_ID = "90000000-0000-4000-8000-000000000097";
const RPC_READINESS_HASH = "5".repeat(64);

describe("BUILD 002-B immutable readiness persistence and tenant RLS (PGlite support)", () => {
  let db: Db;

  beforeAll(async () => {
    db = new PGlite({ extensions: { pgcrypto } }) as Db;
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create schema storage;
      create table storage.buckets (
        id text primary key,
        name text not null unique,
        public boolean not null default false,
        file_size_limit bigint,
        allowed_mime_types text[]
      );
    `);
    const migrations = readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort();
    const r2Migration = migrations.find((name) => name.startsWith("20260819130000_"));
    const hardeningMigration = migrations.find((name) => name.includes("002e_r10_stale_concurrency_hardening"));
    for (const name of migrations.filter((item) => item !== r2Migration && item !== hardeningMigration)) {
      await db.exec(readFileSync(resolve(migrationsDir, name), "utf8"));
    }
    await db.exec(`
      insert into auth.users(id) values ('${ACTOR_A}'), ('${ACTOR_B}');
      insert into public.tenants(id, kind, personal_owner_principal_id, status) values
        ('${TENANT_A}', 'PERSONAL', '${ACTOR_A}', 'ACTIVE'),
        ('${TENANT_B}', 'PERSONAL', '${ACTOR_B}', 'ACTIVE');
      insert into public.tenant_memberships(id, tenant_id, principal_id, role, status) values
        ('30000000-0000-4000-8000-000000000001', '${TENANT_A}', '${ACTOR_A}', 'OWNER', 'ACTIVE'),
        ('30000000-0000-4000-8000-000000000002', '${TENANT_B}', '${ACTOR_B}', 'OWNER', 'ACTIVE');
      insert into public.projects(id, owner_tenant_id, name) values
        ('${PROJECT_A}', '${TENANT_A}', 'A'), ('${PROJECT_B}', '${TENANT_B}', 'B');
      insert into public.assets(id, owner_tenant_id, project_id, name) values
        ('${ASSET_A}', '${TENANT_A}', '${PROJECT_A}', 'A'), ('${ASSET_B}', '${TENANT_B}', '${PROJECT_B}', 'B');
      insert into public.asset_versions(id, owner_tenant_id, asset_id, version_number, state) values
        ('${VERSION_A}', '${TENANT_A}', '${ASSET_A}', 1, '{}'::jsonb), ('${VERSION_B}', '${TENANT_B}', '${ASSET_B}', 1, '{}'::jsonb);
      update public.assets set current_version_id = '${VERSION_A}' where id = '${ASSET_A}';
      update public.assets set current_version_id = '${VERSION_B}' where id = '${ASSET_B}';
      insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request)
      values ('${TX_A}', '${TENANT_A}', '${PROJECT_A}', '${ASSET_A}', '${VERSION_A}', 'A'),
             ('${TX_B}', '${TENANT_B}', '${PROJECT_B}', '${ASSET_B}', '${VERSION_B}', 'B');
      set role service_role;
      insert into public.build002_signal_requirements(
        owner_tenant_id, outcome_transaction_id, requirement_id, semantic_type, critical,
        accepted_provenance, qualification_rule, dependency_selectors, blueprint_id,
        blueprint_version, blueprint_hash, policy_id, policy_hash, schema_version,
        requirement_definition_hash, created_at
      ) values (
        '${TENANT_A}', '${TX_A}', 'signal.readiness', 'text', true,
        '["OBSERVED"]'::jsonb, '{"version":"1","cardinality":"SINGLE_VALUED","humanReviewRequired":false}'::jsonb,
        '[{"identity":"asset.version","required":false}]'::jsonb, '90000000-0000-4000-8000-000000000001', 1,
        '${REQUIREMENT_HASH}', null, null, 'build002-signal-requirement-v0.1', '${REQUIREMENT_HASH}', now()
      );
      insert into public.build002_signals(
        signal_id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash,
        payload, source, provenance, captured_at, valid_until, dependency_identity, dependency_hash,
        schema_version, content_hash
      ) values (
        '${SIGNAL_A}', '${TENANT_A}', '${TX_A}', 'signal.readiness', '${REQUIREMENT_HASH}',
        '{"value":"ready"}'::jsonb, '{"identity":"fixture","version":"1","hash":null}'::jsonb,
        'OBSERVED', now(), null, 'asset.version', '${SIGNAL_HASH}', 'build002-signal-v0.2', '${SIGNAL_HASH}'
      );
      insert into public.build002_dependency_snapshots(
        owner_tenant_id, outcome_transaction_id, requirement_definition_hashes, signal_references,
        dependency_bindings, blueprint_hash, policy_hash, task_spec_hash, transaction_semantic_hash,
        source_asset_version_hash, context_lens_hash, schema_version, dependency_snapshot_hash
      ) values (
        '${TENANT_A}', '${TX_A}', '["${REQUIREMENT_HASH}"]'::jsonb,
        '[{"requirementId":"signal.readiness","signalId":"${SIGNAL_A}","contentHash":"${SIGNAL_HASH}"}]'::jsonb,
        '[]'::jsonb, null, null, null, null, null, null, 'build002-dependency-snapshot-v0.2', '${DEPENDENCY_HASH}'
      );
      insert into public.build002_dependency_requirements(owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, requirement_definition_hash)
      select '${TENANT_A}', '${TX_A}', id, '${REQUIREMENT_HASH}' from public.build002_dependency_snapshots where dependency_snapshot_hash = '${DEPENDENCY_HASH}';
      insert into public.build002_dependency_signals(owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, signal_id, signal_content_hash, requirement_id)
      select '${TENANT_A}', '${TX_A}', id, '${SIGNAL_A}', '${SIGNAL_HASH}', 'signal.readiness' from public.build002_dependency_snapshots where dependency_snapshot_hash = '${DEPENDENCY_HASH}';
      insert into public.build002_signal_qualifications(
        owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash,
        dependency_snapshot_id, dependency_snapshot_hash, signal_ids, signal_content_hashes,
        evaluator, outcome, reason_code, evidence_valid_until, qualified_at, schema_version, qualification_content_hash
      ) select '${TENANT_A}', '${TX_A}', 'signal.readiness', '${REQUIREMENT_HASH}', id, '${DEPENDENCY_HASH}',
        '["${SIGNAL_A}"]'::jsonb, '["${SIGNAL_HASH}"]'::jsonb,
        '{"schemaVersion":"build002-qualification-evaluator-v0.1","version":"0.1.0","definitionHash":"${QUALIFICATION_HASH}"}'::jsonb,
        'QUALIFIED', 'SIGNAL_QUALIFIED', null, now(), 'build002-signal-qualification-v0.3', '${QUALIFICATION_HASH}'
      from public.build002_dependency_snapshots where dependency_snapshot_hash = '${DEPENDENCY_HASH}';
      insert into public.build002_qualification_signals(owner_tenant_id, outcome_transaction_id, qualification_id, qualification_content_hash, signal_id, signal_content_hash, requirement_id)
      select '${TENANT_A}', '${TX_A}', id, '${QUALIFICATION_HASH}', '${SIGNAL_A}', '${SIGNAL_HASH}', 'signal.readiness' from public.build002_signal_qualifications where qualification_content_hash = '${QUALIFICATION_HASH}';
      insert into public.build002_delegation_readiness(
        owner_tenant_id, outcome_transaction_id, requirement_set_hash, qualification_set_hash,
        dependency_snapshot_id, dependency_snapshot_hash, task_spec_hash, source_asset_version_hash,
        blueprint_hash, policy_hash, evaluator, state, blocking_codes, condition_codes, created_at,
        valid_until, schema_version, readiness_content_hash
      ) select '${TENANT_A}', '${TX_A}', '${REQUIREMENT_HASH}', '${QUALIFICATION_HASH}', id, '${DEPENDENCY_HASH}', null, null,
        null, null, '{"schemaVersion":"build002-qualification-evaluator-v0.1","version":"0.1.0","definitionHash":"${READINESS_HASH}"}'::jsonb,
        'READY', '[]'::jsonb, '[]'::jsonb, now(), null, 'build002-signal-readiness-v0.3', '${READINESS_HASH}'
      from public.build002_dependency_snapshots where dependency_snapshot_hash = '${DEPENDENCY_HASH}';
      insert into public.build002_readiness_qualifications(owner_tenant_id, outcome_transaction_id, readiness_id, readiness_content_hash, qualification_id, qualification_content_hash)
      select '${TENANT_A}', '${TX_A}', r.id, '${READINESS_HASH}', q.id, '${QUALIFICATION_HASH}'
      from public.build002_delegation_readiness r cross join public.build002_signal_qualifications q
      where r.readiness_content_hash = '${READINESS_HASH}' and q.qualification_content_hash = '${QUALIFICATION_HASH}';
      reset role;
    `);
    if (r2Migration) await db.exec(readFileSync(resolve(migrationsDir, r2Migration), "utf8"));
    if (hardeningMigration) await db.exec(readFileSync(resolve(migrationsDir, hardeningMigration), "utf8"));
  }, 30_000);

  afterAll(async () => db?.close());

  it("persists the complete tenant-rooted snapshot graph with composite lineage", async () => {
    const result = await db.query<{ requirements: number; signals: number; dependencies: number; qualifications: number; readiness: number; links: number }>(`
      select
        (select count(*)::integer from public.build002_signal_requirements) as requirements,
        (select count(*)::integer from public.build002_signals) as signals,
        (select count(*)::integer from public.build002_dependency_snapshots) as dependencies,
        (select count(*)::integer from public.build002_signal_qualifications) as qualifications,
        (select count(*)::integer from public.build002_delegation_readiness) as readiness,
        (select count(*)::integer from public.build002_readiness_qualifications) as links
    `);
    expect(result.rows[0]).toEqual({ requirements: 1, signals: 1, dependencies: 1, qualifications: 1, readiness: 1, links: 1 });
  });

  it("denies direct authenticated writes and tenant-crossing reads", async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ACTOR_A}';`);
    await expectSqlError(db, `insert into public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, requirement_id, semantic_type, critical, accepted_provenance, qualification_rule, dependency_selectors, blueprint_id, blueprint_version, blueprint_hash, schema_version, requirement_definition_hash, created_at) values ('${TENANT_A}', '${TX_A}', 'x', 'x', false, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '90000000-0000-4000-8000-000000000002', 1, '${REQUIREMENT_HASH}', 'build002-signal-requirement-v0.1', '${"f".repeat(64)}', now())`, "permission denied");
    const visible = await db.query<{ owner_tenant_id: string }>("select owner_tenant_id::text from public.build002_signal_requirements");
    expect(visible.rows).toEqual([{ owner_tenant_id: TENANT_A }]);
    await db.exec("reset role; set role service_role; update public.tenant_memberships set status = 'REVOKED' where tenant_id = '" + TENANT_A + "'; reset role; set role authenticated;");
    const revoked = await db.query<Record<string, unknown>>("select * from public.build002_signal_requirements");
    expect(revoked.rows).toEqual([]);
    await db.exec("reset role");
  });

  it("rejects service-role update/delete through grants and immutable triggers", async () => {
    await db.exec("set role service_role");
    await expectSqlError(db, `update public.build002_signals set provenance = 'UNKNOWN' where signal_id = '${SIGNAL_A}'`, "permission denied");
    await expectSqlError(db, `delete from public.build002_signal_requirements where requirement_definition_hash = '${REQUIREMENT_HASH}'`, "permission denied");
    await db.exec("reset role");
  });

  it("rejects cross-tenant and missing-parent lineage", async () => {
    await db.exec("set role service_role");
    await expectSqlError(db, `insert into public.build002_dependency_snapshots(owner_tenant_id, outcome_transaction_id, requirement_definition_hashes, signal_references, dependency_bindings, schema_version, dependency_snapshot_hash) values ('${TENANT_A}', '${TX_A}', '[\"${REQUIREMENT_HASH}\"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'build002-dependency-snapshot-v0.2', '${"f".repeat(64)}')`, "permission denied");
    await expectSqlError(db, `insert into public.build002_signal_qualifications(id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash, dependency_snapshot_id, dependency_snapshot_hash, signal_ids, signal_content_hashes, evaluator, outcome, reason_code, qualified_at, schema_version, qualification_content_hash) values ('90000000-0000-4000-8000-000000000099', '${TENANT_A}', '${TX_A}', 'signal.readiness', '${REQUIREMENT_HASH}', '90000000-0000-4000-8000-000000000099', '${"f".repeat(64)}', '[]'::jsonb, '[]'::jsonb, '{\"schemaVersion\":\"build002-qualification-evaluator-v0.1\",\"version\":\"0.1.0\",\"definitionHash\":\"${QUALIFICATION_HASH}\"}'::jsonb, 'MISSING', 'SIGNAL_MISSING', now(), 'build002-signal-qualification-v0.3', '${SECOND_QUALIFICATION_HASH}')`, "permission denied");
    await expectSqlError(db, `insert into public.build002_dependency_signals(owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, signal_id, signal_content_hash, requirement_id) values ('${TENANT_A}', '${TX_A}', '90000000-0000-4000-8000-000000000099', '${SIGNAL_A}', '${WRONG_HASH}', 'signal.readiness')`, "permission denied");
    await db.exec("reset role");
  });

  it("uses the atomic RPCs and rolls back a failed child lineage", async () => {
    await db.exec("set role service_role");
    const snapshot = {
      owner_tenant_id: TENANT_A,
      outcome_transaction_id: TX_A,
      requirement_definition_hashes: [REQUIREMENT_HASH],
      signal_references: [{ requirementId: "signal.readiness", signalId: SIGNAL_A, contentHash: SIGNAL_HASH }],
      dependency_bindings: [],
      blueprint_hash: null,
      policy_hash: null,
      task_spec_hash: null,
      transaction_semantic_hash: null,
      source_asset_version_hash: null,
      context_lens_hash: null,
      schema_version: "build002-dependency-snapshot-v0.2",
      dependency_snapshot_hash: ATOMIC_DEPENDENCY_HASH,
    };
    const inserted = await db.query<{ id: string }>("select public.build002_insert_dependency_snapshot($1::jsonb) as id", [JSON.stringify(snapshot)]);
    expect(inserted.rows[0].id).toBeTruthy();
    const before = await db.query<{ count: number }>("select count(*)::integer as count from public.build002_dependency_snapshots");
    const invalid = { ...snapshot, dependency_snapshot_hash: ATOMIC_INVALID_HASH, signal_references: [{ requirementId: "signal.readiness", signalId: SIGNAL_A, contentHash: "2".repeat(64) }] };
    await expectSqlError(db, "select public.build002_insert_dependency_snapshot($1::jsonb)", "violates foreign key", JSON.stringify(invalid));
    const after = await db.query<{ count: number }>("select count(*)::integer as count from public.build002_dependency_snapshots");
    expect(after.rows[0].count).toBe(before.rows[0].count);
    const baseDependency = await db.query<{ id: string }>("select id::text from public.build002_dependency_snapshots where dependency_snapshot_hash = $1", [DEPENDENCY_HASH]);
    const qualification = {
      owner_tenant_id: TENANT_A,
      outcome_transaction_id: TX_A,
      id: RPC_QUALIFICATION_ID,
      requirement_id: "signal.readiness",
      requirement_definition_hash: REQUIREMENT_HASH,
      dependency_snapshot_hash: DEPENDENCY_HASH,
      signalIds: [SIGNAL_A],
      signalContentHashes: [SIGNAL_HASH],
      evaluator: { schemaVersion: "build002-qualification-evaluator-v0.1", version: "0.1.0", definitionHash: RPC_QUALIFICATION_HASH },
      outcome: "QUALIFIED",
      reason_code: "SIGNAL_QUALIFIED",
      evidence_valid_until: null,
      qualified_at: "2026-08-18T12:00:00.000Z",
      schema_version: "build002-signal-qualification-v0.3",
      qualification_content_hash: RPC_QUALIFICATION_HASH,
    };
    const qInserted = await db.query<{ id: string }>("select public.build002_insert_signal_qualification($1::jsonb, $2::uuid) as id", [JSON.stringify(qualification), baseDependency.rows[0].id]);
    expect(qInserted.rows[0].id).toBe(RPC_QUALIFICATION_ID);
    const readiness = {
      owner_tenant_id: TENANT_A,
      outcome_transaction_id: TX_A,
      id: RPC_READINESS_ID,
      requirement_set_hash: REQUIREMENT_HASH,
      qualification_set_hash: RPC_QUALIFICATION_HASH,
      dependency_snapshot_hash: DEPENDENCY_HASH,
      task_spec_hash: null,
      source_asset_version_hash: null,
      blueprint_hash: null,
      policy_hash: null,
      evaluator: { schemaVersion: "build002-qualification-evaluator-v0.1", version: "0.1.0", definitionHash: RPC_READINESS_HASH },
      state: "READY",
      blocking_codes: [],
      condition_codes: [],
      created_at: "2026-08-18T12:00:00.000Z",
      valid_until: null,
      schema_version: "build002-signal-readiness-v0.3",
      readiness_content_hash: RPC_READINESS_HASH,
    };
    const rInserted = await db.query<{ id: string }>("select public.build002_insert_delegation_readiness($1::jsonb, $2::uuid, $3::jsonb) as id", [JSON.stringify(readiness), baseDependency.rows[0].id, JSON.stringify([RPC_QUALIFICATION_ID])]);
    expect(rInserted.rows[0].id).toBe(RPC_READINESS_ID);
    const readinessBefore = await db.query<{ count: number }>("select count(*)::integer as count from public.build002_delegation_readiness");
    await expectSqlError(db, "select public.build002_insert_delegation_readiness($1::jsonb, $2::uuid, $3::jsonb)", "BUILD002_READINESS_QUALIFICATION_SET_MISMATCH", JSON.stringify({ ...readiness, id: "90000000-0000-4000-8000-000000000096", readiness_content_hash: "6".repeat(64) }), baseDependency.rows[0].id, JSON.stringify(["90000000-0000-4000-8000-000000000095"]));
    const readinessAfter = await db.query<{ count: number }>("select count(*)::integer as count from public.build002_delegation_readiness");
    expect(readinessAfter.rows[0].count).toBe(readinessBefore.rows[0].count);
    await db.exec("reset role");
  });
});

async function expectSqlError(db: Db, sql: string, message: string, ...params: unknown[]): Promise<void> {
  await expect(db.query(sql, params)).rejects.toThrow(message);
}
