// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OutcomeReadinessCandidateResolver } from "@/src/application/outcome/resolve-outcome-readiness-candidate";
import { compileSignalRequirement, createDependencySnapshot, createSignal } from "@/src/domain/outcome/signal-readiness";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { ResolvedOutcomeDependencySnapshot } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";

const enabled = process.env.BUILD002_NATIVE_PG_C1_C === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_C_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const TENANT = "a3000000-0000-4000-8000-000000000001";
const TRANSACTION = "b3000000-0000-4000-8000-000000000001";
const BLUEPRINT = "c3000000-0000-4000-8000-000000000001";
const PROFILE = "c3000000-0000-4000-8000-000000000002";
const PROJECT = "e3000000-0000-4000-8000-000000000001";
const ASSET = "e3000000-0000-4000-8000-000000000002";
const VERSION = "e3000000-0000-4000-8000-000000000003";
const EVALUATION_TIME = "2026-08-20T12:00:00.000Z";
const BLUEPRINT_HASH = "a".repeat(64);
const ASSET_HASH = "b".repeat(64);
const TRANSACTION_HASH = "c".repeat(64);

function connection(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function fixture(signalOverrides: Partial<Parameters<typeof createSignal>[0]> = {}) {
  const requirement = compileSignalRequirement({
    requirementId: "signal.native",
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "TEXT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [
      { identity: "asset.version", required: true },
      { identity: "blueprint", required: true },
      { identity: "transaction.semantic", required: true },
    ],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: BLUEPRINT_HASH,
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, EVALUATION_TIME);
  const evidence = createSignal({
    signalId: "d3000000-0000-4000-8000-000000000001",
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId: requirement.requirementId,
    payload: { value: "native" },
    source: { identity: "native-fixture", version: "1", hash: "d".repeat(64) },
    provenance: "OBSERVED",
    capturedAt: "2026-08-20T11:00:00.000Z",
    validUntil: "2026-08-21T12:00:00.000Z",
    dependency: { identity: "asset.version", hash: ASSET_HASH },
    schemaVersion: "build002-signal-v0.2",
    ...signalOverrides,
  });
  const snapshot = createDependencySnapshot({
    schemaVersion: "build002-dependency-snapshot-v0.2",
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementDefinitionHashes: [requirement.requirementDefinitionHash],
    signalReferences: [{ requirementId: requirement.requirementId, signalId: evidence.signalId, contentHash: evidence.contentHash }],
    dependencyBindings: [
      { identity: "asset.version", hash: ASSET_HASH },
      { identity: "blueprint", hash: BLUEPRINT_HASH },
      { identity: "transaction.semantic", hash: TRANSACTION_HASH },
    ],
    blueprintHash: BLUEPRINT_HASH,
    policyHash: null,
    taskSpecHash: null,
    transactionSemanticHash: TRANSACTION_HASH,
    sourceAssetVersionHash: ASSET_HASH,
    contextLensHash: null,
  });
  return {
    authority: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, binding: {}, blueprint: { hash: BLUEPRINT_HASH }, requirementProfile: {}, signalRequirements: [requirement], resolvedAt: EVALUATION_TIME } as unknown as ResolvedOutcomeRequirementAuthority,
    universe: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, requirements: [{ requirement, signals: [evidence] }] } as ResolvedOutcomeSignalUniverse,
    dependency: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, dependencySnapshot: snapshot } as ResolvedOutcomeDependencySnapshot,
  };
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-C native PostgreSQL 17 E3", () => {
  let admin: Client;
  let isolatedDatabase = "";

  beforeAll(async () => {
    isolatedDatabase = `virro_e3_c1_c_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await admin.connect();
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users (id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);");
    for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort()) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    const persisted = fixture();
    const requirement = persisted.authority.signalRequirements[0];
    const evidence = persisted.universe.requirements[0].signals[0];
    await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE')", [TENANT]);
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'C1-C native project', $2)", [PROJECT, TENANT]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'C1-C native asset', $3)", [ASSET, PROJECT, TENANT]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{\"width\":100}'::jsonb, $3)", [VERSION, ASSET, TENANT]);
    await admin.query("update public.assets set current_version_id = $1 where id = $2", [VERSION, ASSET]);
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1, $2, $3, $4, $5, 'C1-C native readiness')", [TRANSACTION, TENANT, PROJECT, ASSET, VERSION]);
    await admin.query("insert into public.outcome_blueprints(id, version, hash, previous_version_hash, status, published_at, definition) values ($1, 1, $2, null, 'PUBLISHED', $3, $4::jsonb)", [BLUEPRINT, BLUEPRINT_HASH, EVALUATION_TIME, JSON.stringify({ id: BLUEPRINT, version: 1, previousVersionHash: null })]);
    await admin.query("insert into public.outcome_requirement_profiles(id, version, hash, previous_version_hash, blueprint_id, blueprint_version, blueprint_hash, policy_id, policy_hash, status, published_at, definition) values ($1, 1, $2, null, $3, 1, $4, null, null, 'PUBLISHED', $5, $6::jsonb)", [PROFILE, "e".repeat(64), BLUEPRINT, BLUEPRINT_HASH, EVALUATION_TIME, JSON.stringify({ id: PROFILE, version: 1, previousVersionHash: null, blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH }, policy: null })]);
    await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id, outcome_transaction_id, blueprint_id, blueprint_version, blueprint_hash, requirement_profile_id, requirement_profile_version, requirement_profile_hash, policy_id, policy_hash, schema_version, binding_hash, bound_at) values ($1, $2, $3, 1, $4, $5, 1, $6, null, null, 'outcome-transaction-requirement-binding-v0.1', $7, $8)", [TENANT, TRANSACTION, BLUEPRINT, BLUEPRINT_HASH, PROFILE, "e".repeat(64), "f".repeat(64), EVALUATION_TIME]);
    await admin.query("insert into public.build002_signal_requirements(owner_tenant_id, outcome_transaction_id, requirement_id, semantic_type, critical, accepted_provenance, qualification_rule, dependency_selectors, blueprint_id, blueprint_version, blueprint_hash, policy_id, policy_hash, schema_version, requirement_definition_hash, created_at) values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, 1, $10, null, null, 'build002-signal-requirement-v0.1', $11, $12)", [TENANT, TRANSACTION, requirement.requirementId, requirement.semanticType, requirement.critical, JSON.stringify(requirement.acceptedProvenance), JSON.stringify(requirement.qualificationRule), JSON.stringify(requirement.dependencySelectors), BLUEPRINT, BLUEPRINT_HASH, requirement.requirementDefinitionHash, EVALUATION_TIME]);
    await admin.query("insert into public.build002_signals(signal_id, owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash, payload, source, provenance, captured_at, valid_until, dependency_identity, dependency_hash, schema_version, content_hash) values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, 'build002-signal-v0.2', $13)", [evidence.signalId, TENANT, TRANSACTION, evidence.requirementId, requirement.requirementDefinitionHash, JSON.stringify(evidence.payload), JSON.stringify(evidence.source), evidence.provenance, evidence.capturedAt, evidence.validUntil, evidence.dependency.identity, evidence.dependency.hash, evidence.contentHash]);
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

  it("applies all migrations once, emits READY in memory, and writes nothing", async () => {
    expect((await admin.query("select version() as version")).rows[0].version).toMatch(/PostgreSQL 17/i);
    expect(readdirSync(migrationsDir).filter((item) => item.endsWith(".sql"))).toHaveLength(31);
    const before = await admin.query(`select
      (select count(*) from public.build002_signals) as signals,
      (select count(*) from public.build002_dependency_snapshots) as dependencies,
      (select count(*) from public.build002_signal_qualifications) as qualifications,
      (select count(*) from public.build002_delegation_readiness) as readiness,
      (select status from public.outcome_transactions where id = $1) as transaction_status,
      (select count(*) from public.execution_runs) as executions,
      (select count(*) from public.mutation_leases) as leases,
      (select count(*) from public.state_commits) as commits`, [TRANSACTION]);
    const value = fixture();
    const result = new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(value.authority, value.universe, value.dependency);
    expect(result.readiness.state).toBe("READY");
    const expired = fixture({ validUntil: "2026-08-20T11:59:00.000Z" });
    expect(new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(expired.authority, expired.universe, expired.dependency).readiness.state).toBe("INSUFFICIENT_SIGNAL");
    const future = fixture({ capturedAt: "2026-08-20T13:00:00.000Z" });
    expect(new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(future.authority, future.universe, future.dependency).readiness.state).toBe("INSUFFICIENT_SIGNAL");
    const after = await admin.query(`select
      (select count(*) from public.build002_signals) as signals,
      (select count(*) from public.build002_dependency_snapshots) as dependencies,
      (select count(*) from public.build002_signal_qualifications) as qualifications,
      (select count(*) from public.build002_delegation_readiness) as readiness,
      (select status from public.outcome_transactions where id = $1) as transaction_status,
      (select count(*) from public.execution_runs) as executions,
      (select count(*) from public.mutation_leases) as leases,
      (select count(*) from public.state_commits) as commits`, [TRANSACTION]);
    expect(after.rows).toEqual(before.rows);
  });
});
