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
const REQUIREMENT_HASH = "a".repeat(64);
const SIGNAL_HASH = "b".repeat(64);

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
    for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort()) {
      await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    }
    await admin.query(`
      insert into auth.users(id) values ('${ACTOR_A}'), ('${ACTOR_B}') on conflict do nothing;
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
    `);
  }, 60_000);

  afterAll(async () => {
    await service?.end();
    await admin?.end();
  });

  it("isolates tenant reads across independent authenticated sessions", async () => {
    const tenantA = new Client({ connectionString: databaseUrl });
    const tenantB = new Client({ connectionString: databaseUrl });
    await tenantA.connect();
    await tenantB.connect();
    try {
      await tenantA.query("set role authenticated");
      await tenantA.query(`set request.jwt.claim.sub = '${ACTOR_A}'`);
      await tenantB.query("set role authenticated");
      await tenantB.query(`set request.jwt.claim.sub = '${ACTOR_B}'`);
      const a = await tenantA.query("select owner_tenant_id::text from public.build002_signal_requirements");
      const b = await tenantB.query("select owner_tenant_id::text from public.build002_signal_requirements");
      expect(a.rows).toEqual([{ owner_tenant_id: TENANT_A }]);
      expect(b.rows).toEqual([]);
    } finally {
      await tenantA.end();
      await tenantB.end();
    }
  });

  it("denies authenticated writes and rejects exact wrong-hash lineage", async () => {
    const actor = new Client({ connectionString: databaseUrl });
    await actor.connect();
    try {
      await actor.query("set role authenticated");
      await actor.query(`set request.jwt.claim.sub = '${ACTOR_A}'`);
      await expect(actor.query(`delete from public.build002_signals where signal_id = '${SIGNAL_A}'`)).rejects.toThrow();
    } finally {
      await actor.end();
    }
    await expect(service.query(`insert into public.build002_dependency_signals(owner_tenant_id, outcome_transaction_id, dependency_snapshot_id, signal_id, signal_content_hash, requirement_id) values ('${TENANT_A}', '${TX_A}', '90000000-0000-4000-8000-000000000099', '${SIGNAL_A}', '${"c".repeat(64)}', 'signal.readiness')`)).rejects.toThrow();
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
});
