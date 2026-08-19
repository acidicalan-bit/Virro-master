// @vitest-environment node

import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { createOutcomeTransactionRequirementBinding } from "@/src/domain/outcome/specification/outcome-transaction-requirement-binding";
import { publishOutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { publishOutcomeRequirementProfile } from "@/src/domain/outcome/specification/outcome-requirement-profile";
import { SupabaseTransactionRequirementBindingRepository } from "@/src/infrastructure/persistence/outcome/supabase-transaction-requirement-binding-repository";

const enabled = process.env.BUILD002_C0_C_INDEPENDENT === "true";
const rootUrl = process.env.BUILD002_C0_C_INDEPENDENT_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const TENANT_A = "a1000000-0000-4000-8000-000000000001";
const TENANT_B = "a1000000-0000-4000-8000-000000000002";
const PROJECT = "a2000000-0000-4000-8000-000000000001";
const ASSET = "a3000000-0000-4000-8000-000000000001";
const VERSION = "a4000000-0000-4000-8000-000000000001";

type Blueprint = ReturnType<typeof publishOutcomeBlueprint>;
type Profile = ReturnType<typeof publishOutcomeRequirementProfile>;

function dbUrl(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function blueprintPayload(value: Blueprint): Record<string, unknown> {
  const { hash: _hash, status: _status, ...definition } = value;
  return { ...value, definition };
}

function profilePayload(value: Profile): Record<string, unknown> {
  const { hash: _hash, status: _status, ...definition } = value;
  return { ...value, definition };
}

function payload(binding: ReturnType<typeof createOutcomeTransactionRequirementBinding>): Record<string, unknown> {
  return {
    schema_version: binding.schemaVersion,
    owner_tenant_id: binding.ownerTenantId,
    outcome_transaction_id: binding.outcomeTransactionId,
    blueprint_id: binding.blueprint.id,
    blueprint_version: binding.blueprint.version,
    blueprint_hash: binding.blueprint.hash,
    requirement_profile_id: binding.requirementProfile.id,
    requirement_profile_version: binding.requirementProfile.version,
    requirement_profile_hash: binding.requirementProfile.hash,
    policy_id: binding.policy.id,
    policy_hash: binding.policy.hash,
    binding_hash: binding.bindingHash,
    bound_at: binding.boundAt,
  };
}

function expectRejected(client: Client, text: string, values: unknown[] = []): Promise<unknown> {
  return expect(client.query(text, values)).rejects.toThrow();
}

function makeProfile(blueprint: Blueprint, id = randomUUID()): Profile {
  return publishOutcomeRequirementProfile({
    schemaVersion: "outcome-requirement-profile-v0.1",
    id,
    version: 1,
    previousVersionHash: null,
    blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash },
    policy: null,
    requirements: [{
      requirementId: "independent.binding",
      semanticType: "text",
      critical: true,
      acceptedProvenance: ["OBSERVED"],
      qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
      dependencySelectors: [],
    }],
  }, "2026-08-19T12:00:00.000Z", blueprint);
}

describe.runIf(enabled && Boolean(rootUrl))("BUILD002-C0-C independent native verification", () => {
  let admin: Client;
  let serviceA: Client;
  let serviceB: Client;
  let isolatedDatabase: string;
  let blueprintA: Blueprint;
  let blueprintB: Blueprint;
  let profileA: Profile;
  let profileB: Profile;
  let bindingA: ReturnType<typeof createOutcomeTransactionRequirementBinding>;
  let transactionA: string;
  let sideEffectsBefore: Record<string, number>;

  async function addTransaction(id = randomUUID(), owner = TENANT_A): Promise<string> {
    await admin.query(
      "insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1,$2,$3,$4,$5,'independent C0-C')",
      [id, owner, PROJECT, ASSET, VERSION],
    );
    return id;
  }

  async function publishCatalog(blueprint: Blueprint, profile: Profile): Promise<void> {
    await serviceA.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(blueprint))]);
    await serviceA.query("select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(profile))]);
  }

  async function readBindingCount(transactionId: string): Promise<number> {
    const result = await admin.query<{ count: string }>(
      "select count(*)::text as count from public.outcome_transaction_requirement_bindings where outcome_transaction_id=$1",
      [transactionId],
    );
    return Number(result.rows[0].count);
  }

  async function sideEffectSnapshot(): Promise<Record<string, number>> {
    const tables = [
      "build002_signal_requirements", "build002_signals", "build002_dependency_snapshots",
      "build002_signal_qualifications", "build002_delegation_readiness", "mutation_leases",
      "execution_runs", "state_commits",
    ];
    const snapshot: Record<string, number> = {};
    for (const table of tables) {
      const result = await admin.query<{ count: string }>(`select count(*)::text as count from public.${table}`);
      snapshot[table] = Number(result.rows[0].count);
    }
    return snapshot;
  }

  beforeAll(async () => {
    isolatedDatabase = `virro_independent_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: dbUrl(rootUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();

    admin = new Client({ connectionString: dbUrl(rootUrl!, isolatedDatabase) });
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
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    for (const name of migrations) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    await admin.query("insert into public.tenants(id, kind, status) values ($1,'ORGANIZATION','ACTIVE'),($2,'ORGANIZATION','ACTIVE')", [TENANT_A, TENANT_B]);
    await admin.query("insert into public.projects(id, name, owner_tenant_id) values ($1,'independent',$2)", [PROJECT, TENANT_A]);
    await admin.query("insert into public.assets(id, project_id, name, owner_tenant_id) values ($1,$2,'independent',$3)", [ASSET, PROJECT, TENANT_A]);
    await admin.query("insert into public.asset_versions(id, asset_id, version_number, state, owner_tenant_id) values ($1,$2,1,'{}'::jsonb,$3)", [VERSION, ASSET, TENANT_A]);

    serviceA = new Client({ connectionString: dbUrl(rootUrl!, isolatedDatabase) });
    serviceB = new Client({ connectionString: dbUrl(rootUrl!, isolatedDatabase) });
    await serviceA.connect(); await serviceB.connect();
    await serviceA.query("set role service_role"); await serviceB.query("set role service_role");

    const base = createPrecisionEditBlueprintDefinition();
    blueprintA = publishOutcomeBlueprint({ ...base, id: randomUUID() }, "2026-08-19T12:00:00.000Z");
    blueprintB = publishOutcomeBlueprint({ ...base, id: randomUUID() }, "2026-08-19T12:00:00.000Z");
    profileA = makeProfile(blueprintA);
    profileB = makeProfile(blueprintB);
    await publishCatalog(blueprintA, profileA);
    await publishCatalog(blueprintB, profileB);
    transactionA = await addTransaction("a5000000-0000-4000-8000-000000000001");
    bindingA = createOutcomeTransactionRequirementBinding({
      ownerTenantId: TENANT_A,
      outcomeTransactionId: transactionA,
      blueprint: blueprintA,
      requirementProfile: profileA,
      boundAt: "2026-08-19T12:00:00.000Z",
    });
    sideEffectsBefore = await sideEffectSnapshot();
  }, 120_000);

  afterAll(async () => {
    await serviceA?.end(); await serviceB?.end(); await admin?.end();
    if (rootUrl && isolatedDatabase) {
      const root = new Client({ connectionString: dbUrl(rootUrl, "postgres") });
      await root.connect(); await root.query(`drop database if exists "${isolatedDatabase}" with (force)`); await root.end();
    }
  });

  it("derives the migration, relational, trigger, RLS, and effective ACL facts", async () => {
    const version = await admin.query<{ version: string }>("select version() as version");
    expect(version.rows[0].version).toMatch(/PostgreSQL 17/i);
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    expect(migrations).toHaveLength(29);
    expect(migrations[0]).toBe("20260809110000_intent_lab_build_001.sql");
    expect(migrations.at(-1)).toBe("20260819150000_build_002_c0_c_transaction_requirement_binding.sql");
    expect(migrations.filter((name) => name.startsWith("20260819150000_build_002_c0_c_")).length).toBe(1);

    const constraints = await admin.query<{ definition: string }>(`select pg_get_constraintdef(oid) as definition
      from pg_constraint where conrelid='public.outcome_transaction_requirement_bindings'::regclass`);
    const definitions = constraints.rows.map((row) => row.definition.toUpperCase());
    expect(definitions).toContain("PRIMARY KEY (OWNER_TENANT_ID, OUTCOME_TRANSACTION_ID)");
    expect(definitions.some((value) => value.includes("FOREIGN KEY (OWNER_TENANT_ID, OUTCOME_TRANSACTION_ID)") && value.includes("OUTCOME_TRANSACTIONS(OWNER_TENANT_ID, ID)"))).toBe(true);
    expect(definitions.some((value) => value.includes("FOREIGN KEY (BLUEPRINT_ID, BLUEPRINT_VERSION, BLUEPRINT_HASH)") && value.includes("OUTCOME_BLUEPRINTS(ID, VERSION, HASH)"))).toBe(true);
    expect(definitions.some((value) => value.includes("FOREIGN KEY (REQUIREMENT_PROFILE_ID, REQUIREMENT_PROFILE_VERSION, REQUIREMENT_PROFILE_HASH)") && value.includes("OUTCOME_REQUIREMENT_PROFILES(ID, VERSION, HASH)"))).toBe(true);
    const key = await admin.query<{ indexdef: string }>("select indexdef from pg_indexes where indexname='outcome_transactions_owner_id_uq'");
    expect(key.rows[0].indexdef).toMatch(/owner_tenant_id, id/);
    const rls = await admin.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid='public.outcome_transaction_requirement_bindings'::regclass");
    expect(rls.rows[0].relrowsecurity).toBe(true);
    const triggers = await admin.query<{ tgname: string; tgenabled: string }>("select tgname,tgenabled from pg_trigger where tgrelid='public.outcome_transaction_requirement_bindings'::regclass and not tgisinternal");
    expect(triggers.rows.filter((row) => row.tgenabled === "O").map((row) => row.tgname)).toEqual(expect.arrayContaining([
      "outcome_transaction_requirement_bindings_tenant_guard",
      "outcome_transaction_requirement_bindings_profile_guard",
      "outcome_transaction_requirement_bindings_immutable",
    ]));

    const acl = await admin.query<{ rpc: boolean; anon: boolean; authenticated: boolean; public_exec: boolean; insert: boolean; update: boolean; delete: boolean }>(`select
      has_function_privilege('service_role','public.build002_bind_outcome_transaction_requirements(jsonb)','execute') rpc,
      has_function_privilege('anon','public.build002_bind_outcome_transaction_requirements(jsonb)','execute') anon,
      has_function_privilege('authenticated','public.build002_bind_outcome_transaction_requirements(jsonb)','execute') authenticated,
      has_function_privilege('public','public.build002_bind_outcome_transaction_requirements(jsonb)','execute') public_exec,
      has_table_privilege('service_role','public.outcome_transaction_requirement_bindings','insert') insert,
      has_table_privilege('service_role','public.outcome_transaction_requirement_bindings','update') update,
      has_table_privilege('service_role','public.outcome_transaction_requirement_bindings','delete') delete`);
    expect(acl.rows[0]).toMatchObject({ rpc: true, anon: false, authenticated: false, public_exec: false, insert: false, update: false, delete: false });
  });

  it("accepts one exact binding and rejects raw ACL, tenant, address, policy, and rebind attacks", async () => {
    await serviceA.query("select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload(bindingA))]);
    expect(await readBindingCount(transactionA)).toBe(1);
    await expectRejected(serviceA, "insert into public.outcome_transaction_requirement_bindings(owner_tenant_id,outcome_transaction_id,blueprint_id,blueprint_version,blueprint_hash,requirement_profile_id,requirement_profile_version,requirement_profile_hash,schema_version,binding_hash,bound_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [TENANT_A, randomUUID(), blueprintA.id, blueprintA.version, blueprintA.hash, profileA.id, profileA.version, profileA.hash, bindingA.schemaVersion, bindingA.bindingHash, bindingA.boundAt]);
    await expectRejected(serviceA, "update public.outcome_transaction_requirement_bindings set binding_hash=$1 where owner_tenant_id=$2 and outcome_transaction_id=$3", ["f".repeat(64), TENANT_A, transactionA]);
    await expectRejected(serviceA, "delete from public.outcome_transaction_requirement_bindings where owner_tenant_id=$1 and outcome_transaction_id=$2", [TENANT_A, transactionA]);
    await serviceA.query("set role anon");
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload(bindingA))]);
    await serviceA.query("reset role; set role service_role");
    await serviceA.query("set role authenticated");
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload(bindingA))]);
    await serviceA.query("reset role; set role service_role");

    const duplicate = payload(bindingA);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(duplicate)]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), owner_tenant_id: TENANT_B })]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), outcome_transaction_id: randomUUID() })]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), blueprint_id: randomUUID() })]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), blueprint_hash: "f".repeat(64) })]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), blueprint_version: blueprintA.version + 1 })]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), requirement_profile_id: randomUUID() })]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), requirement_profile_hash: "e".repeat(64) })]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), requirement_profile_version: profileA.version + 1 })]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), blueprint_id: blueprintB.id, blueprint_version: blueprintB.version, blueprint_hash: blueprintB.hash })]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), policy_id: "deferred" })]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), policy_hash: "a".repeat(64) })]);
    const rebindProfile = createOutcomeTransactionRequirementBinding({ ownerTenantId: TENANT_A, outcomeTransactionId: transactionA, blueprint: blueprintB, requirementProfile: profileB, boundAt: bindingA.boundAt });
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload(rebindProfile))]);
    await expectRejected(serviceA, "select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ ...payload(bindingA), requirement_profile_id: profileB.id, requirement_profile_version: profileB.version, requirement_profile_hash: profileB.hash })]);
    expect(await readBindingCount(transactionA)).toBe(1);

    const nullOwner = randomUUID();
    await expectRejected(admin, "insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1,null,$2,$3,$4,'null owner')", [nullOwner, PROJECT, ASSET, VERSION]);
  });

  it("serializes identical and competing authorities and preserves immutable history", async () => {
    const txSame = await addTransaction();
    const sameA = createOutcomeTransactionRequirementBinding({ ownerTenantId: TENANT_A, outcomeTransactionId: txSame, blueprint: blueprintA, requirementProfile: profileA, boundAt: bindingA.boundAt });
    const sameResults = await Promise.allSettled([serviceA, serviceB].map((client) => client.query("select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload(sameA))])));
    expect(sameResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await readBindingCount(txSame)).toBe(1);

    const txCompeting = await addTransaction();
    const compA = createOutcomeTransactionRequirementBinding({ ownerTenantId: TENANT_A, outcomeTransactionId: txCompeting, blueprint: blueprintA, requirementProfile: profileA, boundAt: bindingA.boundAt });
    const compB = createOutcomeTransactionRequirementBinding({ ownerTenantId: TENANT_A, outcomeTransactionId: txCompeting, blueprint: blueprintB, requirementProfile: profileB, boundAt: bindingA.boundAt });
    const competing = await Promise.allSettled([
      serviceA.query("select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload(compA))]),
      serviceB.query("select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify(payload(compB))]),
    ]);
    expect(competing.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await readBindingCount(txCompeting)).toBe(1);

    await expectRejected(admin, "update public.outcome_transaction_requirement_bindings set binding_hash=$1 where owner_tenant_id=$2 and outcome_transaction_id=$3", ["f".repeat(64), TENANT_A, transactionA]);
    await expectRejected(admin, "delete from public.outcome_transaction_requirement_bindings where owner_tenant_id=$1 and outcome_transaction_id=$2", [TENANT_A, transactionA]);
    await expectRejected(admin, "delete from public.outcome_transactions where id=$1", [transactionA]);
    const retained = await admin.query("select outcome_transaction_id from public.outcome_transaction_requirement_bindings where outcome_transaction_id=$1", [transactionA]);
    expect(retained.rowCount).toBe(1);
    expect(await sideEffectSnapshot()).toEqual(sideEffectsBefore);
  });
});

describe("BUILD002-C0-C independent repository transport verification", () => {
  it("normalizes offset instants, rejects invalid precision, and keeps the semantic hash stable", async () => {
    const blueprint = publishOutcomeBlueprint({ ...createPrecisionEditBlueprintDefinition(), id: randomUUID() }, "2026-08-19T12:00:00.000Z");
    const profile = makeProfile(blueprint);
    const binding = createOutcomeTransactionRequirementBinding({
      ownerTenantId: TENANT_A,
      outcomeTransactionId: randomUUID(),
      blueprint,
      requirementProfile: profile,
      boundAt: "2026-08-19T12:00:00.000Z",
    });
    const row = (bound_at: unknown) => ({
      schema_version: binding.schemaVersion, owner_tenant_id: binding.ownerTenantId, outcome_transaction_id: binding.outcomeTransactionId,
      blueprint_id: binding.blueprint.id, blueprint_version: binding.blueprint.version, blueprint_hash: binding.blueprint.hash,
      requirement_profile_id: binding.requirementProfile.id, requirement_profile_version: binding.requirementProfile.version, requirement_profile_hash: binding.requirementProfile.hash,
      policy_id: null, policy_hash: null, binding_hash: binding.bindingHash, bound_at,
    });
    const catalog = {
      getBlueprint: async () => blueprint,
      getRequirementProfile: async () => profile,
    };
    const transactions = { findById: async () => ({ id: binding.outcomeTransactionId, ownerTenantId: binding.ownerTenantId }) };
    const get = async (transport: unknown) => {
      const query = { eq: () => query, maybeSingle: async () => ({ data: row(transport), error: null }) };
      const client = { from: () => ({ select: () => query }) } as never;
      const repository = new SupabaseTransactionRequirementBindingRepository(client, binding.ownerTenantId, catalog as never, transactions as never);
      return repository.get(binding.outcomeTransactionId);
    };
    await expect(get("2026-08-19T12:00:00+00:00")).resolves.toMatchObject({ boundAt: "2026-08-19T12:00:00.000Z", bindingHash: binding.bindingHash });
    await expect(get("2026-08-19T07:00:00-05:00")).resolves.toMatchObject({ boundAt: "2026-08-19T12:00:00.000Z", bindingHash: binding.bindingHash });
    await expect(get("not-a-timestamp")).rejects.toThrow();
    await expect(get("2026-08-19T12:00:00.123400Z")).rejects.toThrow();

    const rpc = vi.fn().mockResolvedValue({ data: binding.outcomeTransactionId, error: null });
    const query = { eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: row("2026-08-19T07:00:00-05:00"), error: null }) };
    const client = { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(query) }), rpc } as never;
    const catalogFull = { getBlueprint: vi.fn().mockResolvedValue(blueprint), getRequirementProfile: vi.fn().mockResolvedValue(profile) };
    const transactionsFull = { findById: vi.fn().mockResolvedValue({ id: binding.outcomeTransactionId, ownerTenantId: binding.ownerTenantId }) };
    const repository = new SupabaseTransactionRequirementBindingRepository(client, binding.ownerTenantId, catalogFull as never, transactionsFull as never);
    await expect(repository.publish(binding)).resolves.toMatchObject({ boundAt: "2026-08-19T12:00:00.000Z", bindingHash: binding.bindingHash });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith("owner_tenant_id", binding.ownerTenantId);
    expect(query.eq).toHaveBeenCalledWith("outcome_transaction_id", binding.outcomeTransactionId);

    const rejectedRpc = vi.fn();
    const rejectedClient = { from: vi.fn(), rpc: rejectedRpc } as never;
    const unpersistedCatalog = { getBlueprint: vi.fn(), getRequirementProfile: vi.fn().mockResolvedValue(null) };
    const rejectedRepository = new SupabaseTransactionRequirementBindingRepository(rejectedClient, binding.ownerTenantId, unpersistedCatalog as never, transactionsFull as never);
    await expect(rejectedRepository.publish(binding)).rejects.toThrow("BUILD002_BINDING_CATALOG_MISMATCH");
    expect(rejectedRpc).not.toHaveBeenCalled();
  });
});
