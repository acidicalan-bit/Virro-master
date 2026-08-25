// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.BUILD002_NATIVE_PG_C1_D4 === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_D4_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
function connection(url: string, database: string): string { const parsed = new URL(url); parsed.pathname = `/${database}`; return parsed.toString(); }

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-D4-R0 native PostgreSQL 17 boundary", () => {
  let admin: Client;
  let service: Client;
  let isolatedDatabase = "";

  beforeAll(async () => {
    isolatedDatabase = `virro_d4_r0_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    service = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await admin.connect(); await service.connect();
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users(id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;");
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    expect(migrations).toHaveLength(36);
    for (const name of migrations) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    await service.query("set role service_role");
  }, 120_000);

  afterAll(async () => {
    await admin?.end(); await service?.end();
    if (databaseUrl && isolatedDatabase) {
      const root = new Client({ connectionString: connection(databaseUrl, "postgres") });
      await root.connect(); await root.query(`drop database if exists "${isolatedDatabase}" with (force)`); await root.end();
    }
  });

  it("publishes one RPC-only append-only authority boundary", async () => {
    const version = await admin.query("select current_setting('server_version_num') as version");
    expect(Number(version.rows[0].version)).toBeGreaterThanOrEqual(170000);
    const table = await admin.query("select to_regclass('public.build002_execution_authorities') as table_name");
    expect(table.rows[0].table_name).toBe("build002_execution_authorities");
    const functionRow = await admin.query("select has_function_privilege('service_role', 'public.build002_grant_execution_authority(uuid,uuid,uuid,uuid,text)', 'EXECUTE') as allowed, has_function_privilege('anon', 'public.build002_grant_execution_authority(uuid,uuid,uuid,uuid,text)', 'EXECUTE') as anon_allowed");
    expect(functionRow.rows[0]).toEqual({ allowed: true, anon_allowed: false });
    const directInsert = await service.query("insert into public.build002_execution_authorities(execution_authority_id, schema_version, owner_tenant_id, principal_id, membership_id, delegability_admission_id, delegability_admission_content_hash, authority_commit_id, outcome_transaction_id, asset_id, source_asset_version_id, source_asset_version_hash, task_spec_id, task_spec_version, task_spec_hash, blueprint_id, blueprint_version, blueprint_hash, capability_grant, capability_grant_hash, historical_dependency_snapshot_hash, current_dependency_snapshot_hash, evaluator_schema_version, evaluator_version, evaluator_definition_hash, scope, mutation_lease_granted, execution_started, consequence_boundary, delegability_revalidated_at, execution_authority_revalidated_at, granted_at, valid_until, execution_authority_content_hash, idempotency_key) values (gen_random_uuid(),'build002-execution-authority-v0.1',gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),repeat('a',64),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),repeat('b',64),gen_random_uuid(),1,repeat('c',64),gen_random_uuid(),1,repeat('d',64),'[]'::jsonb,repeat('e',64),repeat('f',64),repeat('0',64),'schema','version',repeat('1',64),'EXECUTION_AUTHORITY_ONLY',false,false,'FRESH_MUTATION_LEASE_AND_PREEXECUTION_RECHECK_REQUIRED',now(),now(),now(),null,repeat('2',64),'forged')").catch((error: unknown) => error);
    expect(directInsert).toMatchObject({ code: expect.any(String) });
    expect((directInsert as { code: string }).code).toMatch(/^(42501|23503|23505|23514)$/);
    await expect(service.query("update public.build002_execution_authorities set scope='EXECUTION_AUTHORITY_ONLY'")).rejects.toThrow();
    await expect(service.query("delete from public.build002_execution_authorities")).rejects.toThrow();
    const sideEffects = await admin.query("select (select count(*) from public.execution_runs) as execution_runs, (select count(*) from public.mutation_leases) as mutation_leases, (select count(*) from public.evidence_receipts) as evidence_receipts, (select count(*) from public.state_commits) as state_commits");
    expect(sideEffects.rows[0]).toEqual({ execution_runs: "0", mutation_leases: "0", evidence_receipts: "0", state_commits: "0" });
  });
});
