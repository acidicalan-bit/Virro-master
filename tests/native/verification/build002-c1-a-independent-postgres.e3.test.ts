// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.BUILD002_NATIVE_PG_C1_A_VERIFY === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_A_VERIFY_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const TENANT_A = "61000000-0000-4000-8000-000000000001";
const TENANT_B = "61000000-0000-4000-8000-000000000002";
const TX_A = "62000000-0000-4000-8000-000000000001";
const TX_B = "62000000-0000-4000-8000-000000000002";
const PROJECT_A = "63000000-0000-4000-8000-000000000001";
const PROJECT_B = "63000000-0000-4000-8000-000000000002";
const ASSET_A = "64000000-0000-4000-8000-000000000001";
const ASSET_B = "64000000-0000-4000-8000-000000000002";
const VERSION_A = "65000000-0000-4000-8000-000000000001";
const VERSION_B = "65000000-0000-4000-8000-000000000002";
const H1 = "1".repeat(64);
const H2 = "2".repeat(64);

function databaseConnectionString(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-A independent native PostgreSQL verifier", () => {
  let admin: Client;
  let service: Client;
  let isolatedDatabase: string;

  beforeAll(async () => {
    isolatedDatabase = `virro_c1_a_verify_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: databaseConnectionString(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();

    const isolatedUrl = databaseConnectionString(databaseUrl!, isolatedDatabase);
    admin = new Client({ connectionString: isolatedUrl });
    await admin.connect();
    await admin.query("create extension if not exists pgcrypto");
    await admin.query("do $$ begin create role anon nologin; exception when duplicate_object then null; end $$");
    await admin.query("do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$");
    await admin.query("do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$");
    await admin.query("create schema if not exists auth");
    await admin.query("create table if not exists auth.users (id uuid primary key)");
    await admin.query("create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$");
    await admin.query("create schema if not exists storage");
    await admin.query("create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[])");
    for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort()) {
      await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    }
    await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE'), ($2, 'ORGANIZATION', 'ACTIVE')", [TENANT_A, TENANT_B]);
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'C1-A verify A', $2), ($3, 'C1-A verify B', $4)", [PROJECT_A, TENANT_A, PROJECT_B, TENANT_B]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'C1-A verify A', $3), ($4, $5, 'C1-A verify B', $6)", [ASSET_A, PROJECT_A, TENANT_A, ASSET_B, PROJECT_B, TENANT_B]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{}'::jsonb, $3), ($4, $5, 1, '{}'::jsonb, $6)", [VERSION_A, ASSET_A, TENANT_A, VERSION_B, ASSET_B, TENANT_B]);
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1, $2, $3, $4, $5, 'verify A'), ($6, $7, $8, $9, $10, 'verify B')", [TX_A, TENANT_A, PROJECT_A, ASSET_A, VERSION_A, TX_B, TENANT_B, PROJECT_B, ASSET_B, VERSION_B]);
    await admin.query(`insert into public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, requirement_id, semantic_type, critical, accepted_provenance, qualification_rule, dependency_selectors, blueprint_id, blueprint_version, blueprint_hash, schema_version, requirement_definition_hash, created_at) values ($1, $2, 'signal.a', 'TEXT', true, '["OBSERVED"]', '{"version":"1","cardinality":"SINGLE_VALUED","humanReviewRequired":false}', '[]', '66000000-0000-4000-8000-000000000001', 1, $3, 'build002-signal-requirement-v0.1', $3, now()), ($4, $5, 'signal.b', 'TEXT', true, '["OBSERVED"]', '{"version":"1","cardinality":"SINGLE_VALUED","humanReviewRequired":false}', '[]', '66000000-0000-4000-8000-000000000002', 1, $6, 'build002-signal-requirement-v0.1', $6, now()), ($1, $7, 'signal.a', 'TEXT', true, '["OBSERVED"]', '{"version":"1","cardinality":"SINGLE_VALUED","humanReviewRequired":false}', '[]', '66000000-0000-4000-8000-000000000003', 1, $3, 'build002-signal-requirement-v0.1', $3, now())`, [TENANT_A, TX_A, H1, TENANT_B, TX_B, H2, TX_B]);
    await admin.query("insert into public.build002_signals(signal_id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash, payload, source, provenance, captured_at, dependency_identity, dependency_hash, schema_version, content_hash) values ($1, $2, $3, 'signal.a', $4, '{\"value\":\"late\"}', '{\"identity\":\"fixture\",\"version\":\"1\",\"hash\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}', 'OBSERVED', '2026-08-20T12:00:02Z', 'asset.version', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'build002-signal-v0.2', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc')", ["67000000-0000-4000-8000-000000000002", TENANT_A, TX_A, H1]);
    await admin.query("insert into public.build002_signals(signal_id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash, payload, source, provenance, captured_at, dependency_identity, dependency_hash, schema_version, content_hash) values ($1, $2, $3, 'signal.a', $4, '{\"value\":\"early\"}', '{\"identity\":\"fixture\",\"version\":\"1\",\"hash\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}', 'OBSERVED', '2026-08-20T12:00:01Z', 'asset.version', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'build002-signal-v0.2', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc')", ["67000000-0000-4000-8000-000000000001", TENANT_A, TX_A, H1]);
    await admin.query("insert into public.build002_signals(signal_id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash, payload, source, provenance, captured_at, dependency_identity, dependency_hash, schema_version, content_hash) values ($1, $2, $3, 'signal.b', $4, '{\"value\":\"wrong-requirement\"}', '{\"identity\":\"fixture\",\"version\":\"1\",\"hash\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}', 'OBSERVED', '2026-08-20T12:00:00Z', 'asset.version', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'build002-signal-v0.2', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc')", ["67000000-0000-4000-8000-000000000003", TENANT_A, TX_A, H2]);
    await admin.query("insert into public.build002_signals(signal_id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash, payload, source, provenance, captured_at, dependency_identity, dependency_hash, schema_version, content_hash) values ($1, $2, $3, 'signal.a', $4, '{\"value\":\"foreign\"}', '{\"identity\":\"fixture\",\"version\":\"1\",\"hash\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}', 'OBSERVED', '2026-08-20T12:00:00Z', 'asset.version', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'build002-signal-v0.2', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc')", ["67000000-0000-4000-8000-000000000004", TENANT_B, TX_B, H1]);
    service = new Client({ connectionString: isolatedUrl });
    await service.connect();
    await service.query("set role service_role");
  }, 120_000);

  afterAll(async () => {
    await service?.end();
    await admin?.end();
    if (databaseUrl && isolatedDatabase) {
      const root = new Client({ connectionString: databaseConnectionString(databaseUrl, "postgres") });
      await root.connect();
      await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
      await root.end();
    }
  });

  it("proves PostgreSQL 17 exact persisted scope, ordering, and zero writes", async () => {
    const version = await admin.query<{ version: string }>("select version() as version");
    expect(version.rows[0].version).toMatch(/PostgreSQL 17/i);
    expect(readdirSync(migrationsDir).filter((item) => item.endsWith(".sql"))).toHaveLength(29);
    const before = await admin.query(`select
      (select count(*) from public.build002_signal_requirements) as requirements,
      (select count(*) from public.build002_signals) as signals,
      (select count(*) from public.build002_dependency_snapshots) as dependencies,
      (select count(*) from public.build002_signal_qualifications) as qualifications,
      (select count(*) from public.build002_delegation_readiness) as readiness,
      (select count(*) from public.outcome_transactions where id = $1 and status = 'PREPARED') as prepared,
      (select count(*) from public.execution_runs) as executions,
      (select count(*) from public.mutation_leases) as leases,
      (select count(*) from public.state_commits) as commits`, [TX_A]);
    const rows = await service.query<{ signal_id: string }>("select signal_id::text from public.build002_signals where owner_tenant_id = $1 and outcome_transaction_id = $2 and requirement_definition_hash = $3 order by captured_at asc, signal_id asc", [TENANT_A, TX_A, H1]);
    expect(rows.rows.map((row) => row.signal_id)).toEqual([
      "67000000-0000-4000-8000-000000000001",
      "67000000-0000-4000-8000-000000000002",
    ]);
    expect((await service.query("select 1 from public.build002_signals where owner_tenant_id = $1 and outcome_transaction_id = $2 and requirement_definition_hash = $3", [TENANT_A, TX_A, H2])).rows).toHaveLength(0);
    expect((await service.query("select 1 from public.build002_signals where owner_tenant_id = $1 and outcome_transaction_id = $2 and requirement_definition_hash = $3", [TENANT_A, TX_B, H1])).rows).toHaveLength(0);
    expect((await service.query("select 1 from public.build002_signals where owner_tenant_id = $1 and outcome_transaction_id = $2 and requirement_definition_hash = $3", [TENANT_B, TX_B, H1])).rows).toHaveLength(1);
    const after = await admin.query(`select
      (select count(*) from public.build002_signal_requirements) as requirements,
      (select count(*) from public.build002_signals) as signals,
      (select count(*) from public.build002_dependency_snapshots) as dependencies,
      (select count(*) from public.build002_signal_qualifications) as qualifications,
      (select count(*) from public.build002_delegation_readiness) as readiness,
      (select count(*) from public.outcome_transactions where id = $1 and status = 'PREPARED') as prepared,
      (select count(*) from public.execution_runs) as executions,
      (select count(*) from public.mutation_leases) as leases,
      (select count(*) from public.state_commits) as commits`, [TX_A]);
    expect(after.rows).toEqual(before.rows);
  });
});
