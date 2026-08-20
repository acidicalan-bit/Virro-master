// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.BUILD002_NATIVE_PG_C1_A === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_A_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const TENANT_A = "a1000000-0000-4000-8000-000000000001";
const TENANT_B = "a1000000-0000-4000-8000-000000000002";
const TX_A = "b1000000-0000-4000-8000-000000000001";
const TX_B = "b1000000-0000-4000-8000-000000000002";
const PROJECT_A = "c1000000-0000-4000-8000-000000000001";
const PROJECT_B = "c1000000-0000-4000-8000-000000000002";
const ASSET_A = "d1000000-0000-4000-8000-000000000001";
const ASSET_B = "d1000000-0000-4000-8000-000000000002";
const VERSION_A = "e1000000-0000-4000-8000-000000000001";
const VERSION_B = "e1000000-0000-4000-8000-000000000002";
const REQUIREMENT_A = "a".repeat(64);
const REQUIREMENT_B = "b".repeat(64);
const SIGNAL_HASH_A = "c".repeat(64);

function databaseConnectionString(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-A native PostgreSQL E3", () => {
  let admin: Client;
  let service: Client;
  let isolatedDatabase: string;

  beforeAll(async () => {
    isolatedDatabase = `virro_e3_c1_a_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: databaseConnectionString(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();

    const isolatedUrl = databaseConnectionString(databaseUrl!, isolatedDatabase);
    admin = new Client({ connectionString: isolatedUrl });
    await admin.connect();
    await admin.query(`
      create extension if not exists pgcrypto;
      do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
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
    await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE'), ($2, 'ORGANIZATION', 'ACTIVE')", [TENANT_A, TENANT_B]);
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'C1-A A', $2), ($3, 'C1-A B', $4)", [PROJECT_A, TENANT_A, PROJECT_B, TENANT_B]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'C1-A A', $3), ($4, $5, 'C1-A B', $6)", [ASSET_A, PROJECT_A, TENANT_A, ASSET_B, PROJECT_B, TENANT_B]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{}'::jsonb, $3), ($4, $5, 1, '{}'::jsonb, $6)", [VERSION_A, ASSET_A, TENANT_A, VERSION_B, ASSET_B, TENANT_B]);
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1, $2, $3, $4, $5, 'C1-A A'), ($6, $7, $8, $9, $10, 'C1-A B')", [TX_A, TENANT_A, PROJECT_A, ASSET_A, VERSION_A, TX_B, TENANT_B, PROJECT_B, ASSET_B, VERSION_B]);
    await admin.query(`insert into public.build002_signal_requirements(
        owner_tenant_id, outcome_transaction_id, requirement_id, semantic_type, critical,
        accepted_provenance, qualification_rule, dependency_selectors, blueprint_id,
        blueprint_version, blueprint_hash, schema_version, requirement_definition_hash, created_at
      ) values
        ($1, $2, 'signal.a', 'TEXT', true, '["OBSERVED"]', '{"version":"1","cardinality":"SINGLE_VALUED","humanReviewRequired":false}', '[]', 'f1000000-0000-4000-8000-000000000001', 1, $3, 'build002-signal-requirement-v0.1', $3, now()),
        ($4, $5, 'signal.a', 'TEXT', true, '["OBSERVED"]', '{"version":"1","cardinality":"SINGLE_VALUED","humanReviewRequired":false}', '[]', 'f1000000-0000-4000-8000-000000000002', 1, $6, 'build002-signal-requirement-v0.1', $6, now())`, [TENANT_A, TX_A, REQUIREMENT_A, TENANT_B, TX_B, REQUIREMENT_B]);
    service = new Client({ connectionString: isolatedUrl });
    await service.connect();
    await service.query("set role service_role");
    await admin.query(`
      insert into public.build002_signals(
        signal_id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash,
        payload, source, provenance, captured_at, dependency_identity, dependency_hash, schema_version, content_hash
      ) values
        ('11000000-0000-4000-8000-000000000002', $1, $2, 'signal.a', $3, '{"value":"late"}', '{"identity":"fixture"}', 'OBSERVED', '2026-08-20T12:00:02Z', 'asset.version', $4, 'build002-signal-v0.2', $4),
        ('11000000-0000-4000-8000-000000000001', $1, $2, 'signal.a', $3, '{"value":"early"}', '{"identity":"fixture"}', 'OBSERVED', '2026-08-20T12:00:01Z', 'asset.version', $4, 'build002-signal-v0.2', $4),
        ('11000000-0000-4000-8000-000000000003', $1, $2, 'signal.a', $3, '{"value":"wrong-hash"}', '{"identity":"fixture"}', 'OBSERVED', '2026-08-20T12:00:03Z', 'asset.version', $4, 'build002-signal-v0.2', $4),
        ('11000000-0000-4000-8000-000000000004', $5, $6, 'signal.a', $7, '{"value":"foreign"}', '{"identity":"fixture"}', 'OBSERVED', '2026-08-20T12:00:00Z', 'asset.version', $4, 'build002-signal-v0.2', $4)
    `, [TENANT_A, TX_A, REQUIREMENT_A, SIGNAL_HASH_A, TENANT_B, TX_B, REQUIREMENT_B]);
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

  it("applies all 29 migrations and resolves only exact tenant, transaction and requirement hash rows", async () => {
    const version = await admin.query<{ version: string }>("select version() as version");
    expect(version.rows[0].version).toMatch(/PostgreSQL 17/i);
    const migrations = readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort();
    expect(migrations).toHaveLength(29);
    const before = await service.query<{ signals: string; requirements: string; dependencies: string; qualifications: string; readiness: string }>(`select
      (select count(*) from public.build002_signals) as signals,
      (select count(*) from public.build002_signal_requirements) as requirements,
      (select count(*) from public.build002_dependency_snapshots) as dependencies,
      (select count(*) from public.build002_signal_qualifications) as qualifications,
      (select count(*) from public.build002_delegation_readiness) as readiness`);
    const rows = await service.query<{ signal_id: string }>(`select signal_id::text from public.build002_signals
      where owner_tenant_id = $1 and outcome_transaction_id = $2 and requirement_definition_hash = $3
      order by captured_at asc, signal_id asc`, [TENANT_A, TX_A, REQUIREMENT_A]);
    expect(rows.rows.map((row) => row.signal_id)).toEqual([
      "11000000-0000-4000-8000-000000000001",
      "11000000-0000-4000-8000-000000000002",
      "11000000-0000-4000-8000-000000000003",
    ]);
    const after = await service.query<{ signals: string; requirements: string; dependencies: string; qualifications: string; readiness: string }>(`select
      (select count(*) from public.build002_signals) as signals,
      (select count(*) from public.build002_signal_requirements) as requirements,
      (select count(*) from public.build002_dependency_snapshots) as dependencies,
      (select count(*) from public.build002_signal_qualifications) as qualifications,
      (select count(*) from public.build002_delegation_readiness) as readiness`);
    expect(after.rows[0]).toEqual(before.rows[0]);
    const foreign = await service.query("select signal_id from public.build002_signals where owner_tenant_id = $1 and outcome_transaction_id = $2 and requirement_definition_hash = $3", [TENANT_A, TX_A, REQUIREMENT_B]);
    expect(foreign.rows).toHaveLength(0);
  });
});
