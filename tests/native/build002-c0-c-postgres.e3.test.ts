// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { createOutcomeTransactionRequirementBinding } from "@/src/domain/outcome/specification/outcome-transaction-requirement-binding";
import { publishOutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { publishOutcomeRequirementProfile } from "@/src/domain/outcome/specification/outcome-requirement-profile";

const enabled = process.env.BUILD002_NATIVE_PG_C0_C === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const TENANT_A = "a0000000-0000-4000-8000-000000000001";
const TENANT_B = "a0000000-0000-4000-8000-000000000002";
const TX_A = "b0000000-0000-4000-8000-000000000001";
const PROJECT_A = "c0000000-0000-4000-8000-000000000001";
const ASSET_A = "d0000000-0000-4000-8000-000000000001";
const VERSION_A = "e0000000-0000-4000-8000-000000000001";

function databaseConnectionString(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function blueprintPayload(blueprint: ReturnType<typeof publishOutcomeBlueprint>): Record<string, unknown> {
  const { hash, status, publishedAt, ...definition } = blueprint;
  void hash; void status;
  return { ...blueprint, publishedAt, definition };
}

function profilePayload(profile: ReturnType<typeof publishOutcomeRequirementProfile>): Record<string, unknown> {
  const { hash, status, publishedAt, ...definition } = profile;
  void hash; void status;
  return { ...profile, definition, publishedAt };
}

async function expectRejected(client: Client, sql: string, values: unknown[] = []): Promise<void> {
  await expect(client.query(sql, values)).rejects.toThrow();
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD 002-C0-C native PostgreSQL E3", () => {
  let admin: Client;
  let service: Client;
  let secondService: Client;
  let isolatedDatabase: string;
  let binding: ReturnType<typeof createOutcomeTransactionRequirementBinding>;
  let blueprint: ReturnType<typeof publishOutcomeBlueprint>;
  let profile: ReturnType<typeof publishOutcomeRequirementProfile>;

  beforeAll(async () => {
    isolatedDatabase = `virro_e3_c0_c_${process.pid}_${Date.now()}`;
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
    await admin.query("insert into auth.users(id) values ($1),($2)", [randomUUID(), randomUUID()]);
    await admin.query("insert into public.tenants(id, kind, status) values ($1, 'ORGANIZATION', 'ACTIVE'),($2, 'ORGANIZATION', 'ACTIVE')", [TENANT_A, TENANT_B]);
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1, 'C0-C E3', $2)", [PROJECT_A, TENANT_A]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1, $2, 'E3 asset', $3)", [ASSET_A, PROJECT_A, TENANT_A]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1, $2, 1, '{}'::jsonb, $3)", [VERSION_A, ASSET_A, TENANT_A]);
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1,$2,$3,$4,$5,'C0-C E3')", [TX_A, TENANT_A, PROJECT_A, ASSET_A, VERSION_A]);
    service = new Client({ connectionString: isolatedUrl });
    secondService = new Client({ connectionString: isolatedUrl });
    await service.connect(); await secondService.connect();
    await service.query("set role service_role"); await secondService.query("set role service_role");
    blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), "2026-08-19T12:00:00.000Z");
    profile = publishOutcomeRequirementProfile({
      schemaVersion: "outcome-requirement-profile-v0.1", id: randomUUID(), version: 1, previousVersionHash: null,
      blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash }, policy: null,
      requirements: [{ requirementId: "binding.minimum", semanticType: "text", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [] }],
    }, "2026-08-19T12:00:00.000Z", blueprint);
    await service.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(blueprint))]);
    await service.query("select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(profile))]);
    binding = createOutcomeTransactionRequirementBinding({ ownerTenantId: TENANT_A, outcomeTransactionId: TX_A, blueprint, requirementProfile: profile, boundAt: "2026-08-19T12:00:00.000Z" });
  }, 120_000);

  afterAll(async () => {
    await service?.end(); await secondService?.end(); await admin?.end();
    if (databaseUrl && isolatedDatabase) {
      const root = new Client({ connectionString: databaseConnectionString(databaseUrl, "postgres") });
      await root.connect(); await root.query(`drop database if exists "${isolatedDatabase}" with (force)`); await root.end();
    }
  });

  it("runs on PostgreSQL 17 and exposes one C0-C migration", async () => {
    const version = await admin.query<{ version: string }>("select version() as version");
    expect(version.rows[0].version).toMatch(/PostgreSQL 17/i);
    const migrations = readdirSync(migrationsDir).filter((item) => item.endsWith(".sql"));
    expect(migrations.filter((name) => name.startsWith("20260819150000_build_002_c0_c_")).length).toBe(1);
    expect(migrations).toHaveLength(32);
    expect(migrations.sort()[0]).toBe("20260809110000_intent_lab_build_001.sql");
    expect(migrations.sort().at(-1)).toBe("20260820211000_build_002_c1_d0_r1_authority_marker_graph_coherence.sql");

    const key = await admin.query<{ indexdef: string }>("select indexdef from pg_indexes where schemaname='public' and indexname='outcome_transactions_owner_id_uq'");
    expect(key.rows[0]?.indexdef).toMatch(/owner_tenant_id, id/);
    const constraints = await admin.query<{ definition: string }>(`select pg_get_constraintdef(oid) as definition
      from pg_constraint where conrelid = 'public.outcome_transaction_requirement_bindings'::regclass`);
    const definitions = constraints.rows.map((row) => row.definition.toUpperCase());
    expect(definitions.some((item) => item.includes("PRIMARY KEY (OWNER_TENANT_ID, OUTCOME_TRANSACTION_ID)"))).toBe(true);
    expect(definitions.some((item) => item.includes("FOREIGN KEY (OWNER_TENANT_ID, OUTCOME_TRANSACTION_ID)") && item.includes("ON DELETE RESTRICT"))).toBe(true);
    expect(definitions.some((item) => item.includes("FOREIGN KEY (BLUEPRINT_ID, BLUEPRINT_VERSION, BLUEPRINT_HASH)"))).toBe(true);
    expect(definitions.some((item) => item.includes("FOREIGN KEY (REQUIREMENT_PROFILE_ID, REQUIREMENT_PROFILE_VERSION, REQUIREMENT_PROFILE_HASH)"))).toBe(true);
    const table = await admin.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid='public.outcome_transaction_requirement_bindings'::regclass");
    expect(table.rows[0].relrowsecurity).toBe(true);
    const triggers = await admin.query<{ tgname: string; tgenabled: string }>(`select tgname, tgenabled from pg_trigger
      where tgrelid='public.outcome_transaction_requirement_bindings'::regclass and not tgisinternal`);
    expect(triggers.rows.filter((row) => row.tgenabled === "O").map((row) => row.tgname)).toEqual(expect.arrayContaining([
      "outcome_transaction_requirement_bindings_tenant_guard",
      "outcome_transaction_requirement_bindings_profile_guard",
      "outcome_transaction_requirement_bindings_immutable",
    ]));
  });

  it("allows exactly one RPC binding and denies direct service-role table writes", async () => {
    const payload = {
      schema_version: binding.schemaVersion, owner_tenant_id: binding.ownerTenantId, outcome_transaction_id: binding.outcomeTransactionId,
      blueprint_id: binding.blueprint.id, blueprint_version: binding.blueprint.version, blueprint_hash: binding.blueprint.hash,
      requirement_profile_id: binding.requirementProfile.id, requirement_profile_version: binding.requirementProfile.version, requirement_profile_hash: binding.requirementProfile.hash,
      policy_id: null, policy_hash: null, binding_hash: binding.bindingHash, bound_at: binding.boundAt,
    };
    await expectRejected(service, "insert into public.outcome_transaction_requirement_bindings(owner_tenant_id,outcome_transaction_id,blueprint_id,blueprint_version,blueprint_hash,requirement_profile_id,requirement_profile_version,requirement_profile_hash,policy_id,policy_hash,schema_version,binding_hash,bound_at) values ($1,$2,$3,$4,$5,$6,$7,$8,null,null,$9,$10,$11)", [TENANT_A, TX_A, blueprint.id, blueprint.version, blueprint.hash, profile.id, profile.version, profile.hash, binding.schemaVersion, binding.bindingHash, binding.boundAt]);
    await service.query("select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload)]);
    const row = await service.query("select owner_tenant_id,outcome_transaction_id,binding_hash from public.outcome_transaction_requirement_bindings where owner_tenant_id=$1 and outcome_transaction_id=$2", [TENANT_A, TX_A]);
    expect(row.rowCount).toBe(1); expect(row.rows[0].binding_hash).toBe(binding.bindingHash);
    await expectRejected(service, "delete from public.outcome_transactions where id=$1", [TX_A]);
    await service.query("set role anon");
    await expectRejected(service, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload)]);
    await service.query("reset role; set role service_role");
    await expectRejected(service, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload, policy_id: "deferred", policy_hash: "a".repeat(64) })]);
  });

  it("rejects duplicates, cross-tenant transactions and Profile→Blueprint mismatches", async () => {
    const payload = { schema_version: binding.schemaVersion, owner_tenant_id: TENANT_A, outcome_transaction_id: TX_A, blueprint_id: blueprint.id, blueprint_version: blueprint.version, blueprint_hash: blueprint.hash, requirement_profile_id: profile.id, requirement_profile_version: profile.version, requirement_profile_hash: profile.hash, policy_id: null, policy_hash: null, binding_hash: binding.bindingHash, bound_at: binding.boundAt };
    await expectRejected(secondService, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload)]);
    await expectRejected(service, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload, owner_tenant_id: TENANT_B })]);
    await expectRejected(service, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload, outcome_transaction_id: randomUUID() })]);
    await expectRejected(service, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload, blueprint_id: randomUUID() })]);
  });

  it("serializes concurrent first publication and rejects update/delete", async () => {
    const tx = randomUUID();
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1,$2,$3,$4,$5,'C0-C concurrency')", [tx, TENANT_A, PROJECT_A, ASSET_A, VERSION_A]);
    const payload = { schema_version: binding.schemaVersion, owner_tenant_id: TENANT_A, outcome_transaction_id: tx, blueprint_id: blueprint.id, blueprint_version: blueprint.version, blueprint_hash: blueprint.hash, requirement_profile_id: profile.id, requirement_profile_version: profile.version, requirement_profile_hash: profile.hash, policy_id: null, policy_hash: null, binding_hash: binding.bindingHash, bound_at: binding.boundAt };
    const results = await Promise.allSettled([service, secondService].map((client) => client.query("select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload)])));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await expectRejected(service, "update public.outcome_transaction_requirement_bindings set binding_hash=$1 where owner_tenant_id=$2 and outcome_transaction_id=$3", ["f".repeat(64), TENANT_A, tx]);
    await expectRejected(service, "delete from public.outcome_transaction_requirement_bindings where owner_tenant_id=$1 and outcome_transaction_id=$2", [TENANT_A, tx]);
  });
});
