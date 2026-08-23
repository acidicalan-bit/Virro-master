// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  OutcomeDependencySnapshotResolver,
  type OutcomeDependencySnapshotRepositories,
} from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import type { AssetRecord, AssetVersionRecord, OutcomeTransactionRecord } from "@/src/application/ports/repositories";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import { compileSignalRequirement } from "@/src/domain/outcome/signal-readiness";

const enabled = process.env.BUILD002_NATIVE_PG_C1_B === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_B_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const TENANT_A = "a2000000-0000-4000-8000-000000000001";
const TENANT_B = "a2000000-0000-4000-8000-000000000002";
const PROJECT_A = "b2000000-0000-4000-8000-000000000001";
const PROJECT_B = "b2000000-0000-4000-8000-000000000002";
const ASSET_A = "c2000000-0000-4000-8000-000000000001";
const ASSET_B = "c2000000-0000-4000-8000-000000000002";
const VERSION_A = "d2000000-0000-4000-8000-000000000001";
const VERSION_B = "d2000000-0000-4000-8000-000000000002";
const TX_A = "e2000000-0000-4000-8000-000000000001";
const TX_B = "e2000000-0000-4000-8000-000000000002";
const BLUEPRINT = "f2000000-0000-4000-8000-000000000001";
const REQUIREMENT_HASH = "a".repeat(64);
const BLUEPRINT_HASH = "b".repeat(64);
const CREATED_AT = "2026-08-20T12:00:00.000Z";

function databaseConnectionString(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-B native PostgreSQL E3", () => {
  let admin: Client;
  let isolatedDatabase: string;

  beforeAll(async () => {
    isolatedDatabase = `virro_e3_c1_b_${process.pid}_${Date.now()}`;
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
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'C1-B A', $2), ($3, 'C1-B B', $4)", [PROJECT_A, TENANT_A, PROJECT_B, TENANT_B]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'C1-B A', $3), ($4, $5, 'C1-B B', $6)", [ASSET_A, PROJECT_A, TENANT_A, ASSET_B, PROJECT_B, TENANT_B]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{\"width\":100}'::jsonb, $3), ($4, $5, 1, '{\"width\":200}'::jsonb, $6)", [VERSION_A, ASSET_A, TENANT_A, VERSION_B, ASSET_B, TENANT_B]);
    await admin.query("update public.assets set current_version_id = $1 where id = $2", [VERSION_A, ASSET_A]);
    await admin.query("update public.assets set current_version_id = $1 where id = $2", [VERSION_B, ASSET_B]);
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1, $2, $3, $4, $5, 'C1-B A'), ($6, $7, $8, $9, $10, 'C1-B B')", [TX_A, TENANT_A, PROJECT_A, ASSET_A, VERSION_A, TX_B, TENANT_B, PROJECT_B, ASSET_B, VERSION_B]);
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

  it("applies the current migration set and resolves the tenant-owned current state without writes", async () => {
    expect((await admin.query<{ version: string }>("select version() as version")).rows[0].version).toMatch(/PostgreSQL 17/i);
    const before = await admin.query<{ projects: string; assets: string; versions: string; transactions: string; dependencies: string }>(`select
      (select count(*) from public.projects) as projects,
      (select count(*) from public.assets) as assets,
      (select count(*) from public.asset_versions) as versions,
      (select count(*) from public.outcome_transactions) as transactions,
      (select count(*) from public.build002_dependency_snapshots) as dependencies`);
    const transactionRow = await admin.query("select id::text, owner_tenant_id::text, project_id::text, asset_id::text, base_version_id::text, status, raw_request, created_at::text, updated_at::text, completed_at::text, abort_reason from public.outcome_transactions where id = $1 and owner_tenant_id = $2", [TX_A, TENANT_A]);
    const assetRow = await admin.query("select id::text, owner_tenant_id::text, project_id::text, name, description, current_version_id::text, created_at::text, updated_at::text from public.assets where id = $1 and owner_tenant_id = $2", [ASSET_A, TENANT_A]);
    const versionRow = await admin.query("select id::text, owner_tenant_id::text, asset_id::text, version_number, state, parent_version_id::text, created_at::text from public.asset_versions where id = $1 and owner_tenant_id = $2", [VERSION_A, TENANT_A]);
    const transaction = {
      id: String(transactionRow.rows[0].id),
      ownerTenantId: String(transactionRow.rows[0].owner_tenant_id),
      projectId: String(transactionRow.rows[0].project_id),
      assetId: String(transactionRow.rows[0].asset_id),
      baseVersionId: String(transactionRow.rows[0].base_version_id),
      status: transactionRow.rows[0].status,
      rawRequest: String(transactionRow.rows[0].raw_request),
      createdAt: String(transactionRow.rows[0].created_at),
      updatedAt: String(transactionRow.rows[0].updated_at),
      completedAt: transactionRow.rows[0].completed_at,
      abortReason: transactionRow.rows[0].abort_reason,
    } as OutcomeTransactionRecord;
    const asset = {
      id: String(assetRow.rows[0].id),
      ownerTenantId: String(assetRow.rows[0].owner_tenant_id),
      projectId: String(assetRow.rows[0].project_id),
      name: String(assetRow.rows[0].name),
      description: assetRow.rows[0].description,
      currentVersionId: String(assetRow.rows[0].current_version_id),
      createdAt: String(assetRow.rows[0].created_at),
      updatedAt: String(assetRow.rows[0].updated_at),
    } as AssetRecord;
    const version = {
      id: String(versionRow.rows[0].id),
      ownerTenantId: String(versionRow.rows[0].owner_tenant_id),
      assetId: String(versionRow.rows[0].asset_id),
      versionNumber: Number(versionRow.rows[0].version_number),
      state: versionRow.rows[0].state,
      parentVersionId: versionRow.rows[0].parent_version_id,
      createdAt: String(versionRow.rows[0].created_at),
    } as AssetVersionRecord;
    const requirement = compileSignalRequirement({
      requirementId: "signal.a",
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
    const authority = {
      ownerTenantId: TENANT_A,
      outcomeTransactionId: TX_A,
      binding: {},
      blueprint: { hash: BLUEPRINT_HASH },
      requirementProfile: {},
      signalRequirements: [{ ...requirement, requirementDefinitionHash: REQUIREMENT_HASH }],
      resolvedAt: CREATED_AT,
    } as unknown as ResolvedOutcomeRequirementAuthority;
    const universe = {
      ownerTenantId: TENANT_A,
      outcomeTransactionId: TX_A,
      requirements: [{ requirement: authority.signalRequirements[0], signals: [] }],
    } as ResolvedOutcomeSignalUniverse;
    const repositories: OutcomeDependencySnapshotRepositories = {
      transactions: { findById: async () => transaction },
      assets: { findById: async () => asset },
      assetVersions: { findById: async () => version },
      signalUniverse: { listSignalsForRequirement: async () => [] },
    };
    const result = await new OutcomeDependencySnapshotResolver(repositories).resolve(authority, universe);
    expect(result.dependencySnapshot.requirementDefinitionHashes).toEqual([REQUIREMENT_HASH]);
    expect(result.dependencySnapshot.signalReferences).toEqual([]);
    const after = await admin.query<{ projects: string; assets: string; versions: string; transactions: string; dependencies: string }>(`select
      (select count(*) from public.projects) as projects,
      (select count(*) from public.assets) as assets,
      (select count(*) from public.asset_versions) as versions,
      (select count(*) from public.outcome_transactions) as transactions,
      (select count(*) from public.build002_dependency_snapshots) as dependencies`);
    expect(after.rows[0]).toEqual(before.rows[0]);
    expect(after.rows[0].dependencies).toBe("0");
    const foreign = await admin.query("select id from public.assets where id = $1 and owner_tenant_id = $2", [ASSET_B, TENANT_A]);
    expect(foreign.rows).toHaveLength(0);
  });
});
