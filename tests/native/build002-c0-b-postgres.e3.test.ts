// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { Client } from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import {
  publishOutcomeBlueprint,
  OutcomeBlueprintSchema,
  verifyOutcomeBlueprintHash,
  type OutcomeBlueprint,
} from "@/src/domain/outcome/specification/outcome-blueprint";
import {
  publishOutcomeRequirementProfile,
  OutcomeRequirementProfileSchema,
  verifyOutcomeRequirementProfileBlueprintBinding,
  verifyOutcomeRequirementProfileHash,
  type OutcomeRequirementProfile,
} from "@/src/domain/outcome/specification/outcome-requirement-profile";

const enabled = process.env.BUILD002_NATIVE_PG_C0_B === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_URL;
let activeDatabaseUrl = databaseUrl;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const c0MigrationName = "20260819140000_build_002_c0_requirement_catalog.sql";
const PUBLISHED_AT = "2026-08-19T12:00:00.000Z";
type Uuid = OutcomeBlueprint["id"];

type QueryClient = Client;

function databaseConnectionString(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function makeBlueprint(id: Uuid = randomUUID() as Uuid, version = 1, previousVersionHash: string | null = null): OutcomeBlueprint {
  return publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition({ id, version, previousVersionHash }), PUBLISHED_AT);
}

function makeProfile(blueprint: OutcomeBlueprint, id: Uuid = randomUUID() as Uuid, version = 1, previousVersionHash: string | null = null): OutcomeRequirementProfile {
  return publishOutcomeRequirementProfile({
    schemaVersion: "outcome-requirement-profile-v0.1",
    id,
    version,
    previousVersionHash,
    blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash },
    policy: null,
    requirements: [{
      requirementId: "catalog.minimum",
      semanticType: "text",
      critical: true,
      acceptedProvenance: ["OBSERVED"],
      qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
      dependencySelectors: [{ identity: "blueprint", required: true }],
    }],
  }, PUBLISHED_AT, blueprint);
}

function blueprintPayload(blueprint: OutcomeBlueprint): Record<string, unknown> {
  const { hash, status, publishedAt, ...definition } = blueprint;
  void hash;
  void status;
  return { ...blueprint, publishedAt, definition };
}

function profilePayload(profile: OutcomeRequirementProfile): Record<string, unknown> {
  const { hash, status, publishedAt, ...definition } = profile;
  void hash;
  void status;
  return { ...profile, definition, publishedAt };
}

async function serviceClient(connectionString = activeDatabaseUrl!): Promise<QueryClient> {
  const client = new Client({ connectionString });
  await client.connect();
  await client.query("set role service_role");
  return client;
}

async function expectRejected(client: QueryClient, text: string, values: unknown[] = []): Promise<void> {
  await expect(client.query(text, values)).rejects.toThrow();
}

async function expectAbsent(client: QueryClient, table: string, id: string, version: number): Promise<void> {
  const result = await client.query<{ count: number }>(`select count(*)::integer as count from ${table} where id = $1 and version = $2`, [id, version]);
  expect(result.rows[0].count).toBe(0);
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD 002-C0-B native PostgreSQL E3", () => {
  let admin: QueryClient;
  let service: QueryClient;
  let rootAdmin: QueryClient;
  let isolatedDatabase: string;
  let migrationNames: string[] = [];
  let blueprint: OutcomeBlueprint;
  let profile: OutcomeRequirementProfile;

  beforeAll(async () => {
    isolatedDatabase = `virro_e3_c0_b_${process.pid}_${Date.now()}`;
    rootAdmin = new Client({ connectionString: databaseConnectionString(databaseUrl!, "postgres") });
    await rootAdmin.connect();
    await rootAdmin.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await rootAdmin.query(`create database "${isolatedDatabase}"`);
    await rootAdmin.end();
    rootAdmin = undefined as never;
    const isolatedUrl = databaseConnectionString(databaseUrl!, isolatedDatabase);
    activeDatabaseUrl = isolatedUrl;
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
    migrationNames = readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort();
    for (const name of migrationNames) {
      await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    }
    console.info("C0_B_MIGRATION_CHAIN", JSON.stringify({
      count: migrationNames.length,
      first: migrationNames[0],
      last: migrationNames.at(-1),
      c0Occurrences: migrationNames.filter((name) => name === c0MigrationName).length,
    }));
    service = await serviceClient(isolatedUrl);
    blueprint = makeBlueprint();
    profile = makeProfile(blueprint);
  }, 60_000);

  afterAll(async () => {
    await service?.end();
    await admin?.end();
    if (databaseUrl && isolatedDatabase) {
      rootAdmin = new Client({ connectionString: databaseConnectionString(databaseUrl, "postgres") });
      await rootAdmin.connect();
      await rootAdmin.query(`drop database if exists "${isolatedDatabase}" with (force)`);
      await rootAdmin.end();
    }
  });

  it("records the native PostgreSQL version and publishes a valid round-trip pair", async () => {
    const version = await admin.query<{ version: string }>("select version() as version");
    expect(version.rows[0].version).toMatch(/PostgreSQL 17/i);
    expect(migrationNames.length).toBeGreaterThan(0);
    expect(migrationNames[0]).toBe("20260809110000_intent_lab_build_001.sql");
    expect(migrationNames.at(-1)).toBe(c0MigrationName);
    expect(migrationNames.filter((name) => name === c0MigrationName)).toHaveLength(1);
    await service.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(blueprint))]);
    await service.query("select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(profile))]);
    const blueprintRow = await service.query("select * from public.outcome_blueprints where id = $1 and version = $2", [blueprint.id, blueprint.version]);
    const profileRow = await service.query("select * from public.outcome_requirement_profiles where id = $1 and version = $2", [profile.id, profile.version]);
    const roundTripBlueprint = OutcomeBlueprintSchema.parse({ ...blueprintRow.rows[0].definition, hash: blueprintRow.rows[0].hash, status: blueprintRow.rows[0].status, publishedAt: new Date(blueprintRow.rows[0].published_at).toISOString() });
    const roundTripProfile = OutcomeRequirementProfileSchema.parse({ ...profileRow.rows[0].definition, hash: profileRow.rows[0].hash, status: profileRow.rows[0].status, publishedAt: new Date(profileRow.rows[0].published_at).toISOString() });
    expect(verifyOutcomeBlueprintHash(roundTripBlueprint)).toBe(true);
    expect(verifyOutcomeRequirementProfileHash(roundTripProfile)).toBe(true);
    expect(verifyOutcomeRequirementProfileBlueprintBinding(roundTripProfile, roundTripBlueprint)).toBe(true);
    expect(roundTripProfile.requirements).toEqual(profile.requirements);
  });

  it("rejects Blueprint root and definition address mismatches through the production RPC", async () => {
    const other = makeBlueprint();
    const payload = blueprintPayload(blueprint);
    await expectRejected(service, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify({
      ...payload,
      definition: { ...(payload.definition as Record<string, unknown>), id: other.id },
    })]);
    await expectRejected(service, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify({
      ...payload,
      definition: { ...(payload.definition as Record<string, unknown>), version: 2 },
    })]);
    await expectRejected(service, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify({
      ...payload,
      previousVersionHash: "a".repeat(64),
      definition: { ...(payload.definition as Record<string, unknown>), previousVersionHash: "b".repeat(64) },
    })]);
  });

  it("rejects Profile relational Blueprint fields that disagree with its definition", async () => {
    const payload = profilePayload(profile);
    const definition = payload.definition as Record<string, unknown>;
    const blueprintDefinition = definition.blueprint as Record<string, unknown>;
    await expectRejected(service, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify({
      ...payload,
      definition: { ...definition, blueprint: { ...blueprintDefinition, id: randomUUID() } },
    })]);
    await expectRejected(service, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify({
      ...payload,
      definition: { ...definition, blueprint: { ...blueprintDefinition, version: 2 } },
    })]);
    await expectRejected(service, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify({
      ...payload,
      definition: { ...definition, blueprint: { ...blueprintDefinition, hash: "a".repeat(64) } },
    })]);
  });

  it("rejects RPC payloads with missing required definition keys", async () => {
    const blueprintPayloadValue = blueprintPayload(blueprint);
    const blueprintDefinition = blueprintPayloadValue.definition as Record<string, unknown>;
    const withoutBlueprintId = { ...blueprintDefinition };
    delete withoutBlueprintId.id;
    const withoutBlueprintVersion = { ...blueprintDefinition };
    delete withoutBlueprintVersion.version;
    const withoutBlueprintPrevious = { ...blueprintDefinition };
    delete withoutBlueprintPrevious.previousVersionHash;
    for (const definition of [withoutBlueprintId, withoutBlueprintVersion, withoutBlueprintPrevious]) {
      await expectRejected(service, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify({ ...blueprintPayloadValue, definition })]);
    }

    const profilePayloadValue = profilePayload(profile);
    const profileDefinition = profilePayloadValue.definition as Record<string, unknown>;
    const withoutProfileId = { ...profileDefinition };
    delete withoutProfileId.id;
    const withoutProfileVersion = { ...profileDefinition };
    delete withoutProfileVersion.version;
    const withoutProfilePrevious = { ...profileDefinition };
    delete withoutProfilePrevious.previousVersionHash;
    const withoutProfileBlueprint = { ...profileDefinition };
    delete withoutProfileBlueprint.blueprint;
    const withoutProfileBlueprintId = { ...profileDefinition, blueprint: {} };
    const withoutProfileBlueprintVersion = { ...profileDefinition, blueprint: { ...(profileDefinition.blueprint as Record<string, unknown>) } };
    delete (withoutProfileBlueprintVersion.blueprint as Record<string, unknown>).version;
    const withoutProfileBlueprintHash = { ...profileDefinition, blueprint: { ...(profileDefinition.blueprint as Record<string, unknown>) } };
    delete (withoutProfileBlueprintHash.blueprint as Record<string, unknown>).hash;
    const withoutProfilePolicy = { ...profileDefinition };
    delete withoutProfilePolicy.policy;
    for (const definition of [withoutProfileId, withoutProfileVersion, withoutProfilePrevious, withoutProfileBlueprint, withoutProfileBlueprintId, withoutProfileBlueprintVersion, withoutProfileBlueprintHash, withoutProfilePolicy]) {
      await expectRejected(service, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify({ ...profilePayloadValue, definition })]);
    }
  });

  it("rejects non-null policy through both RPC and privileged table constraints", async () => {
    const payload = profilePayload(profile);
    const definition = payload.definition as Record<string, unknown>;
    await expectRejected(service, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify({
      ...payload,
      policy: { id: "policy", hash: "a".repeat(64) },
      definition: { ...definition, policy: { id: "policy", hash: "a".repeat(64) } },
    })]);
    await expectRejected(admin, `insert into public.outcome_requirement_profiles(
      id, version, hash, status, published_at, definition,
      blueprint_id, blueprint_version, blueprint_hash, policy_id, policy_hash
    ) values ($1, 1, $2, 'PUBLISHED', now(), $3::jsonb, $4, $5, $6, 'policy', $7)`, [
      randomUUID(), "b".repeat(64), JSON.stringify(definition), blueprint.id, blueprint.version, blueprint.hash, "a".repeat(64),
    ]);
  });

  it("rejects a privileged Blueprint insert whose relational address disagrees with definition", async () => {
    const payload = blueprintPayload(blueprint);
    await expectRejected(admin, `insert into public.outcome_blueprints(
      id, version, hash, status, published_at, definition
    ) values ($1, 1, $2, 'PUBLISHED', now(), $3::jsonb)`, [
      randomUUID(), "c".repeat(64), JSON.stringify(payload.definition),
    ]);
  });

  it("rejects every malformed privileged Blueprint definition and leaves no row", async () => {
    const base = blueprintPayload(blueprint).definition as Record<string, unknown>;
    const withoutId = { ...base };
    delete withoutId.id;
    const withoutVersion = { ...base };
    delete withoutVersion.version;
    const withoutPrevious = { ...base };
    delete withoutPrevious.previousVersionHash;
    const attacks = [
      {},
      withoutId,
      withoutVersion,
      withoutPrevious,
      { ...base, id: null },
      { ...base, version: null },
    ];
    for (const [index, definition] of attacks.entries()) {
      const id = randomUUID();
      const version = 1;
      await expectRejected(admin, `insert into public.outcome_blueprints(
        id, version, hash, status, published_at, definition
      ) values ($1, $2, $3, 'PUBLISHED', now(), $4::jsonb)`, [id, version, `${index + 1}`.repeat(64).slice(0, 64), JSON.stringify(definition)]);
      await expectAbsent(admin, "public.outcome_blueprints", id, version);
    }
  });

  it("rejects every malformed privileged Profile definition and leaves no row", async () => {
    const base = profilePayload(profile).definition as Record<string, unknown>;
    const blueprintDefinition = base.blueprint as Record<string, unknown>;
    const withoutId = { ...base };
    delete withoutId.id;
    const withoutVersion = { ...base };
    delete withoutVersion.version;
    const withoutPrevious = { ...base };
    delete withoutPrevious.previousVersionHash;
    const withoutBlueprint = { ...base };
    delete withoutBlueprint.blueprint;
    const incompleteBlueprint = { ...base, blueprint: {} };
    const withoutBlueprintId = { ...base, blueprint: { ...blueprintDefinition } };
    delete (withoutBlueprintId.blueprint as Record<string, unknown>).id;
    const withoutBlueprintVersion = { ...base, blueprint: { ...blueprintDefinition } };
    delete (withoutBlueprintVersion.blueprint as Record<string, unknown>).version;
    const withoutBlueprintHash = { ...base, blueprint: { ...blueprintDefinition } };
    delete (withoutBlueprintHash.blueprint as Record<string, unknown>).hash;
    const withoutPolicy = { ...base };
    delete withoutPolicy.policy;
    const attacks = [withoutId, withoutVersion, withoutPrevious, withoutBlueprint, incompleteBlueprint, withoutBlueprintId, withoutBlueprintVersion, withoutBlueprintHash, withoutPolicy];
    for (const [index, malformedDefinition] of attacks.entries()) {
      const id = randomUUID();
      const version = 1;
      const definition = (malformedDefinition as Record<string, unknown>).id === undefined ? malformedDefinition : { ...malformedDefinition, id };
      await expectRejected(admin, `insert into public.outcome_requirement_profiles(
        id, version, hash, status, published_at, definition,
        blueprint_id, blueprint_version, blueprint_hash, policy_id, policy_hash
      ) values ($1, $2, $3, 'PUBLISHED', now(), $4::jsonb, $5, $6, $7, null, null)`, [
        id, version, `${index + 1}`.repeat(64).slice(0, 64), JSON.stringify(definition), blueprint.id, blueprint.version, blueprint.hash,
      ]);
      await expectAbsent(admin, "public.outcome_requirement_profiles", id, version);
    }
  });

  it("enforces table-owned contiguous Blueprint lineage for privileged inserts", async () => {
    const id = randomUUID() as Uuid;
    const insertBlueprint = async (candidate: OutcomeBlueprint): Promise<void> => {
      await admin.query(`insert into public.outcome_blueprints(
        id, version, hash, previous_version_hash, status, published_at, definition
      ) values ($1, $2, $3, $4, 'PUBLISHED', $5, $6::jsonb)`, [
        candidate.id,
        candidate.version,
        candidate.hash,
        candidate.previousVersionHash,
        PUBLISHED_AT,
        JSON.stringify(blueprintPayload(candidate).definition),
      ]);
    };

    const v1WithPrevious = makeBlueprint(id, 1, "a".repeat(64));
    await expectRejected(admin, `insert into public.outcome_blueprints(
      id, version, hash, previous_version_hash, status, published_at, definition
    ) values ($1, $2, $3, $4, 'PUBLISHED', now(), $5::jsonb)`, [
      id, 1, v1WithPrevious.hash, v1WithPrevious.previousVersionHash, JSON.stringify(blueprintPayload(v1WithPrevious).definition),
    ]);
    await expectAbsent(admin, "public.outcome_blueprints", id, 1);

    const v2WithoutV1 = makeBlueprint(id, 2, "b".repeat(64));
    await expectRejected(admin, `insert into public.outcome_blueprints(
      id, version, hash, previous_version_hash, status, published_at, definition
    ) values ($1, $2, $3, $4, 'PUBLISHED', now(), $5::jsonb)`, [
      id, 2, v2WithoutV1.hash, v2WithoutV1.previousVersionHash, JSON.stringify(blueprintPayload(v2WithoutV1).definition),
    ]);
    await expectAbsent(admin, "public.outcome_blueprints", id, 2);

    const v1 = makeBlueprint(id, 1, null);
    await insertBlueprint(v1);

    const v2WrongPrevious = makeBlueprint(id, 2, "c".repeat(64));
    await expectRejected(admin, `insert into public.outcome_blueprints(
      id, version, hash, previous_version_hash, status, published_at, definition
    ) values ($1, $2, $3, $4, 'PUBLISHED', now(), $5::jsonb)`, [
      id, 2, v2WrongPrevious.hash, v2WrongPrevious.previousVersionHash, JSON.stringify(blueprintPayload(v2WrongPrevious).definition),
    ]);
    await expectAbsent(admin, "public.outcome_blueprints", id, 2);

    const v3Gap = makeBlueprint(id, 3, v1.hash);
    await expectRejected(admin, `insert into public.outcome_blueprints(
      id, version, hash, previous_version_hash, status, published_at, definition
    ) values ($1, $2, $3, $4, 'PUBLISHED', now(), $5::jsonb)`, [
      id, 3, v3Gap.hash, v3Gap.previousVersionHash, JSON.stringify(blueprintPayload(v3Gap).definition),
    ]);
    await expectAbsent(admin, "public.outcome_blueprints", id, 3);

    const v2 = makeBlueprint(id, 2, v1.hash);
    await insertBlueprint(v2);
    const v3 = makeBlueprint(id, 3, v2.hash);
    await insertBlueprint(v3);
    for (const version of [1, 2, 3]) {
      await expect(admin.query("select 1 from public.outcome_blueprints where id = $1 and version = $2", [id, version])).resolves.toMatchObject({ rowCount: 1 });
    }
  });

  it("enforces table-owned contiguous Profile lineage for privileged inserts", async () => {
    const blueprintId = randomUUID() as Uuid;
    const lineageBlueprint = makeBlueprint(blueprintId);
    await admin.query(`insert into public.outcome_blueprints(
      id, version, hash, previous_version_hash, status, published_at, definition
    ) values ($1, $2, $3, $4, 'PUBLISHED', $5, $6::jsonb)`, [
      lineageBlueprint.id,
      lineageBlueprint.version,
      lineageBlueprint.hash,
      lineageBlueprint.previousVersionHash,
      PUBLISHED_AT,
      JSON.stringify(blueprintPayload(lineageBlueprint).definition),
    ]);

    const id = randomUUID() as Uuid;
    const insertProfile = async (candidate: OutcomeRequirementProfile): Promise<void> => {
      await admin.query(`insert into public.outcome_requirement_profiles(
        id, version, hash, previous_version_hash,
        blueprint_id, blueprint_version, blueprint_hash,
        policy_id, policy_hash, status, published_at, definition
      ) values ($1, $2, $3, $4, $5, $6, $7, null, null, 'PUBLISHED', $8, $9::jsonb)`, [
        candidate.id,
        candidate.version,
        candidate.hash,
        candidate.previousVersionHash,
        candidate.blueprint.id,
        candidate.blueprint.version,
        candidate.blueprint.hash,
        PUBLISHED_AT,
        JSON.stringify(profilePayload(candidate).definition),
      ]);
    };

    const v1WithPrevious = makeProfile(lineageBlueprint, id, 1, "d".repeat(64));
    await expectRejected(admin, `insert into public.outcome_requirement_profiles(
      id, version, hash, previous_version_hash,
      blueprint_id, blueprint_version, blueprint_hash,
      policy_id, policy_hash, status, published_at, definition
    ) values ($1, $2, $3, $4, $5, $6, $7, null, null, 'PUBLISHED', now(), $8::jsonb)`, [
      id, 1, v1WithPrevious.hash, v1WithPrevious.previousVersionHash,
      lineageBlueprint.id, lineageBlueprint.version, lineageBlueprint.hash, JSON.stringify(profilePayload(v1WithPrevious).definition),
    ]);
    await expectAbsent(admin, "public.outcome_requirement_profiles", id, 1);

    const v2WithoutV1 = makeProfile(lineageBlueprint, id, 2, "e".repeat(64));
    await expectRejected(admin, `insert into public.outcome_requirement_profiles(
      id, version, hash, previous_version_hash,
      blueprint_id, blueprint_version, blueprint_hash,
      policy_id, policy_hash, status, published_at, definition
    ) values ($1, $2, $3, $4, $5, $6, $7, null, null, 'PUBLISHED', now(), $8::jsonb)`, [
      id, 2, v2WithoutV1.hash, v2WithoutV1.previousVersionHash,
      lineageBlueprint.id, lineageBlueprint.version, lineageBlueprint.hash, JSON.stringify(profilePayload(v2WithoutV1).definition),
    ]);
    await expectAbsent(admin, "public.outcome_requirement_profiles", id, 2);

    const v1 = makeProfile(lineageBlueprint, id, 1, null);
    await insertProfile(v1);
    const v2WrongPrevious = makeProfile(lineageBlueprint, id, 2, "f".repeat(64));
    await expectRejected(admin, `insert into public.outcome_requirement_profiles(
      id, version, hash, previous_version_hash,
      blueprint_id, blueprint_version, blueprint_hash,
      policy_id, policy_hash, status, published_at, definition
    ) values ($1, $2, $3, $4, $5, $6, $7, null, null, 'PUBLISHED', now(), $8::jsonb)`, [
      id, 2, v2WrongPrevious.hash, v2WrongPrevious.previousVersionHash,
      lineageBlueprint.id, lineageBlueprint.version, lineageBlueprint.hash, JSON.stringify(profilePayload(v2WrongPrevious).definition),
    ]);
    await expectAbsent(admin, "public.outcome_requirement_profiles", id, 2);

    const v3Gap = makeProfile(lineageBlueprint, id, 3, v1.hash);
    await expectRejected(admin, `insert into public.outcome_requirement_profiles(
      id, version, hash, previous_version_hash,
      blueprint_id, blueprint_version, blueprint_hash,
      policy_id, policy_hash, status, published_at, definition
    ) values ($1, $2, $3, $4, $5, $6, $7, null, null, 'PUBLISHED', now(), $8::jsonb)`, [
      id, 3, v3Gap.hash, v3Gap.previousVersionHash,
      lineageBlueprint.id, lineageBlueprint.version, lineageBlueprint.hash, JSON.stringify(profilePayload(v3Gap).definition),
    ]);
    await expectAbsent(admin, "public.outcome_requirement_profiles", id, 3);

    const v2 = makeProfile(lineageBlueprint, id, 2, v1.hash);
    await insertProfile(v2);
    const v3 = makeProfile(lineageBlueprint, id, 3, v2.hash);
    await insertProfile(v3);
    for (const version of [1, 2, 3]) {
      await expect(admin.query("select 1 from public.outcome_requirement_profiles where id = $1 and version = $2", [id, version])).resolves.toMatchObject({ rowCount: 1 });
    }
  });

  it("denies direct catalog writes and permits only the service RPC boundary", async () => {
    await expectRejected(service, `insert into public.outcome_blueprints(id, version, hash, status, published_at, definition) values ($1, 99, $2, 'PUBLISHED', now(), '{}'::jsonb)`, [randomUUID(), "a".repeat(64)]);
    const anon = new Client({ connectionString: activeDatabaseUrl });
    const authenticated = new Client({ connectionString: activeDatabaseUrl });
    await anon.connect();
    await authenticated.connect();
    try {
      await anon.query("set role anon");
      await authenticated.query("set role authenticated");
      for (const client of [anon, authenticated]) {
        await expectRejected(client, "select * from public.outcome_blueprints");
        await expectRejected(client, "select public.build002_publish_outcome_blueprint('{}'::jsonb)");
        await expectRejected(client, "insert into public.outcome_blueprints(id, version, hash, status, published_at, definition) values ($1, 1, $2, 'PUBLISHED', now(), '{}'::jsonb)", [randomUUID(), "b".repeat(64)]);
      }
    } finally {
      await anon.end();
      await authenticated.end();
    }
  });

  it("rejects exact missing and wrong-hash Profile Blueprint bindings", async () => {
    const missingBlueprint = makeBlueprint();
    const missingProfile = makeProfile(missingBlueprint);
    await expectRejected(service, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(missingProfile))]);
    const wrongHash = { ...profile, blueprint: { ...profile.blueprint, hash: "c".repeat(64) } };
    await expectRejected(service, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(wrongHash as OutcomeRequirementProfile))]);
  });

  it("rejects non-null policy and all invalid Profile lineages", async () => {
    const nonNullPolicy = { ...profile, policy: { id: "unresolved", hash: "d".repeat(64) }, hash: profile.hash };
    await expectRejected(service, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(nonNullPolicy as OutcomeRequirementProfile))]);
    const absentV2 = makeProfile(blueprint, randomUUID() as Uuid, 2, profile.hash);
    await expectRejected(service, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(absentV2))]);
    const duplicate = makeProfile(blueprint, profile.id);
    await expectRejected(service, "select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(duplicate))]);
  });

  it("rejects invalid Blueprint lineages and duplicate versions", async () => {
    const absentV2 = makeBlueprint(randomUUID() as Uuid, 2, "e".repeat(64));
    await expectRejected(service, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(absentV2))]);
    const v1 = makeBlueprint();
    await service.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(v1))]);
    const wrongPrevious = makeBlueprint(v1.id, 2, "f".repeat(64));
    await expectRejected(service, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(wrongPrevious))]);
    const duplicate = makeBlueprint(v1.id);
    await expectRejected(service, "select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(duplicate))]);
  });

  it("rejects UPDATE and DELETE for owner and service roles", async () => {
    await expectRejected(admin, "update public.outcome_blueprints set definition = '{}'::jsonb where id = $1 and version = 1", [blueprint.id]);
    await expectRejected(admin, "delete from public.outcome_blueprints where id = $1 and version = 1", [blueprint.id]);
    await expectRejected(service, "update public.outcome_requirement_profiles set definition = '{}'::jsonb where id = $1 and version = 1", [profile.id]);
    await expectRejected(service, "delete from public.outcome_requirement_profiles where id = $1 and version = 1", [profile.id]);
  });

  it("serializes concurrent duplicate Blueprint publication to one durable row", async () => {
    const candidate = makeBlueprint();
    const clients = [await serviceClient(), await serviceClient()];
    try {
      const results = await Promise.allSettled(clients.map((client) => client.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(candidate))])));
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const row = await admin.query("select count(*)::integer as count from public.outcome_blueprints where id = $1 and version = 1", [candidate.id]);
      expect(row.rows[0].count).toBe(1);
    } finally {
      await Promise.all(clients.map((client) => client.end()));
    }
  });

  it("serializes concurrent next-version Blueprint and Profile publication", async () => {
    const v1 = makeBlueprint();
    await service.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(v1))]);
    const v2 = makeBlueprint(v1.id, 2, v1.hash);
    const blueprintClients = [await serviceClient(), await serviceClient()];
    try {
      const results = await Promise.allSettled(blueprintClients.map((client) => client.query("select public.build002_publish_outcome_blueprint($1::jsonb)", [JSON.stringify(blueprintPayload(v2))])));
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const row = await admin.query("select count(*)::integer as count from public.outcome_blueprints where id = $1 and version = 2", [v1.id]);
      expect(row.rows[0].count).toBe(1);
    } finally {
      await Promise.all(blueprintClients.map((client) => client.end()));
    }
    const p1 = makeProfile(v1);
    await service.query("select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(p1))]);
    const p2 = makeProfile(v1, p1.id, 2, p1.hash);
    const profileClients = [await serviceClient(), await serviceClient()];
    try {
      const results = await Promise.allSettled(profileClients.map((client) => client.query("select public.build002_publish_outcome_requirement_profile($1::jsonb)", [JSON.stringify(profilePayload(p2))])));
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const row = await admin.query("select count(*)::integer as count from public.outcome_requirement_profiles where id = $1 and version = 2", [p1.id]);
      expect(row.rows[0].count).toBe(1);
    } finally {
      await Promise.all(profileClients.map((client) => client.end()));
    }
  });

  it("preserves timestamptz and JSONB semantic material without drift", async () => {
    const blueprintRow = await service.query("select definition, published_at from public.outcome_blueprints where id = $1 and version = 1", [blueprint.id]);
    const profileRow = await service.query("select definition, published_at from public.outcome_requirement_profiles where id = $1 and version = 1", [profile.id]);
    expect(new Date(blueprintRow.rows[0].published_at).toISOString()).toBe(PUBLISHED_AT);
    expect(new Date(profileRow.rows[0].published_at).toISOString()).toBe(PUBLISHED_AT);
    expect(blueprintRow.rows[0].definition.variables).toEqual(blueprint.variables);
    expect(profileRow.rows[0].definition.requirements).toEqual(profile.requirements);
    expect(profileRow.rows[0].definition.policy).toBeNull();
  });
});
