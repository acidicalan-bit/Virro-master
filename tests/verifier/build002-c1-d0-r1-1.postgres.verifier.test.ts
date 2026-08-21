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
type RaceIds = { project: string; asset: string; version: string; tx: string; blueprint: string; profile: string; requirementRow: string; signal: string; requirementId: string; qualification: string; readiness: string; versionB?: string };

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

function raceGraph(ids: RaceIds, hashSeed: string): Graph {
  const now = new Date(Date.now() - 60_000).toISOString();
  const h = { blueprint: hashSeed.repeat(64), asset: (hashSeed === "a" ? "b" : "a").repeat(64), tx: "c".repeat(64) };
  const requirement = compileSignalRequirement({ requirementId: ids.requirementId, subjectKind: "OUTCOME_TRANSACTION", semanticType: "TEXT", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }], blueprintId: ids.blueprint, blueprintVersion: 1, blueprintHash: h.blueprint, policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, now);
  const signal = createSignal({ signalId: ids.signal, ownerTenantId: TENANT, transactionId: ids.tx, requirementId: requirement.requirementId, payload: { verifier: "v3b" }, source: { identity: "independent-v3b", version: "1", hash: "d".repeat(64) }, provenance: "OBSERVED", capturedAt: new Date(Date.parse(now) - 30_000).toISOString(), validUntil: new Date(Date.parse(now) + 3_600_000).toISOString(), dependency: { identity: "asset.version", hash: h.asset }, schemaVersion: "build002-signal-v0.2" });
  const snapshot = createDependencySnapshot({ schemaVersion: "build002-dependency-snapshot-v0.2", ownerTenantId: TENANT, transactionId: ids.tx, requirementDefinitionHashes: [requirement.requirementDefinitionHash], signalReferences: [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }], dependencyBindings: [{ identity: "asset.version", hash: h.asset }, { identity: "blueprint", hash: h.blueprint }, { identity: "transaction.semantic", hash: h.tx }], blueprintHash: h.blueprint, policyHash: null, taskSpecHash: null, transactionSemanticHash: h.tx, sourceAssetVersionHash: h.asset, contextLensHash: null });
  const evaluator = currentDefaultEvaluator();
  const qualification = evaluateSignalQualification({ requirement, signals: [signal], currentDependencySnapshot: snapshot, evaluator, evaluationTime: now, idFactory: () => ids.qualification });
  const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: ids.tx }, requirements: [requirement], qualifications: [qualification], dependencySnapshot: snapshot, evaluator, evaluationTime: now, idFactory: () => ids.readiness });
  const payload: Record<string, unknown> = { owner_tenant_id: TENANT, outcome_transaction_id: ids.tx, transaction: { ownerTenantId: TENANT, transactionId: ids.tx, projectId: ids.project, assetId: ids.asset, baseVersionId: ids.version, rawRequest: "v3b" }, asset: { id: ids.asset, ownerTenantId: TENANT, projectId: ids.project, currentVersionId: ids.version }, sourceVersion: { id: ids.version, ownerTenantId: TENANT, assetId: ids.asset, versionNumber: 1, parentVersionId: null, state: {} }, binding: { bindingHash: "e".repeat(64), blueprintId: ids.blueprint, blueprintVersion: 1, blueprintHash: h.blueprint, requirementProfileId: ids.profile, requirementProfileVersion: 1, requirementProfileHash: "f".repeat(64) }, requirements: [requirement], dependency_snapshot: snapshot, qualifications: [{ ...qualification, signalReferences: [{ signalId: signal.signalId, contentHash: signal.contentHash }] }], readiness, schema_version: "build002-readiness-authority-commit-v0.1" };
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

  function payloadWithReadinessId(payload: Record<string, unknown>, id: string): Record<string, unknown> {
    const next = structuredClone(payload) as Record<string, unknown> & { readiness: Record<string, unknown> };
    const { id: _oldId, readinessContentHash: _oldHash, createdAt, ...material } = next.readiness;
    void _oldId; void _oldHash;
    next.readiness = { ...material, id, createdAt, readinessContentHash: canonicalSha256(material) };
    return next;
  }

  function readinessOf(payload: Record<string, unknown>): Record<string, unknown> {
    return payload.readiness as Record<string, unknown>;
  }

  async function markerCount(): Promise<number> {
    const result = await admin.query("select count(*)::int as count from public.build002_readiness_authority_commits");
    return result.rows[0].count as number;
  }

  async function expectBoundaryRejection(payload: Record<string, unknown>, label: string): Promise<void> {
    try {
      await call(payload);
      throw new Error(`V3A_UNEXPECTED_ACCEPTANCE:${label}`);
    } catch (error) {
      const message = String(error);
      expect(message, label).toMatch(/V3A_UNEXPECTED_ACCEPTANCE|V3A_FORCED_MARKER_FAILURE|GRAPH_INVALID|COMMIT_FAILED|READINESS_AUTHORITY/);
      expect(message, label).not.toContain(`V3A_UNEXPECTED_ACCEPTANCE:${label}`);
      console.info(`V3A_REJECTION_${label}=${message}`);
    }
  }

  async function setUserTriggers(table: string, enabledState: "ENABLE" | "DISABLE"): Promise<void> {
    await admin.query(`alter table public.${table} ${enabledState} trigger all`);
  }

  async function seedReadiness(payload: Record<string, unknown>): Promise<void> {
    const input = payload as Record<string, unknown> & { readiness: Record<string, unknown>; dependency_snapshot: Record<string, unknown> };
    const readiness = input.readiness;
    const snapshot = await admin.query("select id from public.build002_dependency_snapshots where owner_tenant_id=$1 and outcome_transaction_id=$2 and dependency_snapshot_hash=$3", [TENANT, TX, (input.dependency_snapshot as { dependencySnapshotHash: string }).dependencySnapshotHash]);
    const snapshotId = snapshot.rows[0]?.id;
    if (!snapshotId) throw new Error("V3A_FIXTURE_SNAPSHOT_MISSING");
    await admin.query("insert into public.build002_delegation_readiness(id,owner_tenant_id,outcome_transaction_id,requirement_set_hash,qualification_set_hash,dependency_snapshot_id,dependency_snapshot_hash,task_spec_hash,source_asset_version_hash,blueprint_hash,policy_hash,evaluator,state,blocking_codes,condition_codes,created_at,valid_until,schema_version,readiness_content_hash) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,null,$11,$12,$13,$14,$15,$16,$17,$18)", [readiness.id, TENANT, TX, readiness.requirementSetHash, readiness.qualificationSetHash, snapshotId, readiness.dependencySnapshotHash, readiness.taskSpecHash ?? null, readiness.sourceAssetVersionHash ?? null, readiness.blueprintHash ?? null, JSON.stringify(readiness.evaluator), readiness.state, JSON.stringify(readiness.blockingCodes), JSON.stringify(readiness.conditionCodes), readiness.createdAt, readiness.validUntil ?? null, readiness.schemaVersion, readiness.readinessContentHash]);
    await admin.query("insert into public.build002_readiness_qualifications(owner_tenant_id,outcome_transaction_id,readiness_id,readiness_content_hash,qualification_id,qualification_content_hash) values ($1,$2,$3,$4,$5,$6)", [TENANT, TX, readiness.id, readiness.readinessContentHash, QUAL, value.qualification.qualificationContentHash]);
  }

  async function transactionTableSnapshot(transactionId: string): Promise<Record<string, string>> {
    const tables = [
      "build002_signal_requirements", "build002_dependency_snapshots", "build002_dependency_requirements",
      "build002_dependency_signals", "build002_signal_qualifications", "build002_qualification_signals",
      "build002_delegation_readiness", "build002_readiness_qualifications", "build002_readiness_authority_commits",
    ];
    const snapshot: Record<string, string> = {};
    for (const table of tables) {
      const rows = await admin.query(`select to_jsonb(t) as row from public.${table} t where owner_tenant_id=$1 and outcome_transaction_id=$2 order by to_jsonb(t)::text`, [TENANT, transactionId]);
      snapshot[table] = JSON.stringify(rows.rows.map((row) => row.row));
    }
    return snapshot;
  }

  async function insertRequirement(client: Client, rowId: string, requirement: SignalRequirement, transactionId = TX, blueprintId = BLUEPRINT, blueprintHash = hashes.blueprint) {
    await client.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({ id: rowId, owner_tenant_id: TENANT, outcome_transaction_id: transactionId, requirement_id: requirement.requirementId, semantic_type: requirement.semanticType, critical: requirement.critical, accepted_provenance: requirement.acceptedProvenance, qualification_rule: requirement.qualificationRule, dependency_selectors: requirement.dependencySelectors, blueprint_id: blueprintId, blueprint_version: 1, blueprint_hash: blueprintHash, policy_id: null, policy_hash: null, schema_version: requirement.definitionSchemaVersion, requirement_definition_hash: requirement.requirementDefinitionHash, created_at: requirement.createdAt })]);
  }

  async function insertSignal(client: Client, signal: Signal, requirement: SignalRequirement, transactionId = TX) {
    await client.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: signal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: transactionId, requirement_id: signal.requirementId, requirement_definition_hash: requirement.requirementDefinitionHash, payload: signal.payload, source: signal.source, provenance: signal.provenance, captured_at: signal.capturedAt, valid_until: signal.validUntil, dependency_identity: signal.dependency.identity, dependency_hash: signal.dependency.hash, schema_version: signal.schemaVersion, content_hash: signal.contentHash })]);
  }

  async function persistRaceFixture(ids: RaceIds, hashSeed: string, includeSecondVersion = false): Promise<Graph> {
    const fixture = raceGraph(ids, hashSeed);
    await admin.query("insert into public.projects(id,name,owner_tenant_id) values ($1,$2,$3)", [ids.project, `v3b-${ids.tx}`, TENANT]);
    await admin.query("insert into public.assets(id,project_id,name,owner_tenant_id,current_version_id) values ($1,$2,$3,$4,null)", [ids.asset, ids.project, `v3b-${ids.asset}`, TENANT]);
    await admin.query("insert into public.asset_versions(id,asset_id,version_number,state,owner_tenant_id) values ($1,$2,1,'{}',$3)", [ids.version, ids.asset, TENANT]);
    if (includeSecondVersion && ids.versionB) await admin.query("insert into public.asset_versions(id,asset_id,version_number,state,owner_tenant_id) values ($1,$2,2,'{}',$3)", [ids.versionB, ids.asset, TENANT]);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [ids.version, ids.asset]);
    await admin.query("insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,raw_request,status) values ($1,$2,$3,$4,$5,'v3b','PREPARED')", [ids.tx, TENANT, ids.project, ids.asset, ids.version]);
    const blueprintHash = hashSeed.repeat(64);
    await admin.query("insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,1,$2,null,'PUBLISHED',now(),$3::jsonb)", [ids.blueprint, blueprintHash, JSON.stringify({ id: ids.blueprint, version: 1, hash: blueprintHash, previousVersionHash: null })]);
    const profileHash = "f".repeat(64);
    await admin.query("insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,1,$2,null,$3,1,$4,null,null,'PUBLISHED',now(),$5::jsonb)", [ids.profile, profileHash, ids.blueprint, blueprintHash, JSON.stringify({ schemaVersion: "outcome-requirement-profile-v0.1", id: ids.profile, version: 1, previousVersionHash: null, blueprint: { id: ids.blueprint, version: 1, hash: blueprintHash }, policy: null, requirements: [{ requirementId: fixture.requirement.requirementId, semanticType: fixture.requirement.semanticType, critical: fixture.requirement.critical, acceptedProvenance: fixture.requirement.acceptedProvenance, qualificationRule: fixture.requirement.qualificationRule, dependencySelectors: fixture.requirement.dependencySelectors }] })]);
    await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id,outcome_transaction_id,blueprint_id,blueprint_version,blueprint_hash,requirement_profile_id,requirement_profile_version,requirement_profile_hash,policy_id,policy_hash,schema_version,binding_hash,bound_at) values ($1,$2,$3,1,$4,$5,1,$6,null,null,'outcome-transaction-requirement-binding-v0.1',$7,now())", [TENANT, ids.tx, ids.blueprint, blueprintHash, ids.profile, profileHash, "e".repeat(64)]);
    await insertRequirement(service, ids.requirementRow, fixture.requirement, ids.tx, ids.blueprint, blueprintHash);
    await insertSignal(service, fixture.signal, fixture.requirement, ids.tx);
    return fixture;
  }

  async function openRaceClient(label: string): Promise<{ client: Client; pid: number }> {
    const client = new Client({ connectionString: dbUrl(databaseUrl!, database) });
    await client.connect();
    await client.query("select set_config('application_name',$1,false)", [label]);
    const pid = Number((await client.query("select pg_backend_pid() as pid")).rows[0].pid);
    return { client, pid };
  }

  async function configureRaceClient(client: Client, role?: string): Promise<void> {
    if (role) await client.query(`set role ${role}`);
    await client.query("set statement_timeout='20000'");
    await client.query("set lock_timeout='15000'");
  }

  async function waitUntilBlocked(observer: Client, blockedPid: number, expectedBlockerPid: number): Promise<Record<string, unknown>> {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const result = await observer.query("select wait_event_type, wait_event, pg_blocking_pids($1)::int[] as blockers from pg_stat_activity where pid=$1", [blockedPid]);
      const row = result.rows[0] as { wait_event_type?: string; wait_event?: string; blockers?: number[] } | undefined;
      if (row?.blockers?.includes(expectedBlockerPid)) return row as Record<string, unknown>;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
    }
    throw new Error(`V3B_BLOCKING_NOT_OBSERVED:${blockedPid}:${expectedBlockerPid}`);
  }

  async function lockEvidence(observer: Client, pids: number[]): Promise<unknown[]> {
    const result = await observer.query("select pid, locktype, mode, granted, relation::regclass::text as relation, transactionid::text as transactionid from pg_locks where pid = any($1::int[]) and (relation is not null or transactionid is not null) order by pid, locktype, mode", [pids]);
    return result.rows;
  }

  async function markerCountFor(transactionId: string): Promise<number> {
    const result = await admin.query("select count(*)::int as count from public.build002_readiness_authority_commits where owner_tenant_id=$1 and outcome_transaction_id=$2", [TENANT, transactionId]);
    return result.rows[0].count as number;
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

  it("rejects qualification-link wrong-hash, missing, and extra variants without a marker", async () => {
    const qualificationLink = "build002_qualification_signals";
    const before = await markerCount();
    const wrongHashPayload = payloadWithReadinessId(value.payload, "a9500000-0000-4000-8000-000000000101");
    await setUserTriggers(qualificationLink, "DISABLE");
    try { await admin.query("update public.build002_qualification_signals set signal_content_hash=$1 where owner_tenant_id=$2 and outcome_transaction_id=$3 and qualification_id=$4 and signal_id=$5", ["f".repeat(64), TENANT, TX, QUAL, SIG]); }
    finally { await setUserTriggers(qualificationLink, "ENABLE"); }
    try { await expectBoundaryRejection(wrongHashPayload, "QUALIFICATION_LINK_WRONG_HASH"); }
    finally {
      await setUserTriggers(qualificationLink, "DISABLE");
      await admin.query("update public.build002_qualification_signals set signal_content_hash=$1 where owner_tenant_id=$2 and outcome_transaction_id=$3 and qualification_id=$4 and signal_id=$5", [value.signal.contentHash, TENANT, TX, QUAL, SIG]);
      await setUserTriggers(qualificationLink, "ENABLE");
    }
    expect(await markerCount()).toBe(before);

    const missingPayload = payloadWithReadinessId(value.payload, "a9500000-0000-4000-8000-000000000102");
    await setUserTriggers(qualificationLink, "DISABLE");
    try { await admin.query("delete from public.build002_qualification_signals where owner_tenant_id=$1 and outcome_transaction_id=$2 and qualification_id=$3 and signal_id=$4", [TENANT, TX, QUAL, SIG]); }
    finally { await setUserTriggers(qualificationLink, "ENABLE"); }
    try { await expectBoundaryRejection(missingPayload, "QUALIFICATION_LINK_MISSING"); }
    finally {
      await setUserTriggers(qualificationLink, "DISABLE");
      await admin.query("insert into public.build002_qualification_signals(owner_tenant_id,outcome_transaction_id,qualification_id,qualification_content_hash,signal_id,signal_content_hash,requirement_id) values ($1,$2,$3,$4,$5,$6,$7)", [TENANT, TX, QUAL, value.qualification.qualificationContentHash, SIG, value.signal.contentHash, value.requirement.requirementId]);
      await setUserTriggers(qualificationLink, "ENABLE");
    }
    expect(await markerCount()).toBe(before);

    const { contentHash: _signalHash, signalId: _signalId, ...extraSignalInput } = value.signal;
    void _signalHash; void _signalId;
    const extraSignal = createSignal({ ...extraSignalInput, signalId: "a9300000-0000-4000-8000-000000000101", payload: { verifier: "v3a-extra" } });
    await insertSignal(service, extraSignal, value.requirement);
    await admin.query("alter table public.build002_qualification_signals disable trigger all");
    await admin.query("insert into public.build002_qualification_signals(owner_tenant_id,outcome_transaction_id,qualification_id,qualification_content_hash,signal_id,signal_content_hash,requirement_id) values ($1,$2,$3,$4,$5,$6,$7)", [TENANT, TX, QUAL, value.qualification.qualificationContentHash, extraSignal.signalId, extraSignal.contentHash, value.requirement.requirementId]);
    await admin.query("alter table public.build002_qualification_signals enable trigger all");
    const extraPayload = payloadWithReadinessId(value.payload, "a9500000-0000-4000-8000-000000000103");
    try { await expectBoundaryRejection(extraPayload, "QUALIFICATION_LINK_EXTRA"); }
    finally {
      await setUserTriggers("build002_qualification_signals", "DISABLE");
      await admin.query("delete from public.build002_qualification_signals where owner_tenant_id=$1 and outcome_transaction_id=$2 and qualification_id=$3 and signal_id=$4", [TENANT, TX, QUAL, extraSignal.signalId]);
      await setUserTriggers("build002_qualification_signals", "ENABLE");
      await setUserTriggers("build002_signals", "DISABLE");
      await admin.query("delete from public.build002_signals where signal_id=$1", [extraSignal.signalId]);
      await setUserTriggers("build002_signals", "ENABLE");
    }
    expect(await markerCount()).toBe(before);
  });

  it("rejects readiness-link wrong-hash, missing, and extra variants without a marker", async () => {
    const readinessLink = "build002_readiness_qualifications";
    const before = await markerCount();
    const wrongHashPayload = payloadWithReadinessId(value.payload, "a9500000-0000-4000-8000-000000000104");
    await seedReadiness(wrongHashPayload);
    await setUserTriggers(readinessLink, "DISABLE");
    try { await admin.query("update public.build002_readiness_qualifications set qualification_content_hash=$1 where owner_tenant_id=$2 and outcome_transaction_id=$3 and readiness_id=$4 and qualification_id=$5", ["e".repeat(64), TENANT, TX, readinessOf(wrongHashPayload).id, QUAL]); }
    finally { await setUserTriggers(readinessLink, "ENABLE"); }
    try { await expectBoundaryRejection(wrongHashPayload, "READINESS_LINK_WRONG_HASH"); }
    finally {
      await setUserTriggers(readinessLink, "DISABLE");
      await admin.query("update public.build002_readiness_qualifications set qualification_content_hash=$1 where owner_tenant_id=$2 and outcome_transaction_id=$3 and readiness_id=$4 and qualification_id=$5", [value.qualification.qualificationContentHash, TENANT, TX, readinessOf(wrongHashPayload).id, QUAL]);
      await admin.query("delete from public.build002_readiness_qualifications where owner_tenant_id=$1 and outcome_transaction_id=$2 and readiness_id=$3", [TENANT, TX, readinessOf(wrongHashPayload).id]);
      await setUserTriggers("build002_delegation_readiness", "DISABLE");
      await admin.query("delete from public.build002_delegation_readiness where owner_tenant_id=$1 and outcome_transaction_id=$2 and id=$3", [TENANT, TX, readinessOf(wrongHashPayload).id]);
      await setUserTriggers("build002_delegation_readiness", "ENABLE");
      await setUserTriggers(readinessLink, "ENABLE");
    }
    expect(await markerCount()).toBe(before);

    const missingPayload = payloadWithReadinessId(value.payload, "a9500000-0000-4000-8000-000000000105");
    await seedReadiness(missingPayload);
    await setUserTriggers(readinessLink, "DISABLE");
    try { await admin.query("delete from public.build002_readiness_qualifications where owner_tenant_id=$1 and outcome_transaction_id=$2 and readiness_id=$3 and qualification_id=$4", [TENANT, TX, readinessOf(missingPayload).id, QUAL]); }
    finally { await setUserTriggers(readinessLink, "ENABLE"); }
    try { await expectBoundaryRejection(missingPayload, "READINESS_LINK_MISSING"); }
    finally {
      await setUserTriggers(readinessLink, "DISABLE");
      await admin.query("insert into public.build002_readiness_qualifications(owner_tenant_id,outcome_transaction_id,readiness_id,readiness_content_hash,qualification_id,qualification_content_hash) values ($1,$2,$3,$4,$5,$6)", [TENANT, TX, readinessOf(missingPayload).id, readinessOf(missingPayload).readinessContentHash, QUAL, value.qualification.qualificationContentHash]);
      await admin.query("delete from public.build002_readiness_qualifications where owner_tenant_id=$1 and outcome_transaction_id=$2 and readiness_id=$3", [TENANT, TX, readinessOf(missingPayload).id]);
      await setUserTriggers("build002_delegation_readiness", "DISABLE");
      await admin.query("delete from public.build002_delegation_readiness where owner_tenant_id=$1 and outcome_transaction_id=$2 and id=$3", [TENANT, TX, readinessOf(missingPayload).id]);
      await setUserTriggers("build002_delegation_readiness", "ENABLE");
      await setUserTriggers(readinessLink, "ENABLE");
    }
    expect(await markerCount()).toBe(before);

    const extraQualification = "a9400000-0000-0000-8000-000000000102";
    const extraPayload = payloadWithReadinessId(value.payload, "a9500000-0000-4000-8000-000000000106");
    await seedReadiness(extraPayload);
    await admin.query("insert into public.build002_signal_qualifications(id,owner_tenant_id,outcome_transaction_id,requirement_id,requirement_definition_hash,dependency_snapshot_id,dependency_snapshot_hash,signal_ids,signal_content_hashes,evaluator,outcome,reason_code,evidence_valid_until,qualified_at,schema_version,qualification_content_hash) select $1,owner_tenant_id,outcome_transaction_id,requirement_id,requirement_definition_hash,dependency_snapshot_id,dependency_snapshot_hash,signal_ids,signal_content_hashes,evaluator,outcome,reason_code,evidence_valid_until,qualified_at,schema_version,qualification_content_hash from public.build002_signal_qualifications where id=$2", [extraQualification, QUAL]);
    await admin.query("insert into public.build002_readiness_qualifications(owner_tenant_id,outcome_transaction_id,readiness_id,readiness_content_hash,qualification_id,qualification_content_hash) values ($1,$2,$3,$4,$5,$6)", [TENANT, TX, readinessOf(extraPayload).id, readinessOf(extraPayload).readinessContentHash, extraQualification, value.qualification.qualificationContentHash]);
    try { await expectBoundaryRejection(extraPayload, "READINESS_LINK_EXTRA"); }
    finally {
      await setUserTriggers(readinessLink, "DISABLE");
      await admin.query("delete from public.build002_readiness_qualifications where owner_tenant_id=$1 and outcome_transaction_id=$2 and readiness_id=$3", [TENANT, TX, readinessOf(extraPayload).id]);
      await setUserTriggers("build002_delegation_readiness", "DISABLE");
      await admin.query("delete from public.build002_delegation_readiness where owner_tenant_id=$1 and outcome_transaction_id=$2 and id=$3", [TENANT, TX, readinessOf(extraPayload).id]);
      await setUserTriggers("build002_delegation_readiness", "ENABLE");
      await setUserTriggers(readinessLink, "ENABLE");
      await setUserTriggers("build002_signal_qualifications", "DISABLE");
      await admin.query("delete from public.build002_signal_qualifications where id=$1", [extraQualification]);
      await setUserTriggers("build002_signal_qualifications", "ENABLE");
    }
    expect(await markerCount()).toBe(before);
  });

  it("rolls back a valid new graph on a verifier-only AFTER INSERT marker failure", async () => {
    const ids = { project: "c9000000-0000-4000-8000-000000000101", asset: "d9000000-0000-4000-8000-000000000101", version: "e9000000-0000-4000-8000-000000000101", tx: "f9000000-0000-4000-8000-000000000101", blueprint: "a9100000-0000-4000-8000-000000000101", profile: "a9100000-0000-4000-8000-000000000102", requirementRow: "a9200000-0000-4000-8000-000000000101", signal: "a9300000-0000-4000-8000-000000000102", qualification: "a9400000-0000-4000-8000-000000000102", readiness: "a9500000-0000-4000-8000-000000000107" };
    const createdAt = new Date(Date.now() - 60_000).toISOString();
    const requirement = compileSignalRequirement({ requirementId: "signal.verifier.v3a.rollback", subjectKind: "OUTCOME_TRANSACTION", semanticType: "TEXT", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }], blueprintId: ids.blueprint, blueprintVersion: 1, blueprintHash: "a".repeat(64), policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, createdAt);
    const signal = createSignal({ signalId: ids.signal, ownerTenantId: TENANT, transactionId: ids.tx, requirementId: requirement.requirementId, payload: { verifier: "v3a-rollback" }, source: { identity: "independent-v3a", version: "1", hash: "b".repeat(64) }, provenance: "OBSERVED", capturedAt: new Date(Date.parse(createdAt) - 30_000).toISOString(), validUntil: new Date(Date.parse(createdAt) + 3_600_000).toISOString(), dependency: { identity: "asset.version", hash: "c".repeat(64) }, schemaVersion: "build002-signal-v0.2" });
    const snapshot = createDependencySnapshot({ schemaVersion: "build002-dependency-snapshot-v0.2", ownerTenantId: TENANT, transactionId: ids.tx, requirementDefinitionHashes: [requirement.requirementDefinitionHash], signalReferences: [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }], dependencyBindings: [{ identity: "asset.version", hash: "c".repeat(64) }, { identity: "blueprint", hash: "a".repeat(64) }, { identity: "transaction.semantic", hash: "d".repeat(64) }], blueprintHash: "a".repeat(64), policyHash: null, taskSpecHash: null, transactionSemanticHash: "d".repeat(64), sourceAssetVersionHash: "c".repeat(64), contextLensHash: null });
    const evaluator = currentDefaultEvaluator();
    const qualification = evaluateSignalQualification({ requirement, signals: [signal], currentDependencySnapshot: snapshot, evaluator, evaluationTime: createdAt, idFactory: () => ids.qualification });
    const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: ids.tx }, requirements: [requirement], qualifications: [qualification], dependencySnapshot: snapshot, evaluator, evaluationTime: createdAt, idFactory: () => ids.readiness });

    await admin.query("insert into public.projects(id,name,owner_tenant_id) values ($1,'v3a-rollback',$2)", [ids.project, TENANT]);
    await admin.query("insert into public.assets(id,project_id,name,owner_tenant_id,current_version_id) values ($1,$2,'v3a-rollback',$3,null)", [ids.asset, ids.project, TENANT]);
    await admin.query("insert into public.asset_versions(id,asset_id,version_number,state,owner_tenant_id) values ($1,$2,1,'{}',$3)", [ids.version, ids.asset, TENANT]);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [ids.version, ids.asset]);
    await admin.query("insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,raw_request,status) values ($1,$2,$3,$4,$5,'v3a-rollback','PREPARED')", [ids.tx, TENANT, ids.project, ids.asset, ids.version]);
    await admin.query("insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,1,$2,null,'PUBLISHED',now(),$3::jsonb)", [ids.blueprint, "a".repeat(64), JSON.stringify({ id: ids.blueprint, version: 1, hash: "a".repeat(64), previousVersionHash: null })]);
    await admin.query("insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,1,$2,null,$3,1,$4,null,null,'PUBLISHED',now(),$5::jsonb)", [ids.profile, "e".repeat(64), ids.blueprint, "a".repeat(64), JSON.stringify({ schemaVersion: "outcome-requirement-profile-v0.1", id: ids.profile, version: 1, previousVersionHash: null, blueprint: { id: ids.blueprint, version: 1, hash: "a".repeat(64) }, policy: null, requirements: [{ requirementId: requirement.requirementId, semanticType: requirement.semanticType, critical: requirement.critical, acceptedProvenance: requirement.acceptedProvenance, qualificationRule: requirement.qualificationRule, dependencySelectors: requirement.dependencySelectors }] })]);
    await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id,outcome_transaction_id,blueprint_id,blueprint_version,blueprint_hash,requirement_profile_id,requirement_profile_version,requirement_profile_hash,policy_id,policy_hash,schema_version,binding_hash,bound_at) values ($1,$2,$3,1,$4,$5,1,$6,null,null,'outcome-transaction-requirement-binding-v0.1',$7,now())", [TENANT, ids.tx, ids.blueprint, "a".repeat(64), ids.profile, "e".repeat(64), "f".repeat(64)]);
    await insertRequirement(service, ids.requirementRow, requirement, ids.tx, ids.blueprint, "a".repeat(64));
    await insertSignal(service, signal, requirement, ids.tx);

    const payload = { owner_tenant_id: TENANT, outcome_transaction_id: ids.tx, transaction: { ownerTenantId: TENANT, transactionId: ids.tx, projectId: ids.project, assetId: ids.asset, baseVersionId: ids.version, rawRequest: "v3a-rollback" }, asset: { id: ids.asset, ownerTenantId: TENANT, projectId: ids.project, currentVersionId: ids.version }, sourceVersion: { id: ids.version, ownerTenantId: TENANT, assetId: ids.asset, versionNumber: 1, parentVersionId: null, state: {} }, binding: { bindingHash: "f".repeat(64), blueprintId: ids.blueprint, blueprintVersion: 1, blueprintHash: "a".repeat(64), requirementProfileId: ids.profile, requirementProfileVersion: 1, requirementProfileHash: "e".repeat(64) }, requirements: [requirement], dependency_snapshot: snapshot, qualifications: [{ ...qualification, signalReferences: [{ signalId: signal.signalId, contentHash: signal.contentHash }] }], readiness, schema_version: "build002-readiness-authority-commit-v0.1" };
    const historicalBefore = await transactionTableSnapshot(TX);
    const newBefore = await transactionTableSnapshot(ids.tx);
    await admin.query("create or replace function public.verifier_v3a_fail_marker() returns trigger language plpgsql as $$ begin raise exception 'V3A_FORCED_MARKER_FAILURE'; end; $$");
    await admin.query("drop trigger if exists verifier_v3a_fail_marker on public.build002_readiness_authority_commits");
    await admin.query("create trigger verifier_v3a_fail_marker after insert on public.build002_readiness_authority_commits for each row execute function public.verifier_v3a_fail_marker()");
    try {
      await expectBoundaryRejection(payload, "ATOMIC_ROLLBACK");
    } finally {
      await admin.query("drop trigger if exists verifier_v3a_fail_marker on public.build002_readiness_authority_commits");
      await admin.query("drop function if exists public.verifier_v3a_fail_marker()");
    }
    const newAfter = await transactionTableSnapshot(ids.tx);
    const historicalAfter = await transactionTableSnapshot(TX);
    expect(newAfter).toEqual(newBefore);
    expect(historicalAfter).toEqual(historicalBefore);
    console.info("V3A_ATOMIC_ROLLBACK_NEW_ROW_DELTA=0");
    console.info("V3A_HISTORICAL_ROWS_SURVIVE=PASS");
  });

  it("serializes Signal universe changes in both directions", async () => {
    const changeIds: RaceIds = { project: "c9000000-0000-4000-8000-000000000201", asset: "d9000000-0000-4000-8000-000000000201", version: "e9000000-0000-4000-8000-000000000201", tx: "f9000000-0000-4000-8000-000000000201", blueprint: "a9100000-0000-4000-8000-000000000201", profile: "a9100000-0000-4000-8000-000000000202", requirementRow: "a9200000-0000-4000-8000-000000000201", signal: "a9300000-0000-4000-8000-000000000201", requirementId: "signal.verifier.v3b.signal.change", qualification: "a9400000-0000-4000-8000-000000000201", readiness: "a9500000-0000-4000-8000-000000000201" };
    const changeFixture = await persistRaceFixture(changeIds, "a");
    const changeB = await openRaceClient("v3b-signal-change-first-b");
    const changeA = await openRaceClient("v3b-signal-change-first-a");
    const changeO = await openRaceClient("v3b-signal-change-first-o");
    const changeC = await openRaceClient("v3b-signal-change-first-c");
    try {
      await configureRaceClient(changeB.client, "service_role");
      await configureRaceClient(changeA.client, "service_role");
      const { contentHash: _changeHash, signalId: _changeSignalId, ...changeSignalInput } = changeFixture.signal;
      void _changeHash; void _changeSignalId;
      const signalB = createSignal({ ...changeSignalInput, signalId: "a9300000-0000-4000-8000-000000000202", payload: { verifier: "v3b-signal-s2" } });
      await changeB.client.query("begin");
      await insertSignal(changeB.client, signalB, changeFixture.requirement, changeIds.tx);
      await changeB.client.query("commit");
      await expect(changeB.client.query("select signal_id from public.build002_signals where signal_id=$1", [signalB.signalId])).resolves.toBeDefined();
      const before = await markerCountFor(changeIds.tx);
      await expect(changeA.client.query("select public.build002_commit_readiness_authority($1::uuid,$2::jsonb)", [ACTOR, JSON.stringify(changeFixture.payload)])).rejects.toThrow(/SIGNAL_UNIVERSE_CHANGED|COMMIT_FAILED/);
      expect(await markerCountFor(changeIds.tx)).toBe(before);
      console.info("V3B_SIGNAL_CHANGE_FIRST=PASS rejection=READINESS_AUTHORITY_SIGNAL_UNIVERSE_CHANGED marker_delta=0");
    } finally {
      await changeB.client.end(); await changeA.client.end(); await changeO.client.end(); await changeC.client.end();
    }

    const lockIds: RaceIds = { project: "c9000000-0000-4000-8000-000000000211", asset: "d9000000-0000-4000-8000-000000000211", version: "e9000000-0000-4000-8000-000000000211", tx: "f9000000-0000-4000-8000-000000000211", blueprint: "a9100000-0000-4000-8000-000000000211", profile: "a9100000-0000-4000-8000-000000000212", requirementRow: "a9200000-0000-4000-8000-000000000211", signal: "a9300000-0000-4000-8000-000000000211", requirementId: "signal.verifier.v3b.signal.lock", qualification: "a9400000-0000-4000-8000-000000000211", readiness: "a9500000-0000-4000-8000-000000000211" };
    const lockFixture = await persistRaceFixture(lockIds, "b");
    const a = await openRaceClient("v3b-signal-d0-a");
    const b = await openRaceClient("v3b-signal-d0-b");
    const c = await openRaceClient("v3b-signal-d0-c");
    const o = await openRaceClient("v3b-signal-d0-o");
    let aPromise: Promise<unknown> | undefined;
    let bPromise: Promise<unknown> | undefined;
    try {
      await configureRaceClient(a.client, "service_role");
      await configureRaceClient(b.client, "service_role");
      await configureRaceClient(c.client);
      await configureRaceClient(o.client);
      const { contentHash: _lockHash, signalId: _lockSignalId, ...lockSignalInput } = lockFixture.signal;
      void _lockHash; void _lockSignalId;
      const signalB = createSignal({ ...lockSignalInput, signalId: "a9300000-0000-4000-8000-000000000212", payload: { verifier: "v3b-signal-parked-s2" } });
      await c.client.query("begin");
      await c.client.query("select id from public.assets where id=$1 for update", [lockIds.asset]);
      await a.client.query("begin");
      aPromise = a.client.query("select public.build002_commit_readiness_authority($1::uuid,$2::jsonb) as result", [ACTOR, JSON.stringify(lockFixture.payload)]);
      const aBlocked = await waitUntilBlocked(o.client, a.pid, c.pid);
      await b.client.query("begin");
      bPromise = insertSignal(b.client, signalB, lockFixture.requirement, lockIds.tx);
      const bBlocked = await waitUntilBlocked(o.client, b.pid, a.pid);
      const locks = await lockEvidence(o.client, [a.pid, b.pid, c.pid]);
      console.info(`V3B_SIGNAL_D0_FIRST A_PID=${a.pid} B_PID=${b.pid} C_PID=${c.pid} A_BLOCKED_BY=${c.pid} B_BLOCKED_BY=${a.pid} A_WAIT_EVENT_TYPE=${String(aBlocked.wait_event_type)} A_WAIT_EVENT=${String(aBlocked.wait_event)} B_WAIT_EVENT_TYPE=${String(bBlocked.wait_event_type)} B_WAIT_EVENT=${String(bBlocked.wait_event)} LOCKS=${JSON.stringify(locks)}`);
      await c.client.query("commit");
      await aPromise;
      await a.client.query("commit");
      await bPromise;
      await b.client.query("commit");
      const marker = await markerCountFor(lockIds.tx);
      const inserted = await admin.query("select count(*)::int as count from public.build002_signals where signal_id=$1", [signalB.signalId]);
      expect(marker).toBe(1);
      expect(inserted.rows[0].count).toBe(1);
      const status = await admin.query("select status from public.outcome_transactions where id=$1", [lockIds.tx]);
      expect(status.rows[0].status).toBe("PREPARED");
      console.info("V3B_SIGNAL_D0_FIRST=PASS SIGNAL_LOCK_CHAIN=B->A->C POST_COMMIT_SIGNAL_CHANGE_MAKES_CURRENTNESS_REVALIDATION_REQUIRED=YES");
    } finally {
      if (aPromise) await a.client.query("rollback").catch(() => undefined);
      if (bPromise) await b.client.query("rollback").catch(() => undefined);
      await a.client.end(); await b.client.end(); await c.client.end(); await o.client.end();
    }
  });

  it("serializes Membership revocation in both directions", async () => {
    const firstIds: RaceIds = { project: "c9000000-0000-4000-8000-000000000221", asset: "d9000000-0000-4000-8000-000000000221", version: "e9000000-0000-4000-8000-000000000221", tx: "f9000000-0000-4000-8000-000000000221", blueprint: "a9100000-0000-4000-8000-000000000221", profile: "a9100000-0000-4000-8000-000000000222", requirementRow: "a9200000-0000-4000-8000-000000000221", signal: "a9300000-0000-4000-8000-000000000221", requirementId: "signal.verifier.v3b.membership.first", qualification: "a9400000-0000-4000-8000-000000000221", readiness: "a9500000-0000-4000-8000-000000000221" };
    const firstFixture = await persistRaceFixture(firstIds, "c");
    const revokeFirst = await openRaceClient("v3b-membership-change-first-b");
    const attemptAfterRevoke = await openRaceClient("v3b-membership-change-first-a");
    try {
      await configureRaceClient(attemptAfterRevoke.client, "service_role");
      await configureRaceClient(revokeFirst.client);
      await revokeFirst.client.query("begin");
      await revokeFirst.client.query("update public.tenant_memberships set status='REVOKED' where tenant_id=$1 and principal_id=$2", [TENANT, ACTOR]);
      await revokeFirst.client.query("commit");
      const before = await markerCountFor(firstIds.tx);
      await expect(attemptAfterRevoke.client.query("select public.build002_commit_readiness_authority($1::uuid,$2::jsonb)", [ACTOR, JSON.stringify(firstFixture.payload)])).rejects.toThrow(/MEMBERSHIP_INVALID|COMMIT_FAILED/);
      expect(await markerCountFor(firstIds.tx)).toBe(before);
      console.info("V3B_MEMBERSHIP_REVOCATION_FIRST=PASS rejection=READINESS_AUTHORITY_MEMBERSHIP_INVALID marker_delta=0");
    } finally {
      await admin.query("update public.tenant_memberships set status='ACTIVE' where tenant_id=$1 and principal_id=$2", [TENANT, ACTOR]);
      await revokeFirst.client.end(); await attemptAfterRevoke.client.end();
    }

    const lockIds: RaceIds = { project: "c9000000-0000-4000-8000-000000000231", asset: "d9000000-0000-4000-8000-000000000231", version: "e9000000-0000-4000-8000-000000000231", tx: "f9000000-0000-4000-8000-000000000231", blueprint: "a9100000-0000-4000-8000-000000000231", profile: "a9100000-0000-4000-8000-000000000232", requirementRow: "a9200000-0000-4000-8000-000000000231", signal: "a9300000-0000-4000-8000-000000000231", requirementId: "signal.verifier.v3b.membership.lock", qualification: "a9400000-0000-4000-8000-000000000231", readiness: "a9500000-0000-4000-8000-000000000231" };
    const lockFixture = await persistRaceFixture(lockIds, "d");
    const a = await openRaceClient("v3b-membership-d0-a");
    const b = await openRaceClient("v3b-membership-d0-b");
    const c = await openRaceClient("v3b-membership-d0-c");
    const o = await openRaceClient("v3b-membership-d0-o");
    let aPromise: Promise<unknown> | undefined;
    let bPromise: Promise<unknown> | undefined;
    try {
      await configureRaceClient(a.client, "service_role");
      await configureRaceClient(b.client);
      await configureRaceClient(c.client);
      await configureRaceClient(o.client);
      await c.client.query("begin");
      await c.client.query("select id from public.outcome_transactions where owner_tenant_id=$1 and id=$2 for update", [TENANT, lockIds.tx]);
      await a.client.query("begin");
      aPromise = a.client.query("select public.build002_commit_readiness_authority($1::uuid,$2::jsonb) as result", [ACTOR, JSON.stringify(lockFixture.payload)]);
      const aBlocked = await waitUntilBlocked(o.client, a.pid, c.pid);
      await b.client.query("begin");
      bPromise = b.client.query("update public.tenant_memberships set status='REVOKED' where tenant_id=$1 and principal_id=$2", [TENANT, ACTOR]);
      const bBlocked = await waitUntilBlocked(o.client, b.pid, a.pid);
      const locks = await lockEvidence(o.client, [a.pid, b.pid, c.pid]);
      console.info(`V3B_MEMBERSHIP_D0_FIRST A_PID=${a.pid} B_PID=${b.pid} C_PID=${c.pid} A_BLOCKED_BY=${c.pid} B_BLOCKED_BY=${a.pid} A_WAIT_EVENT_TYPE=${String(aBlocked.wait_event_type)} A_WAIT_EVENT=${String(aBlocked.wait_event)} B_WAIT_EVENT_TYPE=${String(bBlocked.wait_event_type)} B_WAIT_EVENT=${String(bBlocked.wait_event)} LOCKS=${JSON.stringify(locks)}`);
      await c.client.query("commit");
      await aPromise;
      await a.client.query("commit");
      await bPromise;
      await b.client.query("commit");
      expect(await markerCountFor(lockIds.tx)).toBe(1);
      const status = await admin.query("select status from public.outcome_transactions where id=$1", [lockIds.tx]);
      const membership = await admin.query("select status from public.tenant_memberships where tenant_id=$1 and principal_id=$2", [TENANT, ACTOR]);
      expect(status.rows[0].status).toBe("PREPARED");
      expect(membership.rows[0].status).toBe("REVOKED");
      console.info("V3B_MEMBERSHIP_D0_FIRST=PASS MEMBERSHIP_LOCK_CHAIN=B->A->C");
    } finally {
      await admin.query("update public.tenant_memberships set status='ACTIVE' where tenant_id=$1 and principal_id=$2", [TENANT, ACTOR]);
      if (aPromise) await a.client.query("rollback").catch(() => undefined);
      if (bPromise) await b.client.query("rollback").catch(() => undefined);
      await a.client.end(); await b.client.end(); await c.client.end(); await o.client.end();
    }
  });

  it("serializes Asset head changes in both directions", async () => {
    const firstIds: RaceIds = { project: "c9000000-0000-4000-8000-000000000241", asset: "d9000000-0000-4000-8000-000000000241", version: "e9000000-0000-4000-8000-000000000241", versionB: "e9000000-0000-4000-8000-000000000242", tx: "f9000000-0000-4000-8000-000000000241", blueprint: "a9100000-0000-4000-8000-000000000241", profile: "a9100000-0000-4000-8000-000000000242", requirementRow: "a9200000-0000-4000-8000-000000000241", signal: "a9300000-0000-4000-8000-000000000241", requirementId: "signal.verifier.v3b.asset.first", qualification: "a9400000-0000-4000-8000-000000000241", readiness: "a9500000-0000-4000-8000-000000000241" };
    const firstFixture = await persistRaceFixture(firstIds, "e", true);
    const headFirst = await openRaceClient("v3b-asset-change-first-b");
    const attemptOld = await openRaceClient("v3b-asset-change-first-a");
    try {
      await configureRaceClient(headFirst.client);
      await configureRaceClient(attemptOld.client, "service_role");
      await headFirst.client.query("begin");
      await headFirst.client.query("update public.assets set current_version_id=$1 where id=$2", [firstIds.versionB, firstIds.asset]);
      await headFirst.client.query("commit");
      const before = await markerCountFor(firstIds.tx);
      await expect(attemptOld.client.query("select public.build002_commit_readiness_authority($1::uuid,$2::jsonb)", [ACTOR, JSON.stringify(firstFixture.payload)])).rejects.toThrow(/SOURCE_ASSET_HEAD_CHANGED|SOURCE_CHANGED|COMMIT_FAILED/);
      expect(await markerCountFor(firstIds.tx)).toBe(before);
      console.info("V3B_ASSET_HEAD_CHANGE_FIRST=PASS rejection=SOURCE_ASSET_HEAD_CHANGED marker_delta=0");
    } finally {
      await headFirst.client.end(); await attemptOld.client.end();
    }

    const lockIds: RaceIds = { project: "c9000000-0000-4000-8000-000000000251", asset: "d9000000-0000-4000-8000-000000000251", version: "e9000000-0000-4000-8000-000000000251", versionB: "e9000000-0000-4000-8000-000000000252", tx: "f9000000-0000-4000-8000-000000000251", blueprint: "a9100000-0000-4000-8000-000000000251", profile: "a9100000-0000-4000-8000-000000000252", requirementRow: "a9200000-0000-4000-8000-000000000251", signal: "a9300000-0000-4000-8000-000000000251", requirementId: "signal.verifier.v3b.asset.lock", qualification: "a9400000-0000-4000-8000-000000000251", readiness: "a9500000-0000-4000-8000-000000000251" };
    const lockFixture = await persistRaceFixture(lockIds, "f", true);
    const a = await openRaceClient("v3b-asset-d0-a");
    const b = await openRaceClient("v3b-asset-d0-b");
    const c = await openRaceClient("v3b-asset-d0-c");
    const o = await openRaceClient("v3b-asset-d0-o");
    let aPromise: Promise<unknown> | undefined;
    let bPromise: Promise<unknown> | undefined;
    try {
      await configureRaceClient(a.client, "service_role");
      await configureRaceClient(b.client);
      await configureRaceClient(c.client);
      await configureRaceClient(o.client);
      await c.client.query("begin");
      await c.client.query("select id from public.asset_versions where id=$1 for update", [lockIds.version]);
      await a.client.query("begin");
      aPromise = a.client.query("select public.build002_commit_readiness_authority($1::uuid,$2::jsonb) as result", [ACTOR, JSON.stringify(lockFixture.payload)]);
      const aBlocked = await waitUntilBlocked(o.client, a.pid, c.pid);
      await b.client.query("begin");
      bPromise = b.client.query("update public.assets set current_version_id=$1 where id=$2", [lockIds.versionB, lockIds.asset]);
      const bBlocked = await waitUntilBlocked(o.client, b.pid, a.pid);
      const locks = await lockEvidence(o.client, [a.pid, b.pid, c.pid]);
      console.info(`V3B_ASSET_D0_FIRST A_PID=${a.pid} B_PID=${b.pid} C_PID=${c.pid} A_BLOCKED_BY=${c.pid} B_BLOCKED_BY=${a.pid} A_WAIT_EVENT_TYPE=${String(aBlocked.wait_event_type)} A_WAIT_EVENT=${String(aBlocked.wait_event)} B_WAIT_EVENT_TYPE=${String(bBlocked.wait_event_type)} B_WAIT_EVENT=${String(bBlocked.wait_event)} LOCKS=${JSON.stringify(locks)}`);
      await c.client.query("commit");
      await aPromise;
      await a.client.query("commit");
      await bPromise;
      await b.client.query("commit");
      expect(await markerCountFor(lockIds.tx)).toBe(1);
      const status = await admin.query("select status from public.outcome_transactions where id=$1", [lockIds.tx]);
      const head = await admin.query("select current_version_id::text as current_version_id from public.assets where id=$1", [lockIds.asset]);
      expect(status.rows[0].status).toBe("PREPARED");
      expect(head.rows[0].current_version_id).toBe(lockIds.versionB);
      console.info("V3B_ASSET_D0_FIRST=PASS ASSET_LOCK_CHAIN=B->A->C");
    } finally {
      if (aPromise) await a.client.query("rollback").catch(() => undefined);
      if (bPromise) await b.client.query("rollback").catch(() => undefined);
      await a.client.end(); await b.client.end(); await c.client.end(); await o.client.end();
    }
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
