// @vitest-environment node

import { readFileSync } from "node:fs";
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
const migrationPath = resolve(process.cwd(), "supabase/migrations/20260819140000_build_002_c0_requirement_catalog.sql");
const PUBLISHED_AT = "2026-08-19T12:00:00.000Z";
type Uuid = OutcomeBlueprint["id"];

type QueryClient = Client;

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
  return { ...profile };
}

async function serviceClient(): Promise<QueryClient> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query("set role service_role");
  return client;
}

async function expectRejected(client: QueryClient, text: string, values: unknown[] = []): Promise<void> {
  await expect(client.query(text, values)).rejects.toThrow();
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD 002-C0-B native PostgreSQL E3", () => {
  let admin: QueryClient;
  let service: QueryClient;
  let blueprint: OutcomeBlueprint;
  let profile: OutcomeRequirementProfile;

  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrl });
    await admin.connect();
    await admin.query(`
      create extension if not exists pgcrypto;
      do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
    `);
    await admin.query(readFileSync(migrationPath, "utf8"));
    service = await serviceClient();
    blueprint = makeBlueprint();
    profile = makeProfile(blueprint);
  }, 60_000);

  afterAll(async () => {
    await service?.end();
    await admin?.end();
  });

  it("records the native PostgreSQL version and publishes a valid round-trip pair", async () => {
    const version = await admin.query<{ version: string }>("select version() as version");
    expect(version.rows[0].version).toMatch(/PostgreSQL 17/i);
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

  it("denies direct catalog writes and permits only the service RPC boundary", async () => {
    await expectRejected(service, `insert into public.outcome_blueprints(id, version, hash, status, published_at, definition) values ($1, 99, $2, 'PUBLISHED', now(), '{}'::jsonb)`, [randomUUID(), "a".repeat(64)]);
    const anon = new Client({ connectionString: databaseUrl });
    const authenticated = new Client({ connectionString: databaseUrl });
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
