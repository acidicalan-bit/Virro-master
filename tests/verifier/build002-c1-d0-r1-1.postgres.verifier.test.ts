// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
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
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";

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
    dependencyBindings: [{ identity: "asset.version", hash: hashes.asset }, { identity: "blueprint", hash: hashes.blueprint }, { identity: "transaction.semantic", hash: hashes.tx }],
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
    transaction: { ownerTenantId: TENANT, transactionId: TX, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "verifier" },
    asset: { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, currentVersionId: VERSION },
    sourceVersion: { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, parentVersionId: null, state: {} },
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

  async function insertRequirement(client: Client, rowId: string, requirement: SignalRequirement, transactionId = TX, blueprintId = BLUEPRINT, blueprintHash = hashes.blueprint) {
    await client.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({ id: rowId, owner_tenant_id: TENANT, outcome_transaction_id: transactionId, requirement_id: requirement.requirementId, semantic_type: requirement.semanticType, critical: requirement.critical, accepted_provenance: requirement.acceptedProvenance, qualification_rule: requirement.qualificationRule, dependency_selectors: requirement.dependencySelectors, blueprint_id: blueprintId, blueprint_version: 1, blueprint_hash: blueprintHash, policy_id: null, policy_hash: null, schema_version: requirement.definitionSchemaVersion, requirement_definition_hash: requirement.requirementDefinitionHash, created_at: requirement.createdAt })]);
  }

  async function insertSignal(client: Client, signal: Signal, requirement: SignalRequirement, transactionId = TX) {
    await client.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: signal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: transactionId, requirement_id: signal.requirementId, requirement_definition_hash: requirement.requirementDefinitionHash, payload: signal.payload, source: signal.source, provenance: signal.provenance, captured_at: signal.capturedAt, valid_until: signal.validUntil, dependency_identity: signal.dependency.identity, dependency_hash: signal.dependency.hash, schema_version: signal.schemaVersion, content_hash: signal.contentHash })]);
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
    const migrationFilenameSetHash = createHash("sha256").update(`${migrationNames.join("\n")}\n`).digest("hex");
    await admin.query("create temporary table verifier_migrations(name text primary key, ordinal integer not null)");
    for (const [ordinal, name] of migrationNames.entries()) {
      await admin.query("insert into verifier_migrations(name, ordinal) values ($1, $2)", [name, ordinal]);
      await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    }
    const migrationEvidence = await admin.query("select count(*)::int as applied, count(distinct name)::int as unique_names, bool_and(ordinal = row_number) as lexical from (select name, ordinal, row_number() over (order by name) - 1 as row_number from verifier_migrations) ordered");
    expect(migrationNames.length).toBe(migrationEvidence.rows[0].applied);
    expect(migrationEvidence.rows[0].unique_names).toBe(migrationNames.length);
    expect(migrationEvidence.rows[0].lexical).toBe(true);
    console.info(`MIGRATION_COUNT_FOUND=${migrationNames.length} MIGRATION_COUNT_APPLIED=${migrationEvidence.rows[0].applied} MIGRATION_FILENAME_SET_HASH=${migrationFilenameSetHash}`);
    const version = await admin.query("show server_version_num");
    expect(String(version.rows[0].server_version_num).startsWith("17")).toBe(true);
    value = graph();
    await admin.query("insert into auth.users(id) values ($1)", [ACTOR]);
    await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE')", [TENANT]);
    await admin.query("insert into public.tenant_memberships(id, tenant_id, principal_id, role, status) values ($1,$2,$3,'OWNER','ACTIVE')", ["b9100000-0000-4000-8000-000000000001", TENANT, ACTOR]);
    await admin.query("insert into public.projects(id,name,owner_tenant_id) values ($1,'verifier',$2)", [PROJECT, TENANT]);
    await admin.query("insert into public.assets(id,project_id,name,owner_tenant_id,current_version_id) values ($1,$2,'verifier',$3,null)", [ASSET, PROJECT, TENANT]);
    await admin.query("insert into public.asset_versions(id,asset_id,version_number,state,owner_tenant_id) values ($1,$2,1,'{}',$3)", [VERSION, ASSET, TENANT]);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [VERSION, ASSET]);
    await admin.query("insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,raw_request,status) values ($1,$2,$3,$4,$5,'verifier','PREPARED')", [TX, TENANT, PROJECT, ASSET, VERSION]);
    await admin.query("insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,1,$2,null,'PUBLISHED',now(),$3::jsonb)", [BLUEPRINT, hashes.blueprint, JSON.stringify({ id: BLUEPRINT, version: 1, hash: hashes.blueprint, previousVersionHash: null })]);
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

  it("rejects each internally hash-valid C0 semantic-field mutation", async () => {
    const variants: Array<[string, Partial<SignalRequirement>]> = [
      ["semanticType", { semanticType: "NUMBER" }],
      ["critical", { critical: false }],
      ["acceptedProvenance", { acceptedProvenance: ["SYSTEM_DERIVED"] }],
      ["qualificationRule", { qualificationRule: { version: "2", cardinality: "SINGLE_VALUED", humanReviewRequired: false } }],
      ["dependencySelectors", { dependencySelectors: [{ identity: "blueprint", required: true }] }],
    ];
    for (const [index, [name, change]] of variants.entries()) {
      void name;
      const input = { requirementId: value.requirement.requirementId, subjectKind: value.requirement.subjectKind, semanticType: change.semanticType ?? value.requirement.semanticType, critical: change.critical ?? value.requirement.critical, acceptedProvenance: change.acceptedProvenance ?? value.requirement.acceptedProvenance, qualificationRule: change.qualificationRule ?? value.requirement.qualificationRule, dependencySelectors: change.dependencySelectors ?? value.requirement.dependencySelectors, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: hashes.blueprint, policyId: null, policyHash: null, definitionSchemaVersion: value.requirement.definitionSchemaVersion };
      const requirement = compileSignalRequirement(input, value.requirement.createdAt);
      const { contentHash: _hash, signalId: _id, ...signalInput } = value.signal;
      void _hash; void _id;
      const signal = createSignal({ ...signalInput, signalId: `a9300000-0000-4000-8000-0000000000${index + 10}`, requirementId: requirement.requirementId });
      const snapshot = createDependencySnapshot({ schemaVersion: value.snapshot.schemaVersion, ownerTenantId: TENANT, transactionId: TX, requirementDefinitionHashes: [requirement.requirementDefinitionHash], signalReferences: [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }], dependencyBindings: value.snapshot.dependencyBindings, blueprintHash: hashes.blueprint, policyHash: null, taskSpecHash: null, transactionSemanticHash: hashes.tx, sourceAssetVersionHash: hashes.asset, contextLensHash: null });
      const qualification = evaluateSignalQualification({ requirement, signals: [signal], currentDependencySnapshot: snapshot, evaluator: currentDefaultEvaluator(), evaluationTime: requirement.createdAt, idFactory: () => `a9400000-0000-4000-8000-0000000000${index + 10}` });
      const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TX }, requirements: [requirement], qualifications: [qualification], dependencySnapshot: snapshot, evaluator: currentDefaultEvaluator(), evaluationTime: requirement.createdAt, idFactory: () => `a9500000-0000-4000-8000-0000000000${index + 10}` });
      await insertRequirement(service, `a9200000-0000-4000-8000-0000000000${index + 10}`, requirement);
      await insertSignal(service, signal, requirement);
      const payload = { ...value.payload, requirements: [requirement], dependency_snapshot: snapshot, qualifications: [{ ...qualification, signalReferences: [{ signalId: signal.signalId, contentHash: signal.contentHash }] }], readiness };
      await expect(call(payload)).rejects.toThrow(/C0_CHANGED|GRAPH_INVALID|COMMIT_FAILED/);
    }
  });

  it("rejects a READY graph expired at the DB authority boundary", async () => {
    const expired = structuredClone(value.payload) as Record<string, unknown> & { readiness: Record<string, unknown> };
    const expiredReadiness = { ...expired.readiness, validUntil: new Date(Date.now() - 1_000).toISOString() } as Record<string, unknown>;
    const { id, readinessContentHash: _hash, createdAt, ...material } = expiredReadiness;
    void id; void _hash; void createdAt;
    expired.readiness = { ...material, id: value.readiness.id, createdAt: value.readiness.createdAt, readinessContentHash: canonicalSha256(material) };
    await expect(call(expired)).rejects.toThrow(/EXPIRED_BEFORE_COMMIT|GRAPH_INVALID|COMMIT_FAILED/);
  });

  it("keeps a separate nonexpired READY control authoritative without consequences", async () => {
    const result = await call(value.payload);
    expect(result.rows[0].result.authority_commit_id).toBeTruthy();
    const status = await admin.query("select status from public.outcome_transactions where id=$1", [TX]);
    expect(status.rows[0].status).toBe("PREPARED");
    const writes = await admin.query("select (select count(*) from public.mutation_leases) as leases, (select count(*) from public.execution_runs) as runs, (select count(*) from public.state_commits) as commits");
    expect(Object.values(writes.rows[0]).every((entry) => String(entry) === "0")).toBe(true);
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

  it("checks marker visibility through real authenticated and anon roles", async () => {
    const own = new Client({ connectionString: dbUrl(databaseUrl!, database) });
    await own.connect();
    try {
      await own.query("set role authenticated");
      await own.query("select set_config('request.jwt.claim.sub', $1, false)", [ACTOR]);
      const visible = await own.query("select count(*)::int as count from public.build002_readiness_authority_commits");
      expect(visible.rows[0].count).toBeGreaterThan(0);
      await admin.query("update public.tenant_memberships set status='REVOKED' where tenant_id=$1 and principal_id=$2", [TENANT, ACTOR]);
      const revoked = await own.query("select count(*)::int as count from public.build002_readiness_authority_commits");
      expect(revoked.rows[0].count).toBe(0);
      await admin.query("update public.tenant_memberships set status='ACTIVE' where tenant_id=$1 and principal_id=$2", [TENANT, ACTOR]);
      await admin.query("update public.tenants set status='SUSPENDED' where id=$1", [TENANT]);
      const suspended = await own.query("select count(*)::int as count from public.build002_readiness_authority_commits");
      expect(suspended.rows[0].count).toBe(0);
      await admin.query("update public.tenants set status='ACTIVE' where id=$1", [TENANT]);
      await admin.query("update public.tenants set status='REVOKED' where id=$1", [TENANT]);
      const revokedTenant = await own.query("select count(*)::int as count from public.build002_readiness_authority_commits");
      expect(revokedTenant.rows[0].count).toBe(0);
      await admin.query("update public.tenants set status='ACTIVE' where id=$1", [TENANT]);
      const foreign = new Client({ connectionString: dbUrl(databaseUrl!, database) });
      await foreign.connect();
      try {
        await foreign.query("set role authenticated");
        await foreign.query("select set_config('request.jwt.claim.sub', $1, false)", ["a9000000-0000-4000-8000-000000000099"]);
        const rows = await foreign.query("select count(*)::int as count from public.build002_readiness_authority_commits");
        expect(rows.rows[0].count).toBe(0);
      } finally { await foreign.end(); }
      const anon = new Client({ connectionString: dbUrl(databaseUrl!, database) });
      await anon.connect();
      try { await anon.query("set role anon"); await expect(anon.query("select * from public.build002_readiness_authority_commits")).rejects.toThrow(/permission denied/); } finally { await anon.end(); }
    } finally {
      await admin.query("update public.tenants set status='ACTIVE' where id=$1", [TENANT]);
      await admin.query("update public.tenant_memberships set status='ACTIVE' where tenant_id=$1 and principal_id=$2", [TENANT, ACTOR]);
      await own.end();
    }
  });

  it("commits a canonical two-requirement graph, then rejects a hash-valid qualification swap", async () => {
    const ids = { project: "c9000000-0000-4000-8000-000000000003", asset: "d9000000-0000-4000-8000-000000000003", version: "e9000000-0000-4000-8000-000000000003", tx: "f9000000-0000-4000-8000-000000000003", blueprint: "a9100000-0000-4000-8000-000000000005", profile: "a9100000-0000-4000-8000-000000000006", r1: "a9610000-0000-4000-8000-000000000001", r2: "a9610000-0000-4000-8000-000000000002", s1: "a9620000-0000-4000-8000-000000000001", s2: "a9620000-0000-4000-8000-000000000002", q1: "a9630000-0000-4000-8000-000000000001", q2: "a9630000-0000-4000-8000-000000000002", ready: "a9640000-0000-4000-8000-000000000001", swapReady: "a9640000-0000-4000-8000-000000000002" };
    const createdAt = new Date(Date.now() - 60_000).toISOString();
    const makeRequirement = (requirementId: string, semanticType: string) => compileSignalRequirement({ requirementId, subjectKind: "OUTCOME_TRANSACTION", semanticType, critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }], blueprintId: ids.blueprint, blueprintVersion: 1, blueprintHash: "8".repeat(64), policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, createdAt);
    const r1 = makeRequirement("signal.verifier.multi.one", "TEXT");
    const r2 = makeRequirement("signal.verifier.multi.two", "NUMBER");
    const makeSignal = (signalId: string, requirement: SignalRequirement, payload: Record<string, unknown>) => createSignal({ signalId, ownerTenantId: TENANT, transactionId: ids.tx, requirementId: requirement.requirementId, payload, source: { identity: "multi-verifier", version: "1", hash: "9".repeat(64) }, provenance: "OBSERVED", capturedAt: new Date(Date.parse(createdAt) - 30_000).toISOString(), validUntil: new Date(Date.parse(createdAt) + 3_600_000).toISOString(), dependency: { identity: "asset.version", hash: "7".repeat(64) }, schemaVersion: "build002-signal-v0.2" });
    const s1 = makeSignal(ids.s1, r1, { one: true });
    const s2 = makeSignal(ids.s2, r2, { two: 2 });
    const snapshot = createDependencySnapshot({ schemaVersion: "build002-dependency-snapshot-v0.2", ownerTenantId: TENANT, transactionId: ids.tx, requirementDefinitionHashes: [r1.requirementDefinitionHash, r2.requirementDefinitionHash], signalReferences: [{ requirementId: r1.requirementId, signalId: s1.signalId, contentHash: s1.contentHash }, { requirementId: r2.requirementId, signalId: s2.signalId, contentHash: s2.contentHash }], dependencyBindings: [{ identity: "asset.version", hash: "7".repeat(64) }, { identity: "blueprint", hash: "8".repeat(64) }, { identity: "transaction.semantic", hash: "6".repeat(64) }], blueprintHash: "8".repeat(64), policyHash: null, taskSpecHash: null, transactionSemanticHash: "6".repeat(64), sourceAssetVersionHash: "7".repeat(64), contextLensHash: null });
    const evaluator = currentDefaultEvaluator();
    const q1 = evaluateSignalQualification({ requirement: r1, signals: [s1], currentDependencySnapshot: snapshot, evaluator, evaluationTime: createdAt, idFactory: () => ids.q1 });
    const q2 = evaluateSignalQualification({ requirement: r2, signals: [s2], currentDependencySnapshot: snapshot, evaluator, evaluationTime: createdAt, idFactory: () => ids.q2 });
    const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: ids.tx }, requirements: [r1, r2], qualifications: [q1, q2], dependencySnapshot: snapshot, evaluator, evaluationTime: createdAt, idFactory: () => ids.ready });
    await admin.query("insert into public.projects(id,name,owner_tenant_id) values ($1,'multi',$2)", [ids.project, TENANT]);
    await admin.query("insert into public.assets(id,project_id,name,owner_tenant_id,current_version_id) values ($1,$2,'multi',$3,null)", [ids.asset, ids.project, TENANT]);
    await admin.query("insert into public.asset_versions(id,asset_id,version_number,state,owner_tenant_id) values ($1,$2,1,'{}',$3)", [ids.version, ids.asset, TENANT]);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [ids.version, ids.asset]);
    await admin.query("insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,raw_request,status) values ($1,$2,$3,$4,$5,'multi','PREPARED')", [ids.tx, TENANT, ids.project, ids.asset, ids.version]);
    await admin.query("insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,1,$2,null,'PUBLISHED',now(),$3::jsonb)", [ids.blueprint, "8".repeat(64), JSON.stringify({ id: ids.blueprint, version: 1, previousVersionHash: null })]);
    const profileDefinition = { schemaVersion: "outcome-requirement-profile-v0.1", id: ids.profile, version: 1, previousVersionHash: null, blueprint: { id: ids.blueprint, version: 1, hash: "8".repeat(64) }, policy: null, requirements: [r1, r2].map((requirement) => ({ requirementId: requirement.requirementId, semanticType: requirement.semanticType, critical: requirement.critical, acceptedProvenance: requirement.acceptedProvenance, qualificationRule: requirement.qualificationRule, dependencySelectors: requirement.dependencySelectors })) };
    await admin.query("insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,1,$2,null,$3,1,$4,null,null,'PUBLISHED',now(),$5::jsonb)", [ids.profile, "f".repeat(64), ids.blueprint, "8".repeat(64), JSON.stringify(profileDefinition)]);
    await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id,outcome_transaction_id,blueprint_id,blueprint_version,blueprint_hash,requirement_profile_id,requirement_profile_version,requirement_profile_hash,policy_id,policy_hash,schema_version,binding_hash,bound_at) values ($1,$2,$3,1,$4,$5,1,$6,null,null,'outcome-transaction-requirement-binding-v0.1',$7,now())", [TENANT, ids.tx, ids.blueprint, "8".repeat(64), ids.profile, "f".repeat(64), "e".repeat(64)]);
    await insertRequirement(service, ids.r1, r1, ids.tx, ids.blueprint, "8".repeat(64));
    await insertRequirement(service, ids.r2, r2, ids.tx, ids.blueprint, "8".repeat(64));
    await insertSignal(service, s1, r1, ids.tx); await insertSignal(service, s2, r2, ids.tx);
    const base = { owner_tenant_id: TENANT, outcome_transaction_id: ids.tx, transaction: { ownerTenantId: TENANT, transactionId: ids.tx, projectId: ids.project, assetId: ids.asset, baseVersionId: ids.version, rawRequest: "multi" }, asset: { id: ids.asset, ownerTenantId: TENANT, projectId: ids.project, currentVersionId: ids.version }, sourceVersion: { id: ids.version, ownerTenantId: TENANT, assetId: ids.asset, versionNumber: 1, parentVersionId: null, state: {} }, binding: { bindingHash: "e".repeat(64), blueprintId: ids.blueprint, blueprintVersion: 1, blueprintHash: "8".repeat(64), requirementProfileId: ids.profile, requirementProfileVersion: 1, requirementProfileHash: "f".repeat(64) }, requirements: [r1, r2], dependency_snapshot: snapshot, qualifications: [q1, q2].map((qualification) => ({ ...qualification, signalReferences: qualification.signalIds.map((signalId, index) => ({ signalId, contentHash: qualification.signalContentHashes[index] })) })), readiness };
    await expect(call(base)).resolves.toBeDefined();
    const swappedQ1 = evaluateSignalQualification({ requirement: r1, signals: [s2], currentDependencySnapshot: snapshot, evaluator, evaluationTime: createdAt, idFactory: () => "a9630000-0000-4000-8000-000000000003" });
    const swappedReadiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: ids.tx }, requirements: [r1, r2], qualifications: [swappedQ1, q2], dependencySnapshot: snapshot, evaluator, evaluationTime: createdAt, idFactory: () => ids.swapReady });
    const swapped = { ...base, qualifications: [swappedQ1, q2].map((qualification) => ({ ...qualification, signalReferences: qualification.signalIds.map((signalId, index) => ({ signalId, contentHash: qualification.signalContentHashes[index] })) })), readiness: swappedReadiness };
    await expect(call(swapped)).rejects.toThrow(/GRAPH_INVALID|COMMIT_FAILED|SIGNAL/);
  });

  it("commits a legitimate zero-signal non-ready authority without execution", async () => {
    const ids = { project: "c9000000-0000-4000-8000-000000000002", asset: "d9000000-0000-4000-8000-000000000002", version: "e9000000-0000-4000-8000-000000000002", tx: "f9000000-0000-4000-8000-000000000002", blueprint: "a9100000-0000-4000-8000-000000000003", profile: "a9100000-0000-4000-8000-000000000004", requirementRow: "a9200000-0000-4000-8000-000000000003", requirement: "a9600000-0000-4000-8000-000000000001", qualification: "a9700000-0000-4000-8000-000000000001", readiness: "a9800000-0000-4000-8000-000000000001" };
    const createdAt = new Date(Date.now() - 60_000).toISOString();
    const requirement = compileSignalRequirement({ requirementId: "signal.verifier.zero", subjectKind: "OUTCOME_TRANSACTION", semanticType: "TEXT", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }], blueprintId: ids.blueprint, blueprintVersion: 1, blueprintHash: "a".repeat(64), policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, createdAt);
    const snapshot = createDependencySnapshot({ schemaVersion: "build002-dependency-snapshot-v0.2", ownerTenantId: TENANT, transactionId: ids.tx, requirementDefinitionHashes: [requirement.requirementDefinitionHash], signalReferences: [], dependencyBindings: [{ identity: "asset.version", hash: "b".repeat(64) }, { identity: "blueprint", hash: "a".repeat(64) }, { identity: "transaction.semantic", hash: "c".repeat(64) }], blueprintHash: "a".repeat(64), policyHash: null, taskSpecHash: null, transactionSemanticHash: "c".repeat(64), sourceAssetVersionHash: "b".repeat(64), contextLensHash: null });
    const qualification = evaluateSignalQualification({ requirement, signals: [], currentDependencySnapshot: snapshot, evaluator: currentDefaultEvaluator(), evaluationTime: createdAt, idFactory: () => ids.qualification });
    const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: ids.tx }, requirements: [requirement], qualifications: [qualification], dependencySnapshot: snapshot, evaluator: currentDefaultEvaluator(), evaluationTime: createdAt, idFactory: () => ids.readiness });
    await admin.query("insert into public.projects(id,name,owner_tenant_id) values ($1,'zero',$2)", [ids.project, TENANT]);
    await admin.query("insert into public.assets(id,project_id,name,owner_tenant_id,current_version_id) values ($1,$2,'zero',$3,null)", [ids.asset, ids.project, TENANT]);
    await admin.query("insert into public.asset_versions(id,asset_id,version_number,state,owner_tenant_id) values ($1,$2,1,'{}',$3)", [ids.version, ids.asset, TENANT]);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [ids.version, ids.asset]);
    await admin.query("insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,raw_request,status) values ($1,$2,$3,$4,$5,'zero','PREPARED')", [ids.tx, TENANT, ids.project, ids.asset, ids.version]);
    await admin.query("insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,1,$2,null,'PUBLISHED',now(),$3::jsonb)", [ids.blueprint, "a".repeat(64), JSON.stringify({ id: ids.blueprint, version: 1, previousVersionHash: null })]);
    await admin.query("insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,1,$2,null,$3,1,$4,null,null,'PUBLISHED',now(),$5::jsonb)", [ids.profile, "d".repeat(64), ids.blueprint, "a".repeat(64), JSON.stringify({ schemaVersion: "outcome-requirement-profile-v0.1", id: ids.profile, version: 1, previousVersionHash: null, blueprint: { id: ids.blueprint, version: 1, hash: "a".repeat(64) }, policy: null, requirements: [{ requirementId: requirement.requirementId, semanticType: requirement.semanticType, critical: requirement.critical, acceptedProvenance: requirement.acceptedProvenance, qualificationRule: requirement.qualificationRule, dependencySelectors: requirement.dependencySelectors }] })]);
    await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id,outcome_transaction_id,blueprint_id,blueprint_version,blueprint_hash,requirement_profile_id,requirement_profile_version,requirement_profile_hash,policy_id,policy_hash,schema_version,binding_hash,bound_at) values ($1,$2,$3,1,$4,$5,1,$6,null,null,'outcome-transaction-requirement-binding-v0.1',$7,now())", [TENANT, ids.tx, ids.blueprint, "a".repeat(64), ids.profile, "d".repeat(64), "e".repeat(64)]);
    const payload = { owner_tenant_id: TENANT, outcome_transaction_id: ids.tx, transaction: { ownerTenantId: TENANT, transactionId: ids.tx, projectId: ids.project, assetId: ids.asset, baseVersionId: ids.version, rawRequest: "zero" }, asset: { id: ids.asset, ownerTenantId: TENANT, projectId: ids.project, currentVersionId: ids.version }, sourceVersion: { id: ids.version, ownerTenantId: TENANT, assetId: ids.asset, versionNumber: 1, parentVersionId: null, state: {} }, binding: { bindingHash: "e".repeat(64), blueprintId: ids.blueprint, blueprintVersion: 1, blueprintHash: "a".repeat(64), requirementProfileId: ids.profile, requirementProfileVersion: 1, requirementProfileHash: "d".repeat(64) }, requirements: [requirement], dependency_snapshot: snapshot, qualifications: [{ ...qualification, signalReferences: [] }], readiness };
    const result = await call(payload);
    expect(result.rows[0].result.authority_commit_id).toBeTruthy();
    expect(readiness.state).toBe("INSUFFICIENT_SIGNAL");
    const status = await admin.query("select status from public.outcome_transactions where id=$1", [ids.tx]);
    expect(status.rows[0].status).toBe("PREPARED");
    const signals = await admin.query("select count(*)::int as count from public.build002_signals where outcome_transaction_id=$1", [ids.tx]);
    expect(signals.rows[0].count).toBe(0);
  });

  it("keeps the transaction PREPARED and leaves execution/state-commit tables untouched", async () => {
    const row = await admin.query("select status from public.outcome_transactions where id=$1", [TX]);
    expect(row.rows[0].status).toBe("PREPARED");
    const counts = await admin.query("select (select count(*) from public.mutation_leases) as mutation_leases, (select count(*) from public.execution_runs) as execution_runs, (select count(*) from public.verification_runs) as verification_runs, (select count(*) from public.state_commits) as state_commits");
    expect(Object.values(counts.rows[0]).every((value) => String(value) === "0")).toBe(true);
  });
});
