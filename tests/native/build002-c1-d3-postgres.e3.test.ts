// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDelegabilityAdmission } from "@/src/domain/outcome/delegability-admission";
import { compileSignalRequirement, createDependencySnapshot, createSignal, currentDefaultEvaluator, evaluateDelegationReadiness, evaluateSignalQualification } from "@/src/domain/outcome/signal-readiness";

const enabled = process.env.BUILD002_NATIVE_PG_C1_D3 === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_D3_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const ACTOR = "a6000000-0000-4000-8000-000000000001";
const TENANT = "b6000000-0000-4000-8000-000000000001";
const MEMBERSHIP = "b6000000-0000-4000-8000-000000000002";
const PROJECT = "c6000000-0000-4000-8000-000000000001";
const ASSET = "d6000000-0000-4000-8000-000000000001";
const VERSION = "e6000000-0000-4000-8000-000000000001";
const TRANSACTION = "f6000000-0000-4000-8000-000000000001";
const BLUEPRINT = "a7000000-0000-4000-8000-000000000001";
const PROFILE = "a7000000-0000-4000-8000-000000000002";
const SIGNAL = "a8000000-0000-4000-8000-000000000001";
const SIGNAL2 = "a8000000-0000-4000-8000-000000000002";
const REQUIREMENT2 = "ab000000-0000-4000-8000-000000000002";
const REQUIREMENT3 = "ab000000-0000-4000-8000-000000000003";
const QUALIFICATION = "a9000000-0000-4000-8000-000000000001";
const READINESS = "aa000000-0000-4000-8000-000000000001";
const VERSION2 = "e6000000-0000-4000-8000-000000000002";
const BLUEPRINT_HASH = "a".repeat(64);
const ASSET_HASH = "b".repeat(64);
const TRANSACTION_HASH = "c".repeat(64);
const PROFILE_HASH = "d".repeat(64);
const BINDING_HASH = "e".repeat(64);

function connection(url: string, database: string): string { const parsed = new URL(url); parsed.pathname = `/${database}`; return parsed.toString(); }

function graph() {
  const evaluatedAt = new Date(Date.now() - 30_000).toISOString();
  const signal = createSignal({ signalId: SIGNAL, ownerTenantId: TENANT, transactionId: TRANSACTION, requirementId: "signal.d3", payload: { value: "d3" }, source: { identity: "native-d3", version: "1", hash: "f".repeat(64) }, provenance: "OBSERVED", capturedAt: new Date(Date.now() - 60_000).toISOString(), validUntil: new Date(Date.now() + 3_600_000).toISOString(), dependency: { identity: "asset.version", hash: ASSET_HASH }, schemaVersion: "build002-signal-v0.2" });
  const requirement = compileSignalRequirement({ requirementId: "signal.d3", subjectKind: "OUTCOME_TRANSACTION", semanticType: "TEXT", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }, { identity: "transaction.semantic", required: true }], blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, evaluatedAt);
  const snapshot = createDependencySnapshot({ schemaVersion: "build002-dependency-snapshot-v0.2", ownerTenantId: TENANT, transactionId: TRANSACTION, requirementDefinitionHashes: [requirement.requirementDefinitionHash], signalReferences: [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }], dependencyBindings: [{ identity: "asset.version", hash: ASSET_HASH }, { identity: "blueprint", hash: BLUEPRINT_HASH }, { identity: "transaction.semantic", hash: TRANSACTION_HASH }], blueprintHash: BLUEPRINT_HASH, policyHash: null, taskSpecHash: null, transactionSemanticHash: TRANSACTION_HASH, sourceAssetVersionHash: ASSET_HASH, contextLensHash: null });
  const evaluator = currentDefaultEvaluator();
  const qualification = evaluateSignalQualification({ requirement, signals: [signal], currentDependencySnapshot: snapshot, evaluator, evaluationTime: evaluatedAt, idFactory: () => QUALIFICATION });
  const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TRANSACTION }, requirements: [requirement], qualifications: [qualification], dependencySnapshot: snapshot, evaluator, evaluationTime: evaluatedAt, idFactory: () => READINESS });
  const payload: Record<string, unknown> = { owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, transaction: { ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "d3 native" }, asset: { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, currentVersionId: VERSION }, sourceVersion: { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, parentVersionId: null, state: { width: 100 } }, binding: { bindingHash: BINDING_HASH, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, requirementProfileId: PROFILE, requirementProfileVersion: 1, requirementProfileHash: PROFILE_HASH }, requirements: [requirement], dependency_snapshot: snapshot, qualifications: [{ ...qualification, signalReferences: qualification.signalIds.map((id, index) => ({ signalId: id, contentHash: qualification.signalContentHashes[index] })) }], readiness };
  return { requirement, signal, snapshot, readiness, evaluator, payload };
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-D3-R3 native PostgreSQL 17 evidence closure", () => {
  let admin: Client; let serviceA: Client; let serviceB: Client; let anon: Client; let authenticated: Client; let isolatedDatabase = ""; let value: ReturnType<typeof graph>; let authorityCommitId = "";
  beforeAll(async () => {
    isolatedDatabase = `virro_d3_r1_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") }); await root.connect(); await root.query(`drop database if exists "${isolatedDatabase}" with (force)`); await root.query(`create database "${isolatedDatabase}"`); await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) }); serviceA = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) }); serviceB = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) }); anon = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) }); authenticated = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) }); await admin.connect(); await serviceA.connect(); await serviceB.connect(); await anon.connect(); await authenticated.connect();
    await admin.query("set application_name='d3-r3-admin'"); await serviceA.query("set application_name='d3-r3-authority'; set statement_timeout='15s'; set lock_timeout='12s'"); await serviceB.query("set application_name='d3-r3-mutator'; set statement_timeout='15s'; set lock_timeout='12s'");
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users (id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);");
    await anon.query("set role anon; set application_name='d3-r3-anon'"); await authenticated.query("set role authenticated; set application_name='d3-r3-authenticated'");
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort(); expect(migrations).toHaveLength(34); for (const name of migrations) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    value = graph();
    await admin.query("insert into auth.users(id) values ($1) on conflict do nothing", [ACTOR]); await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE')", [TENANT]); await admin.query("insert into public.tenant_memberships(id, tenant_id, principal_id, role, status) values ($1, $2, $3, 'OWNER', 'ACTIVE')", [MEMBERSHIP, TENANT, ACTOR]); await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'D3 project', $2)", [PROJECT, TENANT]); await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'D3 asset', $3)", [ASSET, PROJECT, TENANT]); await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{\"width\":100}'::jsonb, $3)", [VERSION, ASSET, TENANT]); await admin.query("update public.assets set current_version_id = $1 where id = $2", [VERSION, ASSET]); await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request, status) values ($1, $2, $3, $4, $5, 'd3 native', 'PREPARED')", [TRANSACTION, TENANT, PROJECT, ASSET, VERSION]);
    await admin.query("insert into public.outcome_blueprints(id, version, hash, previous_version_hash, status, published_at, definition) values ($1, 1, $2, null, 'PUBLISHED', now(), $3::jsonb)", [BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ id: BLUEPRINT, version: 1, previousVersionHash: null })]); await admin.query("insert into public.outcome_requirement_profiles(id, version, hash, previous_version_hash, blueprint_id, blueprint_version, blueprint_hash, policy_id, policy_hash, status, published_at, definition) values ($1, 1, $2, null, $3, 1, $4, null, null, 'PUBLISHED', now(), $5::jsonb)", [PROFILE, PROFILE_HASH, BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ schemaVersion: "outcome-requirement-profile-v0.1", id: PROFILE, version: 1, previousVersionHash: null, blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH }, policy: null, requirements: [{ requirementId: value.requirement.requirementId, semanticType: value.requirement.semanticType, critical: value.requirement.critical, acceptedProvenance: value.requirement.acceptedProvenance, qualificationRule: value.requirement.qualificationRule, dependencySelectors: value.requirement.dependencySelectors }] })]); await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id, outcome_transaction_id, blueprint_id, blueprint_version, blueprint_hash, requirement_profile_id, requirement_profile_version, requirement_profile_hash, policy_id, policy_hash, schema_version, binding_hash, bound_at) values ($1, $2, $3, 1, $4, $5, 1, $6, null, null, 'outcome-transaction-requirement-binding-v0.1', $7, now())", [TENANT, TRANSACTION, BLUEPRINT, BLUEPRINT_HASH, PROFILE, PROFILE_HASH, BINDING_HASH]);
    await serviceA.query("set role service_role"); await serviceB.query("set role service_role"); await serviceA.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({ id: "ab000000-0000-4000-8000-000000000001", owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: value.requirement.requirementId, semantic_type: value.requirement.semanticType, critical: value.requirement.critical, accepted_provenance: value.requirement.acceptedProvenance, qualification_rule: value.requirement.qualificationRule, dependency_selectors: value.requirement.dependencySelectors, blueprint_id: BLUEPRINT, blueprint_version: 1, blueprint_hash: BLUEPRINT_HASH, schema_version: value.requirement.definitionSchemaVersion, requirement_definition_hash: value.requirement.requirementDefinitionHash, created_at: value.requirement.createdAt })]); await serviceA.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: value.signal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: value.signal.requirementId, requirement_definition_hash: value.requirement.requirementDefinitionHash, payload: value.signal.payload, source: value.signal.source, provenance: value.signal.provenance, captured_at: value.signal.capturedAt, valid_until: value.signal.validUntil, dependency_identity: value.signal.dependency.identity, dependency_hash: value.signal.dependency.hash, schema_version: value.signal.schemaVersion, content_hash: value.signal.contentHash })]);
    const marker = await serviceA.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb) as result", [ACTOR, JSON.stringify(value.payload)]); authorityCommitId = marker.rows[0].result.authority_commit_id;
  }, 120_000);
  afterAll(async () => { await admin?.end(); await serviceA?.end(); await serviceB?.end(); await anon?.end(); await authenticated?.end(); if (databaseUrl && isolatedDatabase) { const root = new Client({ connectionString: connection(databaseUrl, "postgres") }); await root.connect(); await root.query(`drop database if exists "${isolatedDatabase}" with (force)`); await root.end(); } });
  function material() { return { transaction: { ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "d3 native" }, asset: { id: ASSET, projectId: PROJECT, ownerTenantId: TENANT, currentVersionId: VERSION }, sourceVersion: { id: VERSION, assetId: ASSET, ownerTenantId: TENANT, versionNumber: 1, parentVersionId: null, state: { width: 100 } }, binding: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH }, requirementProfile: { id: PROFILE, version: 1, hash: PROFILE_HASH }, policy: { id: null, hash: null }, bindingHash: BINDING_HASH }, dependencySnapshot: value.snapshot, evaluator: value.evaluator }; }
  function request(revalidatedAt = new Date(Date.now() - 1_000).toISOString()) { return createDelegabilityAdmission({ ownerTenantId: TENANT, principalId: ACTOR, membershipId: MEMBERSHIP, authorityCommitId, outcomeTransactionId: TRANSACTION, readinessId: value.readiness.id, readinessContentHash: value.readiness.readinessContentHash, historicalDependencySnapshotHash: value.snapshot.dependencySnapshotHash, currentDependencySnapshotHash: value.snapshot.dependencySnapshotHash, evaluator: value.evaluator, revalidatedAt }, new Date().toISOString()); }
  async function admit(client: Client, admission = request()) { const result = await client.query("select public.build002_admit_delegability($1::uuid, $2::uuid, $3::uuid, $4::jsonb, $5::jsonb) as result", [ACTOR, MEMBERSHIP, authorityCommitId, JSON.stringify(admission), JSON.stringify(material())]); return result.rows[0].result as { admission_id: string }; }
  async function admitInTransaction(client: Client, admission = request()) { await client.query("begin"); try { const result = await client.query("select public.build002_admit_delegability($1::uuid, $2::uuid, $3::uuid, $4::jsonb, $5::jsonb) as result", [ACTOR, MEMBERSHIP, authorityCommitId, JSON.stringify(admission), JSON.stringify(material())]); return result.rows[0].result as { admission_id: string }; } catch (error) { await client.query("rollback"); throw error; } }
  async function pid(client: Client): Promise<number> { return Number((await client.query("select pg_backend_pid() as pid")).rows[0].pid); }
  async function waitUntilBlocked(blockedClient: Client, blockerClient: Client, timeoutMs = 10_000): Promise<void> { const blockedPid = await pid(blockedClient); const blockerPid = await pid(blockerClient); const deadline = Date.now() + timeoutMs; await new Promise((resolve) => setTimeout(resolve, 50)); while (Date.now() < deadline) { const row = await admin.query("select $1 = any(pg_blocking_pids($2)) as blocked", [blockerPid, blockedPid]); if (row.rows[0].blocked) return; await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error(`D3_CONCURRENCY_TIMEOUT blocked=${blockedPid} blocker=${blockerPid}`); }
  async function rollbackQuiet(client: Client): Promise<void> { try { await client.query("rollback"); } catch { /* no transaction */ } }
  async function cleanupExtras(): Promise<void> { await admin.query("set session_replication_role='replica'"); await admin.query("delete from public.build002_signals where signal_id=$1", [SIGNAL2]); await admin.query("delete from public.build002_signal_requirements where id in ($1,$2)", [REQUIREMENT2, REQUIREMENT3]); await admin.query("update public.assets set current_version_id=$1 where id=$2", [VERSION, ASSET]); await admin.query("delete from public.asset_versions where id=$1", [VERSION2]); await admin.query("update public.tenant_memberships set status='ACTIVE' where id=$1", [MEMBERSHIP]); await admin.query("update public.outcome_transactions set raw_request='d3 native' where id=$1", [TRANSACTION]); await admin.query("set session_replication_role='origin'"); }
  function secondRequirement() { return compileSignalRequirement({ requirementId: "signal.d3.extra", subjectKind: "OUTCOME_TRANSACTION", semanticType: "TEXT", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [{ identity: "asset.version", required: true }], blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, new Date(Date.now() - 60_000).toISOString()); }
  async function insertRequirement(client: Client, requirement = secondRequirement(), id = REQUIREMENT2): Promise<void> { await client.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({ id, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: requirement.requirementId, semantic_type: requirement.semanticType, critical: requirement.critical, accepted_provenance: requirement.acceptedProvenance, qualification_rule: requirement.qualificationRule, dependency_selectors: requirement.dependencySelectors, blueprint_id: BLUEPRINT, blueprint_version: 1, blueprint_hash: BLUEPRINT_HASH, schema_version: requirement.definitionSchemaVersion, requirement_definition_hash: requirement.requirementDefinitionHash, created_at: requirement.createdAt })]); }
  async function insertSignal(client: Client): Promise<void> { const signal = createSignal({ signalId: SIGNAL2, ownerTenantId: TENANT, transactionId: TRANSACTION, requirementId: "signal.d3", payload: { value: "d3-extra" }, source: { identity: "native-d3", version: "1", hash: "f".repeat(64) }, provenance: "OBSERVED", capturedAt: new Date(Date.now() - 60_000).toISOString(), validUntil: new Date(Date.now() + 3_600_000).toISOString(), dependency: { identity: "asset.version", hash: ASSET_HASH }, schemaVersion: "build002-signal-v0.2" }); await client.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: signal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: signal.requirementId, requirement_definition_hash: value.requirement.requirementDefinitionHash, payload: signal.payload, source: signal.source, provenance: signal.provenance, captured_at: signal.capturedAt, valid_until: signal.validUntil, dependency_identity: signal.dependency.identity, dependency_hash: signal.dependency.hash, schema_version: signal.schemaVersion, content_hash: signal.contentHash })]); }
  beforeEach(async () => { await rollbackQuiet(serviceA); await rollbackQuiet(serviceB); await cleanupExtras(); });
  afterEach(async () => { await rollbackQuiet(serviceA); await rollbackQuiet(serviceB); await cleanupExtras(); });
  it("admits one READY/CURRENT fact and concurrent identical callers receive the same id", async () => { const [first, second] = await Promise.all([admit(serviceA), admit(serviceB)]); expect(first.admission_id).toBe(second.admission_id); expect((await admin.query("select count(*)::int as count from public.build002_delegability_admissions")).rows[0].count).toBe(1); });
  it("returns the same fact for sequential retries with different historical timestamps and ids", async () => { const first = await admit(serviceA, request(new Date(Date.now() - 2_000).toISOString())); const second = await admit(serviceA, request(new Date(Date.now() - 1_000).toISOString())); expect(first.admission_id).toBe(second.admission_id); expect((await admin.query("select count(*)::int as count from public.build002_delegability_admissions")).rows[0].count).toBe(1); });
  it("rejects stale server-owned transaction material and leaves no additional row", async () => { const stale = material(); stale.transaction.rawRequest = "tampered"; await expect(serviceA.query("select public.build002_admit_delegability($1::uuid, $2::uuid, $3::uuid, $4::jsonb, $5::jsonb)", [ACTOR, MEMBERSHIP, authorityCommitId, JSON.stringify(request()), JSON.stringify(stale)])).rejects.toThrow(/CURRENTNESS_NOT_CURRENT|SERIALIZED_RECHECK_FAILED/); expect((await admin.query("select count(*)::int as count from public.build002_delegability_admissions")).rows[0].count).toBe(1); });
  it("rejects direct service-role mutation of the immutable result", async () => { await expect(serviceA.query("delete from public.build002_delegability_admissions")).rejects.toThrow(); await expect(serviceA.query("update public.build002_delegability_admissions set scope='DELEGABILITY_ONLY'")).rejects.toThrow(); await expect(serviceA.query("insert into public.build002_delegability_admissions select * from public.build002_delegability_admissions limit 1")).rejects.toThrow(); });
  it("rejects C0 binding update and delete attacks", async () => { await expect(serviceA.query("update public.outcome_transaction_requirement_bindings set binding_hash=$1 where owner_tenant_id=$2 and outcome_transaction_id=$3", ["f".repeat(64), TENANT, TRANSACTION])).rejects.toThrow(); await expect(serviceA.query("delete from public.outcome_transaction_requirement_bindings where owner_tenant_id=$1 and outcome_transaction_id=$2", [TENANT, TRANSACTION])).rejects.toThrow(); });
  it("enforces table and RPC ACLs while allowing the service-role RPC", async () => {
    for (const client of [anon, authenticated, serviceA]) {
      await expect(client.query("insert into public.build002_delegability_admissions select * from public.build002_delegability_admissions limit 1")).rejects.toThrow();
      await expect(client.query("update public.build002_delegability_admissions set scope='DELEGABILITY_ONLY'")).rejects.toThrow();
      await expect(client.query("delete from public.build002_delegability_admissions")).rejects.toThrow();
    }
    await expect(anon.query("select public.build002_admit_delegability($1::uuid,$2::uuid,$3::uuid,$4::jsonb,$5::jsonb)", [ACTOR, MEMBERSHIP, authorityCommitId, JSON.stringify(request()), JSON.stringify(material())])).rejects.toThrow();
    await expect(authenticated.query("select public.build002_admit_delegability($1::uuid,$2::uuid,$3::uuid,$4::jsonb,$5::jsonb)", [ACTOR, MEMBERSHIP, authorityCommitId, JSON.stringify(request()), JSON.stringify(material())])).rejects.toThrow();
    await expect(anon.query("select public.build002_admit_delegability_legacy($1::uuid,$2::uuid,$3::uuid,$4::jsonb)", [ACTOR, MEMBERSHIP, authorityCommitId, JSON.stringify(request())])).rejects.toThrow();
    await expect(authenticated.query("select public.build002_admit_delegability_legacy($1::uuid,$2::uuid,$3::uuid,$4::jsonb)", [ACTOR, MEMBERSHIP, authorityCommitId, JSON.stringify(request())])).rejects.toThrow();
    await expect(serviceA.query("select public.build002_admit_delegability_legacy($1::uuid,$2::uuid,$3::uuid,$4::jsonb)", [ACTOR, MEMBERSHIP, authorityCommitId, JSON.stringify(request())])).rejects.toThrow();
    await expect(admit(serviceA)).resolves.toMatchObject({ admission_id: expect.any(String) });
  });
  it("rejects forged current material, non-ready states, expired readiness, evaluator drift, and scope mismatches", async () => {
    const call = (admission: Record<string, unknown>, currentMaterial: Record<string, unknown> = material()) => serviceA.query("select public.build002_admit_delegability($1::uuid,$2::uuid,$3::uuid,$4::jsonb,$5::jsonb)", [ACTOR, MEMBERSHIP, authorityCommitId, JSON.stringify(admission), JSON.stringify(currentMaterial)]);
    const replayMutations: Array<[string, (forged: Record<string, unknown>) => void]> = [
      ["schemaVersion", (forged) => { forged.schemaVersion = "forged"; }],
      ["ownerTenantId", (forged) => { forged.ownerTenantId = "10000000-0000-4000-8000-000000000099"; }],
      ["principalId", (forged) => { forged.principalId = "20000000-0000-4000-8000-000000000099"; }],
      ["membershipId", (forged) => { forged.membershipId = "30000000-0000-4000-8000-000000000099"; }],
      ["authorityCommitId", (forged) => { forged.authorityCommitId = "40000000-0000-4000-8000-000000000099"; }],
      ["outcomeTransactionId", (forged) => { forged.outcomeTransactionId = "f0000000-0000-4000-8000-000000000099"; }],
      ["readinessId", (forged) => { forged.readinessId = "aa000000-0000-4000-8000-000000000099"; }],
      ["readinessContentHash", (forged) => { forged.readinessContentHash = "0".repeat(64); }],
      ["historicalDependencySnapshotHash", (forged) => { forged.historicalDependencySnapshotHash = "0".repeat(64); }],
      ["currentDependencySnapshotHash", (forged) => { forged.currentDependencySnapshotHash = "0".repeat(64); }],
      ["evaluatorSchemaVersion", (forged) => { forged.evaluatorSchemaVersion = "forged"; }],
      ["evaluatorVersion", (forged) => { forged.evaluatorVersion = "9.9.9"; }],
      ["evaluatorDefinitionHash", (forged) => { forged.evaluatorDefinitionHash = "0".repeat(64); }],
      ["currentness", (forged) => { forged.currentness = "STALE"; }],
      ["scope", (forged) => { forged.scope = "EXECUTION"; }],
      ["executionAuthorityGranted", (forged) => { forged.executionAuthorityGranted = true; }],
      ["executionStarted", (forged) => { forged.executionStarted = true; }],
      ["consequenceBoundary", (forged) => { forged.consequenceBoundary = "forged"; }],
      ["revalidatedAt-before-evaluation", (forged) => { forged.revalidatedAt = new Date(Date.now() - 60_000).toISOString(); }],
      ["revalidatedAt-in-future", (forged) => { forged.revalidatedAt = new Date(Date.now() + 60_000).toISOString(); }],
      ...["READY_WITH_CONDITIONS", "NEEDS_CONTEXT", "INSUFFICIENT_SIGNAL", "HUMAN_REVIEW_REQUIRED", "BLOCKED_BY_POLICY"].map((state) => [state, (forged: Record<string, unknown>) => { forged.readinessState = state; }] as [string, (forged: Record<string, unknown>) => void]),
    ];
    for (const [field, mutate] of replayMutations) {
      const forged = structuredClone(request()) as unknown as Record<string, unknown>;
      mutate(forged);
      await expect(call(forged), field).rejects.toThrow();
      expect((await admin.query("select count(*)::int as count from public.build002_delegability_admissions")).rows[0].count).toBe(1);
    }
    const readiness = await admin.query("select valid_until from public.build002_delegation_readiness where id=$1", [value.readiness.id]);
    await admin.query("set session_replication_role='replica'");
    await admin.query("update public.build002_delegation_readiness set valid_until=$1 where id=$2", [new Date(Date.now() - 60_000).toISOString(), value.readiness.id]);
    await admin.query("set session_replication_role='origin'");
    try {
      await expect(call(request())).rejects.toThrow();
    } finally {
      await admin.query("set session_replication_role='replica'");
      await admin.query("update public.build002_delegation_readiness set valid_until=$1 where id=$2", [readiness.rows[0].valid_until, value.readiness.id]);
      await admin.query("set session_replication_role='origin'");
    }
    const evaluatorDrift = structuredClone(material()) as ReturnType<typeof material>;
    evaluatorDrift.evaluator = { ...evaluatorDrift.evaluator, definitionHash: "0".repeat(64) };
    await expect(call(request(), evaluatorDrift as unknown as Record<string, unknown>)).rejects.toThrow();
    const forgedMaterial = structuredClone(material()) as ReturnType<typeof material>;
    const mutations: Array<(current: ReturnType<typeof material>) => void> = [
      (current) => { current.transaction.rawRequest = "forged"; },
      (current) => { current.asset.currentVersionId = VERSION2; },
      (current) => { current.sourceVersion.state = { width: 999 }; },
      (current) => { current.binding.bindingHash = "0".repeat(64); },
      (current) => { current.binding.blueprint.hash = "0".repeat(64); },
      (current) => { current.binding.requirementProfile.hash = "0".repeat(64); },
      (current) => { current.dependencySnapshot.dependencySnapshotHash = "0".repeat(64); },
      (current) => { current.evaluator.definitionHash = "0".repeat(64); },
    ];
    for (const mutate of mutations) {
      const current = structuredClone(forgedMaterial) as ReturnType<typeof material>;
      mutate(current);
      await expect(call(request(), current as unknown as Record<string, unknown>)).rejects.toThrow();
    }
    const wrongTenant = structuredClone(request()) as unknown as Record<string, unknown>;
    wrongTenant.ownerTenantId = "10000000-0000-4000-8000-000000000099";
    await expect(call(wrongTenant)).rejects.toThrow();
    const wrongMembership = structuredClone(request()) as unknown as Record<string, unknown>;
    wrongMembership.membershipId = "30000000-0000-4000-8000-000000000099";
    await expect(call(wrongMembership)).rejects.toThrow();
    const wrongAuthority = structuredClone(request()) as unknown as Record<string, unknown>;
    wrongAuthority.authorityCommitId = "40000000-0000-4000-8000-000000000099";
    await expect(call(wrongAuthority)).rejects.toThrow();
  });
  it("serializes Signal insertion in both orders", async () => {
    await cleanupExtras();
    await serviceB.query("begin"); await insertRequirement(serviceB); await insertSignal(serviceB);
    const blockedAdmission = admit(serviceA); await waitUntilBlocked(serviceA, serviceB); await serviceB.query("commit"); await expect(blockedAdmission).rejects.toThrow(/CURRENTNESS_NOT_CURRENT|SERIALIZED_RECHECK_FAILED/); await cleanupExtras();
    const admission = await admitInTransaction(serviceA); await serviceB.query("begin"); const blockedWriter = insertRequirement(serviceB).then(() => insertSignal(serviceB)); await waitUntilBlocked(serviceB, serviceA); await serviceA.query("commit"); await blockedWriter; await serviceB.query("commit"); await cleanupExtras();
    expect(admission.admission_id).toEqual(expect.any(String));
  });
  it("serializes requirement insertion in both orders", async () => {
    await serviceB.query("begin"); await insertRequirement(serviceB, secondRequirement(), REQUIREMENT3); const blockedAdmission = admit(serviceA); await waitUntilBlocked(serviceA, serviceB); await serviceB.query("commit"); await expect(blockedAdmission).rejects.toThrow(/CURRENTNESS_NOT_CURRENT|SERIALIZED_RECHECK_FAILED/);
    const admission = await admitInTransaction(serviceA); await serviceB.query("begin"); const blockedWriter = insertRequirement(serviceB, secondRequirement(), REQUIREMENT3); await waitUntilBlocked(serviceB, serviceA); await serviceA.query("commit"); await blockedWriter; await serviceB.query("commit");
    expect(admission.admission_id).toEqual(expect.any(String));
  });
  it("serializes source-head changes in both orders", async () => {
    await cleanupExtras(); await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1,$2,2,'{\"width\":101}'::jsonb,$3) on conflict do nothing", [VERSION2, ASSET, TENANT]);
    await serviceB.query("begin"); await serviceB.query("update public.assets set current_version_id=$1 where id=$2", [VERSION2, ASSET]); const blockedAdmission = admit(serviceA); await waitUntilBlocked(serviceA, serviceB); await serviceB.query("commit"); await expect(blockedAdmission).rejects.toThrow(/SOURCE_ASSET_HEAD_CHANGED|CURRENTNESS_NOT_CURRENT/); await cleanupExtras();
    const admission = await admitInTransaction(serviceA); await serviceB.query("begin"); const blockedWriter = serviceB.query("update public.assets set current_version_id=$1 where id=$2", [VERSION2, ASSET]); await waitUntilBlocked(serviceB, serviceA); await serviceA.query("commit"); await blockedWriter; await serviceB.query("commit"); await cleanupExtras();
    expect(admission.admission_id).toEqual(expect.any(String));
  });
  it("serializes membership revocation in both orders", async () => {
    await cleanupExtras();
    await serviceB.query("begin"); await serviceB.query("update public.tenant_memberships set status='REVOKED' where id=$1", [MEMBERSHIP]); const blockedAdmission = admit(serviceA); await waitUntilBlocked(serviceA, serviceB); await serviceB.query("commit"); await expect(blockedAdmission).rejects.toThrow(/READINESS_AUTHORITY_MEMBERSHIP_INVALID|AUTHORITY_NOT_CURRENT/); await cleanupExtras();
    const admission = await admitInTransaction(serviceA); await serviceB.query("begin"); const blockedWriter = serviceB.query("update public.tenant_memberships set status='REVOKED' where id=$1", [MEMBERSHIP]); await waitUntilBlocked(serviceB, serviceA); await serviceA.query("commit"); await blockedWriter; await serviceB.query("commit"); await cleanupExtras();
    expect(admission.admission_id).toEqual(expect.any(String));
  });
  it("serializes transaction raw_request changes in both orders", async () => {
    await serviceB.query("begin");
    const writerFirst = serviceB.query("update public.outcome_transactions set raw_request='d3 changed' where id=$1", [TRANSACTION]);
    await expect(writerFirst).rejects.toThrow();
    await rollbackQuiet(serviceB);
    const admission = await admitInTransaction(serviceA);
    await serviceB.query("begin");
    const blockedWriter = serviceB.query("update public.outcome_transactions set raw_request='d3 changed' where id=$1", [TRANSACTION]);
    await expect(blockedWriter).rejects.toThrow();
    await rollbackQuiet(serviceB);
    await serviceA.query("commit");
    expect(admission.admission_id).toEqual(expect.any(String));
  });
});
