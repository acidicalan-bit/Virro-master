// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.BUILD002_NATIVE_PG_C1_D5_R0 === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_D5_R0_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
function connection(url: string, database: string): string { const parsed = new URL(url); parsed.pathname = `/${database}`; return parsed.toString(); }

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-D5-R0 native PostgreSQL 17 mutation lease boundary", () => {
  let admin: Client;
  let service: Client;
  let isolatedDatabase = "";

  beforeAll(async () => {
    isolatedDatabase = `virro_d5_r0_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    service = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await admin.connect(); await service.connect();
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users(id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets(id text primary key, name text not null unique, public boolean not null default false); alter table storage.buckets add column if not exists file_size_limit bigint; alter table storage.buckets add column if not exists allowed_mime_types text[];");
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    expect(migrations).toHaveLength(40);
    expect(migrations.at(-1)).toBe("20260825100000_build_002_c1_d5_r2_mutation_lease_contract_closure.sql");
    for (const name of migrations) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    await service.query("set role service_role");
  }, 120_000);

  afterAll(async () => {
    await admin?.end(); await service?.end();
    if (databaseUrl && isolatedDatabase) { const root = new Client({ connectionString: connection(databaseUrl, "postgres") }); await root.connect(); await root.query(`drop database if exists "${isolatedDatabase}" with (force)`); await root.end(); }
  });

  it("replays the full migration set and exposes only the service RPC", async () => {
    expect((await admin.query("select current_setting('server_version_num') as version")).rows[0].version).toMatch(/^17/);
    expect((await admin.query("select to_regclass('public.build002_mutation_leases') as name")).rows[0].name).toBe("build002_mutation_leases");
    const acl = await admin.query("select has_function_privilege('service_role','public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)','EXECUTE') as service_ok, has_function_privilege('anon','public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)','EXECUTE') as anon_ok, has_function_privilege('authenticated','public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)','EXECUTE') as auth_ok, has_table_privilege('service_role','public.build002_mutation_leases','INSERT') as service_insert, has_table_privilege('service_role','public.build002_mutation_leases','UPDATE') as service_update, has_table_privilege('service_role','public.build002_mutation_leases','DELETE') as service_delete, has_table_privilege('anon','public.build002_mutation_leases','INSERT') as anon_insert, has_table_privilege('authenticated','public.build002_mutation_leases','UPDATE') as auth_update");
    expect(acl.rows[0]).toEqual({ service_ok: true, anon_ok: false, auth_ok: false, service_insert: false, service_update: false, service_delete: false, anon_insert: false, auth_update: false });
  });

  it("rejects forged direct writes and leaves all consequence tables empty", async () => {
    await expect(service.query("insert into public.build002_mutation_leases(mutation_lease_id,schema_version,owner_tenant_id,principal_id,membership_id,execution_authority_id,execution_authority_content_hash,delegability_admission_id,authority_commit_id,outcome_transaction_id,asset_id,source_asset_version_id,source_asset_version_hash,task_spec_id,task_spec_version,task_spec_hash,blueprint_id,blueprint_version,blueprint_hash,current_dependency_snapshot_hash,capability_grant_hash,target_path,category,scope,execution_started,execution_authority_revalidated_at,mutation_lease_revalidated_at,granted_at,valid_until,consequence_boundary,mutation_lease_content_hash) values (gen_random_uuid(),'build002-mutation-lease-v0.1',gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),repeat('a',64),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),repeat('b',64),gen_random_uuid(),1,repeat('c',64),gen_random_uuid(),1,repeat('d',64),repeat('e',64),repeat('f',64),'requested.color','MUTABLE','MUTATION_LEASE_ONLY',false,now(),now(),now(),now()+interval '1 minute','FRESH_PREEXECUTION_RECHECK_AND_EXECUTION_START_REQUIRED',repeat('0',64))")).rejects.toThrow();
    const counts = await admin.query("select (select count(*) from public.build002_mutation_leases) as d5, (select count(*) from public.mutation_leases) as legacy, (select count(*) from public.execution_runs) as runs, (select count(*) from public.state_commits) as commits");
    expect(counts.rows[0]).toEqual({ d5: "0", legacy: "0", runs: "0", commits: "0" });
  });
});
