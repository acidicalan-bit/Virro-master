// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OutcomeReadinessCandidateResolver } from "@/src/application/outcome/resolve-outcome-readiness-candidate";
import { compileSignalRequirement, createDependencySnapshot, createSignal } from "@/src/domain/outcome/signal-readiness";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { ResolvedOutcomeDependencySnapshot } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";

const enabled = process.env.BUILD002_NATIVE_PG_C1_C === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_C_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const TENANT = "a3000000-0000-4000-8000-000000000001";
const TRANSACTION = "b3000000-0000-4000-8000-000000000001";
const BLUEPRINT = "c3000000-0000-4000-8000-000000000001";
const EVALUATION_TIME = "2026-08-20T12:00:00.000Z";
const BLUEPRINT_HASH = "a".repeat(64);
const ASSET_HASH = "b".repeat(64);
const TRANSACTION_HASH = "c".repeat(64);

function connection(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function fixture(signalOverrides: Partial<Parameters<typeof createSignal>[0]> = {}) {
  const requirement = compileSignalRequirement({
    requirementId: "signal.native",
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "TEXT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [
      { identity: "asset.version", required: true },
      { identity: "blueprint", required: true },
      { identity: "transaction.semantic", required: true },
    ],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: BLUEPRINT_HASH,
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, EVALUATION_TIME);
  const evidence = createSignal({
    signalId: "d3000000-0000-4000-8000-000000000001",
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId: requirement.requirementId,
    payload: { value: "native" },
    source: { identity: "native-fixture", version: "1", hash: "d".repeat(64) },
    provenance: "OBSERVED",
    capturedAt: "2026-08-20T11:00:00.000Z",
    validUntil: "2026-08-21T12:00:00.000Z",
    dependency: { identity: "asset.version", hash: ASSET_HASH },
    schemaVersion: "build002-signal-v0.2",
    ...signalOverrides,
  });
  const snapshot = createDependencySnapshot({
    schemaVersion: "build002-dependency-snapshot-v0.2",
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementDefinitionHashes: [requirement.requirementDefinitionHash],
    signalReferences: [{ requirementId: requirement.requirementId, signalId: evidence.signalId, contentHash: evidence.contentHash }],
    dependencyBindings: [
      { identity: "asset.version", hash: ASSET_HASH },
      { identity: "blueprint", hash: BLUEPRINT_HASH },
      { identity: "transaction.semantic", hash: TRANSACTION_HASH },
    ],
    blueprintHash: BLUEPRINT_HASH,
    policyHash: null,
    taskSpecHash: null,
    transactionSemanticHash: TRANSACTION_HASH,
    sourceAssetVersionHash: ASSET_HASH,
    contextLensHash: null,
  });
  return {
    authority: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, binding: {}, blueprint: { hash: BLUEPRINT_HASH }, requirementProfile: {}, signalRequirements: [requirement], resolvedAt: EVALUATION_TIME } as unknown as ResolvedOutcomeRequirementAuthority,
    universe: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, requirements: [{ requirement, signals: [evidence] }] } as ResolvedOutcomeSignalUniverse,
    dependency: { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, dependencySnapshot: snapshot } as ResolvedOutcomeDependencySnapshot,
  };
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-C native PostgreSQL 17 E3", () => {
  let admin: Client;
  let isolatedDatabase = "";

  beforeAll(async () => {
    isolatedDatabase = `virro_e3_c1_c_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await admin.connect();
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users (id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);");
    for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort()) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
  }, 120_000);

  afterAll(async () => {
    await admin?.end();
    if (databaseUrl && isolatedDatabase) {
      const root = new Client({ connectionString: connection(databaseUrl, "postgres") });
      await root.connect();
      await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
      await root.end();
    }
  });

  it("applies all migrations once, emits READY in memory, and writes nothing", async () => {
    expect((await admin.query("select version() as version")).rows[0].version).toMatch(/PostgreSQL 17/i);
    expect(readdirSync(migrationsDir).filter((item) => item.endsWith(".sql"))).toHaveLength(29);
    const before = await admin.query("select (select count(*) from pg_class where relkind = 'r')::text as tables");
    const value = fixture();
    const result = new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(value.authority, value.universe, value.dependency);
    expect(result.readiness.state).toBe("READY");
    const expired = fixture({ validUntil: "2026-08-20T11:59:00.000Z" });
    expect(new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(expired.authority, expired.universe, expired.dependency).readiness.state).toBe("INSUFFICIENT_SIGNAL");
    const future = fixture({ capturedAt: "2026-08-20T13:00:00.000Z" });
    expect(new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(future.authority, future.universe, future.dependency).readiness.state).toBe("INSUFFICIENT_SIGNAL");
    const after = await admin.query("select (select count(*) from pg_class where relkind = 'r')::text as tables");
    expect(after.rows).toEqual(before.rows);
  });
});
