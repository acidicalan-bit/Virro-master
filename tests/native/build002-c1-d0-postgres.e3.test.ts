// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
import {
  compileSignalRequirement,
  createDependencySnapshot,
  createSignal,
  currentDefaultEvaluator,
  evaluateDelegationReadiness,
  evaluateSignalQualification,
  type DelegationReadiness,
  type DependencySnapshot,
  type Signal,
  type SignalQualification,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";

const enabled = process.env.BUILD002_NATIVE_PG_C1_D0 === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_D0_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const ACTOR = "a0000000-0000-4000-8000-000000000001";
const TENANT = "b0000000-0000-4000-8000-000000000001";
const PROJECT = "c0000000-0000-4000-8000-000000000001";
const ASSET = "d0000000-0000-4000-8000-000000000001";
const VERSION = "e0000000-0000-4000-8000-000000000001";
const TRANSACTION = "f0000000-0000-4000-8000-000000000001";
const BLUEPRINT = "a1000000-0000-4000-8000-000000000001";
const PROFILE = "a1000000-0000-4000-8000-000000000002";
const SIGNAL = "a2000000-0000-4000-8000-000000000001";
const QUALIFICATION = "a3000000-0000-4000-8000-000000000001";
const READINESS = "a4000000-0000-4000-8000-000000000001";
const BLUEPRINT_HASH = "a".repeat(64);
const ASSET_HASH = "b".repeat(64);
const TRANSACTION_HASH = "c".repeat(64);
const PROFILE_HASH = "d".repeat(64);
const BINDING_HASH = "e".repeat(64);

function connection(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

type Graph = {
  requirement: SignalRequirement;
  signal: Signal;
  snapshot: DependencySnapshot;
  qualification: SignalQualification;
  readiness: DelegationReadiness;
  payload: Record<string, unknown>;
};

function graph(): Graph {
  const now = new Date(Date.now() - 30_000).toISOString();
  const capturedAt = new Date(Date.now() - 60_000).toISOString();
  const validUntil = new Date(Date.now() + 3_600_000).toISOString();
  const requirement = compileSignalRequirement({
    requirementId: "signal.d0",
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
  }, now);
  const signal = createSignal({
    signalId: SIGNAL,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId: requirement.requirementId,
    payload: { value: "d0" },
    source: { identity: "native-d0", version: "1", hash: "f".repeat(64) },
    provenance: "OBSERVED",
    capturedAt,
    validUntil,
    dependency: { identity: "asset.version", hash: ASSET_HASH },
    schemaVersion: "build002-signal-v0.2",
  });
  const snapshot = createDependencySnapshot({
    schemaVersion: "build002-dependency-snapshot-v0.2",
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementDefinitionHashes: [requirement.requirementDefinitionHash],
    signalReferences: [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }],
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
  const evaluator = currentDefaultEvaluator();
  const qualification = evaluateSignalQualification({
    requirement,
    signals: [signal],
    currentDependencySnapshot: snapshot,
    evaluator,
    evaluationTime: now,
    idFactory: () => QUALIFICATION,
  });
  const readiness = evaluateDelegationReadiness({
    subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TRANSACTION },
    requirements: [requirement],
    qualifications: [qualification],
    dependencySnapshot: snapshot,
    evaluator,
    evaluationTime: now,
    idFactory: () => READINESS,
  });
  const payload: Record<string, unknown> = {
    owner_tenant_id: TENANT,
    outcome_transaction_id: TRANSACTION,
    transaction: { ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "d0 native" },
    asset: { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, currentVersionId: VERSION },
    sourceVersion: { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, parentVersionId: null, state: { width: 100 } },
    binding: { bindingHash: BINDING_HASH, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, requirementProfileId: PROFILE, requirementProfileVersion: 1, requirementProfileHash: PROFILE_HASH },
    requirements: [requirement],
    dependency_snapshot: snapshot,
    qualifications: [{ ...qualification, signalReferences: qualification.signalIds.map((id, index) => ({ signalId: id, contentHash: qualification.signalContentHashes[index] })) }],
    readiness,
  };
  return { requirement, signal, snapshot, qualification, readiness, payload };
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-D0 native PostgreSQL 17", () => {
  let admin: Client;
  let service: Client;
  let isolatedDatabase = "";
  let value: Graph;

  beforeAll(async () => {
    isolatedDatabase = `virro_d0_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    service = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await admin.connect();
    await service.connect();
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users (id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);");
    for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort()) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    value = graph();
    await admin.query("insert into auth.users(id) values ($1) on conflict do nothing", [ACTOR]);
    await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE')", [TENANT]);
    await admin.query("insert into public.tenant_memberships(id, tenant_id, principal_id, role, status) values ($1, $2, $3, 'OWNER', 'ACTIVE')", ["b1000000-0000-4000-8000-000000000001", TENANT, ACTOR]);
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'D0 project', $2)", [PROJECT, TENANT]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'D0 asset', $3)", [ASSET, PROJECT, TENANT]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{\"width\":100}'::jsonb, $3)", [VERSION, ASSET, TENANT]);
    await admin.query("update public.assets set current_version_id = $1 where id = $2", [VERSION, ASSET]);
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request, status) values ($1, $2, $3, $4, $5, 'd0 native', 'PREPARED')", [TRANSACTION, TENANT, PROJECT, ASSET, VERSION]);
    await admin.query("insert into public.outcome_blueprints(id, version, hash, previous_version_hash, status, published_at, definition) values ($1, 1, $2, null, 'PUBLISHED', now(), $3::jsonb)", [BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ id: BLUEPRINT, version: 1, previousVersionHash: null })]);
    await admin.query("insert into public.outcome_requirement_profiles(id, version, hash, previous_version_hash, blueprint_id, blueprint_version, blueprint_hash, policy_id, policy_hash, status, published_at, definition) values ($1, 1, $2, null, $3, 1, $4, null, null, 'PUBLISHED', now(), $5::jsonb)", [PROFILE, PROFILE_HASH, BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ schemaVersion: "outcome-requirement-profile-v0.1", id: PROFILE, version: 1, previousVersionHash: null, blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH }, policy: null, requirements: [{ requirementId: value.requirement.requirementId, semanticType: value.requirement.semanticType, critical: value.requirement.critical, acceptedProvenance: value.requirement.acceptedProvenance, qualificationRule: value.requirement.qualificationRule, dependencySelectors: value.requirement.dependencySelectors }] })]);
    await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id, outcome_transaction_id, blueprint_id, blueprint_version, blueprint_hash, requirement_profile_id, requirement_profile_version, requirement_profile_hash, policy_id, policy_hash, schema_version, binding_hash, bound_at) values ($1, $2, $3, 1, $4, $5, 1, $6, null, null, 'outcome-transaction-requirement-binding-v0.1', $7, now())", [TENANT, TRANSACTION, BLUEPRINT, BLUEPRINT_HASH, PROFILE, PROFILE_HASH, BINDING_HASH]);
    await service.query("set role service_role");
    await service.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({ id: "a5000000-0000-4000-8000-000000000001", owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: value.requirement.requirementId, semantic_type: value.requirement.semanticType, critical: value.requirement.critical, accepted_provenance: value.requirement.acceptedProvenance, qualification_rule: value.requirement.qualificationRule, dependency_selectors: value.requirement.dependencySelectors, blueprint_id: BLUEPRINT, blueprint_version: 1, blueprint_hash: BLUEPRINT_HASH, policy_id: null, policy_hash: null, schema_version: value.requirement.definitionSchemaVersion, requirement_definition_hash: value.requirement.requirementDefinitionHash, created_at: value.requirement.createdAt })]);
    await service.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: value.signal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: value.signal.requirementId, requirement_definition_hash: value.requirement.requirementDefinitionHash, payload: value.signal.payload, source: value.signal.source, provenance: value.signal.provenance, captured_at: value.signal.capturedAt, valid_until: value.signal.validUntil, dependency_identity: value.signal.dependency.identity, dependency_hash: value.signal.dependency.hash, schema_version: value.signal.schemaVersion, content_hash: value.signal.contentHash })]);
  }, 120_000);

  afterAll(async () => {
    await admin?.end();
    await service?.end();
    if (databaseUrl && isolatedDatabase) {
      const root = new Client({ connectionString: connection(databaseUrl, "postgres") });
      await root.connect();
      await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
      await root.end();
    }
  });

  it("commits READY exactly once, keeps PREPARED, and replays idempotently", async () => {
    const first = await service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb) as result", [ACTOR, JSON.stringify(value.payload)]);
    const second = await service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb) as result", [ACTOR, JSON.stringify(value.payload)]);
    expect(first.rows[0].result.authority_commit_id).toBe(second.rows[0].result.authority_commit_id);
    const counts = await admin.query("select (select count(*) from public.build002_readiness_authority_commits) as markers, (select count(*) from public.build002_dependency_snapshots where owner_tenant_id = $1) as dependencies, (select count(*) from public.build002_signal_qualifications where owner_tenant_id = $1) as qualifications, (select count(*) from public.build002_delegation_readiness where owner_tenant_id = $1) as readiness, (select status from public.outcome_transactions where id = $2) as status", [TENANT, TRANSACTION]);
    expect(counts.rows[0]).toMatchObject({ markers: "1", dependencies: "1", qualifications: "1", readiness: "1", status: "PREPARED" });
  });

  it("accepts a non-ready authority marker without transitioning execution state", async () => {
    const nonready = structuredClone(value.payload) as Record<string, unknown>;
    const readiness = {
      ...(nonready.readiness as Record<string, unknown>),
      id: "a4000000-0000-4000-8000-000000000003",
      state: "INSUFFICIENT_SIGNAL",
      blockingCodes: ["SIGNAL_MISSING"],
      validUntil: null,
    } as Record<string, unknown>;
    const { id: _id, readinessContentHash: _hash, createdAt: _createdAt, ...readinessMaterial } = readiness;
    void _id; void _hash; void _createdAt;
    readiness.readinessContentHash = canonicalSha256(readinessMaterial);
    nonready.readiness = readiness;
    const result = await service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb) as result", [ACTOR, JSON.stringify(nonready)]);
    expect(result.rows[0].result.authority_commit_id).toBeTruthy();
    const status = await admin.query("select status from public.outcome_transactions where id = $1", [TRANSACTION]);
    expect(status.rows[0].status).toBe("PREPARED");
  });

  it("accepts a canonical zero-signal requirement as a non-ready marker", async () => {
    const zeroProject = "c0000000-0000-4000-8000-000000000002";
    const zeroAsset = "d0000000-0000-4000-8000-000000000002";
    const zeroVersion = "e0000000-0000-4000-8000-000000000002";
    const zeroTransaction = "f0000000-0000-4000-8000-000000000002";
    const zeroBlueprint = "a1000000-0000-4000-8000-000000000003";
    const zeroProfile = "a1000000-0000-4000-8000-000000000004";
    const zeroRequirement = compileSignalRequirement({
      requirementId: "signal.d0.zero",
      subjectKind: "OUTCOME_TRANSACTION",
      semanticType: "TEXT",
      critical: true,
      acceptedProvenance: ["OBSERVED"],
      qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
      dependencySelectors: [{ identity: "asset.version", required: true }],
      blueprintId: zeroBlueprint,
      blueprintVersion: 1,
      blueprintHash: "a2".repeat(32),
      policyId: null,
      policyHash: null,
      definitionSchemaVersion: "build002-signal-requirement-v0.1",
    }, new Date(Date.now() - 30_000).toISOString());
    const zeroSnapshot = createDependencySnapshot({
      schemaVersion: "build002-dependency-snapshot-v0.2",
      ownerTenantId: TENANT,
      transactionId: zeroTransaction,
      requirementDefinitionHashes: [zeroRequirement.requirementDefinitionHash],
      signalReferences: [],
      dependencyBindings: [
        { identity: "asset.version", hash: "b2".repeat(32) },
        { identity: "blueprint", hash: "a2".repeat(32) },
        { identity: "transaction.semantic", hash: "c2".repeat(32) },
      ],
      blueprintHash: "a2".repeat(32),
      policyHash: null,
      taskSpecHash: null,
      transactionSemanticHash: "c2".repeat(32),
      sourceAssetVersionHash: "b2".repeat(32),
      contextLensHash: null,
    });
    const zeroEvaluator = currentDefaultEvaluator();
    const zeroQualification = evaluateSignalQualification({ requirement: zeroRequirement, signals: [], currentDependencySnapshot: zeroSnapshot, evaluator: zeroEvaluator, evaluationTime: zeroRequirement.createdAt, idFactory: () => "a3000000-0000-4000-8000-000000000002" });
    const zeroReadiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: zeroTransaction }, requirements: [zeroRequirement], qualifications: [zeroQualification], dependencySnapshot: zeroSnapshot, evaluator: zeroEvaluator, evaluationTime: zeroRequirement.createdAt, idFactory: () => "a4000000-0000-4000-8000-000000000004" });
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'D0 zero project', $2)", [zeroProject, TENANT]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'D0 zero asset', $3)", [zeroAsset, zeroProject, TENANT]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{\"width\":100}'::jsonb, $3)", [zeroVersion, zeroAsset, TENANT]);
    await admin.query("update public.assets set current_version_id = $1 where id = $2", [zeroVersion, zeroAsset]);
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request, status) values ($1, $2, $3, $4, $5, 'd0 zero', 'PREPARED')", [zeroTransaction, TENANT, zeroProject, zeroAsset, zeroVersion]);
    await admin.query("insert into public.outcome_blueprints(id, version, hash, previous_version_hash, status, published_at, definition) values ($1, 1, $2, null, 'PUBLISHED', now(), $3::jsonb)", [zeroBlueprint, "a2".repeat(32), JSON.stringify({ id: zeroBlueprint, version: 1, previousVersionHash: null })]);
    await admin.query("insert into public.outcome_requirement_profiles(id, version, hash, previous_version_hash, blueprint_id, blueprint_version, blueprint_hash, policy_id, policy_hash, status, published_at, definition) values ($1, 1, $2, null, $3, 1, $4, null, null, 'PUBLISHED', now(), $5::jsonb)", [zeroProfile, "d2".repeat(32), zeroBlueprint, "a2".repeat(32), JSON.stringify({ schemaVersion: "outcome-requirement-profile-v0.1", id: zeroProfile, version: 1, previousVersionHash: null, blueprint: { id: zeroBlueprint, version: 1, hash: "a2".repeat(32) }, policy: null, requirements: [{ requirementId: zeroRequirement.requirementId, semanticType: zeroRequirement.semanticType, critical: zeroRequirement.critical, acceptedProvenance: zeroRequirement.acceptedProvenance, qualificationRule: zeroRequirement.qualificationRule, dependencySelectors: zeroRequirement.dependencySelectors }] })]);
    await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id, outcome_transaction_id, blueprint_id, blueprint_version, blueprint_hash, requirement_profile_id, requirement_profile_version, requirement_profile_hash, policy_id, policy_hash, schema_version, binding_hash, bound_at) values ($1, $2, $3, 1, $4, $5, 1, $6, null, null, 'outcome-transaction-requirement-binding-v0.1', $7, now())", [TENANT, zeroTransaction, zeroBlueprint, "a2".repeat(32), zeroProfile, "d2".repeat(32), "e2".repeat(32)]);
    const zeroPayload = {
      owner_tenant_id: TENANT,
      outcome_transaction_id: zeroTransaction,
      transaction: { ownerTenantId: TENANT, transactionId: zeroTransaction, projectId: zeroProject, assetId: zeroAsset, baseVersionId: zeroVersion, rawRequest: "d0 zero" },
      asset: { id: zeroAsset, ownerTenantId: TENANT, projectId: zeroProject, currentVersionId: zeroVersion },
      sourceVersion: { id: zeroVersion, ownerTenantId: TENANT, assetId: zeroAsset, versionNumber: 1, parentVersionId: null, state: { width: 100 } },
      binding: { bindingHash: "e2".repeat(32), blueprintId: zeroBlueprint, blueprintVersion: 1, blueprintHash: "a2".repeat(32), requirementProfileId: zeroProfile, requirementProfileVersion: 1, requirementProfileHash: "d2".repeat(32) },
      requirements: [zeroRequirement],
      dependency_snapshot: zeroSnapshot,
      qualifications: [{ ...zeroQualification, signalReferences: [] }],
      readiness: zeroReadiness,
    };
    const result = await service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb) as result", [ACTOR, JSON.stringify(zeroPayload)]);
    expect(result.rows[0].result.authority_commit_id).toBeTruthy();
    expect(zeroReadiness.state).toBe("INSUFFICIENT_SIGNAL");
    const status = await admin.query("select status from public.outcome_transactions where id = $1", [zeroTransaction]);
    expect(status.rows[0].status).toBe("PREPARED");
  });

  it("denies direct marker inserts for service, authenticated, and anon", async () => {
    await service.query("begin");
    try {
      await service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(value.payload)]);
      await expect(service.query("insert into public.build002_readiness_authority_commits default values")).rejects.toThrow(/permission denied|violates/);
    } finally {
      await service.query("rollback");
    }
    await expect(service.query("insert into public.build002_readiness_authority_commits(owner_tenant_id, outcome_transaction_id, principal_id, dependency_snapshot_id, dependency_snapshot_hash, readiness_id, readiness_content_hash, evaluation_time, schema_version) values ($1,$2,$3,$4,$5,$6,$7,now(),'build002-readiness-authority-commit-v0.1')", [TENANT, TRANSACTION, ACTOR, "a6000000-0000-4000-8000-000000000001", value.snapshot.dependencySnapshotHash, READINESS, value.readiness.readinessContentHash])).rejects.toThrow();
    for (const role of ["authenticated", "anon"]) {
      const client = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
      await client.connect();
      try {
        await client.query(`set role ${role}`);
        await expect(client.query("insert into public.build002_readiness_authority_commits default values")).rejects.toThrow(/permission denied|violates/);
      } finally { await client.end(); }
    }
  });

  it("keeps marker reads tenant-scoped for authenticated members", async () => {
    const client = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await client.connect();
    try {
      await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE')", ["b0000000-0000-4000-8000-000000000002"]);
      await admin.query("insert into public.tenant_memberships(id, tenant_id, principal_id, role, status) values ($1, $2, $3, 'MEMBER', 'ACTIVE')", ["b1000000-0000-4000-8000-000000000002", "b0000000-0000-4000-8000-000000000002", ACTOR]);
      await client.query("set role authenticated");
      await client.query("select set_config('request.jwt.claim.sub', $1, false)", [ACTOR]);
      const own = await client.query("select count(*)::int as count from public.build002_readiness_authority_commits");
      expect(own.rows[0].count).toBe(3);
      await admin.query("update public.tenant_memberships set status = 'REVOKED' where tenant_id = $1 and principal_id = $2", [TENANT, ACTOR]);
      const revoked = await client.query("select count(*)::int as count from public.build002_readiness_authority_commits");
      expect(revoked.rows[0].count).toBe(0);
      await admin.query("update public.tenant_memberships set status = 'ACTIVE' where tenant_id = $1 and principal_id = $2", [TENANT, ACTOR]);
      await admin.query("update public.tenants set status = 'SUSPENDED' where id = $1", [TENANT]);
      const inactive = await client.query("select count(*)::int as count from public.build002_readiness_authority_commits");
      expect(inactive.rows[0].count).toBe(0);
      await admin.query("update public.tenants set status = 'ACTIVE' where id = $1", [TENANT]);
      const anon = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
      await anon.connect();
      try {
        await anon.query("set role anon");
        await expect(anon.query("select * from public.build002_readiness_authority_commits")).rejects.toThrow(/permission denied/);
      } finally {
        await anon.end();
      }
    } finally {
      await admin.query("update public.tenants set status = 'ACTIVE' where id = $1", [TENANT]);
      await admin.query("update public.tenant_memberships set status = 'ACTIVE' where tenant_id = $1 and principal_id = $2", [TENANT, ACTOR]);
      await client.end();
    }
  });

  it("rejects a marker when its persisted readiness graph is incomplete", async () => {
    await admin.query("begin");
    try {
      const orphanReadiness = "a4000000-0000-4000-8000-000000000002";
      const snapshotRow = await admin.query("select id from public.build002_dependency_snapshots where owner_tenant_id = $1 and outcome_transaction_id = $2 and dependency_snapshot_hash = $3", [TENANT, TRANSACTION, value.snapshot.dependencySnapshotHash]);
      await admin.query("insert into public.build002_delegation_readiness(id, owner_tenant_id, outcome_transaction_id, requirement_set_hash, qualification_set_hash, dependency_snapshot_id, dependency_snapshot_hash, task_spec_hash, source_asset_version_hash, blueprint_hash, policy_hash, evaluator, state, blocking_codes, condition_codes, created_at, valid_until, schema_version, readiness_content_hash) values ($1,$2,$3,$4,$5,$6,$7,null,$8,$9,null,$10,$11,$12,$13,$14,$15,$16,$17)", [orphanReadiness, TENANT, TRANSACTION, value.readiness.requirementSetHash, value.readiness.qualificationSetHash, snapshotRow.rows[0].id, value.snapshot.dependencySnapshotHash, ASSET_HASH, BLUEPRINT_HASH, JSON.stringify(value.readiness.evaluator), value.readiness.state, JSON.stringify(value.readiness.blockingCodes), JSON.stringify(value.readiness.conditionCodes), value.readiness.createdAt, value.readiness.validUntil, value.readiness.schemaVersion, "1".repeat(64)]);
      const capability = await admin.query("select token from public.build002_readiness_authority_capability limit 1");
      await admin.query("select set_config('build002.authority_commit', $1, true)", [capability.rows[0].token]);
      await expect(admin.query("insert into public.build002_readiness_authority_commits(id, owner_tenant_id, outcome_transaction_id, principal_id, dependency_snapshot_id, dependency_snapshot_hash, readiness_id, readiness_content_hash, evaluation_time, schema_version) values ($1,$2,$3,$4,$5,$6,$7,$8,now(),'build002-readiness-authority-commit-v0.1')", ["a7000000-0000-4000-8000-000000000001", TENANT, TRANSACTION, ACTOR, snapshotRow.rows[0].id, value.snapshot.dependencySnapshotHash, orphanReadiness, "1".repeat(64)])).rejects.toThrow(/READINESS_AUTHORITY_GRAPH_INVALID/);
    } finally {
      await admin.query("rollback");
    }
  });

  it("rejects stale signal graphs, revoked membership, suspended tenant, stale head, expiry, and legacy evaluator", async () => {
    const historicalRequirement = compileSignalRequirement({
      requirementId: "signal.d0.historical",
      subjectKind: value.requirement.subjectKind,
      semanticType: value.requirement.semanticType,
      critical: value.requirement.critical,
      acceptedProvenance: value.requirement.acceptedProvenance,
      qualificationRule: value.requirement.qualificationRule,
      dependencySelectors: value.requirement.dependencySelectors,
      blueprintId: value.requirement.blueprintId,
      blueprintVersion: value.requirement.blueprintVersion,
      blueprintHash: value.requirement.blueprintHash,
      policyId: value.requirement.policyId,
      policyHash: value.requirement.policyHash,
      definitionSchemaVersion: value.requirement.definitionSchemaVersion,
    }, value.requirement.createdAt);
    const { contentHash: _historicalHash, ...historicalInput } = value.signal;
    void _historicalHash;
    const historicalSignal = createSignal({
      ...historicalInput,
      signalId: "a2000000-0000-4000-8000-000000000004",
      requirementId: historicalRequirement.requirementId,
      payload: { value: "historical" },
    });
    await service.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({ id: "a5000000-0000-4000-8000-000000000002", owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: historicalRequirement.requirementId, semantic_type: historicalRequirement.semanticType, critical: historicalRequirement.critical, accepted_provenance: historicalRequirement.acceptedProvenance, qualification_rule: historicalRequirement.qualificationRule, dependency_selectors: historicalRequirement.dependencySelectors, blueprint_id: BLUEPRINT, blueprint_version: 1, blueprint_hash: BLUEPRINT_HASH, policy_id: null, policy_hash: null, schema_version: historicalRequirement.definitionSchemaVersion, requirement_definition_hash: historicalRequirement.requirementDefinitionHash, created_at: historicalRequirement.createdAt })]);
    await service.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: historicalSignal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: historicalSignal.requirementId, requirement_definition_hash: historicalRequirement.requirementDefinitionHash, payload: historicalSignal.payload, source: historicalSignal.source, provenance: historicalSignal.provenance, captured_at: historicalSignal.capturedAt, valid_until: historicalSignal.validUntil, dependency_identity: historicalSignal.dependency.identity, dependency_hash: historicalSignal.dependency.hash, schema_version: historicalSignal.schemaVersion, content_hash: historicalSignal.contentHash })]);
    await expect(service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(value.payload)])).resolves.toBeDefined();
    const { contentHash: _extraHash, ...extraInput } = value.signal;
    void _extraHash;
    const extra = createSignal({ ...extraInput, signalId: "a2000000-0000-4000-8000-000000000002", payload: { value: "extra" } });
    await service.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: extra.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: extra.requirementId, requirement_definition_hash: value.requirement.requirementDefinitionHash, payload: extra.payload, source: extra.source, provenance: extra.provenance, captured_at: extra.capturedAt, valid_until: extra.validUntil, dependency_identity: extra.dependency.identity, dependency_hash: extra.dependency.hash, schema_version: extra.schemaVersion, content_hash: extra.contentHash })]);
    await expect(service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(value.payload)])).rejects.toThrow(/SIGNAL_UNIVERSE_CHANGED|COMMIT_FAILED/);
    await admin.query("update public.tenant_memberships set status = 'REVOKED' where tenant_id = $1 and principal_id = $2", [TENANT, ACTOR]);
    await expect(service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(value.payload)])).rejects.toThrow();
    await admin.query("update public.tenant_memberships set status = 'ACTIVE' where tenant_id = $1 and principal_id = $2", [TENANT, ACTOR]);
    await admin.query("update public.tenants set status = 'SUSPENDED' where id = $1", [TENANT]);
    await expect(service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(value.payload)])).rejects.toThrow();
    await admin.query("update public.tenants set status = 'ACTIVE' where id = $1", [TENANT]);
    await admin.query("update public.assets set current_version_id = null where id = $1", [ASSET]);
    await expect(service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(value.payload)])).rejects.toThrow();
    await admin.query("update public.assets set current_version_id = $1 where id = $2", [VERSION, ASSET]);
    const expired = structuredClone(value.payload) as Record<string, unknown>;
    (expired.readiness as Record<string, unknown>).validUntil = new Date(Date.now() - 60_000).toISOString();
    await expect(service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(expired)])).rejects.toThrow();
    const legacy = structuredClone(value.payload) as Record<string, unknown>;
    const legacyReadiness = legacy.readiness as Record<string, unknown>;
    const legacyEvaluator = legacyReadiness.evaluator as Record<string, unknown>;
    legacyReadiness.evaluator = { ...legacyEvaluator, version: "0.1.0", definitionHash: "1".repeat(64) };
    await expect(service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(legacy)])).rejects.toThrow();
  });

  it("serializes the existing Signal insert RPC behind the transaction row lock", async () => {
    const locker = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    const inserter = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await locker.connect(); await inserter.connect();
    try {
      await locker.query("begin");
      await locker.query("select id from public.outcome_transactions where id = $1 for update", [TRANSACTION]);
      await inserter.query("set role service_role; set statement_timeout = '300ms'");
      const { contentHash: _blockedHash, ...blockedInput } = value.signal;
      void _blockedHash;
      const signal = createSignal({ ...blockedInput, signalId: "a2000000-0000-4000-8000-000000000003", payload: { value: "blocked" } });
      await expect(inserter.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: signal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: signal.requirementId, requirement_definition_hash: value.requirement.requirementDefinitionHash, payload: signal.payload, source: signal.source, provenance: signal.provenance, captured_at: signal.capturedAt, valid_until: signal.validUntil, dependency_identity: signal.dependency.identity, dependency_hash: signal.dependency.hash, schema_version: signal.schemaVersion, content_hash: signal.contentHash })])).rejects.toThrow();
    } finally {
      await locker.query("rollback");
      await locker.end(); await inserter.end();
    }
  });

  it("serializes membership and asset-head authority boundaries", async () => {
    const membershipLocker = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    const membershipAttempt = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    const assetLocker = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    const assetAttempt = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await membershipLocker.connect(); await membershipAttempt.connect(); await assetLocker.connect(); await assetAttempt.connect();
    try {
      await membershipLocker.query("begin");
      await membershipLocker.query("select tenant_id from public.tenant_memberships where tenant_id = $1 and principal_id = $2 for update", [TENANT, ACTOR]);
      await membershipAttempt.query("set role service_role; set statement_timeout = '300ms'");
      await expect(membershipAttempt.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(value.payload)])).rejects.toThrow();
      await membershipLocker.query("rollback");

      await assetLocker.query("begin");
      await assetLocker.query("select id from public.assets where id = $1 for update", [ASSET]);
      await assetAttempt.query("set role service_role; set statement_timeout = '300ms'");
      await expect(assetAttempt.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(value.payload)])).rejects.toThrow();
      await assetLocker.query("rollback");
    } finally {
      await membershipLocker.end(); await membershipAttempt.end(); await assetLocker.end(); await assetAttempt.end();
    }
  });

  it("rolls back newly prepared graph rows on a qualification-stage failure", async () => {
    const before = await admin.query("select (select count(*) from public.build002_dependency_snapshots) as dependencies, (select count(*) from public.build002_signal_qualifications) as qualifications, (select count(*) from public.build002_delegation_readiness) as readiness");
    const invalid = structuredClone(value.payload) as Record<string, unknown>;
    invalid.dependency_snapshot = { ...(invalid.dependency_snapshot as Record<string, unknown>), dependencySnapshotHash: "9".repeat(64) };
    await expect(service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb)", [ACTOR, JSON.stringify(invalid)])).rejects.toThrow();
    const after = await admin.query("select (select count(*) from public.build002_dependency_snapshots) as dependencies, (select count(*) from public.build002_signal_qualifications) as qualifications, (select count(*) from public.build002_delegation_readiness) as readiness");
    expect(after.rows).toEqual(before.rows);
  });
});
