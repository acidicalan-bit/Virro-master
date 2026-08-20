// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthorityContext, TenantMembershipRecord, TenantRecord } from "@/src/domain/auth/authority";
import type { TenantMembershipRepository } from "@/src/application/ports/auth/authority-repositories";
import { TenantAuthorityService } from "@/src/application/auth/tenant-authority-service";
import type { OutcomeTransactionRecord, OutcomeTransactionRepository } from "@/src/application/ports/repositories";
import type { RequirementCatalogRepository } from "@/src/application/ports/outcome/requirement-catalog-repository";
import type { OutcomeTransactionRequirementBindingRepository } from "@/src/application/ports/outcome/transaction-requirement-binding-repository";
import {
  OutcomeRequirementAuthorityResolver,
} from "@/src/application/outcome/resolve-outcome-requirement-authority";
import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { OutcomeBlueprintSchema, publishOutcomeBlueprint, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import {
  OutcomeRequirementProfileSchema,
  publishOutcomeRequirementProfile,
  type OutcomeRequirementProfile,
} from "@/src/domain/outcome/specification/outcome-requirement-profile";
import {
  OutcomeTransactionRequirementBindingSchema,
  createOutcomeTransactionRequirementBinding,
  verifyOutcomeTransactionRequirementBindingHash,
  type OutcomeTransactionRequirementBinding,
} from "@/src/domain/outcome/specification/outcome-transaction-requirement-binding";

const enabled = process.env.BUILD002_NATIVE_PG_C0_E === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");

const PRINCIPAL_A = "10000000-0000-4000-8000-000000000001";
const PRINCIPAL_B = "10000000-0000-4000-8000-000000000002";
const PRINCIPAL_NONE = "10000000-0000-4000-8000-000000000099";
const TENANT_A = "20000000-0000-4000-8000-000000000001";
const TENANT_B = "20000000-0000-4000-8000-000000000002";
const TX_A = "40000000-0000-4000-8000-000000000001";
const TX_B = "40000000-0000-4000-8000-000000000002";
const TX_NO_BINDING = "40000000-0000-4000-8000-000000000003";
const PROJECT_A = "50000000-0000-4000-8000-000000000001";
const PROJECT_B = "50000000-0000-4000-8000-000000000002";
const ASSET_A = "60000000-0000-4000-8000-000000000001";
const ASSET_B = "60000000-0000-4000-8000-000000000002";
const VERSION_A = "70000000-0000-4000-8000-000000000001";
const VERSION_B = "70000000-0000-4000-8000-000000000002";
const MEMBERSHIP_A = "30000000-0000-4000-8000-000000000001";
const MEMBERSHIP_B = "30000000-0000-4000-8000-000000000002";

type Row = Record<string, unknown>;

function databaseConnectionString(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function dbInstant(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function blueprintPayload(blueprint: OutcomeBlueprint): Row {
  const { hash, status, publishedAt, ...definition } = blueprint;
  void hash; void status;
  return { ...blueprint, publishedAt, definition };
}

function profilePayload(profile: OutcomeRequirementProfile): Row {
  const { hash, status, publishedAt, ...definition } = profile;
  void hash; void status;
  return { ...profile, publishedAt, definition };
}

function transactionFromRow(row: Row): OutcomeTransactionRecord {
  return {
    id: String(row.id),
    ownerTenantId: row.owner_tenant_id ? String(row.owner_tenant_id) : null,
    projectId: String(row.project_id),
    assetId: String(row.asset_id),
    baseVersionId: String(row.base_version_id),
    status: row.status as OutcomeTransactionRecord["status"],
    rawRequest: String(row.raw_request),
    createdAt: dbInstant(row.created_at),
    updatedAt: dbInstant(row.updated_at),
    completedAt: row.completed_at ? dbInstant(row.completed_at) : null,
    abortReason: row.abort_reason ? String(row.abort_reason) : null,
  };
}

function blueprintFromRow(row: Row): OutcomeBlueprint {
  return OutcomeBlueprintSchema.parse({
    ...(row.definition as Row),
    hash: String(row.hash),
    status: String(row.status),
    publishedAt: dbInstant(row.published_at),
  });
}

function profileFromRow(row: Row): OutcomeRequirementProfile {
  return OutcomeRequirementProfileSchema.parse({
    ...(row.definition as Row),
    hash: String(row.hash),
    status: String(row.status),
    publishedAt: dbInstant(row.published_at),
  });
}

function bindingFromRow(row: Row): OutcomeTransactionRequirementBinding {
  return OutcomeTransactionRequirementBindingSchema.parse({
    schemaVersion: String(row.schema_version),
    ownerTenantId: String(row.owner_tenant_id),
    outcomeTransactionId: String(row.outcome_transaction_id),
    blueprint: { id: String(row.blueprint_id), version: Number(row.blueprint_version), hash: String(row.blueprint_hash) },
    requirementProfile: { id: String(row.requirement_profile_id), version: Number(row.requirement_profile_version), hash: String(row.requirement_profile_hash) },
    policy: { id: row.policy_id === null ? null : String(row.policy_id), hash: row.policy_hash === null ? null : String(row.policy_hash) },
    bindingHash: String(row.binding_hash),
    boundAt: dbInstant(row.bound_at),
  });
}

class NativeMembershipRepository implements TenantMembershipRepository {
  constructor(private readonly client: Client) {}

  async listActiveMemberships(principalId: string): Promise<TenantMembershipRecord[]> {
    const result = await this.client.query("select id, tenant_id, principal_id, role, status, created_at, revoked_at from public.tenant_memberships where principal_id=$1 and status='ACTIVE' order by tenant_id", [principalId]);
    return result.rows.map((row) => ({ id: String(row.id), tenantId: String(row.tenant_id), principalId: String(row.principal_id), role: row.role as TenantMembershipRecord["role"], status: "ACTIVE", createdAt: dbInstant(row.created_at), revokedAt: row.revoked_at ? dbInstant(row.revoked_at) : null }));
  }

  async findTenant(tenantId: string): Promise<TenantRecord | null> {
    const result = await this.client.query("select id, kind, status, created_at, updated_at from public.tenants where id=$1", [tenantId]);
    const row = result.rows[0];
    return row ? { id: String(row.id), kind: row.kind as TenantRecord["kind"], status: row.status as TenantRecord["status"], createdAt: dbInstant(row.created_at), updatedAt: dbInstant(row.updated_at) } : null;
  }

  async findActiveMembership(principalId: string, tenantId: string): Promise<TenantMembershipRecord | null> {
    const result = await this.client.query("select id, tenant_id, principal_id, role, status, created_at, revoked_at from public.tenant_memberships where principal_id=$1 and tenant_id=$2 and status='ACTIVE'", [principalId, tenantId]);
    const row = result.rows[0];
    return row ? { id: String(row.id), tenantId: String(row.tenant_id), principalId: String(row.principal_id), role: row.role as TenantMembershipRecord["role"], status: "ACTIVE", createdAt: dbInstant(row.created_at), revokedAt: row.revoked_at ? dbInstant(row.revoked_at) : null } : null;
  }
}

class NativeTransactionRepository implements OutcomeTransactionRepository {
  constructor(private readonly client: Client, private readonly ownerTenantId: string) {}

  async findById(id: string): Promise<OutcomeTransactionRecord | null> {
    const result = await this.client.query("select * from public.outcome_transactions where owner_tenant_id=$1 and id=$2", [this.ownerTenantId, id]);
    return result.rows[0] ? transactionFromRow(result.rows[0]) : null;
  }

  async create(): Promise<OutcomeTransactionRecord> { throw new Error("C0-E read-only adapter"); }
  async findByAssetId(): Promise<OutcomeTransactionRecord[]> { throw new Error("C0-E read-only adapter"); }
  async updateStatus(): Promise<OutcomeTransactionRecord> { throw new Error("C0-E read-only adapter"); }
}

class NativeCatalogRepository implements RequirementCatalogRepository {
  constructor(private readonly client: Client) {}

  async getBlueprint(id: string, version: number): Promise<OutcomeBlueprint | null> {
    const result = await this.client.query("select * from public.outcome_blueprints where id=$1 and version=$2", [id, version]);
    return result.rows[0] ? blueprintFromRow(result.rows[0]) : null;
  }

  async getRequirementProfile(id: string, version: number): Promise<OutcomeRequirementProfile | null> {
    const result = await this.client.query("select * from public.outcome_requirement_profiles where id=$1 and version=$2", [id, version]);
    return result.rows[0] ? profileFromRow(result.rows[0]) : null;
  }

  async publishBlueprint(): Promise<OutcomeBlueprint> { throw new Error("C0-E read-only adapter"); }
  async publishRequirementProfile(): Promise<OutcomeRequirementProfile> { throw new Error("C0-E read-only adapter"); }
}

class NativeBindingRepository implements OutcomeTransactionRequirementBindingRepository {
  constructor(private readonly client: Client, private readonly ownerTenantId: string) {}

  async get(outcomeTransactionId: string): Promise<OutcomeTransactionRequirementBinding | null> {
    const result = await this.client.query("select * from public.outcome_transaction_requirement_bindings where owner_tenant_id=$1 and outcome_transaction_id=$2", [this.ownerTenantId, outcomeTransactionId]);
    if (!result.rows[0]) return null;
    const binding = bindingFromRow(result.rows[0]);
    if (binding.ownerTenantId !== this.ownerTenantId || binding.outcomeTransactionId !== outcomeTransactionId || !verifyOutcomeTransactionRequirementBindingHash(binding)) throw new Error("NATIVE_BINDING_INTEGRITY_FAILURE");
    return binding;
  }

  async publish(): Promise<OutcomeTransactionRequirementBinding> { throw new Error("C0-E read-only adapter"); }
}

type ResolverBundle = { client: Client; resolver: OutcomeRequirementAuthorityResolver };

function createResolver(client: Client, ownerTenantId: string, clock = "2026-08-20T12:00:00.000Z"): ResolverBundle {
  const transactions = new NativeTransactionRepository(client, ownerTenantId);
  const bindings = new NativeBindingRepository(client, ownerTenantId);
  const catalog = new NativeCatalogRepository(client);
  return { client, resolver: new OutcomeRequirementAuthorityResolver({ transactions, bindings, catalog, clock: { now: () => clock } }) };
}

function principal(principalId: string) {
  return { principalId, sessionId: `session-${principalId}`, authenticationAssurance: "native-test", authenticatedAt: "2026-08-20T12:00:00.000Z" };
}

async function expectAuthorityFailure(promise: Promise<unknown>, code?: string): Promise<void> {
  await expect(promise).rejects.toMatchObject(code ? { code } : { code: expect.any(String) });
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD 002-C0-E native composed authority chain", () => {
  let admin: Client;
  let isolatedDatabase: string;
  let blueprint: OutcomeBlueprint;
  let profile: OutcomeRequirementProfile;
  let binding: OutcomeTransactionRequirementBinding;
  let authorityA: AuthorityContext;
  let authorityB: AuthorityContext;

  beforeAll(async () => {
    isolatedDatabase = `virro_e3_c0_e_${process.pid}_${Date.now()}`;
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
    await admin.query("insert into auth.users(id) values ($1),($2) on conflict do nothing", [PRINCIPAL_A, PRINCIPAL_B]);
    await admin.query("insert into public.tenants(id, kind, status) values ($1,'ORGANIZATION','ACTIVE'),($2,'ORGANIZATION','ACTIVE')", [TENANT_A, TENANT_B]);
    await admin.query("insert into public.tenant_memberships(id, tenant_id, principal_id, role, status) values ($1,$2,$3,'OWNER','ACTIVE'),($4,$5,$6,'OWNER','ACTIVE')", [MEMBERSHIP_A, TENANT_A, PRINCIPAL_A, MEMBERSHIP_B, TENANT_B, PRINCIPAL_B]);
    await admin.query("insert into public.projects(id, owner_tenant_id, name) values ($1,$2,'C0-E A'),($3,$4,'C0-E B')", [PROJECT_A, TENANT_A, PROJECT_B, TENANT_B]);
    await admin.query("insert into public.assets(id, owner_tenant_id, project_id, name) values ($1,$2,$3,'A'),($4,$5,$6,'B')", [ASSET_A, TENANT_A, PROJECT_A, ASSET_B, TENANT_B, PROJECT_B]);
    await admin.query("insert into public.asset_versions(id, owner_tenant_id, asset_id, version_number, state) values ($1,$2,$3,1,'{}'),($4,$5,$6,1,'{}')", [VERSION_A, TENANT_A, ASSET_A, VERSION_B, TENANT_B, ASSET_B]);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [VERSION_A, ASSET_A]);
    await admin.query("update public.assets set current_version_id=$1 where id=$2", [VERSION_B, ASSET_B]);
    const forgedRawRequest = JSON.stringify({ tenantId: TENANT_B, blueprint: { forged: true }, profile: { forged: true }, requirements: [{ requirementId: "forged" }], requirementDefinitionHash: "f".repeat(64), acceptedProvenance: ["OBSERVED"], inputRequirements: [{ requirementId: "forged" }], readiness: "READY" });
    await admin.query("insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, raw_request) values ($1,$2,$3,$4,$5,'{}'),($6,$7,$8,$9,$10,'{}'),($11,$12,$13,$14,$15,$16)", [TX_A, TENANT_A, PROJECT_A, ASSET_A, VERSION_A, TX_B, TENANT_B, PROJECT_B, ASSET_B, VERSION_B, TX_NO_BINDING, TENANT_A, PROJECT_A, ASSET_A, VERSION_A, forgedRawRequest]);

    const blueprintInput = createPrecisionEditBlueprintDefinition();
    blueprint = publishOutcomeBlueprint(blueprintInput, "2026-08-20T12:00:00.000Z");
    profile = publishOutcomeRequirementProfile({
      schemaVersion: "outcome-requirement-profile-v0.1", id: randomUUID(), version: 1, previousVersionHash: null,
      blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash }, policy: null,
      requirements: [
        { requirementId: "c0e.minimum", semanticType: "text", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [{ identity: "asset.version", required: true }] },
        { requirementId: "c0e.secondary", semanticType: "number", critical: false, acceptedProvenance: ["SYSTEM_DERIVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [] },
      ],
    }, "2026-08-20T12:00:00.000Z", blueprint);

    const service = new Client({ connectionString: isolatedUrl });
    await service.connect();
    await service.query("set role service_role");
    await service.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(blueprint))]);
    await service.query("select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(profile))]);
    binding = createOutcomeTransactionRequirementBinding({ ownerTenantId: TENANT_A, outcomeTransactionId: TX_A, blueprint, requirementProfile: profile, boundAt: "2026-08-20T12:00:00.000Z" });
    await service.query("select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ schema_version: binding.schemaVersion, owner_tenant_id: binding.ownerTenantId, outcome_transaction_id: binding.outcomeTransactionId, blueprint_id: binding.blueprint.id, blueprint_version: binding.blueprint.version, blueprint_hash: binding.blueprint.hash, requirement_profile_id: binding.requirementProfile.id, requirement_profile_version: binding.requirementProfile.version, requirement_profile_hash: binding.requirementProfile.hash, policy_id: null, policy_hash: null, binding_hash: binding.bindingHash, bound_at: binding.boundAt })]);
    const bindingB = createOutcomeTransactionRequirementBinding({ ownerTenantId: TENANT_B, outcomeTransactionId: TX_B, blueprint, requirementProfile: profile, boundAt: "2026-08-20T12:00:00.000Z" });
    await service.query("select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ schema_version: bindingB.schemaVersion, owner_tenant_id: bindingB.ownerTenantId, outcome_transaction_id: bindingB.outcomeTransactionId, blueprint_id: bindingB.blueprint.id, blueprint_version: bindingB.blueprint.version, blueprint_hash: bindingB.blueprint.hash, requirement_profile_id: bindingB.requirementProfile.id, requirement_profile_version: bindingB.requirementProfile.version, requirement_profile_hash: bindingB.requirementProfile.hash, policy_id: null, policy_hash: null, binding_hash: bindingB.bindingHash, bound_at: bindingB.boundAt })]);
    await service.end();

    const membershipService = new TenantAuthorityService(new NativeMembershipRepository(admin));
    authorityA = await membershipService.resolveAuthority({ principal: principal(PRINCIPAL_A) });
    authorityB = await membershipService.resolveAuthority({ principal: principal(PRINCIPAL_B) });
  }, 120_000);

  afterAll(async () => {
    await admin?.end();
    if (databaseUrl && isolatedDatabase) {
      const root = new Client({ connectionString: databaseConnectionString(databaseUrl, "postgres") });
      await root.connect();
      await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
      await root.end();
    }
  });

  it("applies all 30 migrations to fresh PostgreSQL 17 and records persisted fixture addresses", async () => {
    const version = await admin.query<{ version: string }>("select version() as version");
    expect(version.rows[0].version).toMatch(/PostgreSQL 17/i);
    const migrations = readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort();
    expect(migrations).toHaveLength(30);
    expect(migrations[0]).toBe("20260809110000_intent_lab_build_001.sql");
    expect(migrations.at(-1)).toBe("20260820210000_build_002_c1_d0_readiness_authority_commit.sql");
    const persisted = await admin.query("select id::text, owner_tenant_id::text, raw_request from public.outcome_transactions where id in ($1,$2) order by id", [TX_A, TX_B]);
    expect(persisted.rows).toHaveLength(2);
    expect(persisted.rows.map((row) => row.id)).toEqual([TX_A, TX_B]);
    const persistedBlueprint = await admin.query("select id::text, hash from public.outcome_blueprints where id=$1", [blueprint.id]);
    const persistedProfile = await admin.query("select id::text, hash from public.outcome_requirement_profiles where id=$1", [profile.id]);
    expect(persistedBlueprint.rows[0]).toEqual({ id: blueprint.id, hash: blueprint.hash });
    expect(persistedProfile.rows[0]).toEqual({ id: profile.id, hash: profile.hash });
    const bindingRow = await admin.query("select owner_tenant_id::text, outcome_transaction_id::text, binding_hash from public.outcome_transaction_requirement_bindings where outcome_transaction_id=$1", [TX_A]);
    expect(bindingRow.rows[0]).toEqual({ owner_tenant_id: TENANT_A, outcome_transaction_id: TX_A, binding_hash: binding.bindingHash });
  });

  it("resolves the complete persisted authority chain through production resolver and compiler", async () => {
    const client = new Client({ connectionString: databaseConnectionString(databaseUrl!, isolatedDatabase) });
    await client.connect(); await client.query("set role service_role");
    const { resolver } = createResolver(client, TENANT_A);
    const result = await resolver.resolve({ authority: authorityA, outcomeTransactionId: TX_A });
    expect(result.signalRequirements.length).toBeGreaterThan(0);
    expect(result.ownerTenantId).toBe(TENANT_A);
    expect(result.outcomeTransactionId).toBe(TX_A);
    expect(result.binding.bindingHash).toBe(binding.bindingHash);
    expect(result.blueprint.hash).toBe(blueprint.hash);
    expect(result.requirementProfile.hash).toBe(profile.hash);
    for (const requirement of result.signalRequirements) {
      const source = profile.requirements.find((candidate) => candidate.requirementId === requirement.requirementId);
      expect(source).toBeDefined();
      expect(requirement.subjectKind).toBe("OUTCOME_TRANSACTION");
      expect(requirement.blueprintId).toBe(blueprint.id);
      expect(requirement.blueprintVersion).toBe(blueprint.version);
      expect(requirement.blueprintHash).toBe(blueprint.hash);
      expect(requirement.policyId).toBeNull();
      expect(requirement.policyHash).toBeNull();
      expect(requirement.semanticType).toBe(source!.semanticType);
      expect(requirement.acceptedProvenance).toEqual(source!.acceptedProvenance);
      expect(requirement.qualificationRule).toEqual(source!.qualificationRule);
      expect(requirement.dependencySelectors).toEqual(source!.dependencySelectors);
    }
    await client.end();
  });

  it("keeps hashes stable across trusted server timestamps", async () => {
    const client = new Client({ connectionString: databaseConnectionString(databaseUrl!, isolatedDatabase) });
    await client.connect(); await client.query("set role service_role");
    const first = createResolver(client, TENANT_A, "2026-08-20T12:00:00.000Z");
    const second = createResolver(client, TENANT_A, "2026-08-20T13:00:00.000Z");
    const [left, right] = await Promise.all([
      first.resolver.resolve({ authority: authorityA, outcomeTransactionId: TX_A }),
      second.resolver.resolve({ authority: authorityA, outcomeTransactionId: TX_A }),
    ]);
    expect(left.resolvedAt).not.toBe(right.resolvedAt);
    expect(left.signalRequirements.map((item) => [item.requirementId, item.requirementDefinitionHash])).toEqual(right.signalRequirements.map((item) => [item.requirementId, item.requirementDefinitionHash]));
    await client.end();
  });

  it("fails closed for membership, tenant, binding, catalog, and caller-material controls", async () => {
    const membership = new TenantAuthorityService(new NativeMembershipRepository(admin));
    await expectAuthorityFailure(membership.resolveAuthority({ principal: principal(PRINCIPAL_NONE) }), "TENANT_MEMBERSHIP_REQUIRED");
    await admin.query("update public.tenant_memberships set status='REVOKED', revoked_at=now() where id=$1", [MEMBERSHIP_A]);
    await expectAuthorityFailure(membership.resolveAuthority({ principal: principal(PRINCIPAL_A) }), "TENANT_MEMBERSHIP_REQUIRED");
    await admin.query("update public.tenant_memberships set status='ACTIVE', revoked_at=null where id=$1", [MEMBERSHIP_A]);
    await admin.query("update public.tenants set status='SUSPENDED' where id=$1", [TENANT_A]);
    await expectAuthorityFailure(membership.resolveAuthority({ principal: principal(PRINCIPAL_A) }), "TENANT_MEMBERSHIP_INACTIVE");
    await admin.query("update public.tenants set status='ACTIVE' where id=$1", [TENANT_A]);
    await admin.query("insert into public.tenant_memberships(id,tenant_id,principal_id,role,status) values ($1,$2,$3,'OWNER','ACTIVE')", ["30000000-0000-4000-8000-000000000099", TENANT_B, PRINCIPAL_A]);
    await expectAuthorityFailure(membership.resolveAuthority({ principal: principal(PRINCIPAL_A) }), "TENANT_NOT_SELECTED");
    await admin.query("delete from public.tenant_memberships where id=$1", ["30000000-0000-4000-8000-000000000099"]);

    const client = new Client({ connectionString: databaseConnectionString(databaseUrl!, isolatedDatabase) });
    await client.connect(); await client.query("set role service_role");
    const bundle = createResolver(client, TENANT_A);
    await expectAuthorityFailure(bundle.resolver.resolve({ authority: authorityA, outcomeTransactionId: TX_B }));
    await expectAuthorityFailure(bundle.resolver.resolve({ authority: authorityA, outcomeTransactionId: TX_NO_BINDING }));
    await expectAuthorityFailure(bundle.resolver.resolve({ authority: authorityA, outcomeTransactionId: "00000000-0000-4000-8000-000000000099" }));

    const tamperedBinding = { ...binding, ownerTenantId: TENANT_B };
    const tampered = new OutcomeRequirementAuthorityResolver({
      transactions: new NativeTransactionRepository(client, TENANT_A),
      bindings: { get: async () => tamperedBinding, publish: async () => tamperedBinding },
      catalog: new NativeCatalogRepository(client),
      clock: { now: () => "2026-08-20T12:00:00.000Z" },
    });
    await expectAuthorityFailure(tampered.resolve({ authority: authorityA, outcomeTransactionId: TX_A }));
    await client.end();
  });

  it("rejects catalog tamper and caller raw_request authority", async () => {
    const client = new Client({ connectionString: databaseConnectionString(databaseUrl!, isolatedDatabase) });
    await client.connect(); await client.query("set role service_role");
    const base = createResolver(client, TENANT_A);
    const catalog = new NativeCatalogRepository(client);
    const tamperedBlueprint = new OutcomeRequirementAuthorityResolver({
      transactions: new NativeTransactionRepository(client, TENANT_A),
      bindings: new NativeBindingRepository(client, TENANT_A),
      catalog: { ...catalog, getBlueprint: async () => ({ ...blueprint, hash: "a".repeat(64) }), getRequirementProfile: catalog.getRequirementProfile.bind(catalog), publishBlueprint: catalog.publishBlueprint.bind(catalog), publishRequirementProfile: catalog.publishRequirementProfile.bind(catalog) },
      clock: { now: () => "2026-08-20T12:00:00.000Z" },
    });
    await expectAuthorityFailure(tamperedBlueprint.resolve({ authority: authorityA, outcomeTransactionId: TX_A }));

    const missingBlueprint = new OutcomeRequirementAuthorityResolver({
      transactions: new NativeTransactionRepository(client, TENANT_A),
      bindings: new NativeBindingRepository(client, TENANT_A),
      catalog: { ...catalog, getBlueprint: async () => null, getRequirementProfile: catalog.getRequirementProfile.bind(catalog), publishBlueprint: catalog.publishBlueprint.bind(catalog), publishRequirementProfile: catalog.publishRequirementProfile.bind(catalog) },
      clock: { now: () => "2026-08-20T12:00:00.000Z" },
    });
    await expectAuthorityFailure(missingBlueprint.resolve({ authority: authorityA, outcomeTransactionId: TX_A }));

    const missingProfile = new OutcomeRequirementAuthorityResolver({
      transactions: new NativeTransactionRepository(client, TENANT_A),
      bindings: new NativeBindingRepository(client, TENANT_A),
      catalog: { ...catalog, getBlueprint: catalog.getBlueprint.bind(catalog), getRequirementProfile: async () => null, publishBlueprint: catalog.publishBlueprint.bind(catalog), publishRequirementProfile: catalog.publishRequirementProfile.bind(catalog) },
      clock: { now: () => "2026-08-20T12:00:00.000Z" },
    });
    await expectAuthorityFailure(missingProfile.resolve({ authority: authorityA, outcomeTransactionId: TX_A }));

    const mismatchedProfile = { ...profile, blueprint: { ...profile.blueprint, version: profile.blueprint.version + 1 } };
    const profileMismatch = new OutcomeRequirementAuthorityResolver({
      transactions: new NativeTransactionRepository(client, TENANT_A),
      bindings: new NativeBindingRepository(client, TENANT_A),
      catalog: { ...catalog, getBlueprint: catalog.getBlueprint.bind(catalog), getRequirementProfile: async () => mismatchedProfile, publishBlueprint: catalog.publishBlueprint.bind(catalog), publishRequirementProfile: catalog.publishRequirementProfile.bind(catalog) },
      clock: { now: () => "2026-08-20T12:00:00.000Z" },
    });
    await expectAuthorityFailure(profileMismatch.resolve({ authority: authorityA, outcomeTransactionId: TX_A }));

    await expect(client.query("select public.build002_bind_outcome_transaction_requirements($1::jsonb)", [JSON.stringify({ schema_version: binding.schemaVersion, owner_tenant_id: TENANT_B, outcome_transaction_id: TX_A, blueprint_id: binding.blueprint.id, blueprint_version: binding.blueprint.version, blueprint_hash: binding.blueprint.hash, requirement_profile_id: binding.requirementProfile.id, requirement_profile_version: binding.requirementProfile.version, requirement_profile_hash: binding.requirementProfile.hash, policy_id: null, policy_hash: null, binding_hash: binding.bindingHash, bound_at: binding.boundAt })])).rejects.toThrow();
    await expectAuthorityFailure(base.resolver.resolve({ authority: authorityA, outcomeTransactionId: TX_NO_BINDING }));
    await client.end();
  });

  it("keeps concurrent resolutions tenant-scoped, identical, and read-only", async () => {
    const before = await snapshot(admin);
    const bundles: ResolverBundle[] = [];
    try {
      for (let index = 0; index < 4; index += 1) {
        const client = new Client({ connectionString: databaseConnectionString(databaseUrl!, isolatedDatabase) });
        await client.connect(); await client.query("set role service_role");
        bundles.push(createResolver(client, TENANT_A));
      }
      const results = await Promise.all(bundles.map((bundle) => bundle.resolver.resolve({ authority: authorityA, outcomeTransactionId: TX_A })));
      expect(results.map((result) => result.signalRequirements.map((item) => [item.requirementId, item.requirementDefinitionHash]))).toEqual(Array.from({ length: 4 }, () => results[0].signalRequirements.map((item) => [item.requirementId, item.requirementDefinitionHash])));
      const clientB = new Client({ connectionString: databaseConnectionString(databaseUrl!, isolatedDatabase) });
      await clientB.connect(); await clientB.query("set role service_role");
      const bundleB = createResolver(clientB, TENANT_B);
      const [resultA, resultB] = await Promise.all([bundles[0].resolver.resolve({ authority: authorityA, outcomeTransactionId: TX_A }), bundleB.resolver.resolve({ authority: authorityB, outcomeTransactionId: TX_B })]);
      expect(resultA.ownerTenantId).toBe(TENANT_A); expect(resultB.ownerTenantId).toBe(TENANT_B);
      expect(resultA.outcomeTransactionId).not.toBe(resultB.outcomeTransactionId);
      await clientB.end();
    } finally {
      await Promise.all(bundles.map((bundle) => bundle.client.end()));
    }
    const after = await snapshot(admin);
    expect(after).toEqual(before);
  });

  it("has no C0-E HTTP, readiness, ingestion, execution, or persistence surface", async () => {
    const source = readFileSync(resolve(process.cwd(), "src/application/outcome/resolve-outcome-requirement-authority.ts"), "utf8");
    expect(source).not.toMatch(/evaluateReadiness|qualifySignal|canDelegate|ExecutionAuthority|MutationLease|executor\.execute|StateCommit/);
    expect(readdirSync(resolve(process.cwd(), "supabase/migrations")).filter((item) => item.endsWith(".sql"))).toHaveLength(30);
    const signalCounts = await snapshot(admin);
    expect(signalCounts.build002_signal_requirements).toBe(0);
    expect(signalCounts.build002_signals).toBe(0);
    expect(signalCounts.build002_signal_qualifications).toBe(0);
    expect(signalCounts.build002_delegation_readiness).toBe(0);
  });
});

type Snapshot = Record<string, number | string>;

async function snapshot(client: Client): Promise<Snapshot> {
  const result = await client.query(`
    select
      (select count(*)::int from public.build002_signal_requirements) as build002_signal_requirements,
      (select count(*)::int from public.build002_signals) as build002_signals,
      (select count(*)::int from public.build002_dependency_snapshots) as build002_dependency_snapshots,
      (select count(*)::int from public.build002_signal_qualifications) as build002_signal_qualifications,
      (select count(*)::int from public.build002_delegation_readiness) as build002_delegation_readiness,
      (select count(*)::int from public.execution_runs) as execution_runs,
      (select count(*)::int from public.mutation_leases) as mutation_leases,
      (select count(*)::int from public.state_commits) as state_commits,
      (select status::text from public.outcome_transactions where id=$1) as transaction_status,
      (select current_version_id::text from public.assets where id=$2) as asset_current_version
  `, [TX_A, ASSET_A]);
  const row = result.rows[0] as Row;
  return {
    build002_signal_requirements: Number(row.build002_signal_requirements),
    build002_signals: Number(row.build002_signals),
    build002_dependency_snapshots: Number(row.build002_dependency_snapshots),
    build002_signal_qualifications: Number(row.build002_signal_qualifications),
    build002_delegation_readiness: Number(row.build002_delegation_readiness),
    execution_runs: Number(row.execution_runs),
    mutation_leases: Number(row.mutation_leases),
    state_commits: Number(row.state_commits),
    transaction_status: String(row.transaction_status),
    asset_current_version: String(row.asset_current_version),
  };
}
