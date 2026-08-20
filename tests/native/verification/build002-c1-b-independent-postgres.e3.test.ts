// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AssetRecord, AssetVersionRecord, OutcomeTransactionRecord } from "@/src/application/ports/repositories";
import { OutcomeDependencySnapshotResolver, type OutcomeDependencySnapshotRepositories } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import { compileSignalRequirement } from "@/src/domain/outcome/signal-readiness";

const enabled = process.env.BUILD002_NATIVE_PG_C1_B_INDEPENDENT === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_B_INDEPENDENT_URL ?? process.env.BUILD002_NATIVE_PG_C1_B_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const TENANT_A = "a2100000-0000-4000-8000-000000000001";
const TENANT_B = "a2100000-0000-4000-8000-000000000002";
const PROJECT_A = "b2100000-0000-4000-8000-000000000001";
const PROJECT_B = "b2100000-0000-4000-8000-000000000002";
const ASSET_A = "c2100000-0000-4000-8000-000000000001";
const ASSET_B = "c2100000-0000-4000-8000-000000000002";
const VERSION_A = "d2100000-0000-4000-8000-000000000001";
const VERSION_B = "d2100000-0000-4000-8000-000000000002";
const TX_A = "e2100000-0000-4000-8000-000000000001";
const TX_B = "e2100000-0000-4000-8000-000000000002";
const BLUEPRINT = "f2100000-0000-4000-8000-000000000001";
const BLUEPRINT_HASH = "a".repeat(64);
const CREATED_AT = "2026-08-20T12:00:00.000Z";

function databaseConnectionString(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

const requirement = compileSignalRequirement({
  requirementId: "independent.signal.a",
  subjectKind: "OUTCOME_TRANSACTION",
  semanticType: "TEXT",
  critical: true,
  acceptedProvenance: ["OBSERVED"],
  qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
  dependencySelectors: [{ identity: "asset.version", required: true }],
  blueprintId: BLUEPRINT,
  blueprintVersion: 1,
  blueprintHash: BLUEPRINT_HASH,
  policyId: null,
  policyHash: null,
  definitionSchemaVersion: "build002-signal-requirement-v0.1",
}, CREATED_AT);

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-B independent native PostgreSQL 17 boundary", () => {
  let admin: Client;
  let isolatedDatabase = "";
  let transaction: OutcomeTransactionRecord;
  let asset: AssetRecord;
  let version: AssetVersionRecord;

  beforeAll(async () => {
    isolatedDatabase = `virro_c1_b_independent_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: databaseConnectionString(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();
    admin = new Client({ connectionString: databaseConnectionString(databaseUrl!, isolatedDatabase) });
    await admin.connect();
    await admin.query("create extension if not exists pgcrypto");
    await admin.query("do $$ begin create role anon nologin; exception when duplicate_object then null; end $$");
    await admin.query("do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$");
    await admin.query("do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$");
    await admin.query("create schema if not exists auth; create table if not exists auth.users (id uuid primary key)");
    await admin.query("create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$");
    await admin.query("create schema if not exists storage; create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[])");
    for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort()) {
      await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    }
    expect(readdirSync(migrationsDir).filter((item) => item.endsWith(".sql"))).toHaveLength(29);
    await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE'), ($2, 'ORGANIZATION', 'ACTIVE')", [TENANT_A, TENANT_B]);
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'independent A', $2), ($3, 'independent B', $4)", [PROJECT_A, TENANT_A, PROJECT_B, TENANT_B]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'independent A', $3), ($4, $5, 'independent B', $6)", [ASSET_A, PROJECT_A, TENANT_A, ASSET_B, PROJECT_B, TENANT_B]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{\"width\":100}'::jsonb, $3), ($4, $5, 1, '{\"width\":200}'::jsonb, $6)", [VERSION_A, ASSET_A, TENANT_A, VERSION_B, ASSET_B, TENANT_B]);
    await admin.query("update public.assets set current_version_id = $1 where id = $2", [VERSION_A, ASSET_A]);
    await admin.query("update public.assets set current_version_id = $1 where id = $2", [VERSION_B, ASSET_B]);
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1, $2, $3, $4, $5, 'independent A'), ($6, $7, $8, $9, $10, 'independent B')", [TX_A, TENANT_A, PROJECT_A, ASSET_A, VERSION_A, TX_B, TENANT_B, PROJECT_B, ASSET_B, VERSION_B]);
    const tx = await admin.query("select id::text, owner_tenant_id::text, project_id::text, asset_id::text, base_version_id::text, status, raw_request, created_at::text, updated_at::text, completed_at::text, abort_reason from public.outcome_transactions where id = $1", [TX_A]);
    const ar = await admin.query("select id::text, owner_tenant_id::text, project_id::text, name, description, current_version_id::text, created_at::text, updated_at::text from public.assets where id = $1", [ASSET_A]);
    const vr = await admin.query("select id::text, owner_tenant_id::text, asset_id::text, version_number, state, parent_version_id::text, created_at::text from public.asset_versions where id = $1", [VERSION_A]);
    const txRow = tx.rows[0] as Record<string, unknown>;
    transaction = { id: String(txRow.id), ownerTenantId: String(txRow.owner_tenant_id), projectId: String(txRow.project_id), assetId: String(txRow.asset_id), baseVersionId: String(txRow.base_version_id), status: txRow.status as OutcomeTransactionRecord["status"], rawRequest: String(txRow.raw_request), createdAt: String(txRow.created_at), updatedAt: String(txRow.updated_at), completedAt: txRow.completed_at as string | null, abortReason: txRow.abort_reason as string | null };
    const assetRow = ar.rows[0] as Record<string, unknown>;
    asset = { id: String(assetRow.id), ownerTenantId: String(assetRow.owner_tenant_id), projectId: String(assetRow.project_id), name: String(assetRow.name), description: assetRow.description as string | null, currentVersionId: String(assetRow.current_version_id), createdAt: String(assetRow.created_at), updatedAt: String(assetRow.updated_at) };
    const versionRow = vr.rows[0] as Record<string, unknown>;
    version = { id: String(versionRow.id), ownerTenantId: String(versionRow.owner_tenant_id), assetId: String(versionRow.asset_id), versionNumber: Number(versionRow.version_number), state: versionRow.state as Record<string, unknown>, parentVersionId: versionRow.parent_version_id as string | null, createdAt: String(versionRow.created_at) };
  }, 120_000);

  afterAll(async () => {
    await admin?.end();
    if (databaseUrl && isolatedDatabase) {
      const root = new Client({ connectionString: databaseConnectionString(databaseUrl, "postgres") });
      await root.connect();
      await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
      await root.end();
    }
  });

  function resolveNative() {
    const authority = { ownerTenantId: TENANT_A, outcomeTransactionId: TX_A, binding: {}, blueprint: { hash: BLUEPRINT_HASH }, requirementProfile: {}, signalRequirements: [requirement], resolvedAt: CREATED_AT } as unknown as ResolvedOutcomeRequirementAuthority;
    const universe = { ownerTenantId: TENANT_A, outcomeTransactionId: TX_A, requirements: [{ requirement, signals: [] }] } as ResolvedOutcomeSignalUniverse;
    const repositories: OutcomeDependencySnapshotRepositories = {
      transactions: { findById: async () => transaction },
      assets: { findById: async () => asset },
      assetVersions: { findById: async () => version },
      signalUniverse: { listSignalsForRequirement: async () => [] },
    };
    return new OutcomeDependencySnapshotResolver(repositories).resolve(authority, universe);
  }

  it("resolves persisted tenant-owned state on PostgreSQL 17 with zero canonical writes", async () => {
    expect((await admin.query<{ version: string }>("select version() as version")).rows[0].version).toMatch(/PostgreSQL 17/i);
    const before = await admin.query<{ projects: string; assets: string; versions: string; transactions: string; dependencies: string }>("select (select count(*) from public.projects) as projects, (select count(*) from public.assets) as assets, (select count(*) from public.asset_versions) as versions, (select count(*) from public.outcome_transactions) as transactions, (select count(*) from public.build002_dependency_snapshots) as dependencies");
    const result = await resolveNative();
    expect(result.ownerTenantId).toBe(TENANT_A);
    expect(result.dependencySnapshot.signalReferences).toEqual([]);
    const after = await admin.query<{ projects: string; assets: string; versions: string; transactions: string; dependencies: string }>("select (select count(*) from public.projects) as projects, (select count(*) from public.assets) as assets, (select count(*) from public.asset_versions) as versions, (select count(*) from public.outcome_transactions) as transactions, (select count(*) from public.build002_dependency_snapshots) as dependencies");
    expect(after.rows[0]).toEqual(before.rows[0]);
    expect(after.rows[0].dependencies).toBe("0");
    expect((await admin.query("select id from public.assets where id = $1 and owner_tenant_id = $2", [ASSET_B, TENANT_A])).rows).toHaveLength(0);
  });

  it("fails closed when the persisted source head changes", async () => {
    await admin.query("update public.assets set current_version_id = $1 where id = $2", [VERSION_B, ASSET_A]);
    const changed = { ...asset, currentVersionId: VERSION_B } as AssetRecord;
    const authority = { ownerTenantId: TENANT_A, outcomeTransactionId: TX_A, binding: {}, blueprint: { hash: BLUEPRINT_HASH }, requirementProfile: {}, signalRequirements: [requirement], resolvedAt: CREATED_AT } as unknown as ResolvedOutcomeRequirementAuthority;
    const universe = { ownerTenantId: TENANT_A, outcomeTransactionId: TX_A, requirements: [{ requirement, signals: [] }] } as ResolvedOutcomeSignalUniverse;
    const repositories: OutcomeDependencySnapshotRepositories = { transactions: { findById: async () => transaction }, assets: { findById: async () => changed }, assetVersions: { findById: async () => version }, signalUniverse: { listSignalsForRequirement: async () => [] } };
    await expect(new OutcomeDependencySnapshotResolver(repositories).resolve(authority, universe)).rejects.toMatchObject({ code: "SOURCE_ASSET_HEAD_CHANGED" });
  });
});
