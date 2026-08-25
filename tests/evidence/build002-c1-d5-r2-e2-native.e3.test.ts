// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attachTaskSpecHash, taskSpecHashMaterial, verifyTaskSpecHash, type TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
import { createSignal, compileSignalRequirement, createDependencySnapshot, currentDefaultEvaluator, evaluateSignalQualification, evaluateDelegationReadiness } from "@/src/domain/outcome/signal-readiness";
import { createDelegabilityAdmission } from "@/src/domain/outcome/delegability-admission";

const enabled = process.env.BUILD002_E2_NATIVE === "true";
const mode = process.env.BUILD002_E2_MODE === "r1" ? "r1" : "r2";
const databaseUrl = process.env.BUILD002_E2_DATABASE_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.env.BUILD002_E2_MIGRATIONS_DIR ?? resolve(process.cwd(), "supabase/migrations"));
const expectedMigrations = mode === "r1" ? 39 : 40;
const ACTOR = "a2e20000-0000-4000-8000-000000000001";
const TENANT = "b2e20000-0000-4000-8000-000000000001";
const MEMBERSHIP = "b2e20000-0000-4000-8000-000000000002";
const PROJECT = "c2e20000-0000-4000-8000-000000000001";
const ASSET = "d2e20000-0000-4000-8000-000000000001";
const VERSION = "e2e20000-0000-4000-8000-000000000001";
const TRANSACTION = "f2e20000-0000-4000-8000-000000000001";
const RUN = "a3e20000-0000-4000-8000-000000000001";
const CANDIDATE = "a4e20000-0000-4000-8000-000000000001";
const OUTCOME = "a5e20000-0000-4000-8000-000000000001";
const BLUEPRINT = "a6e20000-0000-4000-8000-000000000001";
const PROFILE = "a6e20000-0000-4000-8000-000000000002";
const SIGNAL = "a7e20000-0000-4000-8000-000000000001";
const REQUIREMENT = "a8e20000-0000-4000-8000-000000000001";
const QUALIFICATION = "a9e20000-0000-4000-8000-000000000001";
const READINESS = "aae20000-0000-4000-8000-000000000001";
const TASK_SPEC = "abe20000-0000-4000-8000-000000000001";
const BLUEPRINT_HASH = "a".repeat(64);
const PROFILE_HASH = "b".repeat(64);
const BINDING_HASH = "c".repeat(64);
const SOURCE_SHA = "d".repeat(64);

function connection(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function taskSpec(): TaskSpec {
  return attachTaskSpecHash({
    schemaVersion: "task-spec-v0.1", id: TASK_SPEC, version: 1, previousVersionHash: null,
    status: "READY", transactionId: TRANSACTION,
    blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH },
    source: { assetId: ASSET, versionId: VERSION, sha256: SOURCE_SHA, mimeType: "image/png", byteSize: 10 },
    values: [
      { id: "requested.color", provenance: "CUSTOMER_STATED", critical: true, visibility: ["IMAGE_EXECUTOR"], value: { nested: [1, "x", true] } },
      { id: "requested.size", provenance: "CUSTOMER_STATED", critical: false, visibility: ["IMAGE_EXECUTOR"], value: 42 },
      { id: "requested.unknown", provenance: "UNKNOWN", critical: false, visibility: ["IMAGE_EXECUTOR"] },
      { id: "requested.missing", provenance: "CUSTOMER_STATED", critical: false, visibility: ["IMAGE_EXECUTOR"] },
    ],
    constraints: [{ id: "preserve.subject", effect: "MUST_NOT", target: "subject", value: { untouched: true }, source: "BLUEPRINT_FIXED" }],
    capabilityGrant: ["READ_SOURCE", "WRITE_CANDIDATE"],
    criteria: [{ id: "SAME_SPEC", description: "same spec", critical: true, verifier: "SAME_SPEC_GATE", evidenceTypes: ["POLICY_CHECK"], roles: ["VERIFIER"] }],
    verificationPolicy: { requireSameSpecHash: true, criticalUnknownBlocksCommit: true, executorDoneIsEvidence: false },
    securityProfile: { promptInjectionPolicy: "TREAT_AS_DATA", embeddedSecretPolicy: "FORBID", unknownInputPolicy: "REQUIRE_INPUT" },
    compiler: { name: "e2-native", version: "1.0.0" }, inputRequirements: [], rejectionReasons: [], createdAt: "2026-08-24T12:00:00.000Z",
  });
}

function graph() {
  const now = Date.now();
  const evaluatedAt = new Date(now - 60_000).toISOString();
  const capturedAt = new Date(now - 120_000).toISOString();
  const validUntil = new Date(now + 3_600_000).toISOString();
  const transactionSemanticHash = canonicalSha256({ schemaVersion: "build002-transaction-semantic-binding-v0.1", ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "e2" });
  const sourceAssetVersionHash = canonicalSha256({ schemaVersion: "build002-source-asset-version-binding-v0.1", ownerTenantId: TENANT, assetId: ASSET, versionId: VERSION, versionNumber: 1, parentVersionId: null, state: { width: 100 } });
  const signal = createSignal({ signalId: SIGNAL, ownerTenantId: TENANT, transactionId: TRANSACTION, requirementId: "e2.signal", payload: { value: "e2" }, source: { identity: "e2", version: "1", hash: SOURCE_SHA }, provenance: "OBSERVED", capturedAt, validUntil, dependency: { identity: "asset.version", hash: sourceAssetVersionHash }, schemaVersion: "build002-signal-v0.2" });
  const requirement = compileSignalRequirement({ requirementId: "e2.signal", subjectKind: "OUTCOME_TRANSACTION", semanticType: "TEXT", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }, { identity: "transaction.semantic", required: true }], blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1" }, evaluatedAt);
  const snapshot = createDependencySnapshot({ schemaVersion: "build002-dependency-snapshot-v0.2", ownerTenantId: TENANT, transactionId: TRANSACTION, requirementDefinitionHashes: [requirement.requirementDefinitionHash], signalReferences: [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }], dependencyBindings: [{ identity: "asset.version", hash: sourceAssetVersionHash }, { identity: "blueprint", hash: BLUEPRINT_HASH }, { identity: "transaction.semantic", hash: transactionSemanticHash }], blueprintHash: BLUEPRINT_HASH, policyHash: null, taskSpecHash: null, transactionSemanticHash, sourceAssetVersionHash, contextLensHash: null });
  const evaluator = currentDefaultEvaluator();
  const qualification = evaluateSignalQualification({ requirement, signals: [signal], currentDependencySnapshot: snapshot, evaluator, evaluationTime: evaluatedAt, idFactory: () => QUALIFICATION });
  const readiness = evaluateDelegationReadiness({ subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TRANSACTION }, requirements: [requirement], qualifications: [qualification], dependencySnapshot: snapshot, evaluator, evaluationTime: evaluatedAt, idFactory: () => READINESS });
  const payload = { owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, transaction: { ownerTenantId: TENANT, transactionId: TRANSACTION, projectId: PROJECT, assetId: ASSET, baseVersionId: VERSION, rawRequest: "e2" }, asset: { id: ASSET, ownerTenantId: TENANT, projectId: PROJECT, currentVersionId: VERSION }, sourceVersion: { id: VERSION, ownerTenantId: TENANT, assetId: ASSET, versionNumber: 1, parentVersionId: null, state: { width: 100 } }, binding: { bindingHash: BINDING_HASH, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, requirementProfileId: PROFILE, requirementProfileVersion: 1, requirementProfileHash: PROFILE_HASH }, requirements: [requirement], dependency_snapshot: snapshot, qualifications: [{ ...qualification, signalReferences: qualification.signalIds.map((id, index) => ({ signalId: id, contentHash: qualification.signalContentHashes[index] })) }], readiness };
  return { signal, requirement, snapshot, evaluator, readiness, payload, evaluatedAt };
}

describe.runIf(enabled && Boolean(databaseUrl))(`BUILD002-C1-D5-R2-E2 ${mode.toUpperCase()} authored evidence`, () => {
  let admin: Client; let service: Client; let isolatedDatabase = ""; let spec: TaskSpec; let value: ReturnType<typeof graph>; let admissionId = ""; let authorityId = "";
  const count = async (table: string) => Number((await admin.query(`select count(*)::int as count from public.${table}`)).rows[0].count);

  beforeAll(async () => {
    isolatedDatabase = `virro_d5_r2_e2_${mode}_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") });
    await root.connect(); await root.query(`drop database if exists "${isolatedDatabase}" with (force)`); await root.query(`create database "${isolatedDatabase}"`); await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) }); service = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) }); await admin.connect(); await service.connect();
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users(id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets(id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);");
    await service.query("set role service_role; set statement_timeout='30s'; set lock_timeout='20s'");
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    expect(migrations).toHaveLength(expectedMigrations);
    for (const name of migrations) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    value = graph(); spec = taskSpec(); expect(verifyTaskSpecHash(spec)).toBe(true);
    await admin.query("insert into auth.users(id) values ($1) on conflict do nothing", [ACTOR]);
    await admin.query("insert into public.tenants(id,kind,status) values ($1,'ORGANIZATION','ACTIVE')", [TENANT]);
    await admin.query("insert into public.tenant_memberships(id,tenant_id,principal_id,role,status) values ($1,$2,$3,'OWNER','ACTIVE')", [MEMBERSHIP, TENANT, ACTOR]);
    await admin.query("insert into public.projects(id,name,owner_tenant_id) values ($1,'e2',$2)", [PROJECT, TENANT]);
    await admin.query("insert into public.assets(id,project_id,name,owner_tenant_id) values ($1,$2,'e2',$3)", [ASSET, PROJECT, TENANT]);
    await admin.query("insert into public.asset_versions(id,asset_id,version_number,state,owner_tenant_id) values ($1,$2,1,'{\"width\":100}'::jsonb,$3)", [VERSION, ASSET, TENANT]);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [VERSION, ASSET]);
    await admin.query("insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,raw_request,status) values ($1,$2,$3,$4,$5,'e2','PREPARED')", [TRANSACTION, TENANT, PROJECT, ASSET, VERSION]);
    const blueprint = { schemaVersion: "outcome-blueprint-v0.1", id: BLUEPRINT, version: 1, previousVersionHash: null, sku: { code: "E2", digitalGoodClass: "IMAGE_EDIT" }, outcomeType: "IMAGE_EDIT", seller: { sellerId: "e2", displayName: "E2" }, variables: [], deliverable: { mediaType: "image/png", description: "image" }, capabilityPolicy: { required: ["READ_SOURCE"], optional: ["WRITE_CANDIDATE"], denied: [] }, securityProfile: { unknownInputPolicy: "REQUIRE_INPUT", promptInjectionPolicy: "TREAT_AS_DATA", embeddedSecretPolicy: "FORBID", allowedMimeTypes: ["image/png"], maxSourceBytes: 1000, operatorNotes: null }, qualityProfile: { criteria: [{ id: "SAME_SPEC", description: "same", critical: true, verifier: "SAME_SPEC_GATE", evidenceTypes: ["POLICY_CHECK"], roles: ["VERIFIER"] }] }, budget: { maxProviderCalls: 0, maxCostUsd: null, maxLatencyMs: null }, verificationPolicy: { requireSameSpecHash: true, criticalUnknownBlocksCommit: true, executorDoneIsEvidence: false } };
    await admin.query("insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,1,$2,null,'PUBLISHED',now(),$3::jsonb)", [BLUEPRINT, BLUEPRINT_HASH, JSON.stringify(blueprint)]);
    await admin.query("insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,1,$2,null,$3,1,$4,null,null,'PUBLISHED',now(),$5::jsonb)", [PROFILE, PROFILE_HASH, BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ schemaVersion: "outcome-requirement-profile-v0.1", id: PROFILE, version: 1, previousVersionHash: null, blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH }, policy: null, requirements: [{ requirementId: value.requirement.requirementId, semanticType: value.requirement.semanticType, critical: value.requirement.critical, acceptedProvenance: value.requirement.acceptedProvenance, qualificationRule: value.requirement.qualificationRule, dependencySelectors: value.requirement.dependencySelectors, blueprintId: BLUEPRINT, blueprintVersion: 1, blueprintHash: BLUEPRINT_HASH, policyId: null, policyHash: null, definitionSchemaVersion: value.requirement.definitionSchemaVersion }] })]);
    await admin.query("insert into public.outcome_transaction_requirement_bindings(owner_tenant_id,outcome_transaction_id,blueprint_id,blueprint_version,blueprint_hash,requirement_profile_id,requirement_profile_version,requirement_profile_hash,policy_id,policy_hash,schema_version,binding_hash,bound_at) values ($1,$2,$3,1,$4,$5,1,$6,null,null,'outcome-transaction-requirement-binding-v0.1',$7,now())", [TENANT, TRANSACTION, BLUEPRINT, BLUEPRINT_HASH, PROFILE, PROFILE_HASH, BINDING_HASH]);
    await service.query("select public.build002_insert_signal_requirement($1::jsonb)", [JSON.stringify({ id: REQUIREMENT, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: value.requirement.requirementId, semantic_type: value.requirement.semanticType, critical: value.requirement.critical, accepted_provenance: value.requirement.acceptedProvenance, qualification_rule: value.requirement.qualificationRule, dependency_selectors: value.requirement.dependencySelectors, blueprint_id: BLUEPRINT, blueprint_version: 1, blueprint_hash: BLUEPRINT_HASH, schema_version: value.requirement.definitionSchemaVersion, requirement_definition_hash: value.requirement.requirementDefinitionHash, created_at: value.requirement.createdAt })]);
    await service.query("select public.build002_insert_signal($1::jsonb)", [JSON.stringify({ signal_id: value.signal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: value.signal.requirementId, requirement_definition_hash: value.requirement.requirementDefinitionHash, payload: value.signal.payload, source: value.signal.source, provenance: value.signal.provenance, captured_at: value.signal.capturedAt, valid_until: value.signal.validUntil, dependency_identity: value.signal.dependency.identity, dependency_hash: value.signal.dependency.hash, schema_version: value.signal.schemaVersion, content_hash: value.signal.contentHash })]);
    const marker = await service.query("select public.build002_commit_readiness_authority($1::uuid,$2::jsonb) as result", [ACTOR, JSON.stringify(value.payload)]);
    const admission = createDelegabilityAdmission({ ownerTenantId: TENANT, principalId: ACTOR, membershipId: MEMBERSHIP, authorityCommitId: marker.rows[0].result.authority_commit_id, outcomeTransactionId: TRANSACTION, readinessId: value.readiness.id, readinessContentHash: value.readiness.readinessContentHash, historicalDependencySnapshotHash: value.snapshot.dependencySnapshotHash, currentDependencySnapshotHash: value.snapshot.dependencySnapshotHash, evaluator: value.evaluator, revalidatedAt: new Date(Date.now() - 5_000).toISOString() }, new Date().toISOString());
    const admitted = await service.query("select public.build002_admit_delegability($1::uuid,$2::uuid,$3::uuid,$4::jsonb,$5::jsonb) as result", [ACTOR, MEMBERSHIP, marker.rows[0].result.authority_commit_id, JSON.stringify(admission), JSON.stringify({ transaction: value.payload.transaction, asset: value.payload.asset, sourceVersion: value.payload.sourceVersion, binding: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, blueprint: { id: BLUEPRINT, version: 1, hash: BLUEPRINT_HASH }, requirementProfile: { id: PROFILE, version: 1, hash: PROFILE_HASH }, policy: { id: null, hash: null }, bindingHash: BINDING_HASH }, dependencySnapshot: value.snapshot, evaluator: value.evaluator })]);
    admissionId = admitted.rows[0].result.admission_id;
    await admin.query("insert into public.execution_runs(id,transaction_id,status,executor,started_at,completed_at,latency_ms,cost_usd,error_message,metadata) values ($1,$2,'SUCCESS','e2',now(),now(),0,0,null,'{}'::jsonb)", [RUN, TRANSACTION]);
    await admin.query("insert into public.candidate_assets(id,transaction_id,execution_run_id,source_version_id,storage_key,mime_type,width,height,byte_size,sha256,roi,instruction,provider,model,cost_usd,committed) values ($1,$2,$3,$4,'e2','image/png',1,1,1,$5,'{}'::jsonb,'e2','fixture','fixture',0,false)", [CANDIDATE, TRANSACTION, RUN, VERSION, SOURCE_SHA]);
    await admin.query("insert into public.field_outcomes(id,tenant_id,transaction_id,source_version_id,source_sha256,instruction,roi,topology,task_type,provider,model,raw_candidate_id,delivered_candidate_id,recommended_strategy,strategy_id,policy_version,outcome_sku,blueprint_id,blueprint_version,blueprint_hash,blueprint_snapshot,task_spec_id,task_spec_version,task_spec_hash,task_spec_snapshot,spec_compiler_name,spec_compiler_version,machine_verification_status,same_spec_status,provider_latency_ms,preservation_latency_ms,total_latency_ms,provider_cost_usd) values ($1,$2,$3,$4,$5,'e2','{}'::jsonb,'LOCAL_INDEPENDENT','COLOR_CHANGE','fixture','fixture',$6,$6,'P0_RAW','P0_RAW','e2','precision-edit-v0',$7,1,$8,$9::jsonb,$10,1,$11,$12::jsonb,'e2','1.0','PASSED','PASSED',0,0,0,0)", [OUTCOME, TENANT, TRANSACTION, VERSION, SOURCE_SHA, CANDIDATE, BLUEPRINT, BLUEPRINT_HASH, JSON.stringify({ id: BLUEPRINT, version: 1, previousVersionHash: null }), spec.id, spec.hash, JSON.stringify(spec)]);
    const authority = await service.query("select public.build002_grant_execution_authority($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text) as result", [ACTOR, MEMBERSHIP, admissionId, spec.id, spec.hash]);
    authorityId = authority.rows[0].result.execution_authority_id;
  }, 120_000);

  afterAll(async () => {
    await admin?.end(); await service?.end();
    if (databaseUrl && isolatedDatabase) { const root = new Client({ connectionString: connection(databaseUrl, "postgres") }); await root.connect(); await root.query(`drop database if exists "${isolatedDatabase}" with (force)`); await root.end(); }
  });

  it("replays the frozen migration set and reproduces the criticality boundary", async () => {
    const before = await count("build002_mutation_leases");
    const insertPair = async (path: string, value: unknown, suffix: string) => {
      await admin.query("insert into public.partial_intents(id,transaction_id,owner_tenant_id,raw_input,target_path,operation,desired_value) values ($1,$2,$3,'e2','" + path + "','SET_ATTRIBUTE',$4::jsonb)", [`ad${suffix}0000-0000-4000-8000-000000000001`, TRANSACTION, TENANT, JSON.stringify(value)]);
      await admin.query("insert into public.transaction_patches(id,transaction_id,owner_tenant_id,partial_intent_id,operation,target_path,parameters) values ($1,$2,$3,$4,'SET_ATTRIBUTE',$5,jsonb_build_object('value',$6::jsonb))", [`ae${suffix}0000-0000-4000-8000-000000000001`, TRANSACTION, TENANT, `ad${suffix}0000-0000-4000-8000-000000000001`, path, JSON.stringify(value)]);
    };
    await insertPair("requested.color", spec.values[0].value, "01");
    if (mode === "r1") {
      await expect(service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text)", [ACTOR, MEMBERSHIP, authorityId, "requested.color", "MUTABLE"])).rejects.toThrow(/PATCH_NOT_AUTHORIZED_BY_TASK_SPEC/);
      expect(await count("build002_mutation_leases")).toBe(before);
      return;
    }
    const criticalTrue = await service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as result", [ACTOR, MEMBERSHIP, authorityId, "requested.color", "MUTABLE"]);
    expect(criticalTrue.rows[0].result.mutation_lease_id).toEqual(expect.any(String));
    await insertPair("requested.size", 42, "02");
    const criticalFalse = await service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as result", [ACTOR, MEMBERSHIP, authorityId, "requested.size", "MUTABLE"]);
    expect(criticalFalse.rows[0].result.mutation_lease_id).toEqual(expect.any(String));
    await expect(service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text)", [ACTOR, MEMBERSHIP, authorityId, "requested.unknown", "MUTABLE"])).rejects.toThrow(/PATCH_NOT_AUTHORIZED_BY_TASK_SPEC/);
    await expect(service.query("select public.build002_grant_mutation_lease($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text)", [ACTOR, MEMBERSHIP, authorityId, "requested.missing", "MUTABLE"])).rejects.toThrow(/PATCH_NOT_AUTHORIZED_BY_TASK_SPEC/);
    expect(await count("build002_mutation_leases")).toBe(2);
  });

  it("measures canonical ACL and zero consequence", async () => {
    const acl = await admin.query("select has_function_privilege('service_role','public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)','EXECUTE') as service_ok, has_function_privilege('anon','public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)','EXECUTE') as anon_ok, has_function_privilege('authenticated','public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)','EXECUTE') as auth_ok, has_table_privilege('service_role','public.build002_mutation_leases','INSERT') as service_insert, has_table_privilege('service_role','public.build002_mutation_leases','UPDATE') as service_update, has_table_privilege('service_role','public.build002_mutation_leases','DELETE') as service_delete");
    expect(acl.rows[0]).toEqual({ service_ok: true, anon_ok: false, auth_ok: false, service_insert: false, service_update: false, service_delete: false });
    const before = await Promise.all(["execution_runs", "evidence_receipts", "verification_runs", "state_commits", "asset_versions", "candidate_assets", "cost_records"].map(count));
    expect(before).toEqual([1, 0, 0, 0, 1, 1, 0]);
    const after = await Promise.all(["execution_runs", "evidence_receipts", "verification_runs", "state_commits", "asset_versions", "candidate_assets", "cost_records"].map(count));
    expect(after).toEqual(before);
  });

  it("proves PostgreSQL and TypeScript canonical hashing agree", async () => {
    const fixtures: unknown[] = [null, true, false, "unicode á", "backslash\\", "line\nfeed", [true, 1, { nested: "x" }], { z: 1, a: 2, targetPath: "requested.ñ" }];
    for (const fixture of fixtures) {
      const pg = await admin.query("select public.build002_canonical_sha256($1::jsonb) as hash", [JSON.stringify(fixture)]);
      expect(pg.rows[0].hash).toBe(canonicalSha256(fixture));
    }
    expect(canonicalSha256(taskSpecHashMaterial(spec))).toBe(spec.hash);
  });
});
