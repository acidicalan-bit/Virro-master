// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
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

const enabled = process.env.BUILD002_VERIFIER_NATIVE_PG === "true";
const databaseUrl = process.env.BUILD002_VERIFIER_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const ACTOR = "a9000000-0000-4000-8000-000000000001";
const TENANT = "b9000000-0000-4000-8000-000000000001";
const PROJECT = "c9000000-0000-4000-8000-000000000001";
const ASSET = "d9000000-0000-4000-8000-000000000001";
const VERSION = "e9000000-0000-4000-8000-000000000001";
const TX = "f9000000-0000-4000-8000-000000000001";
const BLUEPRINT = "a9100000-0000-4000-8000-000000000001";
const PROFILE = "a9100000-0000-4000-8000-000000000002";
const REQ_ROW = "a9200000-0000-4000-8000-000000000001";
const SIG = "a9300000-0000-4000-8000-000000000001";
const QUAL = "a9400000-0000-4000-8000-000000000001";
const READY = "a9500000-0000-4000-8000-000000000001";
const hashes = { blueprint: "1".repeat(64), profile: "2".repeat(64), binding: "3".repeat(64), asset: "4".repeat(64), tx: "5".repeat(64) };

type Graph = { requirement: SignalRequirement; signal: Signal; snapshot: DependencySnapshot; qualification: SignalQualification; readiness: DelegationReadiness; payload: Record<string, unknown> };

function dbUrl(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function graph(): Graph {
  const now = new Date(Date.now() - 60_000).toISOString();
  const requirement = compileSignalRequirement({
    requirementId: "signal.verifier.native",
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "TEXT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: hashes.blueprint,
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, now);
  const signal = createSignal({
    signalId: SIG,
    ownerTenantId: TENANT,
    transactionId: TX,
    requirementId: requirement.requirementId,
    payload: { verifier: "native" },
    source: { identity: "independent", version: "1", hash: "6".repeat(64) },
    provenance: "OBSERVED",
    capturedAt: new Date(Date.parse(now) - 30_000).toISOString(),
    validUntil: new Date(Date.parse(now) + 3_600_000).toISOString(),
    dependency: { identity: "asset.version", hash: hashes.asset },
    schemaVersion: "build002-signal-v0.2",
  });
  const snapshot = createDependencySnapshot({
    schemaVersion: "build002-dependency-snapshot-v0.2",
    ownerTenantId: TENANT,
    transactionId: TX,
    requirementDefinitionHashes: [requirement.requirementDefinitionHash],
    signalReferences: [{ requirementId: requirement.requirementId, signalId: SIG, contentHash: signal.contentHash }],
    dependencyBindings: [{ identity: "asset.version", hash: hashes.asset }, { identity: "blueprint", hash: hashes.blueprint }],
    blueprintHash: hashes.blueprint,
    policyHash: null,
    taskSpecHash: null,
    transactionSemanticHash: hashes.tx,
    sourceAssetVersionHash: hashes.asset,
    contextLensHash: null,
  });
  const evaluator = currentDefaultEvaluator();
  const qualification = evaluateSignalQualification({ requirement, signals: [signal], currentDependencySnapshot: snapshot, evaluator, evaluationTime: now, idFactory: () => QUAL });
  const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TX }, requirements: [requirement], qualifications: [qualification], dependencySnapshot: snapshot, evaluator, evaluationTime: now, idFactory: () => READY });
  const payload: Record<string, unknown> = {
    owner_tenant_id: TENANT,
    outcome_transaction_id: TX,
    transaction: { ownerTenantId: TENANT, transactionId: TX, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "independent native verifier" },
    asset: { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, currentVersionId: VERSION },
    sourceVersion: { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, parentVersionId: null, state: { verifier: true } },
    binding: { bindingHash: hashes.binding, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: hashes.blueprint, requirementProfileId: PROFILE, requirementProfileVersion: 1, requirementProfileHash: hashes.profile },
    requirements: [requirement],
    dependency_snapshot: snapshot,
    qualifications: [{ ...qualification, signalReferences: [{ signalId: SIG, contentHash: signal.contentHash }] }],
    readiness,
    schema_version: "build002-readiness-authority-commit-v0.1",
  };
  return { requirement, signal, snapshot, qualification, readiness, payload };
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-D0 R1-1 independent PostgreSQL attacks", () => {
  let admin: Client;
  let service: Client;
  let database = "";
  let value: Graph;

  async function call(payload: Record<string, unknown>) {
    return service.query("select public.build002_commit_readiness_authority($1::uuid, $2::jsonb) as result", [ACTOR, JSON.stringify(payload)]);
  }

  async function insertRequirement(client: Client, rowId: string, requirement: SignalRequirement) {
    await client.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({ id: rowId, owner_tenant_id: TENANT, outcome_transaction_id: TX, requirement_id: requirement.requirementId, semantic_type: requirement.semanticType, critical: requirement.critical, accepted_provenance: requirement.acceptedProvenance, qualification_rule: requirement.qualificationRule, dependency_selectors: requirement.dependencySelectors, blueprint_id: BLUEPRINT, blueprint_version: 1, blueprint_hash: hashes.blueprint, policy_id: null, policy_hash: null, schema_version: requirement.definitionSchemaVersion, requirement_definition_hash: requirement.requirementDefinitionHash, created_at: requirement.createdAt })]);
  }

  beforeAll(async () => {
    database = `virro_c1d0_v_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: dbUrl(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${database}" with (force)`);
    await root.query(`create database "${database}"`);
    await root.end();
    admin = new Client({ connectionString: dbUrl(databaseUrl!, database) });
    service = new Client({ connectionString: dbUrl(databaseUrl!, database) });
    await admin.connect(); await service.connect();
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users (id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);");
    const migrationNames = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    for (const name of migrationNames) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    value = graph();
    await admin.query("insert into auth.users(id) values ($1)", [ACTOR]);
    await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE')", [TENANT]);
    await admin.query("insert into public.tenant_memberships(id, tenant_id, principal_id, role, status) values ($1,$2,$3,'OWNER','ACTIVE')", ["b9100000-0000-4000-8000-000000000001", TENANT, ACTOR]);
    await admin.query("insert into public.projects(id,name,owner_tenant_id) values ($1,'verifier',$2)", [PROJECT, TENANT]);
    await admin.query("insert into public.assets(id,project_id,name,owner_tenant_id,current_version_id) values ($1,$2,'verifier',$3,$4)", [ASSET, PROJECT, TENANT, VERSION]);
    await admin.query("insert into public.asset_versions(id,asset_id,version_number,state,owner_tenant_id) values ($1,$2,1,'{}',$3)", [VERSION, ASSET, TENANT]);
    await admin.query("insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,raw_request,status) values ($1,$2,$3,$4,$5,'verifier','PREPARED')", [TX, TENANT, PROJECT, ASSET, VERSION]);
    await admin.query("insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,1,$2,null,'PUBLISHED',now(),$3::jsonb)", [BLUEPRINT, hashes.blueprint, JSON.stringify({ id: BLUEPRINT, version: 1, hash: hashes.blueprint })]);
    await admin.query("insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,1,$2,null,$3,1,$4,null,null,'PUBLISHED',now(),$5::jsonb)", [PROFILE, hashes.profile, BLUEPRINT, hashes.blueprint, JSON.stringify({ schemaVersion: "outcome-requirement-profile-v0.1", id: PROFILE, version: 1, previousVersionHash: null, blueprint: { id: BLUEPRINT, version: 1, hash: hashes.blueprint }, policy: null, requirements: [{ requirementId: value.requirement.requirementId, semanticType: value.requirement.semanticType, critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: value.requirement.qualificationRule, dependencySelectors: value.requirement.dependencySelectors }] })]);
    await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id,outcome_transaction_id,blueprint_id,blueprint_version,blueprint_hash,requirement_profile_id,requirement_profile_version,requirement_profile_hash,policy_id,policy_hash,schema_version,binding_hash,bound_at) values ($1,$2,$3,1,$4,$5,1,$6,null,null,'outcome-transaction-requirement-binding-v0.1',$7,now())", [TENANT, TX, BLUEPRINT, hashes.blueprint, PROFILE, hashes.profile, hashes.binding]);
    await service.query("set role service_role");
    await insertRequirement(service, REQ_ROW, value.requirement);
    await service.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: SIG, owner_tenant_id: TENANT, outcome_transaction_id: TX, requirement_id: value.signal.requirementId, requirement_definition_hash: value.requirement.requirementDefinitionHash, payload: value.signal.payload, source: value.signal.source, provenance: value.signal.provenance, captured_at: value.signal.capturedAt, valid_until: value.signal.validUntil, dependency_identity: value.signal.dependency.identity, dependency_hash: value.signal.dependency.hash, schema_version: value.signal.schemaVersion, content_hash: value.signal.contentHash })]);
  }, 120_000);

  afterAll(async () => {
    await admin?.end(); await service?.end();
    if (database && databaseUrl) { const root = new Client({ connectionString: dbUrl(databaseUrl, "postgres") }); await root.connect(); await root.query(`drop database if exists "${database}" with (force)`); await root.end(); }
  });

  it("inspects the final RPC and proves R1 scopes the signal universe by canonical hashes", async () => {
    const result = await admin.query("select pg_get_functiondef('public.build002_commit_readiness_authority(uuid,jsonb)'::regprocedure) as definition");
    const definition = String(result.rows[0].definition);
    expect(definition).toContain("requirement_definition_hash");
    expect(definition).toMatch(/signal_definition_hashes|v_snapshot.*requirementDefinitionHashes|requirementDefinitionHashes/s);
    expect(definition).not.toMatch(/where owner_tenant_id = v_tenant and outcome_transaction_id = v_transaction\s*order by requirement_id/s);
  });

  it("rejects a same-transaction direct marker forge after a valid call", async () => {
    await service.query("begin");
    await call(value.payload);
    await expect(service.query("insert into public.build002_readiness_authority_commits default values")).rejects.toThrow(/permission denied|violates/);
    await service.query("rollback");
  });

  it("rejects alternate C0 requirements and qualification/signal relational mismatches", async () => {
    const alternate = compileSignalRequirement({ requirementId: "signal.verifier.alternate", subjectKind: "OUTCOME_TRANSACTION", semanticType: "NUMBER", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: value.requirement.dependencySelectors, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: hashes.blueprint, policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, value.requirement.createdAt);
    const altPayload = { ...value.payload, requirements: [alternate] };
    await expect(call(altPayload)).rejects.toThrow();
    const pairAttack = structuredClone(value.payload) as Record<string, unknown> & { qualifications: Array<{ signalReferences: Array<{ contentHash: string }> }> };
    pairAttack.qualifications[0].signalReferences[0].contentHash = "8".repeat(64);
    await expect(call(pairAttack)).rejects.toThrow();
    const staleEval = structuredClone(value.payload) as Record<string, unknown> & { readiness: { evaluator: Record<string, unknown> } };
    staleEval.readiness.evaluator = { ...staleEval.readiness.evaluator, version: "0.1.0", definitionHash: "9".repeat(64) };
    await expect(call(staleEval)).rejects.toThrow();
  });

  it("ignores a historical noncanonical signal but rejects a canonical extra signal", async () => {
    const old = compileSignalRequirement({ requirementId: "signal.verifier.old", subjectKind: value.requirement.subjectKind, semanticType: value.requirement.semanticType, critical: value.requirement.critical, acceptedProvenance: value.requirement.acceptedProvenance, qualificationRule: value.requirement.qualificationRule, dependencySelectors: value.requirement.dependencySelectors, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: hashes.blueprint, policyId: null, policyHash: null, definitionSchemaVersion: value.requirement.definitionSchemaVersion }, value.requirement.createdAt);
    await insertRequirement(service, "a9200000-0000-4000-8000-000000000002", old);
    const { contentHash: _oldHash, signalId: _oldId, ...oldSignalInput } = value.signal;
    void _oldHash; void _oldId;
    const oldSignal = createSignal({ ...oldSignalInput, signalId: "a9300000-0000-4000-8000-000000000002", requirementId: old.requirementId, payload: { old: true } });
    await service.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: oldSignal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TX, requirement_id: oldSignal.requirementId, requirement_definition_hash: old.requirementDefinitionHash, payload: oldSignal.payload, source: oldSignal.source, provenance: oldSignal.provenance, captured_at: oldSignal.capturedAt, valid_until: oldSignal.validUntil, dependency_identity: oldSignal.dependency.identity, dependency_hash: oldSignal.dependency.hash, schema_version: oldSignal.schemaVersion, content_hash: oldSignal.contentHash })]);
    await expect(call(value.payload)).resolves.toBeDefined();
    const { contentHash: _extraHash, signalId: _extraId, ...extraInput } = value.signal;
    void _extraHash; void _extraId;
    const extra = createSignal({ ...extraInput, signalId: "a9300000-0000-4000-8000-000000000003", payload: { extra: true } });
    await service.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: extra.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TX, requirement_id: extra.requirementId, requirement_definition_hash: value.requirement.requirementDefinitionHash, payload: extra.payload, source: extra.source, provenance: extra.provenance, captured_at: extra.capturedAt, valid_until: extra.validUntil, dependency_identity: extra.dependency.identity, dependency_hash: extra.dependency.hash, schema_version: extra.schemaVersion, content_hash: extra.contentHash })]);
    await expect(call(value.payload)).rejects.toThrow(/SIGNAL_UNIVERSE_CHANGED|COMMIT_FAILED/);
  });

  it("keeps the transaction PREPARED and leaves execution/state-commit tables untouched", async () => {
    const row = await admin.query("select status from public.outcome_transactions where id=$1", [TX]);
    expect(row.rows[0].status).toBe("PREPARED");
    const counts = await admin.query("select (select count(*) from public.mutation_leases) as mutation_leases, (select count(*) from public.execution_runs) as execution_runs, (select count(*) from public.verification_runs) as verification_runs, (select count(*) from public.state_commits) as state_commits");
    expect(Object.values(counts.rows[0]).every((value) => String(value) === "0")).toBe(true);
  });
});
