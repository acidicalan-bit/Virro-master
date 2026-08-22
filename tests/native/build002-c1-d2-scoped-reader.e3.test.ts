// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseReadinessAuthorityCommitScopedReader } from "@/src/infrastructure/persistence/outcome/supabase-readiness-authority-commit-scoped-reader";

const enabled = process.env.BUILD002_NATIVE_PG_C1_D2 === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_D2_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const TENANT_A = "10000000-0000-4000-8000-000000000001";
const TENANT_B = "10000000-0000-4000-8000-000000000002";
const USER_A = "20000000-0000-4000-8000-000000000001";
const TX_A = "30000000-0000-4000-8000-000000000001";
const TX_B = "30000000-0000-4000-8000-000000000002";
const SNAPSHOT_A = "40000000-0000-4000-8000-000000000001";
const SNAPSHOT_B = "40000000-0000-4000-8000-000000000002";
const READINESS_A = "50000000-0000-4000-8000-000000000001";
const READINESS_B = "50000000-0000-4000-8000-000000000002";
const COMMIT_A = "60000000-0000-4000-8000-000000000001";
const COMMIT_B = "60000000-0000-4000-8000-000000000002";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function connection(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

class PgSupabaseLikeClient {
  constructor(private readonly client: Client) {}

  from(table: string) {
    void table;
    return {
      select: (columns: string) => {
        void columns;
        let id = "";
        let ownerTenantId = "";
        const query = {
          eq: (column: string, value: string) => {
            if (column === "id") id = value;
            if (column === "owner_tenant_id") ownerTenantId = value;
            return query;
          },
          maybeSingle: async () => {
            const result = await this.client.query(
              "select * from public.build002_readiness_authority_commits where id = $1 and owner_tenant_id = $2",
              [id, ownerTenantId],
            );
            return { data: result.rows[0] ?? null, error: null };
          },
        };
        return query;
      },
    };
  }
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-D2 native PostgreSQL 17 scoped commit reader", () => {
  let admin: Client;
  let isolatedDatabase = "";

  beforeAll(async () => {
    isolatedDatabase = `virro_d2_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await admin.connect();
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users (id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);");
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    expect(migrations).toHaveLength(31);
    for (const name of migrations) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    await admin.query("insert into auth.users(id) values ($1) on conflict do nothing", [USER_A]);
    await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE'), ($2, 'ORGANIZATION', 'ACTIVE')", [TENANT_A, TENANT_B]);
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'D2 A', $2), ($3, 'D2 B', $4)", ["70000000-0000-4000-8000-000000000001", TENANT_A, "70000000-0000-4000-8000-000000000002", TENANT_B]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'D2 A', $3), ($4, $5, 'D2 B', $6)", ["71000000-0000-4000-8000-000000000001", "70000000-0000-4000-8000-000000000001", TENANT_A, "71000000-0000-4000-8000-000000000002", "70000000-0000-4000-8000-000000000002", TENANT_B]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{}'::jsonb, $3), ($4, $5, 1, '{}'::jsonb, $6)", ["72000000-0000-4000-8000-000000000001", "71000000-0000-4000-8000-000000000001", TENANT_A, "72000000-0000-4000-8000-000000000002", "71000000-0000-4000-8000-000000000002", TENANT_B]);
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request, status) values ($1, $2, $3, $4, $5, 'A', 'PREPARED'), ($6, $7, $8, $9, $10, 'B', 'PREPARED')", [TX_A, TENANT_A, "70000000-0000-4000-8000-000000000001", "71000000-0000-4000-8000-000000000001", "72000000-0000-4000-8000-000000000001", TX_B, TENANT_B, "70000000-0000-4000-8000-000000000002", "71000000-0000-4000-8000-000000000002", "72000000-0000-4000-8000-000000000002"]);
    await admin.query("update public.assets set current_version_id = $1 where id = $2", ["72000000-0000-4000-8000-000000000001", "71000000-0000-4000-8000-000000000001"]);
    await admin.query("update public.assets set current_version_id = $1 where id = $2", ["72000000-0000-4000-8000-000000000002", "71000000-0000-4000-8000-000000000002"]);
    const dependencySql = "insert into public.build002_dependency_snapshots(id, owner_tenant_id, outcome_transaction_id, requirement_definition_hashes, signal_references, dependency_bindings, blueprint_hash, policy_hash, task_spec_hash, transaction_semantic_hash, source_asset_version_hash, context_lens_hash, schema_version, dependency_snapshot_hash) values ($1, $2, $3, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null, null, null, null, null, null, 'build002-dependency-snapshot-v0.2', $4)";
    await admin.query(dependencySql, [SNAPSHOT_A, TENANT_A, TX_A, HASH_A]);
    await admin.query(dependencySql, [SNAPSHOT_B, TENANT_B, TX_B, HASH_B]);
    const readinessSql = "insert into public.build002_delegation_readiness(id, owner_tenant_id, outcome_transaction_id, requirement_set_hash, qualification_set_hash, dependency_snapshot_id, dependency_snapshot_hash, task_spec_hash, source_asset_version_hash, blueprint_hash, policy_hash, evaluator, state, blocking_codes, condition_codes, created_at, valid_until, schema_version, readiness_content_hash) values ($1, $2, $3, $4, $4, $5, $6, null, null, null, null, '{\"schemaVersion\":\"build002-qualification-evaluator-v0.1\",\"version\":\"0.2.0\",\"definitionHash\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}'::jsonb, 'INSUFFICIENT_SIGNAL', '[\"REQUIREMENT_SET_EMPTY\"]'::jsonb, '[]'::jsonb, '2026-08-21T10:00:00Z', null, 'build002-signal-readiness-v0.3', $7)";
    await admin.query(readinessSql, [READINESS_A, TENANT_A, TX_A, HASH_A, SNAPSHOT_A, HASH_A, HASH_A]);
    await admin.query(readinessSql, [READINESS_B, TENANT_B, TX_B, HASH_B, SNAPSHOT_B, HASH_B, HASH_B]);
    // The disposable fixture seeds only the rows needed to exercise the scoped
    // SELECT. D0 graph integrity is covered by the unchanged native D0 suite.
    await admin.query("alter table public.build002_readiness_authority_commits disable trigger build002_readiness_authority_marker_graph_coherent");
    await admin.query("select set_config('build002.authority_commit', (select token from public.build002_readiness_authority_capability limit 1), false)");
    const markerSql = "insert into public.build002_readiness_authority_commits(id, owner_tenant_id, outcome_transaction_id, principal_id, dependency_snapshot_id, dependency_snapshot_hash, readiness_id, readiness_content_hash, evaluation_time, schema_version) values ($1, $2, $3, $4, $5, $6, $7, $6, '2026-08-21T10:00:00Z', 'build002-readiness-authority-commit-v0.1')";
    await admin.query(markerSql, [COMMIT_A, TENANT_A, TX_A, USER_A, SNAPSHOT_A, HASH_A, READINESS_A]);
    await admin.query(markerSql, [COMMIT_B, TENANT_B, TX_B, USER_A, SNAPSHOT_B, HASH_B, READINESS_B]);
    await admin.query("alter table public.build002_readiness_authority_commits enable trigger build002_readiness_authority_marker_graph_coherent");
  }, 120_000);

  afterAll(async () => {
    await admin?.end();
    if (databaseUrl && isolatedDatabase) {
      const root = new Client({ connectionString: connection(databaseUrl, "postgres") });
      await root.connect();
      await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
      await root.end();
    }
  });

  it("returns same-tenant marker and hides a foreign-tenant ID at query scope", async () => {
    expect((await admin.query("select version() as version")).rows[0].version).toMatch(/PostgreSQL 17/i);
    const reader = new SupabaseReadinessAuthorityCommitScopedReader(new PgSupabaseLikeClient(admin) as never, TENANT_A);
    const own = await reader.findByScopedId({ ownerTenantId: TENANT_A, authorityCommitId: COMMIT_A });
    const foreign = await reader.findByScopedId({ ownerTenantId: TENANT_A, authorityCommitId: COMMIT_B });
    expect(own?.authorityCommitId).toBe(COMMIT_A);
    expect(own?.ownerTenantId).toBe(TENANT_A);
    expect(foreign).toBeNull();
  });
});
