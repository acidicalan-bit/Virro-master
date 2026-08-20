// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OutcomeDependencySnapshotResolver, type OutcomeDependencySnapshotRepositories } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import { OutcomeReadinessCandidateResolver } from "@/src/application/outcome/resolve-outcome-readiness-candidate";
import { OutcomeSignalUniverseResolver } from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import { compileSignalRequirement, createSignal } from "@/src/domain/outcome/signal-readiness";
import type { AssetRecord, AssetVersionRecord, OutcomeTransactionRecord } from "@/src/application/ports/repositories";

const enabled = process.env.BUILD002_NATIVE_PG_C1_C_R1 === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_R1_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const TENANT = "a4000000-0000-4000-8000-000000000001";
const PROJECT = "b4000000-0000-4000-8000-000000000001";
const ASSET = "c4000000-0000-4000-8000-000000000001";
const VERSION = "d4000000-0000-4000-8000-000000000001";
const TRANSACTION = "e4000000-0000-4000-8000-000000000001";
const BLUEPRINT = "f4000000-0000-4000-8000-000000000001";
const EVALUATION_TIME = "2026-08-20T12:00:00.000Z";
const BLUEPRINT_HASH = "a".repeat(64);
const SOURCE_HASH = "b".repeat(64);

function connection(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

describe.runIf(enabled && Boolean(databaseUrl))("independent C1-C R1 native PostgreSQL 17", () => {
  let admin: Client;
  let isolatedDatabase = "";

  beforeAll(async () => {
    isolatedDatabase = `virro_verify_c1_c_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await admin.connect();
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users (id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);");
    for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort()) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
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

  it("seeds persisted core/signal rows, composes C1-A/B/C independently, and proves zero writes", async () => {
    expect((await admin.query("select version() as version")).rows[0].version).toMatch(/PostgreSQL 17/i);
    expect(readdirSync(migrationsDir).filter((item) => item.endsWith(".sql"))).toHaveLength(29);
    const requirement = compileSignalRequirement({
      requirementId: "independent.native",
      subjectKind: "OUTCOME_TRANSACTION",
      semanticType: "TEXT",
      critical: true,
      acceptedProvenance: ["OBSERVED"],
      qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
      dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }, { identity: "transaction.semantic", required: true }],
      blueprintId: BLUEPRINT,
      blueprintVersion: 1,
      blueprintHash: BLUEPRINT_HASH,
      policyId: null,
      policyHash: null,
      definitionSchemaVersion: "build002-signal-requirement-v0.1",
    }, EVALUATION_TIME);
    const evidence = createSignal({ signalId: "f4000000-0000-4000-8000-000000000002", ownerTenantId: TENANT, transactionId: TRANSACTION, requirementId: requirement.requirementId, payload: { value: "native" }, source: { identity: "independent-native", version: "1", hash: SOURCE_HASH }, provenance: "OBSERVED", capturedAt: "2026-08-20T11:00:00.000Z", validUntil: null, dependency: { identity: "blueprint", hash: BLUEPRINT_HASH }, schemaVersion: "build002-signal-v0.2" });
    await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE')", [TENANT]);
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'independent native project', $2)", [PROJECT, TENANT]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'independent native asset', $3)", [ASSET, PROJECT, TENANT]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{\"width\":100}'::jsonb, $3)", [VERSION, ASSET, TENANT]);
    await admin.query("update public.assets set current_version_id = $1 where id = $2", [VERSION, ASSET]);
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1, $2, $3, $4, $5, 'independent native')", [TRANSACTION, TENANT, PROJECT, ASSET, VERSION]);
    await admin.query("insert into public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, requirement_id, semantic_type, critical, accepted_provenance, qualification_rule, dependency_selectors, blueprint_id, blueprint_version, blueprint_hash, policy_id, policy_hash, schema_version, requirement_definition_hash, created_at) values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, 1, $10, null, null, 'build002-signal-requirement-v0.1', $11, $12)", [TENANT, TRANSACTION, requirement.requirementId, requirement.semanticType, requirement.critical, JSON.stringify(requirement.acceptedProvenance), JSON.stringify(requirement.qualificationRule), JSON.stringify(requirement.dependencySelectors), BLUEPRINT, BLUEPRINT_HASH, requirement.requirementDefinitionHash, EVALUATION_TIME]);
    await admin.query("insert into public.build002_signals(signal_id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash, payload, source, provenance, captured_at, valid_until, dependency_identity, dependency_hash, schema_version, content_hash) values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, 'build002-signal-v0.2', $13)", [evidence.signalId, TENANT, TRANSACTION, evidence.requirementId, requirement.requirementDefinitionHash, JSON.stringify(evidence.payload), JSON.stringify(evidence.source), evidence.provenance, evidence.capturedAt, evidence.validUntil, evidence.dependency.identity, evidence.dependency.hash, evidence.contentHash]);
    const authority = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, binding: {}, blueprint: { hash: BLUEPRINT_HASH }, requirementProfile: {}, signalRequirements: [requirement], resolvedAt: EVALUATION_TIME } as unknown as ResolvedOutcomeRequirementAuthority;
    const data = { transaction: { id: TRANSACTION, ownerTenantId: TENANT, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, status: "PREPARED", rawRequest: "independent native", createdAt: EVALUATION_TIME, updatedAt: EVALUATION_TIME, completedAt: null, abortReason: null } as OutcomeTransactionRecord, asset: { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, name: "native", description: null, currentVersionId: VERSION, createdAt: EVALUATION_TIME, updatedAt: EVALUATION_TIME } as AssetRecord, version: { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, state: { width: 100 }, parentVersionId: null, createdAt: EVALUATION_TIME } as AssetVersionRecord };
    const repositories: OutcomeDependencySnapshotRepositories = { transactions: { findById: async () => structuredClone(data.transaction) }, assets: { findById: async () => structuredClone(data.asset) }, assetVersions: { findById: async () => structuredClone(data.version) }, signalUniverse: { listSignalsForRequirement: async () => [evidence] } };
    const universe = await new OutcomeSignalUniverseResolver(repositories.signalUniverse).resolve(authority);
    const dependency = await new OutcomeDependencySnapshotResolver(repositories).resolve(authority, universe);
    const before = await admin.query("select (select count(*) from public.build002_signals) as signals, (select count(*) from public.build002_dependency_snapshots) as dependencies, (select count(*) from public.build002_signal_qualifications) as qualifications, (select count(*) from public.build002_delegation_readiness) as readiness, (select status from public.outcome_transactions where id = $1) as status, (select count(*) from public.execution_runs) as executions, (select count(*) from public.mutation_leases) as leases, (select count(*) from public.state_commits) as commits", [TRANSACTION]);
    const candidate = new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(authority, universe, dependency);
    expect(candidate.readiness.state).toBe("READY");
    const { contentHash: _contentHash, ...evidenceInput } = evidence;
    void _contentHash;
    const nonReady = createSignal({ ...evidenceInput, signalId: "f4000000-0000-4000-8000-000000000003", capturedAt: "2026-08-20T13:00:00.000Z" });
    const futureUniverse = { ...universe, requirements: [{ requirement, signals: [nonReady] }] };
    const futureDependency = await new OutcomeDependencySnapshotResolver(repositories).resolve(authority, futureUniverse);
    expect(new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(authority, futureUniverse, futureDependency).readiness.state).toBe("INSUFFICIENT_SIGNAL");
    const after = await admin.query("select (select count(*) from public.build002_signals) as signals, (select count(*) from public.build002_dependency_snapshots) as dependencies, (select count(*) from public.build002_signal_qualifications) as qualifications, (select count(*) from public.build002_delegation_readiness) as readiness, (select status from public.outcome_transactions where id = $1) as status, (select count(*) from public.execution_runs) as executions, (select count(*) from public.mutation_leases) as leases, (select count(*) from public.state_commits) as commits", [TRANSACTION]);
    expect(after.rows).toEqual(before.rows);
  });
});
