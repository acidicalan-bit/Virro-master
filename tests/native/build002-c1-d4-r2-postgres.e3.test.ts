// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { attachTaskSpecHash, taskSpecHashMaterial, verifyTaskSpecHash, type TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import { canonicalJson, canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
import { createSignal, compileSignalRequirement, createDependencySnapshot, currentDefaultEvaluator, evaluateSignalQualification, evaluateDelegationReadiness } from "@/src/domain/outcome/signal-readiness";
import { createDelegabilityAdmission } from "@/src/domain/outcome/delegability-admission";
import { SupabaseExecutionAuthorityRepository } from "@/src/infrastructure/persistence/outcome/supabase-execution-authority-repository";
import { Build002ExecutionAuthoritySchema, executionAuthorityHashMaterial, verifyExecutionAuthorityHash, type Build002ExecutionAuthority } from "@/src/domain/outcome/build002-execution-authority";
import { Build002MutationLeaseSchema, mutationLeaseHashMaterial, verifyBuild002MutationLeaseHash, type Build002MutationLease } from "@/src/domain/outcome/build002-mutation-lease";

const enabled = process.env.BUILD002_NATIVE_PG_C1_D4_R2 === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_D4_R2_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const ACTOR = "a2000000-0000-4000-8000-000000000001";
const ACTOR_B = "a2000000-0000-4000-8000-000000000002";
const TENANT = "b2000000-0000-4000-8000-000000000001";
const MEMBERSHIP = "b2000000-0000-4000-8000-000000000002";
const MEMBERSHIP_B = "b2000000-0000-4000-8000-000000000003";
const PROJECT = "c2000000-0000-4000-8000-000000000001";
const ASSET = "d2000000-0000-4000-8000-000000000001";
const VERSION = "e2000000-0000-4000-8000-000000000001";
const TRANSACTION = "f2000000-0000-4000-8000-000000000001";
const RUN = "a3000000-0000-4000-8000-000000000001";
const CANDIDATE = "a4000000-0000-4000-8000-000000000001";
const OUTCOME = "a5000000-0000-4000-8000-000000000001";
const BLUEPRINT = "a6000000-0000-4000-8000-000000000001";
const PROFILE = "a6000000-0000-4000-8000-000000000002";
const SIGNAL = "a7000000-0000-4000-8000-000000000001";
const SIGNAL_DRIFT = "a7000000-0000-4000-8000-000000000002";
const REQUIREMENT = "a8000000-0000-4000-8000-000000000001";
const REQUIREMENT_DRIFT = "a8000000-0000-4000-8000-000000000002";
const QUALIFICATION = "a9000000-0000-4000-8000-000000000001";
const READINESS = "aa000000-0000-4000-8000-000000000001";
const BLUEPRINT_HASH = "a".repeat(64);
const PROFILE_HASH = "b".repeat(64);
const BINDING_HASH = "c".repeat(64);
const SOURCE_SHA = "d".repeat(64);

function connection(url: string, database: string): string { const parsed = new URL(url); parsed.pathname = `/${database}`; return parsed.toString(); }

function authorityFromRow(row: Record<string, unknown>): Build002ExecutionAuthority {
  return Build002ExecutionAuthoritySchema.parse({
    schemaVersion: row.schema_version, executionAuthorityId: row.execution_authority_id, ownerTenantId: row.owner_tenant_id, principalId: row.principal_id, membershipId: row.membership_id,
    delegabilityAdmissionId: row.delegability_admission_id, delegabilityAdmissionContentHash: row.delegability_admission_content_hash, authorityCommitId: row.authority_commit_id, outcomeTransactionId: row.outcome_transaction_id,
    assetId: row.asset_id, sourceAssetVersionId: row.source_asset_version_id, sourceAssetVersionHash: row.source_asset_version_hash, taskSpecId: row.task_spec_id, taskSpecVersion: row.task_spec_version, taskSpecHash: row.task_spec_hash,
    blueprintId: row.blueprint_id, blueprintVersion: row.blueprint_version, blueprintHash: row.blueprint_hash, capabilityGrant: row.capability_grant, capabilityGrantHash: row.capability_grant_hash,
    historicalDependencySnapshotHash: row.historical_dependency_snapshot_hash, currentDependencySnapshotHash: row.current_dependency_snapshot_hash, evaluatorSchemaVersion: row.evaluator_schema_version, evaluatorVersion: row.evaluator_version, evaluatorDefinitionHash: row.evaluator_definition_hash,
    scope: row.scope, mutationLeaseGranted: row.mutation_lease_granted, executionStarted: row.execution_started, consequenceBoundary: row.consequence_boundary,
    delegabilityRevalidatedAt: isoTimestamp(row.delegability_revalidated_at), executionAuthorityRevalidatedAt: isoTimestamp(row.execution_authority_revalidated_at), grantedAt: isoTimestamp(row.granted_at),
    validUntil: row.valid_until === null ? null : isoTimestamp(row.valid_until), executionAuthorityContentHash: row.execution_authority_content_hash,
  });
}

function isoTimestamp(value: unknown): string { return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString(); }

function mutationLeaseFromRow(row: Record<string, unknown>): Build002MutationLease {
  return Build002MutationLeaseSchema.parse({
    schemaVersion: row.schema_version, mutationLeaseId: row.mutation_lease_id, ownerTenantId: row.owner_tenant_id,
    principalId: row.principal_id, membershipId: row.membership_id, executionAuthorityId: row.execution_authority_id,
    executionAuthorityContentHash: row.execution_authority_content_hash, delegabilityAdmissionId: row.delegability_admission_id,
    authorityCommitId: row.authority_commit_id, outcomeTransactionId: row.outcome_transaction_id, assetId: row.asset_id,
    sourceAssetVersionId: row.source_asset_version_id, sourceAssetVersionHash: row.source_asset_version_hash,
    taskSpecId: row.task_spec_id, taskSpecVersion: row.task_spec_version, taskSpecHash: row.task_spec_hash,
    blueprintId: row.blueprint_id, blueprintVersion: row.blueprint_version, blueprintHash: row.blueprint_hash,
    currentDependencySnapshotHash: row.current_dependency_snapshot_hash, capabilityGrantHash: row.capability_grant_hash,
    targetPath: row.target_path, category: row.category, scope: row.scope, executionStarted: row.execution_started,
    executionAuthorityRevalidatedAt: isoTimestamp(row.execution_authority_revalidated_at),
    mutationLeaseRevalidatedAt: isoTimestamp(row.mutation_lease_revalidated_at), grantedAt: isoTimestamp(row.granted_at),
    validUntil: isoTimestamp(row.valid_until), consequenceBoundary: row.consequence_boundary,
    mutationLeaseContentHash: row.mutation_lease_content_hash,
  });
}

function taskSpec(): TaskSpec {
  return attachTaskSpecHash({
    schemaVersion: "task-spec-v0.1", id: "ab000000-0000-4000-8000-000000000001", version: 1, previousVersionHash: null,
    status: "READY", transactionId: TRANSACTION,
    blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH },
    source: { assetId: ASSET, versionId: VERSION, sha256: SOURCE_SHA, mimeType: "image/png", byteSize: 10 },
    values: [
      { id: "requested.color", provenance: "CUSTOMER_STATED", critical: true, visibility: ["IMAGE_EXECUTOR"], value: { nested: [1, "x", true] } },
      { id: "requested.size", provenance: "CUSTOMER_STATED", critical: false, visibility: ["IMAGE_EXECUTOR"], value: 42 },
    ],
    constraints: [{ id: "preserve.subject", effect: "MUST_NOT", target: "subject", value: { untouched: true }, source: "BLUEPRINT_FIXED" }],
    capabilityGrant: ["READ_SOURCE", "WRITE_CANDIDATE"],
    criteria: [{ id: "SAME_SPEC", description: "same spec", critical: true, verifier: "SAME_SPEC_GATE", evidenceTypes: ["POLICY_CHECK"], roles: ["VERIFIER"] }],
    verificationPolicy: { requireSameSpecHash: true, criticalUnknownBlocksCommit: true, executorDoneIsEvidence: false },
    securityProfile: { promptInjectionPolicy: "TREAT_AS_DATA", embeddedSecretPolicy: "FORBID", unknownInputPolicy: "REQUIRE_INPUT" },
    compiler: { name: "r2a-native", version: "1.0.0" }, inputRequirements: [], rejectionReasons: [], createdAt: "2026-08-24T12:00:00.000Z",
  });
}

function graph() {
  const fixtureNow = Date.now();
  const evaluatedAt = new Date(fixtureNow - 60_000).toISOString();
  const capturedAt = new Date(fixtureNow - 120_000).toISOString();
  const validUntil = new Date(fixtureNow + 3_600_000).toISOString();
  const transactionSemanticHash = canonicalSha256({ schemaVersion: "build002-transaction-semantic-binding-v0.1", ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "r2a" });
  const sourceAssetVersionHash = canonicalSha256({ schemaVersion: "build002-source-asset-version-binding-v0.1", ownerTenantId: TENANT, assetId: ASSET, versionId: VERSION, versionNumber: 1, parentVersionId: null, state: { width: 100 } });
  const signal = createSignal({ signalId: SIGNAL, ownerTenantId: TENANT, transactionId: TRANSACTION, requirementId: "r2a.signal", payload: { value: "r2a" }, source: { identity: "r2a", version: "1", hash: SOURCE_SHA }, provenance: "OBSERVED", capturedAt, validUntil, dependency: { identity: "asset.version", hash: sourceAssetVersionHash }, schemaVersion: "build002-signal-v0.2" });
  const requirement = compileSignalRequirement({ requirementId: "r2a.signal", subjectKind: "OUTCOME_TRANSACTION", semanticType: "TEXT", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }, { identity: "transaction.semantic", required: true }], blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, evaluatedAt);
  const snapshot = createDependencySnapshot({ schemaVersion: "build002-dependency-snapshot-v0.2", ownerTenantId: TENANT, transactionId: TRANSACTION, requirementDefinitionHashes: [requirement.requirementDefinitionHash], signalReferences: [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }], dependencyBindings: [{ identity: "asset.version", hash: sourceAssetVersionHash }, { identity: "blueprint", hash: BLUEPRINT_HASH }, { identity: "transaction.semantic", hash: transactionSemanticHash }], blueprintHash: BLUEPRINT_HASH, policyHash: null, taskSpecHash: null, transactionSemanticHash, sourceAssetVersionHash, contextLensHash: null });
  const evaluator = currentDefaultEvaluator();
  const qualification = evaluateSignalQualification({ requirement, signals: [signal], currentDependencySnapshot: snapshot, evaluator, evaluationTime: evaluatedAt, idFactory: () => QUALIFICATION });
  const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TRANSACTION }, requirements: [requirement], qualifications: [qualification], dependencySnapshot: snapshot, evaluator, evaluationTime: evaluatedAt, idFactory: () => READINESS });
  const payload: Record<string, unknown> = { owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, transaction: { ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "r2a" }, asset: { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, currentVersionId: VERSION }, sourceVersion: { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, parentVersionId: null, state: { width: 100 } }, binding: { bindingHash: BINDING_HASH, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, requirementProfileId: PROFILE, requirementProfileVersion: 1, requirementProfileHash: PROFILE_HASH }, requirements: [requirement], dependency_snapshot: snapshot, qualifications: [{ ...qualification, signalReferences: qualification.signalIds.map((id, index) => ({ signalId: id, contentHash: qualification.signalContentHashes[index] })) }], readiness };
  return { signal, requirement, snapshot, evaluator, readiness, payload, evaluatedAt };
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-D4-R2 native TaskSpec authority closure", () => {
  let admin: Client; let service: Client; let serviceB: Client; let isolatedDatabase = ""; let value: ReturnType<typeof graph>; let spec: TaskSpec; let authorityCommitId = ""; let admissionId = "";
  type ConsequenceSnapshot = { mutationLeases: number; executionRuns: number; evidenceReceipts: number; verificationRuns: number; stateCommits: number; assetVersions: number; candidateAssets: number; costRecords: number; transactionStatuses: string };
  let consequenceBaseline: ConsequenceSnapshot;
  async function consequenceSnapshot(): Promise<ConsequenceSnapshot> {
    const counts = await Promise.all([
      "mutation_leases", "execution_runs", "evidence_receipts", "verification_runs", "state_commits", "asset_versions", "candidate_assets", "cost_records",
    ].map(async (table) => Number((await admin.query(`select count(*)::int as count from public.${table}`)).rows[0].count)));
    const statuses = (await admin.query("select id::text, status from public.outcome_transactions order by id")).rows.map((row) => `${row.id}:${row.status}`).join(",");
    return { mutationLeases: counts[0], executionRuns: counts[1], evidenceReceipts: counts[2], verificationRuns: counts[3], stateCommits: counts[4], assetVersions: counts[5], candidateAssets: counts[6], costRecords: counts[7], transactionStatuses: statuses };
  }
  function instrumentD4(client: Client): void {
    const query = client.query.bind(client) as (...args: unknown[]) => Promise<unknown>;
    client.query = (async (...args: unknown[]) => {
      const statement = typeof args[0] === "string" ? args[0] : "";
      if (!statement.includes("build002_grant_execution_authority")) return query(...args);
      const before = await consequenceSnapshot();
      try { return await query(...args); } finally { expect(await consequenceSnapshot()).toEqual(before); }
    }) as Client["query"];
  }

  beforeAll(async () => {
    isolatedDatabase = `virro_d4_r2a_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") }); await root.connect(); await root.query(`drop database if exists "${isolatedDatabase}" with (force)`); await root.query(`create database "${isolatedDatabase}"`); await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) }); service = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) }); serviceB = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) }); await admin.connect(); await service.connect(); await serviceB.connect();
    await admin.query("set application_name='r2a-admin'; create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users(id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets(id text primary key, name text not null unique, public boolean not null default false); alter table storage.buckets add column if not exists file_size_limit bigint; alter table storage.buckets add column if not exists allowed_mime_types text[];");
    await service.query("set role service_role; set application_name='r2-service-a'; set statement_timeout='30s'; set lock_timeout='20s'"); await serviceB.query("set role service_role; set application_name='r2-service-b'; set statement_timeout='30s'; set lock_timeout='20s'");
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort(); expect(migrations).toHaveLength(40); for (const name of migrations) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    instrumentD4(service); instrumentD4(serviceB);
    value = graph(); spec = taskSpec(); expect(verifyTaskSpecHash(spec)).toBe(true); expect(canonicalSha256(taskSpecHashMaterial(spec))).toBe(spec.hash);
    await admin.query("insert into auth.users(id) values ($1),($2) on conflict do nothing", [ACTOR, ACTOR_B]); await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE')", [TENANT]); await admin.query("insert into public.tenant_memberships(id, tenant_id, principal_id, role, status) values ($1,$2,$3,'OWNER','ACTIVE'),('b2000000-0000-4000-8000-000000000003',$2,$4,'OWNER','ACTIVE')", [MEMBERSHIP, TENANT, ACTOR, ACTOR_B]); await admin.query("insert into public.projects(id,name,owner_tenant_id) values ($1,'r2a',$2)", [PROJECT, TENANT]); await admin.query("insert into public.assets(id,project_id,name,owner_tenant_id) values ($1,$2,'r2a',$3)", [ASSET, PROJECT, TENANT]); await admin.query("insert into public.asset_versions(id,asset_id,version_number,state,owner_tenant_id) values ($1,$2,1,'{\"width\":100}'::jsonb,$3)", [VERSION, ASSET, TENANT]); await admin.query("update public.assets set current_version_id=$1 where id=$2", [VERSION, ASSET]); await admin.query("insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,raw_request,status) values ($1,$2,$3,$4,$5,'r2a','PREPARED')", [TRANSACTION, TENANT, PROJECT, ASSET, VERSION]);
    const blueprintDefinition = { schemaVersion: "outcome-blueprint-v0.1", id: BLUEPRINT, version: 1, previousVersionHash: null, sku: { code: "R2A_NATIVE", digitalGoodClass: "IMAGE_EDIT" }, outcomeType: "IMAGE_EDIT", seller: { sellerId: "r2a", displayName: "R2A" }, variables: [{ kind: "FIXED", id: "mode", description: "mode", critical: false, visibility: ["IMAGE_EXECUTOR"], value: "x", overridePolicy: "DENY" }], deliverable: { mediaType: "image/png", description: "image" }, capabilityPolicy: { required: ["READ_SOURCE"], optional: ["WRITE_CANDIDATE"], denied: [] }, securityProfile: { unknownInputPolicy: "REQUIRE_INPUT", promptInjectionPolicy: "TREAT_AS_DATA", embeddedSecretPolicy: "FORBID", allowedMimeTypes: ["image/png"], maxSourceBytes: 1000, operatorNotes: null }, qualityProfile: { criteria: [{ id: "SAME_SPEC", description: "same", critical: true, verifier: "SAME_SPEC_GATE", evidenceTypes: ["POLICY_CHECK"], roles: ["VERIFIER"] }] }, budget: { maxProviderCalls: 0, maxCostUsd: null, maxLatencyMs: null }, verificationPolicy: { requireSameSpecHash: true, criticalUnknownBlocksCommit: true, executorDoneIsEvidence: false } };
    await admin.query("insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,1,$2,null,'PUBLISHED',now(),$3::jsonb)", [BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ ...blueprintDefinition, id: BLUEPRINT, version: 1, previousVersionHash: null })]); await admin.query("insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,1,$2,null,$3,1,$4,null,null,'PUBLISHED',now(),$5::jsonb)", [PROFILE, PROFILE_HASH, BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ schemaVersion: "outcome-requirement-profile-v0.1", id: PROFILE, version: 1, previousVersionHash: null, blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH }, policy: null, requirements: [{ requirementId: value.requirement.requirementId, semanticType: value.requirement.semanticType, critical: value.requirement.critical, acceptedProvenance: value.requirement.acceptedProvenance, qualificationRule: value.requirement.qualificationRule, dependencySelectors: value.requirement.dependencySelectors, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, policyId: null, policyHash: null, definitionSchemaVersion: value.requirement.definitionSchemaVersion }] })]); await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id,outcome_transaction_id,blueprint_id,blueprint_version,blueprint_hash,requirement_profile_id,requirement_profile_version,requirement_profile_hash,policy_id,policy_hash,schema_version,binding_hash,bound_at) values ($1,$2,$3,1,$4,$5,1,$6,null,null,'outcome-transaction-requirement-binding-v0.1',$7,now())", [TENANT, TRANSACTION, BLUEPRINT, BLUEPRINT_HASH, PROFILE, PROFILE_HASH, BINDING_HASH]);
    await service.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({ id: REQUIREMENT, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: value.requirement.requirementId, semantic_type: value.requirement.semanticType, critical: value.requirement.critical, accepted_provenance: value.requirement.acceptedProvenance, qualification_rule: value.requirement.qualificationRule, dependency_selectors: value.requirement.dependencySelectors, blueprint_id: BLUEPRINT, blueprint_version: 1, blueprint_hash: BLUEPRINT_HASH, schema_version: value.requirement.definitionSchemaVersion, requirement_definition_hash: value.requirement.requirementDefinitionHash, created_at: value.requirement.createdAt })]); await service.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: value.signal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: value.signal.requirementId, requirement_definition_hash: value.requirement.requirementDefinitionHash, payload: value.signal.payload, source: value.signal.source, provenance: value.signal.provenance, captured_at: value.signal.capturedAt, valid_until: value.signal.validUntil, dependency_identity: value.signal.dependency.identity, dependency_hash: value.signal.dependency.hash, schema_version: value.signal.schemaVersion, content_hash: value.signal.contentHash })]);
    const marker = await service.query("select public.build002_commit_readiness_authority($1::uuid,$2::jsonb) as result", [ACTOR, JSON.stringify(value.payload)]); authorityCommitId = marker.rows[0].result.authority_commit_id;
    await admin.query("insert into public.execution_runs(id,transaction_id,status,executor,started_at,completed_at,latency_ms,cost_usd,error_message,metadata) values ($1,$2,'SUCCESS','r2a-fixture',now(),now(),0,0,null,'{}'::jsonb)", [RUN, TRANSACTION]); await admin.query("insert into public.candidate_assets(id,transaction_id,execution_run_id,source_version_id,storage_key,mime_type,width,height,byte_size,sha256,roi,instruction,provider,model,cost_usd,committed) values ($1,$2,$3,$4,'r2a','image/png',1,1,1,$5,'{}'::jsonb,'r2a','fixture','fixture',0,false)", [CANDIDATE, TRANSACTION, RUN, VERSION, SOURCE_SHA]);
    await admin.query("insert into public.field_outcomes(id,tenant_id,transaction_id,source_version_id,source_sha256,instruction,roi,topology,task_type,provider,model,raw_candidate_id,delivered_candidate_id,recommended_strategy,strategy_id,policy_version,outcome_sku,blueprint_id,blueprint_version,blueprint_hash,blueprint_snapshot,task_spec_id,task_spec_version,task_spec_hash,task_spec_snapshot,spec_compiler_name,spec_compiler_version,machine_verification_status,same_spec_status,provider_latency_ms,preservation_latency_ms,total_latency_ms,provider_cost_usd) values ($1,$2,$3,$4,$5,'r2a','{}'::jsonb,'LOCAL_INDEPENDENT','COLOR_CHANGE','fixture','fixture',$6,$6,'P0_RAW','P0_RAW','r2a','precision-edit-v0',$7,1,$8,$9::jsonb,$10,1,$11,$12::jsonb,'r2a','1.0','PASSED','PASSED',0,0,0,0)", [OUTCOME, TENANT, TRANSACTION, VERSION, SOURCE_SHA, CANDIDATE, BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ id: BLUEPRINT, version: 1, previousVersionHash: null }), spec.id, spec.hash, JSON.stringify(spec)]);
    const admission = createDelegabilityAdmission({ ownerTenantId: TENANT, principalId: ACTOR, membershipId: MEMBERSHIP, authorityCommitId, outcomeTransactionId: TRANSACTION, readinessId: value.readiness.id, readinessContentHash: value.readiness.readinessContentHash, historicalDependencySnapshotHash: value.snapshot.dependencySnapshotHash, currentDependencySnapshotHash: value.snapshot.dependencySnapshotHash, evaluator: value.evaluator, revalidatedAt: new Date(Date.now() - 5_000).toISOString() }, new Date().toISOString()); const admitted = await service.query("select public.build002_admit_delegability($1::uuid,$2::uuid,$3::uuid,$4::jsonb,$5::jsonb) as result", [ACTOR, MEMBERSHIP, authorityCommitId, JSON.stringify(admission), JSON.stringify({ transaction: { ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "r2a" }, asset: { id: ASSET, projectId: PROJECT, ownerTenantId: TENANT, currentVersionId: VERSION }, sourceVersion: { id: VERSION, assetId: ASSET, ownerTenantId: TENANT, versionNumber: 1, parentVersionId: null, state: { width: 100 } }, binding: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH }, requirementProfile: { id: PROFILE, version: 1, hash: PROFILE_HASH }, policy: { id: null, hash: null }, bindingHash: BINDING_HASH }, dependencySnapshot: value.snapshot, evaluator: value.evaluator })]); admissionId = admitted.rows[0].result.admission_id;
    consequenceBaseline = await consequenceSnapshot();
  }, 120_000);

  afterAll(async () => { if (admin && consequenceBaseline) expect(await consequenceSnapshot()).toEqual(consequenceBaseline); await admin?.end(); await service?.end(); await serviceB?.end(); if (databaseUrl && isolatedDatabase) { const root = new Client({ connectionString: connection(databaseUrl, "postgres") }); await root.connect(); await root.query(`drop database if exists "${isolatedDatabase}" with (force)`); await root.end(); } });

  it("compares the production TypeScript canonical contract with PostgreSQL", async () => {
    const fixtures: unknown[] = [null, true, false, "", "ASCII", "quotes\"", "backslash\\", "line\nfeed", "tab\t", "Unicode á", "emoji 😀", "e\u0301", [], ["x"], [[1], [true, null]], [true, "x", 1], {}, { z: 1, a: 2 }, { nested: { array: [{ b: 2, a: 1 }] } }, 0, -0, 1, -1, 1.5, 0.1, 0.01, 0.000001, 0.0000001, 1e-7, 1e20, 1e21, 9007199254740991, -9007199254740991];
    const failures: string[] = [];
    for (const [index, fixture] of fixtures.entries()) {
      try {
        const result = await admin.query("select public.build002_canonical_json($1::jsonb) as json, public.build002_canonical_sha256($1::jsonb) as hash", [JSON.stringify(fixture)]);
        const tsJson = canonicalJson(fixture); const tsHash = canonicalSha256(fixture); const pgJson = String(result.rows[0].json); const pgHash = String(result.rows[0].hash);
        if (pgJson !== tsJson || pgHash !== tsHash) failures.push(`fixture-${index}:ts=${tsJson}:pg=${pgJson}:tsHash=${tsHash}:pgHash=${pgHash}`);
      } catch (error) { failures.push(`fixture-${index}:${String(error)}`); }
    }
    expect(failures).toEqual([]);
  });

  it("asserts the canonical signal hash column source", async () => {
    const columns = await admin.query("select column_name from information_schema.columns where table_schema='public' and table_name='build002_signals'");
    const names = new Set(columns.rows.map((row) => row.column_name));
    expect(names.has("content_hash")).toBe(true);
    expect(names.has("signal_content_hash")).toBe(false);
    const linkColumns = await admin.query("select table_name, column_name from information_schema.columns where table_schema='public' and table_name in ('build002_dependency_signals','build002_qualification_signals') and column_name='signal_content_hash'");
    expect(linkColumns.rows).toHaveLength(2);
  });

  it("accepts a legitimate TaskSpec through D4 and the real TypeScript repository", async () => {
    const result = await service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text) as result", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash]); expect(result.rows[0].result.execution_authority_id).toEqual(expect.any(String));
    const row = (await admin.query("select * from public.build002_execution_authorities where execution_authority_id=$1", [result.rows[0].result.execution_authority_id])).rows[0];
    const parsed = authorityFromRow(row);
    const material = executionAuthorityHashMaterial(parsed);
    expect(verifyExecutionAuthorityHash(parsed)).toBe(true);
    expect(canonicalSha256(material)).toBe(parsed.executionAuthorityContentHash);
    const client = { rpc: async (_name: string, args: Record<string, unknown>) => ({ data: (await service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text) as result", [args.p_principal_id, args.p_membership_id, args.p_admission_id, args.p_task_spec_id, args.p_task_spec_hash])).rows[0].result, error: null }), from: (table: string) => ({ select: () => ({ eq: (column: string, id: string) => ({ maybeSingle: async () => { void table; void column; void id; return { data: row, error: null }; } }) }) }) };
    const repository = new SupabaseExecutionAuthorityRepository(client as unknown as SupabaseClient, TENANT); const authority = await repository.grant({ principalId: ACTOR, membershipId: MEMBERSHIP, admissionId, taskSpecId: spec.id, taskSpecHash: spec.hash }); expect(authority.executionAuthorityContentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects a PostgreSQL-self-consistent TaskSpec after semantic mutation", async () => {
    const pgHash = String((await admin.query("select public.build002_canonical_sha256($1::jsonb) as hash", [JSON.stringify(taskSpecHashMaterial(spec))])).rows[0].hash);
    expect(pgHash).toBe(spec.hash);
    await admin.query("set session_replication_role='replica'");
    await admin.query("delete from public.build002_execution_authorities");
    await admin.query("update public.field_outcomes set task_spec_snapshot = jsonb_set(task_spec_snapshot, '{compiler,version}', to_jsonb('999.0.0'::text)) where id=$1", [OUTCOME]);
    await admin.query("set session_replication_role='origin'");
    await expect(service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text)", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash])).rejects.toThrow(/TASK_SPEC_AUTHORITY_INVALID/);
    expect((await admin.query("select count(*)::int as count from public.build002_execution_authorities")).rows[0].count).toBe(0);
    await admin.query("set session_replication_role='replica'");
    await admin.query("update public.field_outcomes set task_spec_snapshot=$1::jsonb where id=$2", [JSON.stringify(spec), OUTCOME]);
    await admin.query("set session_replication_role='origin'");
  });

  it("rejects a tampered persisted authority on RPC retry and repository readback", async () => {
    const issued = await service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text) as result", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash]);
    const authorityId = issued.rows[0].result.execution_authority_id as string;
    await admin.query("set session_replication_role='replica'");
    await admin.query("update public.build002_execution_authorities set execution_authority_content_hash=repeat('f',64) where execution_authority_id=$1", [authorityId]);
    await admin.query("set session_replication_role='origin'");
    await expect(service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text)", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash])).rejects.toThrow(/EXECUTION_AUTHORITY_READBACK_FAILED/);
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: (await admin.query("select * from public.build002_execution_authorities where execution_authority_id=$1", [authorityId])).rows[0] ?? null, error: null }) }) }) }) };
    const repository = new SupabaseExecutionAuthorityRepository(client as unknown as SupabaseClient, TENANT);
    await expect(repository.findById(authorityId)).rejects.toThrow(/EXECUTION_AUTHORITY_READBACK_FAILED/);
    await admin.query("set session_replication_role='replica'"); await admin.query("delete from public.build002_execution_authorities where execution_authority_id=$1", [authorityId]); await admin.query("set session_replication_role='origin'");
  });

  it("serializes identical concurrent authority retries", async () => {
    await admin.query("set session_replication_role='replica'"); await admin.query("delete from public.build002_execution_authorities"); await admin.query("set session_replication_role='origin'");
    const grant = (client: Client) => client.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text) as result", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash]);
    const [left, right] = await Promise.all([grant(service), grant(serviceB)]);
    expect(left.rows[0].result.execution_authority_id).toBe(right.rows[0].result.execution_authority_id);
    expect((await admin.query("select count(*)::int as count from public.build002_execution_authorities")).rows[0].count).toBe(1);
  });

  it("rejects currentness and identity drift before authority issuance", async () => {
    await admin.query("set session_replication_role='replica'"); await admin.query("delete from public.build002_execution_authorities"); await admin.query("set session_replication_role='origin'");
    const d4 = (principal: string, membership: string) => service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text) as result", [principal, membership, admissionId, spec.id, spec.hash]);
    const driftSignal = createSignal({ signalId: SIGNAL_DRIFT, ownerTenantId: TENANT, transactionId: TRANSACTION, requirementId: value.signal.requirementId, payload: { value: "drift" }, source: value.signal.source, provenance: "OBSERVED", capturedAt: value.signal.capturedAt, validUntil: value.signal.validUntil, dependency: value.signal.dependency, schemaVersion: value.signal.schemaVersion });
    await service.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: driftSignal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: driftSignal.requirementId, requirement_definition_hash: value.requirement.requirementDefinitionHash, payload: driftSignal.payload, source: driftSignal.source, provenance: driftSignal.provenance, captured_at: driftSignal.capturedAt, valid_until: driftSignal.validUntil, dependency_identity: driftSignal.dependency.identity, dependency_hash: driftSignal.dependency.hash, schema_version: driftSignal.schemaVersion, content_hash: driftSignal.contentHash })]);
    await expect(d4(ACTOR, MEMBERSHIP)).rejects.toThrow(/CURRENTNESS_NOT_CURRENT/);
    await admin.query("set session_replication_role='replica'"); await admin.query("delete from public.build002_signals where signal_id=$1", [SIGNAL_DRIFT]); await admin.query("set session_replication_role='origin'");

    const requirementDrift = compileSignalRequirement({ requirementId: "r2a.signal.drift", subjectKind: "OUTCOME_TRANSACTION", semanticType: "TEXT", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [{ identity: "asset.version", required: true }], blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, value.evaluatedAt);
    await service.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({ id: REQUIREMENT_DRIFT, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: requirementDrift.requirementId, semantic_type: requirementDrift.semanticType, critical: requirementDrift.critical, accepted_provenance: requirementDrift.acceptedProvenance, qualification_rule: requirementDrift.qualificationRule, dependency_selectors: requirementDrift.dependencySelectors, blueprint_id: BLUEPRINT, blueprint_version: 1, blueprint_hash: BLUEPRINT_HASH, schema_version: requirementDrift.definitionSchemaVersion, requirement_definition_hash: requirementDrift.requirementDefinitionHash, created_at: requirementDrift.createdAt })]);
    await expect(d4(ACTOR, MEMBERSHIP)).rejects.toThrow(/CURRENTNESS_NOT_CURRENT/);
    await admin.query("set session_replication_role='replica'"); await admin.query("delete from public.build002_signal_requirements where id=$1", [REQUIREMENT_DRIFT]); await admin.query("set session_replication_role='origin'");

    const versionB = "e2000000-0000-4000-8000-000000000002";
    await admin.query("insert into public.asset_versions(id,asset_id,version_number,state,owner_tenant_id) values ($1,$2,2,'{\"width\":101}'::jsonb,$3)", [versionB, ASSET, TENANT]); await admin.query("update public.assets set current_version_id=$1 where id=$2", [versionB, ASSET]);
    await expect(d4(ACTOR, MEMBERSHIP)).rejects.toThrow(/SOURCE_ASSET_HEAD_CHANGED/);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [VERSION, ASSET]); await admin.query("set session_replication_role='replica'"); await admin.query("delete from public.asset_versions where id=$1", [versionB]); await admin.query("set session_replication_role='origin'");

    await admin.query("update public.tenant_memberships set status='REVOKED' where id=$1", [MEMBERSHIP]);
    await expect(d4(ACTOR, MEMBERSHIP)).rejects.toThrow(/READINESS_AUTHORITY_MEMBERSHIP_INVALID/);
    await admin.query("update public.tenant_memberships set status='ACTIVE' where id=$1", [MEMBERSHIP]);
    await admin.query("update public.outcome_transactions set raw_request='r2-drift' where id=$1", [TRANSACTION]);
    await expect(d4(ACTOR, MEMBERSHIP)).rejects.toThrow(/CURRENTNESS_NOT_CURRENT/);
    await admin.query("update public.outcome_transactions set raw_request='r2a' where id=$1", [TRANSACTION]);
    await expect(d4(ACTOR_B, MEMBERSHIP_B)).rejects.toThrow(/EXECUTION_AUTHORITY_IDENTITY_MISMATCH/);
    expect((await admin.query("select count(*)::int as count from public.build002_execution_authorities")).rows[0].count).toBe(0);
  });

  it("rejects a directly persisted noncanonical pair at the D4 consequence-time hash boundary", async () => {
    const forged = structuredClone(spec) as TaskSpec; forged.compiler.version = "9.9.9"; const forgedHash = "f".repeat(64); forged.hash = forgedHash;
    await admin.query("set session_replication_role='replica'"); await admin.query("delete from public.build002_execution_authorities"); await admin.query("delete from public.field_outcomes where id=$1", [OUTCOME]); await admin.query("set session_replication_role='origin'");
    const inserted = await service.query("insert into public.field_outcomes(id,tenant_id,transaction_id,source_version_id,source_sha256,instruction,roi,topology,task_type,provider,model,raw_candidate_id,delivered_candidate_id,recommended_strategy,strategy_id,policy_version,outcome_sku,blueprint_id,blueprint_version,blueprint_hash,blueprint_snapshot,task_spec_id,task_spec_version,task_spec_hash,task_spec_snapshot,spec_compiler_name,spec_compiler_version,machine_verification_status,same_spec_status,provider_latency_ms,preservation_latency_ms,total_latency_ms,provider_cost_usd) values ($1,$2,$3,$4,$5,'r2a','{}'::jsonb,'LOCAL_INDEPENDENT','COLOR_CHANGE','fixture','fixture',$6,$6,'P0_RAW','P0_RAW','r2a','precision-edit-v0',$7,1,$8,$9::jsonb,$10,1,$11,$12::jsonb,'r2a','1.0','PASSED','PASSED',0,0,0,0)", [OUTCOME, TENANT, TRANSACTION, VERSION, SOURCE_SHA, CANDIDATE, BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ id: BLUEPRINT, version: 1, previousVersionHash: null }), forged.id, forgedHash, JSON.stringify(forged)]); expect(inserted.rowCount).toBe(1);
    await expect(service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text)", [ACTOR, MEMBERSHIP, admissionId, forged.id, forgedHash])).rejects.toThrow(/TASK_SPEC_AUTHORITY_INVALID/); expect((await admin.query("select count(*)::int as count from public.build002_execution_authorities")).rows[0].count).toBe(0);
    await admin.query("set session_replication_role='replica'"); await admin.query("update public.field_outcomes set task_spec_hash=$1, task_spec_snapshot=$2::jsonb where id=$3", [spec.hash, JSON.stringify(spec), OUTCOME]); await admin.query("set session_replication_role='origin'");
  });

  it("records relational mismatch rejection and exact field_outcomes privileges", async () => {
    await expect(service.query("insert into public.field_outcomes(id,tenant_id,transaction_id,source_version_id,source_sha256,instruction,roi,topology,task_type,provider,model,raw_candidate_id,delivered_candidate_id,recommended_strategy,strategy_id,policy_version,outcome_sku,blueprint_id,blueprint_version,blueprint_hash,blueprint_snapshot,task_spec_id,task_spec_version,task_spec_hash,task_spec_snapshot,spec_compiler_name,spec_compiler_version,machine_verification_status,same_spec_status,provider_latency_ms,preservation_latency_ms,total_latency_ms,provider_cost_usd) values (gen_random_uuid(),$1,$2,$3,$4,'r2a','{}'::jsonb,'LOCAL_INDEPENDENT','COLOR_CHANGE','fixture','fixture',$5,$5,'P0_RAW','P0_RAW','r2a','precision-edit-v0',$6,1,$7,$8::jsonb,$9,1,repeat('0',64),$10::jsonb,'r2a','1.0','PASSED','PASSED',0,0,0,0)", [TENANT, TRANSACTION, VERSION, SOURCE_SHA, CANDIDATE, BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ id: BLUEPRINT, version: 1, previousVersionHash: null }), spec.id, JSON.stringify(spec)])).rejects.toThrow(/TRUST_FIELD_TASK_SPEC_MISMATCH/);
    const privileges = await admin.query("select has_table_privilege('service_role','public.field_outcomes','SELECT') as service_select, has_table_privilege('service_role','public.field_outcomes','INSERT') as service_insert, has_table_privilege('service_role','public.field_outcomes','UPDATE') as service_update, has_table_privilege('service_role','public.field_outcomes','DELETE') as service_delete"); expect(privileges.rows[0]).toEqual({ service_select: true, service_insert: true, service_update: false, service_delete: false });
  });

  it("keeps the execution-authority table and RPC fail-closed by role", async () => {
    const tablePrivileges = await admin.query("select r.rolname as role, has_table_privilege(r.rolname,'public.build002_execution_authorities','INSERT') as insert_ok, has_table_privilege(r.rolname,'public.build002_execution_authorities','UPDATE') as update_ok, has_table_privilege(r.rolname,'public.build002_execution_authorities','DELETE') as delete_ok from (values ('anon'::name),('authenticated'::name),('service_role'::name)) r(rolname) order by r.rolname");
    expect(tablePrivileges.rows).toEqual([
      { role: "anon", insert_ok: false, update_ok: false, delete_ok: false },
      { role: "authenticated", insert_ok: false, update_ok: false, delete_ok: false },
      { role: "service_role", insert_ok: false, update_ok: false, delete_ok: false },
    ]);
    for (const role of ["anon", "authenticated"]) {
      await admin.query(`set role ${role}`);
      await expect(admin.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text)", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash])).rejects.toThrow(/permission denied|EXECUTE/);
      await admin.query("reset role");
    }
    const serviceResult = await service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text) as result", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash]);
    expect(serviceResult.rows[0].result.execution_authority_id).toEqual(expect.any(String));
  });

  it("issues exact D5 leases for critical and non-critical TaskSpec values", async () => {
    await admin.query("set session_replication_role='replica'");
    await admin.query("delete from public.build002_mutation_leases");
    await admin.query("delete from public.build002_execution_authorities");
    await admin.query("set session_replication_role='origin'");
    await admin.query("update public.tenants set status='ACTIVE' where id=$1", [TENANT]);
    await admin.query("update public.tenant_memberships set status='ACTIVE' where id=$1", [MEMBERSHIP]);
    await admin.query("update public.outcome_transactions set status='PREPARED', raw_request='r2a' where id=$1", [TRANSACTION]);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [VERSION, ASSET]);

    const authority = await service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text) as result", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash]);
    const authorityId = authority.rows[0].result.execution_authority_id as string;
    const fixtures = [
      { targetPath: "requested.color", value: spec.values.find((item) => item.id === "requested.color")?.value, suffix: "001" },
      { targetPath: "requested.size", value: spec.values.find((item) => item.id === "requested.size")?.value, suffix: "002" },
    ];
    const consequenceBefore = await consequenceSnapshot();
    for (const fixture of fixtures) {
      const intentId = `ab100000-0000-4000-8000-000000000${fixture.suffix}`;
      const patchId = `ab100000-0000-4000-8000-000000001${fixture.suffix}`;
      const valueJson = JSON.stringify(fixture.value);
      await admin.query("insert into public.partial_intents(id,transaction_id,owner_tenant_id,raw_input,target_path,operation,desired_value) values ($1,$2,$3,'r2 exact patch',$4,'SET_ATTRIBUTE',$5::jsonb)", [intentId, TRANSACTION, TENANT, fixture.targetPath, valueJson]);
      await admin.query("insert into public.transaction_patches(id,transaction_id,owner_tenant_id,partial_intent_id,operation,target_path,parameters) values ($1,$2,$3,$4,'SET_ATTRIBUTE',$5,jsonb_build_object('value',$6::jsonb))", [patchId, TRANSACTION, TENANT, intentId, fixture.targetPath, valueJson]);
      const issued = await service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as result", [ACTOR, MEMBERSHIP, authorityId, fixture.targetPath, "MUTABLE"]);
      expect(issued.rows[0].result.mutation_lease_id).toEqual(expect.any(String));
    }
    expect((await admin.query("select count(*)::int as count from public.build002_mutation_leases")).rows[0].count).toBe(2);
    expect((await admin.query("select count(*)::int as count from public.execution_runs")).rows[0].count).toBe(1);
    const consequenceAfter = await consequenceSnapshot();
    expect(consequenceAfter.executionRuns).toBe(consequenceBefore.executionRuns);
    expect(consequenceAfter.evidenceReceipts).toBe(consequenceBefore.evidenceReceipts);
    expect(consequenceAfter.verificationRuns).toBe(consequenceBefore.verificationRuns);
    expect(consequenceAfter.stateCommits).toBe(consequenceBefore.stateCommits);
    expect(consequenceAfter.assetVersions).toBe(consequenceBefore.assetVersions);
    expect(consequenceAfter.candidateAssets).toBe(consequenceBefore.candidateAssets);
    expect(consequenceAfter.costRecords).toBe(consequenceBefore.costRecords);
    expect(consequenceAfter.transactionStatuses).toBe(consequenceBefore.transactionStatuses);
  });

  it("rejects unknown, missing, duplicate, and mismatched D5 semantics", async () => {
    const reset = async () => {
      await admin.query("set session_replication_role='replica'");
      await admin.query("delete from public.build002_mutation_leases");
      await admin.query("delete from public.build002_execution_authorities");
      await admin.query("delete from public.transaction_patches");
      await admin.query("delete from public.partial_intents");
      await admin.query("update public.field_outcomes set task_spec_hash=$1, task_spec_snapshot=$2::jsonb where id=$3", [spec.hash, JSON.stringify(spec), OUTCOME]);
      await admin.query("set session_replication_role='origin'");
      await admin.query("update public.tenants set status='ACTIVE' where id=$1", [TENANT]);
      await admin.query("update public.tenant_memberships set status='ACTIVE' where id=$1", [MEMBERSHIP]);
      await admin.query("update public.outcome_transactions set status='PREPARED', raw_request='r2a' where id=$1", [TRANSACTION]);
      await admin.query("update public.assets set current_version_id=$1 where id=$2", [VERSION, ASSET]);
    };
    const createAuthority = async () => {
      const result = await service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text) as result", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash]);
      return result.rows[0].result.execution_authority_id as string;
    };
    const insertPatch = async (targetPath: string, value: unknown, suffix: string) => {
      const intentId = `ac100000-0000-4000-8000-000000000${suffix}`;
      const patchId = `ac100000-0000-4000-8000-000000001${suffix}`;
      const valueJson = JSON.stringify(value);
      await admin.query("insert into public.partial_intents(id,transaction_id,owner_tenant_id,raw_input,target_path,operation,desired_value) values ($1,$2,$3,'r2 negative patch',$4,'SET_ATTRIBUTE',$5::jsonb)", [intentId, TRANSACTION, TENANT, targetPath, valueJson]);
      await admin.query("insert into public.transaction_patches(id,transaction_id,owner_tenant_id,partial_intent_id,operation,target_path,parameters) values ($1,$2,$3,$4,'SET_ATTRIBUTE',$5,jsonb_build_object('value',$6::jsonb))", [patchId, TRANSACTION, TENANT, intentId, targetPath, valueJson]);
    };

    await reset();
    const unknownAuthority = await createAuthority();
    const unknown = structuredClone(spec) as TaskSpec;
    (unknown.values[0] as { provenance: string }).provenance = "UNKNOWN";
    await admin.query("set session_replication_role='replica'");
    await admin.query("update public.field_outcomes set task_spec_snapshot=$1::jsonb where id=$2", [JSON.stringify(unknown), OUTCOME]);
    await admin.query("set session_replication_role='origin'");
    await expect(service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text)", [ACTOR, MEMBERSHIP, unknownAuthority, "requested.color", "MUTABLE"])).rejects.toThrow(/PATCH_NOT_AUTHORIZED_BY_TASK_SPEC|TASK_SPEC_AUTHORITY_INVALID/);

    await reset();
    const mismatchAuthority = await createAuthority();
    await insertPatch("requested.color", "wrong", "101");
    await expect(service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text)", [ACTOR, MEMBERSHIP, mismatchAuthority, "requested.color", "MUTABLE"])).rejects.toThrow(/PATCH_NOT_AUTHORIZED_BY_TASK_SPEC/);

    await reset();
    const duplicateAuthority = await createAuthority();
    await insertPatch("requested.color", spec.values[0].value, "102");
    await insertPatch("requested.color", spec.values[0].value, "103");
    await expect(service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text)", [ACTOR, MEMBERSHIP, duplicateAuthority, "requested.color", "MUTABLE"])).rejects.toThrow(/PATCH_NOT_AUTHORIZED_BY_TASK_SPEC/);
    expect((await admin.query("select count(*)::int as count from public.build002_mutation_leases")).rows[0].count).toBe(0);
  });

  it("expires immutable leases and serializes identical retries", async () => {
    await admin.query("set session_replication_role='replica'");
    await admin.query("delete from public.build002_mutation_leases");
    await admin.query("delete from public.build002_execution_authorities");
    await admin.query("delete from public.transaction_patches");
    await admin.query("delete from public.partial_intents");
    await admin.query("update public.field_outcomes set task_spec_hash=$1, task_spec_snapshot=$2::jsonb where id=$3", [spec.hash, JSON.stringify(spec), OUTCOME]);
    await admin.query("set session_replication_role='origin'");
    await admin.query("update public.tenants set status='ACTIVE' where id=$1", [TENANT]);
    await admin.query("update public.tenant_memberships set status='ACTIVE' where id=$1", [MEMBERSHIP]);
    await admin.query("update public.outcome_transactions set status='PREPARED', raw_request='r2a' where id=$1", [TRANSACTION]);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [VERSION, ASSET]);
    const authority = await service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text) as result", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash]);
    const authorityId = authority.rows[0].result.execution_authority_id as string;
    const valueJson = JSON.stringify(spec.values[0].value);
    await admin.query("insert into public.partial_intents(id,transaction_id,owner_tenant_id,raw_input,target_path,operation,desired_value) values ('ad200000-0000-4000-8000-000000000001',$1,$2,'r2 retry','requested.color','SET_ATTRIBUTE',$3::jsonb)", [TRANSACTION, TENANT, valueJson]);
    await admin.query("insert into public.transaction_patches(id,transaction_id,owner_tenant_id,partial_intent_id,operation,target_path,parameters) values ('ad200000-0000-4000-8000-000000001001',$1,$2,'ad200000-0000-4000-8000-000000000001','SET_ATTRIBUTE','requested.color',jsonb_build_object('value',$3::jsonb))", [TRANSACTION, TENANT, valueJson]);
    const first = await service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as result", [ACTOR, MEMBERSHIP, authorityId, "requested.color", "MUTABLE"]);
    const second = await service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as result", [ACTOR, MEMBERSHIP, authorityId, "requested.color", "MUTABLE"]);
    expect(second.rows[0].result.mutation_lease_id).toBe(first.rows[0].result.mutation_lease_id);

    const row = (await admin.query("select * from public.build002_mutation_leases where mutation_lease_id=$1", [first.rows[0].result.mutation_lease_id])).rows[0] as Record<string, unknown>;
    const lease = mutationLeaseFromRow(row);
    expect(verifyBuild002MutationLeaseHash(lease)).toBe(true);
    expect(lease.mutationLeaseContentHash).toBe(first.rows[0].result.mutation_lease_content_hash);
    const pgHash = await admin.query("select public.build002_canonical_sha256($1::jsonb) as hash", [JSON.stringify(mutationLeaseHashMaterial(lease))]);
    expect(pgHash.rows[0].hash).toBe(canonicalSha256(mutationLeaseHashMaterial(lease)));
    const crossRuntimeFixture = { ...mutationLeaseHashMaterial(lease), targetPath: "requested.ñ\\\\line\nvalue" };
    const pgFixtureHash = await admin.query("select public.build002_canonical_sha256($1::jsonb) as hash", [JSON.stringify(crossRuntimeFixture)]);
    expect(pgFixtureHash.rows[0].hash).toBe(canonicalSha256(crossRuntimeFixture));

    await admin.query("set session_replication_role='replica'");
    await admin.query("delete from public.build002_mutation_leases");
    await admin.query("set session_replication_role='origin'");
    const concurrent = await Promise.all([
      service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as result", [ACTOR, MEMBERSHIP, authorityId, "requested.color", "MUTABLE"]),
      serviceB.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as result", [ACTOR, MEMBERSHIP, authorityId, "requested.color", "MUTABLE"]),
    ]);
    expect(concurrent[0].rows[0].result.mutation_lease_id).toBe(concurrent[1].rows[0].result.mutation_lease_id);
    expect((await admin.query("select count(*)::int as count from public.build002_mutation_leases")).rows[0].count).toBe(1);

    await admin.query("set session_replication_role='replica'");
    await admin.query("update public.build002_mutation_leases set valid_until=now()-interval '1 second'");
    await admin.query("set session_replication_role='origin'");
    await expect(service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text)", [ACTOR, MEMBERSHIP, authorityId, "requested.color", "MUTABLE"])).rejects.toThrow(/MUTATION_LEASE_EXPIRED/);
    expect((await admin.query("select count(*)::int as count from public.build002_mutation_leases")).rows[0].count).toBe(1);
  });
});
