// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { Client } from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { publishOutcomeBlueprint, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { publishOutcomeRequirementProfile, type OutcomeRequirementProfile } from "@/src/domain/outcome/specification/outcome-requirement-profile";

const enabled = process.env.BUILD002_NATIVE_PG_C0_B_R3 === "true";
const sourceUrl = process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const c0MigrationName = "20260819140000_build_002_c0_requirement_catalog.sql";
const publishedAt = "2026-08-19T12:00:00.000Z";
type QueryClient = Client;
type Uuid = OutcomeBlueprint["id"];

function dbUrl(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function blueprint(id: Uuid = randomUUID() as Uuid, version = 1, previousVersionHash: string | null = null): OutcomeBlueprint {
  return publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition({ id, version, previousVersionHash }), publishedAt);
}

function profile(bp: OutcomeBlueprint, id: Uuid = randomUUID() as Uuid, version = 1, previousVersionHash: string | null = null): OutcomeRequirementProfile {
  return publishOutcomeRequirementProfile({
    schemaVersion: "outcome-requirement-profile-v0.1",
    id,
    version,
    previousVersionHash,
    blueprint: { id: bp.id, version: bp.version, hash: bp.hash },
    policy: null,
    requirements: [{
      requirementId: "catalog.minimum",
      semanticType: "text",
      critical: true,
      acceptedProvenance: ["OBSERVED"],
      qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
      dependencySelectors: [{ identity: "blueprint", required: true }],
    }],
  }, publishedAt, bp);
}

function bpPayload(value: OutcomeBlueprint): Record<string, unknown> {
  const { hash, status, publishedAt: at, ...definition } = value;
  void hash; void status;
  return { ...value, publishedAt: at, definition };
}

function profilePayload(value: OutcomeRequirementProfile): Record<string, unknown> {
  const { hash, status, publishedAt: at, ...definition } = value;
  void hash; void status;
  return { ...value, publishedAt: at, definition };
}

async function service(url: string): Promise<QueryClient> {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("set role service_role");
  return client;
}

async function rejected(client: QueryClient, text: string, values: unknown[] = []): Promise<void> {
  await expect(client.query(text, values)).rejects.toThrow();
}

async function absent(client: QueryClient, table: string, id: string, version: number): Promise<void> {
  const result = await client.query<{ count: number }>(`select count(*)::integer as count from ${table} where id = $1 and version = $2`, [id, version]);
  expect(result.rows[0].count).toBe(0);
}

describe.runIf(enabled && Boolean(sourceUrl))("independent BUILD 002-C0-B R3 native closure", () => {
  let admin: QueryClient;
  let svc: QueryClient;
  let root: QueryClient;
  let isolated: string;
  let migrationNames: string[];

  beforeAll(async () => {
    isolated = `virro_r3_independent_${process.pid}_${Date.now()}`;
    root = new Client({ connectionString: dbUrl(sourceUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolated}" with (force)`);
    await root.query(`create database "${isolated}"`);
    await root.end();
    root = undefined as never;
    const url = dbUrl(sourceUrl!, isolated);
    admin = new Client({ connectionString: url });
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
      create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
    `);
    migrationNames = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    for (const name of migrationNames) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    svc = await service(url);
    console.info("INDEPENDENT_C0_B_R3_CHAIN", JSON.stringify({
      postgres: (await admin.query<{ version: string }>("select version() as version")).rows[0].version,
      count: migrationNames.length,
      first: migrationNames[0],
      last: migrationNames.at(-1),
      c0Occurrences: migrationNames.filter((name) => name === c0MigrationName).length,
    }));
  }, 60_000);

  afterAll(async () => {
    await svc?.end();
    await admin?.end();
    if (sourceUrl && isolated) {
      root = new Client({ connectionString: dbUrl(sourceUrl, "postgres") });
      await root.connect();
      await root.query(`drop database if exists "${isolated}" with (force)`);
      await root.end();
    }
  });

  it("starts empty and proves catalog shape, constraints, RLS, and triggers", async () => {
    expect((await admin.query("select count(*)::integer as count from public.outcome_blueprints")).rows[0].count).toBe(0);
    expect((await admin.query("select count(*)::integer as count from public.outcome_requirement_profiles")).rows[0].count).toBe(0);
    expect(migrationNames).toHaveLength(28);
    expect(migrationNames[0]).toBe("20260809110000_intent_lab_build_001.sql");
    expect(migrationNames.at(-1)).toBe(c0MigrationName);
    expect(migrationNames.filter((name) => name === c0MigrationName)).toHaveLength(1);
    const keys = await admin.query<{ table_name: string; constraint_type: string; constraint_name: string; is_deferrable: string }>(`
      select tc.table_name, tc.constraint_type, tc.constraint_name, tc.is_deferrable
      from information_schema.table_constraints tc
      where tc.table_schema = 'public' and tc.table_name in ('outcome_blueprints', 'outcome_requirement_profiles')
    `);
    expect(keys.rows.some((row) => row.table_name === "outcome_blueprints" && row.constraint_type === "PRIMARY KEY" && row.constraint_name.includes("pkey"))).toBe(true);
    expect(keys.rows.some((row) => row.table_name === "outcome_requirement_profiles" && row.constraint_type === "PRIMARY KEY" && row.constraint_name.includes("pkey"))).toBe(true);
    const uniqueAddresses = await admin.query<{ definition: string; convalidated: boolean }>(`select pg_get_constraintdef(c.oid) as definition, c.convalidated from pg_constraint c where c.conrelid in ('public.outcome_blueprints'::regclass, 'public.outcome_requirement_profiles'::regclass) and c.contype = 'u'`);
    expect(uniqueAddresses.rows.filter((row) => row.definition.includes("(id, version, hash)")).length).toBe(2);
    expect(uniqueAddresses.rows.every((row) => row.convalidated)).toBe(true);
    const named = await admin.query<{ conname: string; convalidated: boolean }>(`select conname, convalidated from pg_constraint where conrelid in ('public.outcome_blueprints'::regclass, 'public.outcome_requirement_profiles'::regclass)`);
    for (const name of ["outcome_blueprints_previous_hash_shape", "outcome_requirement_profiles_previous_hash_shape", "outcome_blueprints_definition_id_match", "outcome_requirement_profiles_definition_blueprint_hash_match"]) {
      expect(named.rows.find((row) => row.conname === name)?.convalidated).toBe(true);
    }
    const fk = await admin.query<{ convalidated: boolean; conrelid: string; confrelid: string; definition: string }>(`select c.convalidated, c.conrelid::regclass::text as conrelid, c.confrelid::regclass::text as confrelid, pg_get_constraintdef(c.oid) as definition from pg_constraint c where c.conrelid = 'public.outcome_requirement_profiles'::regclass and c.contype = 'f'`);
    expect(fk.rows).toHaveLength(1);
    expect(fk.rows[0].convalidated).toBe(true);
    expect(fk.rows[0].definition).toContain("(blueprint_id, blueprint_version, blueprint_hash)");
    expect(fk.rows[0].definition).toContain("outcome_blueprints(id, version, hash)");
    const rls = await admin.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where oid in ('public.outcome_blueprints'::regclass, 'public.outcome_requirement_profiles'::regclass)`);
    expect(rls.rows).toHaveLength(2);
    expect(rls.rows.every((row) => row.relrowsecurity)).toBe(true);
    const triggers = await admin.query<{ tgname: string; definition: string; tgtype: number }>(`select tgname, tgtype, pg_get_triggerdef(oid) as definition from pg_trigger where tgrelid in ('public.outcome_blueprints'::regclass, 'public.outcome_requirement_profiles'::regclass) and not tgisinternal`);
    expect(triggers.rows.some((row) => row.tgname === "outcome_blueprints_lineage" && row.definition.includes("BEFORE INSERT") && row.definition.includes("build002_enforce_outcome_blueprint_lineage"))).toBe(true);
    expect(triggers.rows.some((row) => row.tgname === "outcome_requirement_profiles_lineage" && row.definition.includes("BEFORE INSERT") && row.definition.includes("build002_enforce_outcome_requirement_profile_lineage"))).toBe(true);
    expect(triggers.rows.some((row) => row.tgname === "outcome_blueprints_immutable" && (row.tgtype & 16) === 16 && (row.tgtype & 8) === 8)).toBe(true);
    expect(triggers.rows.some((row) => row.tgname === "outcome_requirement_profiles_immutable" && (row.tgtype & 16) === 16 && (row.tgtype & 8) === 8)).toBe(true);
  });

  it("rejects independent Blueprint and Profile shape and table-lineage attacks", async () => {
    const bpId = randomUUID() as Uuid;
    const bpAttacks = [
      blueprint(bpId, 1, "a".repeat(64)),
      blueprint(bpId, 2, null),
    ];
    for (const candidate of bpAttacks) {
      await rejected(admin, `insert into public.outcome_blueprints(id, version, hash, previous_version_hash, status, published_at, definition) values ($1,$2,$3,$4,'PUBLISHED',now(),$5::jsonb)`, [candidate.id, candidate.version, candidate.hash, candidate.previousVersionHash, JSON.stringify(bpPayload(candidate).definition)]);
      await absent(admin, "public.outcome_blueprints", candidate.id, candidate.version);
    }
    const v2NoV1 = blueprint(bpId, 2, "b".repeat(64));
    await rejected(admin, `insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,$2,$3,$4,'PUBLISHED',now(),$5::jsonb)`, [bpId,2,v2NoV1.hash,v2NoV1.previousVersionHash,JSON.stringify(bpPayload(v2NoV1).definition)]);
    await absent(admin, "public.outcome_blueprints", bpId, 2);
    const v1 = blueprint(bpId, 1, null);
    const directBlueprint = async (candidate: OutcomeBlueprint) => admin.query(`insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,$2,$3,$4,'PUBLISHED',now(),$5::jsonb)`, [candidate.id,candidate.version,candidate.hash,candidate.previousVersionHash,JSON.stringify(bpPayload(candidate).definition)]);
    await directBlueprint(v1);
    const wrong = blueprint(bpId, 2, "c".repeat(64));
    await rejected(admin, `insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,$2,$3,$4,'PUBLISHED',now(),$5::jsonb)`, [wrong.id,wrong.version,wrong.hash,wrong.previousVersionHash,JSON.stringify(bpPayload(wrong).definition)]);
    await absent(admin, "public.outcome_blueprints", bpId, 2);
    const gap = blueprint(bpId, 3, v1.hash);
    await rejected(admin, `insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,$2,$3,$4,'PUBLISHED',now(),$5::jsonb)`, [gap.id,gap.version,gap.hash,gap.previousVersionHash,JSON.stringify(bpPayload(gap).definition)]);
    await absent(admin, "public.outcome_blueprints", bpId, 3);
    const v2 = blueprint(bpId, 2, v1.hash); await directBlueprint(v2); const v3 = blueprint(bpId, 3, v2.hash); await directBlueprint(v3);
    expect((await admin.query("select count(*)::integer as count from public.outcome_blueprints where id=$1", [bpId])).rows[0].count).toBe(3);

    const profileBp = blueprint();
    await directBlueprint(profileBp);
    const profileId = randomUUID() as Uuid;
    const directProfile = async (candidate: OutcomeRequirementProfile) => admin.query(`insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,$2,$3,$4,$5,$6,$7,null,null,'PUBLISHED',now(),$8::jsonb)`, [candidate.id,candidate.version,candidate.hash,candidate.previousVersionHash,candidate.blueprint.id,candidate.blueprint.version,candidate.blueprint.hash,JSON.stringify(profilePayload(candidate).definition)]);
    for (const candidate of [profile(profileBp, profileId, 1, "d".repeat(64)), profile(profileBp, profileId, 2, null)]) {
      await rejected(admin, `insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,$2,$3,$4,$5,$6,$7,null,null,'PUBLISHED',now(),$8::jsonb)`, [candidate.id,candidate.version,candidate.hash,candidate.previousVersionHash,candidate.blueprint.id,candidate.blueprint.version,candidate.blueprint.hash,JSON.stringify(profilePayload(candidate).definition)]);
      await absent(admin, "public.outcome_requirement_profiles", candidate.id, candidate.version);
    }
    const p2NoV1 = profile(profileBp, profileId, 2, "e".repeat(64));
    await rejected(admin, `insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,$2,$3,$4,$5,$6,$7,null,null,'PUBLISHED',now(),$8::jsonb)`, [p2NoV1.id,p2NoV1.version,p2NoV1.hash,p2NoV1.previousVersionHash,p2NoV1.blueprint.id,p2NoV1.blueprint.version,p2NoV1.blueprint.hash,JSON.stringify(profilePayload(p2NoV1).definition)]);
    const p1 = profile(profileBp, profileId, 1, null); await directProfile(p1);
    const pWrong = profile(profileBp, profileId, 2, "f".repeat(64));
    await rejected(admin, `insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,$2,$3,$4,$5,$6,$7,null,null,'PUBLISHED',now(),$8::jsonb)`, [pWrong.id,pWrong.version,pWrong.hash,pWrong.previousVersionHash,pWrong.blueprint.id,pWrong.blueprint.version,pWrong.blueprint.hash,JSON.stringify(profilePayload(pWrong).definition)]);
    const pGap = profile(profileBp, profileId, 3, p1.hash);
    await rejected(admin, `insert into public.outcome_requirement_profiles(id,version,hash,previous_version_hash,blueprint_id,blueprint_version,blueprint_hash,policy_id,policy_hash,status,published_at,definition) values ($1,$2,$3,$4,$5,$6,$7,null,null,'PUBLISHED',now(),$8::jsonb)`, [pGap.id,pGap.version,pGap.hash,pGap.previousVersionHash,pGap.blueprint.id,pGap.blueprint.version,pGap.blueprint.hash,JSON.stringify(profilePayload(pGap).definition)]);
    const p2 = profile(profileBp, profileId, 2, p1.hash); await directProfile(p2);
    expect((await admin.query("select count(*)::integer as count from public.outcome_requirement_profiles where id=$1", [profileId])).rows[0].count).toBe(2);
  });

  it("rejects structural completeness attacks and raw RPC mismatches", async () => {
    const base = blueprint();
    const rawBp = bpPayload(base);
    const defs: Record<string, unknown>[] = [
      {}, { ...rawBp.definition as object, id: undefined }, { ...rawBp.definition as object, id: null }, { ...rawBp.definition as object, id: 12 }, { ...rawBp.definition as object, id: randomUUID() },
      { ...rawBp.definition as object, version: undefined }, { ...rawBp.definition as object, version: null }, { ...rawBp.definition as object, version: "1" }, { ...rawBp.definition as object, version: 2 },
      { ...rawBp.definition as object, previousVersionHash: undefined }, { ...rawBp.definition as object, previousVersionHash: "not-a-hash" },
    ];
    for (const definition of defs) {
      const id = randomUUID();
      await rejected(admin, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify({ ...rawBp, id, definition })]);
    }
    await rejected(admin, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify({ ...rawBp, definition: { ...(rawBp.definition as object), version: 2 } })]);
    await rejected(admin, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify({ ...rawBp, previousVersionHash: "a".repeat(64), definition: { ...(rawBp.definition as object), previousVersionHash: null } })]);
    const v1WithPrevious = blueprint(randomUUID() as Uuid, 1, "f".repeat(64));
    await rejected(admin, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(bpPayload(v1WithPrevious))]);
    const noPredecessor = blueprint(randomUUID() as Uuid, 2, "e".repeat(64));
    await rejected(admin, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(bpPayload(noPredecessor))]);
    await svc.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(rawBp)]);
    const persisted = blueprint();
    const profileValue = profile(persisted);
    await svc.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(bpPayload(persisted))]);
    const rp = profilePayload(profileValue);
    await svc.query("select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(rp)]);
    const pd = rp.definition as Record<string, unknown>;
    const bpd = pd.blueprint as Record<string, unknown>;
    const profileDefs = [
      { ...pd, id: undefined }, { ...pd, version: undefined }, { ...pd, previousVersionHash: undefined }, { ...pd, blueprint: undefined }, { ...pd, blueprint: null }, { ...pd, blueprint: {} },
      { ...pd, blueprint: { ...bpd, id: undefined } }, { ...pd, blueprint: { ...bpd, version: undefined } }, { ...pd, blueprint: { ...bpd, hash: undefined } },
      { ...pd, blueprint: { ...bpd, id: randomUUID() } }, { ...pd, blueprint: { ...bpd, version: 2 } }, { ...pd, blueprint: { ...bpd, hash: "a".repeat(64) } },
      { ...pd, policy: undefined }, { ...pd, policy: { id: "x", hash: "a".repeat(64) } },
    ];
    for (const definition of profileDefs) await rejected(svc, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify({ ...rp, definition })]);
    await rejected(svc, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify({ ...rp, id: randomUUID(), definition: { ...(rp.definition as object), id: randomUUID() } })]);
    await rejected(svc, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify({ ...rp, version: 2, definition: { ...(rp.definition as object), version: 1 } })]);
    await rejected(svc, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify({ ...rp, previousVersionHash: "a".repeat(64), definition: { ...(rp.definition as object), previousVersionHash: null } })]);
    const absentBlueprint = profile(blueprint(), randomUUID() as Uuid);
    await rejected(svc, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(absentBlueprint))]);
    const wrongBinding = { ...profileValue, blueprint: { ...profileValue.blueprint, hash: "a".repeat(64) } };
    await rejected(svc, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(wrongBinding as OutcomeRequirementProfile))]);
    await rejected(svc, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify({ ...rawBp, id: randomUUID(), definition: { ...(rawBp.definition as object), id: randomUUID() } })]);
    const v1 = blueprint(); await svc.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(bpPayload(v1))]);
    const v2 = blueprint(v1.id, 2, v1.hash); await svc.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(bpPayload(v2))]);
    expect((await admin.query("select count(*)::integer as count from public.outcome_blueprints where id=$1", [v1.id])).rows[0].count).toBe(2);
  });

  it("proves ACL, immutable history, RPC lineage, and concurrent uniqueness", async () => {
    const anon = new Client({ connectionString: dbUrl(sourceUrl!, isolated) });
    const auth = new Client({ connectionString: dbUrl(sourceUrl!, isolated) });
    await anon.connect(); await auth.connect();
    try {
      for (const [client, role] of [[anon, "anon"], [auth, "authenticated"]] as const) {
        await client.query(`set role ${role}`);
        await rejected(client, "select * from public.outcome_blueprints");
        await rejected(client, "insert into public.outcome_blueprints(id,version,hash,status,published_at,definition) values ($1,1,$2,'PUBLISHED',now(),'{}'::jsonb)", [randomUUID(), "a".repeat(64)]);
        await rejected(client, "select public.build002_publish_outcome_blueprint('{}'::jsonb)");
      }
    } finally { await anon.end(); await auth.end(); }
    const bp = blueprint(); await svc.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(bpPayload(bp))]);
    await rejected(svc, "insert into public.outcome_blueprints(id,version,hash,status,published_at,definition) values ($1,1,$2,'PUBLISHED',now(),'{}'::jsonb)", [randomUUID(), "a".repeat(64)]);
    await rejected(admin, "update public.outcome_blueprints set definition='{}'::jsonb where id=$1 and version=1", [bp.id]);
    await rejected(admin, "delete from public.outcome_blueprints where id=$1 and version=1", [bp.id]);
    const duplicate = blueprint();
    const dupClients = [await service(dbUrl(sourceUrl!, isolated)), await service(dbUrl(sourceUrl!, isolated))];
    try { const results = await Promise.allSettled(dupClients.map((client) => client.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(bpPayload(duplicate))]))); expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1); } finally { await Promise.all(dupClients.map((client) => client.end())); }
    const next1 = blueprint(); await svc.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(bpPayload(next1))]);
    const next2 = blueprint(next1.id, 2, next1.hash);
    const nextClients = [await service(dbUrl(sourceUrl!, isolated)), await service(dbUrl(sourceUrl!, isolated))];
    try { const results = await Promise.allSettled(nextClients.map((client) => client.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(bpPayload(next2))]))); expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1); } finally { await Promise.all(nextClients.map((client) => client.end())); }
    const pb = blueprint(); await svc.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(bpPayload(pb))]);
    const p1 = profile(pb); const pclients = [await service(dbUrl(sourceUrl!, isolated)), await service(dbUrl(sourceUrl!, isolated))];
    try { const results = await Promise.allSettled(pclients.map((client) => client.query("select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(p1))]))); expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1); } finally { await Promise.all(pclients.map((client) => client.end())); }
    const p2 = profile(pb, p1.id, 2, p1.hash); const p2clients = [await service(dbUrl(sourceUrl!, isolated)), await service(dbUrl(sourceUrl!, isolated))];
    try { const results = await Promise.allSettled(p2clients.map((client) => client.query("select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(p2))]))); expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1); } finally { await Promise.all(p2clients.map((client) => client.end())); }
  });

  it("does not use uncommitted predecessors and then accepts them after commit", async () => {
    const a = await new Client({ connectionString: dbUrl(sourceUrl!, isolated) }); await a.connect();
    const b = await new Client({ connectionString: dbUrl(sourceUrl!, isolated) }); await b.connect();
    const id = randomUUID() as Uuid; const v1 = blueprint(id); const v2 = blueprint(id, 2, v1.hash);
    try {
      await a.query("begin");
      await a.query("insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,1,$2,null,'PUBLISHED',now(),$3::jsonb)", [v1.id,v1.hash,JSON.stringify(bpPayload(v1).definition)]);
      await rejected(b, "insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,2,$2,$3,'PUBLISHED',now(),$4::jsonb)", [v2.id,v2.hash,v2.previousVersionHash,JSON.stringify(bpPayload(v2).definition)]);
      await a.query("commit");
      await b.query("insert into public.outcome_blueprints(id,version,hash,previous_version_hash,status,published_at,definition) values ($1,2,$2,$3,'PUBLISHED',now(),$4::jsonb)", [v2.id,v2.hash,v2.previousVersionHash,JSON.stringify(bpPayload(v2).definition)]);
      expect((await admin.query("select count(*)::integer as count from public.outcome_blueprints where id=$1", [id])).rows[0].count).toBe(2);
    } finally { await a.end(); await b.end(); }
  });
});
