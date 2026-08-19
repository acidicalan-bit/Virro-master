// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.BUILD002_NATIVE_PG_E3 === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const ACTOR_A = "10000000-0000-4000-8000-000000000001";
const ACTOR_B = "10000000-0000-4000-8000-000000000002";
const ACTOR_C = "10000000-0000-4000-8000-000000000003";
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
const DEPENDENCY_ID = "90000000-0000-4000-8000-000000000001";
const QUALIFICATION_ID = "90000000-0000-4000-8000-000000000002";
const READINESS_ID = "90000000-0000-4000-8000-000000000003";
const REQUIREMENT_HASH = "a".repeat(64);
const SIGNAL_HASH = "b".repeat(64);
const DEPENDENCY_HASH = "c".repeat(64);
const QUALIFICATION_HASH = "d".repeat(64);
const READINESS_HASH = "e".repeat(64);
const REQUIREMENT_B_HASH = "f".repeat(64);
const SIGNAL_B_HASH = "1".repeat(64);
const DEPENDENCY_B_HASH = "2".repeat(64);
const QUALIFICATION_B_HASH = "3".repeat(64);
const READINESS_B_HASH = "4".repeat(64);

describe.runIf(enabled && Boolean(databaseUrl))("BUILD 002-B native PostgreSQL E3", () => {
  let admin: Client;
  let service: Client;

  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrl });
    await admin.connect();
    await admin.query(`
      create extension if not exists pgcrypto;
      do $$ begin
        create role anon nologin;
      exception when duplicate_object then null; end $$;
      do $$ begin
        create role authenticated nologin;
      exception when duplicate_object then null; end $$;
      do $$ begin
        create role service_role nologin bypassrls;
      exception when duplicate_object then null; end $$;
      create schema if not exists auth;
      create table if not exists auth.users (id uuid primary key);
      create or replace function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create schema if not exists storage;
      create table if not exists storage.buckets (
        id text primary key, name text not null unique, public boolean not null default false,
        file_size_limit bigint, allowed_mime_types text[]
      );
    `);
    const migrations = readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort();
    const r2Migration = migrations.find((name) => name.startsWith("20260819130000_"));
    for (const name of migrations.filter((item) => item !== r2Migration)) {
      await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    }
    await admin.query(`
      insert into auth.users(id) values ('${ACTOR_A}'), ('${ACTOR_B}'), ('${ACTOR_C}') on conflict do nothing;
      insert into public.tenants(id, kind, personal_owner_principal_id, status) values
        ('${TENANT_A}', 'PERSONAL', '${ACTOR_A}', 'ACTIVE'), ('${TENANT_B}', 'PERSONAL', '${ACTOR_B}', 'ACTIVE')
      on conflict do nothing;
      insert into public.tenant_memberships(id, tenant_id, principal_id, role, status) values
        ('30000000-0000-4000-8000-000000000001', '${TENANT_A}', '${ACTOR_A}', 'OWNER', 'ACTIVE'),
        ('30000000-0000-4000-8000-000000000002', '${TENANT_B}', '${ACTOR_B}', 'OWNER', 'ACTIVE')
      on conflict do nothing;
      insert into public.projects(id, owner_tenant_id, name) values
        ('${PROJECT_A}', '${TENANT_A}', 'A'), ('${PROJECT_B}', '${TENANT_B}', 'B') on conflict do nothing;
      insert into public.assets(id, owner_tenant_id, project_id, name) values
        ('${ASSET_A}', '${TENANT_A}', '${PROJECT_A}', 'A'), ('${ASSET_B}', '${TENANT_B}', '${PROJECT_B}', 'B') on conflict do nothing;
      insert into public.asset_versions(id, owner_tenant_id, asset_id, version_number, state) values
        ('${VERSION_A}', '${TENANT_A}', '${ASSET_A}', 1, '{}'::jsonb), ('${VERSION_B}', '${TENANT_B}', '${ASSET_B}', 1, '{}'::jsonb) on conflict do nothing;
      update public.assets set current_version_id = '${VERSION_A}' where id = '${ASSET_A}';
      update public.assets set current_version_id = '${VERSION_B}' where id = '${ASSET_B}';
      insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request)
      values ('${TX_A}', '${TENANT_A}', '${PROJECT_A}', '${ASSET_A}', '${VERSION_A}', 'A'),
             ('${TX_B}', '${TENANT_B}', '${PROJECT_B}', '${ASSET_B}', '${VERSION_B}', 'B') on conflict do nothing;
      `);
    service = new Client({ connectionString: databaseUrl });
    await service.connect();
    await service.query("set role service_role");
    await service.query(`
      insert into public.build002_signal_requirements(
        owner_tenant_id, outcome_transaction_id, requirement_id, semantic_type, critical,
        accepted_provenance, qualification_rule, dependency_selectors, blueprint_id,
        blueprint_version, blueprint_hash, schema_version, requirement_definition_hash, created_at
      ) values ('${TENANT_A}', '${TX_A}', 'signal.readiness', 'text', true, '["OBSERVED"]',
        '{"version":"1","cardinality":"SINGLE_VALUED","humanReviewRequired":false}',
        '[]', '90000000-0000-4000-8000-000000000001', 1, '${REQUIREMENT_HASH}',
        'build002-signal-requirement-v0.1', '${REQUIREMENT_HASH}', now()) on conflict do nothing;
      insert into public.build002_signals(
        signal_id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash,
        payload, source, provenance, captured_at, dependency_identity, dependency_hash, schema_version, content_hash
      ) values ('${SIGNAL_A}', '${TENANT_A}', '${TX_A}', 'signal.readiness', '${REQUIREMENT_HASH}',
        '{"value":"ready"}', '{"identity":"fixture"}', 'OBSERVED', now(), 'asset.version', '${SIGNAL_HASH}',
        'build002-signal-v0.2', '${SIGNAL_HASH}') on conflict do nothing;
      insert into public.build002_dependency_snapshots(
        id, owner_tenant_id, outcome_transaction_id, requirement_definition_hashes, signal_references,
        dependency_bindings, schema_version, dependency_snapshot_hash
      ) values ('${DEPENDENCY_ID}', '${TENANT_A}', '${TX_A}', '["${REQUIREMENT_HASH}"]',
        '[{"requirementId":"signal.readiness","signalId":"${SIGNAL_A}","contentHash":"${SIGNAL_HASH}"}]',
        '[]', 'build002-dependency-snapshot-v0.2', '${DEPENDENCY_HASH}') on conflict do nothing;
      insert into public.build002_dependency_requirements(owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, requirement_definition_hash)
        values ('${TENANT_A}', '${TX_A}', '${DEPENDENCY_ID}', '${REQUIREMENT_HASH}') on conflict do nothing;
      insert into public.build002_dependency_signals(owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, signal_id, signal_content_hash, requirement_id)
        values ('${TENANT_A}', '${TX_A}', '${DEPENDENCY_ID}', '${SIGNAL_A}', '${SIGNAL_HASH}', 'signal.readiness') on conflict do nothing;
      insert into public.build002_signal_qualifications(
        id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash,
        dependency_snapshot_id, dependency_snapshot_hash, signal_ids, signal_content_hashes, evaluator,
        outcome, reason_code, qualified_at, schema_version, qualification_content_hash
      ) values ('${QUALIFICATION_ID}', '${TENANT_A}', '${TX_A}', 'signal.readiness', '${REQUIREMENT_HASH}',
        '${DEPENDENCY_ID}', '${DEPENDENCY_HASH}', '["${SIGNAL_A}"]', '["${SIGNAL_HASH}"]',
        '{"schemaVersion":"build002-qualification-evaluator-v0.1","version":"0.1.0","definitionHash":"${QUALIFICATION_HASH}"}',
        'QUALIFIED', 'SIGNAL_QUALIFIED', now(), 'build002-signal-qualification-v0.3', '${QUALIFICATION_HASH}') on conflict do nothing;
      insert into public.build002_qualification_signals(owner_tenant_id, outcome_transaction_id, qualification_id, qualification_content_hash, signal_id, signal_content_hash, requirement_id)
        values ('${TENANT_A}', '${TX_A}', '${QUALIFICATION_ID}', '${QUALIFICATION_HASH}', '${SIGNAL_A}', '${SIGNAL_HASH}', 'signal.readiness') on conflict do nothing;
      insert into public.build002_delegation_readiness(
        id, owner_tenant_id, outcome_transaction_id, requirement_set_hash, qualification_set_hash,
        dependency_snapshot_id, dependency_snapshot_hash, evaluator, state, blocking_codes, condition_codes,
        created_at, schema_version, readiness_content_hash
      ) values ('${READINESS_ID}', '${TENANT_A}', '${TX_A}', '${REQUIREMENT_HASH}', '${QUALIFICATION_HASH}',
        '${DEPENDENCY_ID}', '${DEPENDENCY_HASH}', '{"schemaVersion":"build002-qualification-evaluator-v0.1","version":"0.1.0","definitionHash":"${READINESS_HASH}"}',
        'READY', '[]', '[]', now(), 'build002-signal-readiness-v0.3', '${READINESS_HASH}') on conflict do nothing;
      insert into public.build002_readiness_qualifications(owner_tenant_id, outcome_transaction_id, readiness_id, readiness_content_hash, qualification_id, qualification_content_hash)
        values ('${TENANT_A}', '${TX_A}', '${READINESS_ID}', '${READINESS_HASH}', '${QUALIFICATION_ID}', '${QUALIFICATION_HASH}') on conflict do nothing;
      `);
    if (r2Migration) await admin.query(readFileSync(resolve(migrationsDir, r2Migration), "utf8"));
    await service.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({
      owner_tenant_id: TENANT_B, outcome_transaction_id: TX_B, requirement_id: "signal.other",
      semantic_type: "text", critical: true, accepted_provenance: ["OBSERVED"],
      qualification_rule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
      dependency_selectors: [], blueprint_id: "90000000-0000-4000-8000-000000000004", blueprint_version: 1,
      blueprint_hash: REQUIREMENT_B_HASH, policy_id: null, policy_hash: null,
      schema_version: "build002-signal-requirement-v0.1", requirement_definition_hash: REQUIREMENT_B_HASH,
      created_at: "2026-08-19T12:00:00.000Z",
    })]);
    await service.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({
      signal_id: SIGNAL_B, owner_tenant_id: TENANT_B, outcome_transaction_id: TX_B,
      requirement_id: "signal.other", requirement_definition_hash: REQUIREMENT_B_HASH,
      payload: { value: "B" }, source: { identity: "fixture", version: "1", hash: null },
      provenance: "OBSERVED", captured_at: "2026-08-19T12:00:00.000Z", valid_until: null,
      dependency_identity: "asset.version", dependency_hash: SIGNAL_B_HASH,
      schema_version: "build002-signal-v0.2", content_hash: SIGNAL_B_HASH,
    })]);
    await service.query("select public.build002_insert_dependency_snapshot($1::jsonb)", [JSON.stringify({
      owner_tenant_id: TENANT_B, outcome_transaction_id: TX_B,
      requirement_definition_hashes: [REQUIREMENT_B_HASH],
      signal_references: [{ requirementId: "signal.other", signalId: SIGNAL_B, contentHash: SIGNAL_B_HASH }],
      dependency_bindings: [], blueprint_hash: null, policy_hash: null, task_spec_hash: null,
      transaction_semantic_hash: null, source_asset_version_hash: null, context_lens_hash: null,
      schema_version: "build002-dependency-snapshot-v0.2", dependency_snapshot_hash: DEPENDENCY_B_HASH,
    })]);
    const dependencyB = await service.query("select id::text from public.build002_dependency_snapshots where dependency_snapshot_hash = $1", [DEPENDENCY_B_HASH]);
    await service.query("select public.build002_insert_signal_qualification($1::jsonb, $2::uuid)", [JSON.stringify({
      id: "90000000-0000-4000-8000-000000000004", owner_tenant_id: TENANT_B, outcome_transaction_id: TX_B,
      requirement_id: "signal.other", requirement_definition_hash: REQUIREMENT_B_HASH,
      dependency_snapshot_hash: DEPENDENCY_B_HASH, signalIds: [SIGNAL_B], signalContentHashes: [SIGNAL_B_HASH],
      evaluator: { schemaVersion: "build002-qualification-evaluator-v0.1", version: "0.1.0", definitionHash: QUALIFICATION_B_HASH },
      outcome: "QUALIFIED", reason_code: "SIGNAL_QUALIFIED", evidence_valid_until: null,
      qualified_at: "2026-08-19T12:00:00.000Z", schema_version: "build002-signal-qualification-v0.3",
      qualification_content_hash: QUALIFICATION_B_HASH,
    }), dependencyB.rows[0].id]);
    const qualificationB = await service.query("select id::text from public.build002_signal_qualifications where qualification_content_hash = $1", [QUALIFICATION_B_HASH]);
    await service.query("select public.build002_insert_delegation_readiness($1::jsonb, $2::uuid, $3::jsonb)", [JSON.stringify({
      id: READINESS_ID.replace(/003$/, "004"), owner_tenant_id: TENANT_B, outcome_transaction_id: TX_B,
      requirement_set_hash: REQUIREMENT_B_HASH, qualification_set_hash: QUALIFICATION_B_HASH,
      dependency_snapshot_hash: DEPENDENCY_B_HASH, task_spec_hash: null, source_asset_version_hash: null,
      blueprint_hash: null, policy_hash: null,
      evaluator: { schemaVersion: "build002-qualification-evaluator-v0.1", version: "0.1.0", definitionHash: READINESS_B_HASH },
      state: "READY", blocking_codes: [], condition_codes: [], created_at: "2026-08-19T12:00:00.000Z",
      valid_until: null, schema_version: "build002-signal-readiness-v0.3", readiness_content_hash: READINESS_B_HASH,
    }), dependencyB.rows[0].id, JSON.stringify([qualificationB.rows[0].id])]);
  }, 60_000);

  afterAll(async () => {
    await service?.end();
    await admin?.end();
  });

  it("isolates tenant reads across independent authenticated sessions", async () => {
    const tenantA = new Client({ connectionString: databaseUrl });
    const tenantB = new Client({ connectionString: databaseUrl });
    const tenantC = new Client({ connectionString: databaseUrl });
    const revokedA = new Client({ connectionString: databaseUrl });
    await tenantA.connect();
    await tenantB.connect();
    await tenantC.connect();
    await revokedA.connect();
    const tables = [
      "build002_signal_requirements", "build002_signals", "build002_dependency_snapshots",
      "build002_dependency_requirements", "build002_dependency_signals", "build002_signal_qualifications",
      "build002_qualification_signals", "build002_delegation_readiness", "build002_readiness_qualifications",
    ];
    try {
      await tenantA.query("set role authenticated");
      await tenantA.query(`set request.jwt.claim.sub = '${ACTOR_A}'`);
      await tenantB.query("set role authenticated");
      await tenantB.query(`set request.jwt.claim.sub = '${ACTOR_B}'`);
      await tenantC.query("set role authenticated");
      await tenantC.query(`set request.jwt.claim.sub = '${ACTOR_C}'`);
      await revokedA.query("set role authenticated");
      await revokedA.query(`set request.jwt.claim.sub = '${ACTOR_A}'`);
      for (const table of tables) {
        const own = await tenantA.query(`select owner_tenant_id::text from public.${table}`);
        const foreign = await tenantB.query(`select owner_tenant_id::text from public.${table}`);
        const unrelated = await tenantC.query(`select owner_tenant_id::text from public.${table}`);
        expect(own.rows).toEqual([{ owner_tenant_id: TENANT_A }]);
        expect(foreign.rows).toEqual([{ owner_tenant_id: TENANT_B }]);
        expect(unrelated.rows).toEqual([]);
      }
      await admin.query(`update public.tenant_memberships set status = 'REVOKED' where tenant_id = '${TENANT_A}' and principal_id = '${ACTOR_A}'`);
      for (const table of tables) {
        const revoked = await revokedA.query(`select owner_tenant_id::text from public.${table}`);
        expect(revoked.rows).toEqual([]);
      }
    } finally {
      await admin.query(`update public.tenant_memberships set status = 'ACTIVE' where tenant_id = '${TENANT_A}' and principal_id = '${ACTOR_A}'`);
      await tenantA.end();
      await tenantB.end();
      await tenantC.end();
      await revokedA.end();
    }
  });

  it("denies service-role direct inserts and non-service RPC execution", async () => {
    const tables = [
      "build002_signal_requirements", "build002_signals", "build002_dependency_snapshots",
      "build002_dependency_requirements", "build002_dependency_signals", "build002_signal_qualifications",
      "build002_qualification_signals", "build002_delegation_readiness", "build002_readiness_qualifications",
    ];
    await service.query("set role service_role");
    for (const table of tables) await expect(service.query(`insert into public.${table} default values`)).rejects.toThrow(/permission denied|violates/);
    await service.query("reset role");
    const anon = new Client({ connectionString: databaseUrl });
    const authenticated = new Client({ connectionString: databaseUrl });
    await anon.connect();
    await authenticated.connect();
    try {
      await anon.query("set role anon");
      await authenticated.query("set role authenticated");
      for (const fn of ["build002_insert_signal_requirement('{}'::jsonb)", "build002_insert_signal('{}'::jsonb)"]) {
        await expect(anon.query(`select public.${fn}`)).rejects.toThrow("permission denied");
        await expect(authenticated.query(`select public.${fn}`)).rejects.toThrow("permission denied");
      }
      for (const table of tables) await expect(anon.query(`select * from public.${table}`)).rejects.toThrow("permission denied");
    } finally {
      await anon.end();
      await authenticated.end();
    }
    const acl = await admin.query<{ routine_name: string; service_exec: boolean; anon_exec: boolean; auth_exec: boolean }>(`
      select p.proname as routine_name,
        has_function_privilege('service_role', p.oid, 'EXECUTE') as service_exec,
        has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
        has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname like 'build002_insert_%'
      order by p.proname
    `);
    expect(acl.rows).toEqual([
      { routine_name: "build002_insert_delegation_readiness", service_exec: true, anon_exec: false, auth_exec: false },
      { routine_name: "build002_insert_dependency_snapshot", service_exec: true, anon_exec: false, auth_exec: false },
      { routine_name: "build002_insert_signal", service_exec: true, anon_exec: false, auth_exec: false },
      { routine_name: "build002_insert_signal_qualification", service_exec: true, anon_exec: false, auth_exec: false },
      { routine_name: "build002_insert_signal_requirement", service_exec: true, anon_exec: false, auth_exec: false },
    ]);
  });

  it("denies authenticated writes and rejects exact wrong-hash lineage", async () => {
    const actor = new Client({ connectionString: databaseUrl });
    await actor.connect();
    try {
      await actor.query("set role authenticated");
      await actor.query(`set request.jwt.claim.sub = '${ACTOR_A}'`);
      await expect(actor.query(`insert into public.build002_signals(signal_id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash, payload, source, provenance, captured_at, dependency_identity, dependency_hash, schema_version, content_hash) values ('90000000-0000-4000-8000-000000000099', '${TENANT_A}', '${TX_A}', 'signal.readiness', '${REQUIREMENT_HASH}', '{}', '{}', 'OBSERVED', now(), 'asset.version', '${SIGNAL_HASH}', 'build002-signal-v0.2', '${SIGNAL_HASH}')`)).rejects.toThrow();
      await expect(actor.query(`update public.build002_signals set provenance = 'UNKNOWN' where signal_id = '${SIGNAL_A}'`)).rejects.toThrow();
      await expect(actor.query(`delete from public.build002_signals where signal_id = '${SIGNAL_A}'`)).rejects.toThrow();
    } finally {
      await actor.end();
    }
    await expect(service.query(`insert into public.build002_dependency_signals(owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, signal_id, signal_content_hash, requirement_id) values ('${TENANT_A}', '${TX_A}', '${DEPENDENCY_ID}', '${SIGNAL_A}', '${"1".repeat(64)}', 'signal.readiness')`)).rejects.toThrow();
    await expect(service.query(`insert into public.build002_qualification_signals(owner_tenant_id, outcome_transaction_id, qualification_id, qualification_content_hash, signal_id, signal_content_hash, requirement_id) values ('${TENANT_A}', '${TX_A}', '${QUALIFICATION_ID}', '${QUALIFICATION_HASH}', '${SIGNAL_A}', '${"1".repeat(64)}', 'signal.readiness')`)).rejects.toThrow();
    const before = await admin.query<{ count: string }>("select count(*)::text as count from public.build002_dependency_snapshots");
    const invalidSnapshot = { owner_tenant_id: TENANT_A, outcome_transaction_id: TX_A, requirement_definition_hashes: [REQUIREMENT_HASH], signal_references: [{ requirementId: "signal.readiness", signalId: SIGNAL_A, contentHash: "1".repeat(64) }], dependency_bindings: [], schema_version: "build002-dependency-snapshot-v0.2", dependency_snapshot_hash: "2".repeat(64) };
    await expect(service.query("select public.build002_insert_dependency_snapshot($1::jsonb)", [JSON.stringify(invalidSnapshot)])).rejects.toThrow();
    const after = await admin.query<{ count: string }>("select count(*)::text as count from public.build002_dependency_snapshots");
    expect(after.rows[0].count).toBe(before.rows[0].count);
    await expect(admin.query(`update public.build002_signals set provenance = 'UNKNOWN' where signal_id = '${SIGNAL_A}'`)).rejects.toThrow();
    await expect(admin.query(`delete from public.build002_signals where signal_id = '${SIGNAL_A}'`)).rejects.toThrow();
  });

  it("rejects revoked membership reads in a separate session", async () => {
    await admin.query(`update public.tenant_memberships set status = 'REVOKED' where tenant_id = '${TENANT_A}' and principal_id = '${ACTOR_A}'`);
    const revoked = new Client({ connectionString: databaseUrl });
    await revoked.connect();
    try {
      await revoked.query("set role authenticated");
      await revoked.query(`set request.jwt.claim.sub = '${ACTOR_A}'`);
      const result = await revoked.query("select * from public.build002_signal_requirements");
      expect(result.rows).toEqual([]);
    } finally {
      await revoked.end();
    }
  });

  it("rejects qualification failures and readiness subsets atomically", async () => {
    await service.query("set role service_role");
    const badQualification = {
      id: "90000000-0000-4000-8000-000000000005", owner_tenant_id: TENANT_A, outcome_transaction_id: TX_A,
      requirement_id: "signal.readiness", requirement_definition_hash: REQUIREMENT_HASH,
      dependency_snapshot_hash: DEPENDENCY_HASH, signalIds: [SIGNAL_A], signalContentHashes: ["9".repeat(64)],
      evaluator: { schemaVersion: "build002-qualification-evaluator-v0.1", version: "0.1.0", definitionHash: "5".repeat(64) },
      outcome: "QUALIFIED", reason_code: "SIGNAL_QUALIFIED", evidence_valid_until: null,
      qualified_at: "2026-08-19T12:00:00.000Z", schema_version: "build002-signal-qualification-v0.3",
      qualification_content_hash: "5".repeat(64),
    };
    await expect(service.query("select public.build002_insert_signal_qualification($1::jsonb, $2::uuid)", [JSON.stringify(badQualification), DEPENDENCY_ID])).rejects.toThrow("BUILD002_QUALIFICATION_SIGNAL_SET_MISMATCH");
    const absent = await service.query("select count(*)::integer as count from public.build002_signal_qualifications where id = $1", [badQualification.id]);
    expect(absent.rows[0].count).toBe(0);
    const readiness = {
      id: "90000000-0000-4000-8000-000000000006", owner_tenant_id: TENANT_A, outcome_transaction_id: TX_A,
      requirement_set_hash: REQUIREMENT_HASH, qualification_set_hash: QUALIFICATION_HASH,
      dependency_snapshot_hash: DEPENDENCY_HASH, task_spec_hash: null, source_asset_version_hash: null,
      blueprint_hash: null, policy_hash: null, evaluator: { schemaVersion: "build002-qualification-evaluator-v0.1", version: "0.1.0", definitionHash: READINESS_HASH },
      state: "READY", blocking_codes: [], condition_codes: [], created_at: "2026-08-19T12:00:00.000Z", valid_until: null,
      schema_version: "build002-signal-readiness-v0.3", readiness_content_hash: "6".repeat(64),
    };
    await expect(service.query("select public.build002_insert_delegation_readiness($1::jsonb, $2::uuid, $3::jsonb)", [JSON.stringify(readiness), DEPENDENCY_ID, JSON.stringify([])])).rejects.toThrow("BUILD002_READINESS_QUALIFICATION_SET_MISMATCH");
    const readinessAbsent = await service.query("select count(*)::integer as count from public.build002_delegation_readiness where id = $1", [readiness.id]);
    expect(readinessAbsent.rows[0].count).toBe(0);
    await service.query("reset role");
  });

  it("serializes concurrent identical dependency writes without a partial graph", async () => {
    const first = new Client({ connectionString: databaseUrl });
    const second = new Client({ connectionString: databaseUrl });
    await first.connect();
    await second.connect();
    const snapshot = {
      owner_tenant_id: TENANT_A, outcome_transaction_id: TX_A,
      requirement_definition_hashes: [REQUIREMENT_HASH],
      signal_references: [{ requirementId: "signal.readiness", signalId: SIGNAL_A, contentHash: SIGNAL_HASH }],
      dependency_bindings: [], blueprint_hash: null, policy_hash: null, task_spec_hash: null,
      transaction_semantic_hash: null, source_asset_version_hash: null, context_lens_hash: null,
      schema_version: "build002-dependency-snapshot-v0.2", dependency_snapshot_hash: "7".repeat(64),
    };
    try {
      await first.query("set role service_role");
      await second.query("set role service_role");
      const results = await Promise.allSettled([
        first.query("select public.build002_insert_dependency_snapshot($1::jsonb)", [JSON.stringify(snapshot)]),
        second.query("select public.build002_insert_dependency_snapshot($1::jsonb)", [JSON.stringify(snapshot)]),
      ]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const graph = await admin.query<{ parents: number; links: number }>("select (select count(*)::integer from public.build002_dependency_snapshots where dependency_snapshot_hash = $1) as parents, (select count(*)::integer from public.build002_dependency_signals where dependency_snapshot_id in (select id from public.build002_dependency_snapshots where dependency_snapshot_hash = $1)) as links", [snapshot.dependency_snapshot_hash]);
      expect(graph.rows[0]).toEqual({ parents: 1, links: 1 });
    } finally {
      await first.end();
      await second.end();
    }
  });
});
