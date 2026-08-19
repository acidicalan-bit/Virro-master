// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.BUILD002_NATIVE_PG_VERIFY === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_VERIFY_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");

const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const C = "10000000-0000-4000-8000-000000000003";
const TA = "20000000-0000-4000-8000-000000000001";
const TB = "20000000-0000-4000-8000-000000000002";
const TXA = "40000000-0000-4000-8000-000000000001";
const TXB = "40000000-0000-4000-8000-000000000002";
const BP = "90000000-0000-4000-8000-000000000001";
const req = {
  multi: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  r1: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  r2: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  r3: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  b: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
};
const sig = {
  s1: "80000000-0000-4000-8000-000000000001",
  s2: "80000000-0000-4000-8000-000000000002",
  s3: "80000000-0000-4000-8000-000000000003",
  q1: "80000000-0000-4000-8000-000000000011",
  q2: "80000000-0000-4000-8000-000000000012",
  q3: "80000000-0000-4000-8000-000000000013",
  b: "80000000-0000-4000-8000-000000000021",
};
const h = {
  s1: "1111111111111111111111111111111111111111111111111111111111111111",
  s2: "2222222222222222222222222222222222222222222222222222222222222222",
  s3: "3333333333333333333333333333333333333333333333333333333333333333",
  q1: "4444444444444444444444444444444444444444444444444444444444444444",
  q2: "5555555555555555555555555555555555555555555555555555555555555555",
  q3: "6666666666666666666666666666666666666666666666666666666666666666",
  depMulti: "7777777777777777777777777777777777777777777777777777777777777777",
  depReady: "8888888888888888888888888888888888888888888888888888888888888888",
  qualMulti: "9999999999999999999999999999999999999999999999999999999999999999",
  qual1: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  qual2: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  qual3: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  ready: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  bsig: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  bdep: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  bqual: "1111111111111111111111111111111111111111111111111111111111111112",
  bread: "2222222222222222222222222222222222222222222222222222222222222223",
};
const qid = { multi: "91000000-0000-4000-8000-000000000001", r1: "91000000-0000-4000-8000-000000000011", r2: "91000000-0000-4000-8000-000000000012", r3: "91000000-0000-4000-8000-000000000013", b: "91000000-0000-4000-8000-000000000021" };
const did = { multi: "90000000-0000-4000-8000-000000000001", ready: "90000000-0000-4000-8000-000000000002", b: "90000000-0000-4000-8000-000000000003" };
const rid = { ready: "92000000-0000-4000-8000-000000000001", b: "92000000-0000-4000-8000-000000000002" };
const instant = "2026-08-19T12:00:00.000Z";
const tables = [
  "build002_signal_requirements", "build002_signals", "build002_dependency_snapshots",
  "build002_dependency_requirements", "build002_dependency_signals", "build002_signal_qualifications",
  "build002_qualification_signals", "build002_delegation_readiness", "build002_readiness_qualifications",
];

type Json = Record<string, unknown>;
let admin: Client;
let service: Client;
let depMultiId: string;
let depReadyId: string;
let depBId: string;

function requirement(owner: string, tx: string, id: string, definitionHash: string): Json {
  return { owner_tenant_id: owner, outcome_transaction_id: tx, requirement_id: id, semantic_type: "text", critical: true, accepted_provenance: ["OBSERVED"], qualification_rule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependency_selectors: [], blueprint_id: BP, blueprint_version: 1, blueprint_hash: definitionHash, policy_id: null, policy_hash: null, schema_version: "build002-signal-requirement-v0.1", requirement_definition_hash: definitionHash, created_at: instant };
}
function signal(id: string, owner: string, tx: string, requirementId: string, definitionHash: string, contentHash: string): Json {
  return { signal_id: id, owner_tenant_id: owner, outcome_transaction_id: tx, requirement_id: requirementId, requirement_definition_hash: definitionHash, payload: { value: id }, source: { identity: "independent-native-fixture", version: "1" }, provenance: "OBSERVED", captured_at: instant, valid_until: null, dependency_identity: "asset.version", dependency_hash: contentHash, schema_version: "build002-signal-v0.2", content_hash: contentHash };
}
function dependency(owner: string, tx: string, hash: string, requirements: string[], refs: Array<{ requirementId: string; signalId: string; contentHash: string }>): Json {
  return { owner_tenant_id: owner, outcome_transaction_id: tx, requirement_definition_hashes: requirements, signal_references: refs, dependency_bindings: [], blueprint_hash: null, policy_hash: null, task_spec_hash: null, transaction_semantic_hash: null, source_asset_version_hash: null, context_lens_hash: null, schema_version: "build002-dependency-snapshot-v0.2", dependency_snapshot_hash: hash };
}
function qualification(id: string, owner: string, tx: string, requirementId: string, definitionHash: string, dependencyHash: string, signalIds: string[], signalHashes: string[], contentHash: string): Json {
  return { id, owner_tenant_id: owner, outcome_transaction_id: tx, requirement_id: requirementId, requirement_definition_hash: definitionHash, dependency_snapshot_hash: dependencyHash, signalIds, signalContentHashes: signalHashes, evaluator: { schemaVersion: "build002-qualification-evaluator-v0.1", version: "1", definitionHash: contentHash }, outcome: "QUALIFIED", reason_code: "SIGNAL_QUALIFIED", evidence_valid_until: null, qualified_at: instant, schema_version: "build002-signal-qualification-v0.3", qualification_content_hash: contentHash };
}
function readiness(id: string, owner: string, tx: string, dependencyHash: string, contentHash: string): Json {
  return { id, owner_tenant_id: owner, outcome_transaction_id: tx, requirement_set_hash: h.ready, qualification_set_hash: h.ready, dependency_snapshot_hash: dependencyHash, task_spec_hash: null, source_asset_version_hash: null, blueprint_hash: null, policy_hash: null, evaluator: { schemaVersion: "build002-qualification-evaluator-v0.1", version: "1", definitionHash: contentHash }, state: "READY", blocking_codes: [], condition_codes: [], created_at: instant, valid_until: null, schema_version: "build002-signal-readiness-v0.3", readiness_content_hash: contentHash };
}
async function rpc(client: Client, name: string, args: unknown[]): Promise<string> {
  const placeholders = args.map((_, index) => `$${index + 1}::jsonb`).join(", ");
  const castArgs = name === "build002_insert_signal_qualification" ? "$1::jsonb, $2::uuid" : name === "build002_insert_delegation_readiness" ? "$1::jsonb, $2::uuid, $3::jsonb" : placeholders;
  const result = await client.query(`select public.${name}(${castArgs}) as id`, args);
  return String(result.rows[0].id);
}
async function rejected(action: Promise<unknown>): Promise<void> {
  await expect(action).rejects.toThrow();
}
async function count(client: Client, table: string, where = "true"): Promise<number> {
  const result = await client.query(`select count(*)::int as n from public.${table} where ${where}`);
  return Number(result.rows[0].n);
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD 002-B R2 independent native PostgreSQL closure", () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: databaseUrl });
    await admin.connect();
    const version = await admin.query<{ version: string }>("select version() as version");
    expect(version.rows[0].version).toMatch(/PostgreSQL 17/);
    await admin.query(`
      create extension if not exists pgcrypto;
      do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
      create schema if not exists auth;
      create table if not exists auth.users (id uuid primary key);
      create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create schema if not exists storage;
      create table if not exists storage.buckets (id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
    `);
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    expect(migrations.length).toBeGreaterThan(20);
    for (const name of migrations) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    await admin.query(`
      insert into auth.users(id) values ($1), ($2), ($3) on conflict do nothing;
      insert into public.tenants(id, kind, personal_owner_principal_id, status) values ($4, 'PERSONAL', $1, 'ACTIVE'), ($5, 'PERSONAL', $2, 'ACTIVE') on conflict do nothing;
      insert into public.tenant_memberships(id, tenant_id, principal_id, role, status) values ('30000000-0000-4000-8000-000000000001', $4, $1, 'OWNER', 'ACTIVE'), ('30000000-0000-4000-8000-000000000002', $5, $2, 'OWNER', 'ACTIVE') on conflict do nothing;
      insert into public.outcome_transactions(id, owner_tenant_id, raw_request) values ($6, $4, 'A'), ($7, $5, 'B') on conflict do nothing;
    `, [A, B, C, TA, TB, TXA, TXB]);
    service = new Client({ connectionString: databaseUrl });
    await service.connect();
    await service.query("set role service_role");
    for (const [id, hash] of [["multi", req.multi], ["r1", req.r1], ["r2", req.r2], ["r3", req.r3]] as const) await rpc(service, "build002_insert_signal_requirement", [JSON.stringify(requirement(TA, TXA, id, hash))]);
    await rpc(service, "build002_insert_signal_requirement", [JSON.stringify(requirement(TB, TXB, "foreign", req.b))]);
    await rpc(service, "build002_insert_signal", [JSON.stringify(signal(sig.s1, TA, TXA, "multi", req.multi, h.s3))]);
    await rpc(service, "build002_insert_signal", [JSON.stringify(signal(sig.s2, TA, TXA, "multi", req.multi, h.s1))]);
    await rpc(service, "build002_insert_signal", [JSON.stringify(signal(sig.s3, TA, TXA, "multi", req.multi, h.s2))]);
    await rpc(service, "build002_insert_signal", [JSON.stringify(signal(sig.q1, TA, TXA, "r1", req.r1, h.q1))]);
    await rpc(service, "build002_insert_signal", [JSON.stringify(signal(sig.q2, TA, TXA, "r2", req.r2, h.q2))]);
    await rpc(service, "build002_insert_signal", [JSON.stringify(signal(sig.q3, TA, TXA, "r3", req.r3, h.q3))]);
    await rpc(service, "build002_insert_signal", [JSON.stringify(signal(sig.b, TB, TXB, "foreign", req.b, h.bsig))]);
    depMultiId = await rpc(service, "build002_insert_dependency_snapshot", [JSON.stringify(dependency(TA, TXA, h.depMulti, [req.multi], [
      { requirementId: "multi", signalId: sig.s1, contentHash: h.s3 }, { requirementId: "multi", signalId: sig.s2, contentHash: h.s1 }, { requirementId: "multi", signalId: sig.s3, contentHash: h.s2 },
    ]))]);
    depReadyId = await rpc(service, "build002_insert_dependency_snapshot", [JSON.stringify(dependency(TA, TXA, h.depReady, [req.r1, req.r2, req.r3], [
      { requirementId: "r1", signalId: sig.q1, contentHash: h.q1 }, { requirementId: "r2", signalId: sig.q2, contentHash: h.q2 }, { requirementId: "r3", signalId: sig.q3, contentHash: h.q3 },
    ]))]);
    depBId = await rpc(service, "build002_insert_dependency_snapshot", [JSON.stringify(dependency(TB, TXB, h.bdep, [req.b], [{ requirementId: "foreign", signalId: sig.b, contentHash: h.bsig }]))]);
    await rpc(service, "build002_insert_signal_qualification", [JSON.stringify(qualification(qid.multi, TA, TXA, "multi", req.multi, h.depMulti, [sig.s1, sig.s2, sig.s3], [h.s1, h.s2, h.s3], h.qualMulti)), depMultiId]);
    await rpc(service, "build002_insert_signal_qualification", [JSON.stringify(qualification(qid.r1, TA, TXA, "r1", req.r1, h.depReady, [sig.q1], [h.q1], h.qual1)), depReadyId]);
    await rpc(service, "build002_insert_signal_qualification", [JSON.stringify(qualification(qid.r2, TA, TXA, "r2", req.r2, h.depReady, [sig.q2], [h.q2], h.qual2)), depReadyId]);
    await rpc(service, "build002_insert_signal_qualification", [JSON.stringify(qualification(qid.r3, TA, TXA, "r3", req.r3, h.depReady, [sig.q3], [h.q3], h.qual3)), depReadyId]);
    await rpc(service, "build002_insert_signal_qualification", [JSON.stringify(qualification(qid.b, TB, TXB, "foreign", req.b, h.bdep, [sig.b], [h.bsig], h.bqual)), depBId]);
    await rpc(service, "build002_insert_delegation_readiness", [JSON.stringify(readiness(rid.ready, TA, TXA, h.depReady, h.ready)), depReadyId, JSON.stringify([qid.r1, qid.r2, qid.r3])]);
    await rpc(service, "build002_insert_delegation_readiness", [JSON.stringify(readiness(rid.b, TB, TXB, h.bdep, h.bread)), depBId, JSON.stringify([qid.b])]);
  }, 120_000);

  afterAll(async () => { await service?.end(); await admin?.end(); });

  it("records PostgreSQL 17 and applies every migration exactly once", async () => {
    const result = await admin.query<{ version: string }>("select version() as version");
    expect(result.rows[0].version).toMatch(/PostgreSQL 17/);
    expect(await count(admin, "build002_signal_requirements")).toBe(5);
  });

  it("exposes only the five service-role RPC writes and denies direct inserts", async () => {
    const routines = await admin.query<{ routine_name: string; service_exec: boolean; anon_exec: boolean; auth_exec: boolean }>(`
      select p.proname as routine_name,
        has_function_privilege('service_role', p.oid, 'execute') as service_exec,
        has_function_privilege('anon', p.oid, 'execute') as anon_exec,
        has_function_privilege('authenticated', p.oid, 'execute') as auth_exec
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname like 'build002_insert_%' order by p.proname`);
    expect(routines.rows).toHaveLength(5);
    expect(routines.rows.every((row) => row.service_exec && !row.anon_exec && !row.auth_exec)).toBe(true);
    for (const table of tables) await rejected(service.query(`insert into public.${table} default values`));
    const anon = new Client({ connectionString: databaseUrl }); await anon.connect(); await anon.query("set role anon");
    await rejected(anon.query(`select public.build002_insert_signal_requirement('{}'::jsonb)`)); await anon.end();
  });

  it("preserves exact non-aligned three-signal pairing", async () => {
    const links = await admin.query("select signal_id::text, signal_content_hash from public.build002_qualification_signals where qualification_id = $1 order by signal_id", [qid.multi]);
    expect(links.rows).toEqual([{ signal_id: sig.s1, signal_content_hash: h.s3 }, { signal_id: sig.s2, signal_content_hash: h.s1 }, { signal_id: sig.s3, signal_content_hash: h.s2 }]);
    await rejected(rpc(service, "build002_insert_signal_qualification", [JSON.stringify(qualification("91000000-0000-4000-8000-000000000099", TA, TXA, "multi", req.multi, h.depMulti, [sig.s1, sig.s2, sig.s3], [h.s1, h.s1, h.s2], "9".repeat(64))), depMultiId]));
    expect(await count(admin, "build002_signal_qualifications", `owner_tenant_id = '${TA}' and id = '91000000-0000-4000-8000-000000000099'`)).toBe(0);
  });

  it("rejects wrong hashes, foreign lineage and incomplete readiness atomically", async () => {
    await rejected(rpc(service, "build002_insert_signal", [JSON.stringify(signal("80000000-0000-4000-8000-000000000099", TA, TXA, "multi", req.r1, h.s1))]));
    await rejected(rpc(service, "build002_insert_dependency_snapshot", [JSON.stringify(dependency(TA, TXA, "a".repeat(63) + "b", [req.r1], [{ requirementId: "r1", signalId: sig.b, contentHash: h.bsig }]))]));
    const invalidReady = readiness("92000000-0000-4000-8000-000000000099", TA, TXA, h.depReady, "9".repeat(64));
    await rejected(rpc(service, "build002_insert_delegation_readiness", [JSON.stringify(invalidReady), depReadyId, JSON.stringify([qid.r1])]));
    expect(await count(admin, "build002_delegation_readiness", `id = '${invalidReady.id}'`)).toBe(0);
    await rejected(rpc(service, "build002_insert_signal_qualification", [JSON.stringify(qualification("91000000-0000-4000-8000-000000000098", TA, TXA, "multi", req.multi, h.depMulti, [sig.s1], [h.s3], "8".repeat(64))), depMultiId]));
  });

  it("rejects all eight cross-tenant lineage edges", async () => {
    await rejected(rpc(service, "build002_insert_signal", [JSON.stringify(signal("80000000-0000-4000-8000-000000000097", TA, TXA, "foreign", req.b, h.bsig))]));
    await rejected(rpc(service, "build002_insert_dependency_snapshot", [JSON.stringify(dependency(TA, TXA, "a".repeat(64), [req.b], [{ requirementId: "foreign", signalId: sig.b, contentHash: h.bsig }]))]));
    await rejected(rpc(service, "build002_insert_signal_qualification", [JSON.stringify(qualification("91000000-0000-4000-8000-000000000097", TA, TXA, "foreign", req.b, h.bdep, [sig.b], [h.bsig], "7".repeat(64))), depBId]));
    await rejected(rpc(service, "build002_insert_delegation_readiness", [JSON.stringify(readiness("92000000-0000-4000-8000-000000000097", TA, TXA, h.bdep, "6".repeat(64))), depBId, JSON.stringify([qid.b])]));
    await rejected(admin.query(`insert into public.build002_dependency_requirements(owner_tenant_id,outcome_transaction_id,dependency_snapshot_id,requirement_definition_hash) values ($1,$2,$3,$4)`, [TA, TXA, depMultiId, req.b]));
    await rejected(admin.query(`insert into public.build002_dependency_signals(owner_tenant_id,outcome_transaction_id,dependency_snapshot_id,signal_id,signal_content_hash,requirement_id) values ($1,$2,$3,$4,$5,'multi')`, [TA, TXA, depMultiId, sig.b, h.bsig]));
    await rejected(admin.query(`insert into public.build002_qualification_signals(owner_tenant_id,outcome_transaction_id,qualification_id,qualification_content_hash,signal_id,signal_content_hash,requirement_id) values ($1,$2,$3,$4,$5,$6,'multi')`, [TA, TXA, qid.multi, h.qualMulti, sig.b, h.bsig]));
    await rejected(admin.query(`insert into public.build002_readiness_qualifications(owner_tenant_id,outcome_transaction_id,readiness_id,readiness_content_hash,qualification_id,qualification_content_hash) values ($1,$2,$3,$4,$5,$6)`, [TA, TXA, rid.ready, h.ready, qid.b, h.bqual]));
  });

  it("enforces RLS for A, B, unrelated C and revoked A on all nine tables", async () => {
    const clients = await Promise.all([A, B, C, A].map(async (actor) => { const client = new Client({ connectionString: databaseUrl }); await client.connect(); await client.query("set role authenticated"); await client.query("select set_config('request.jwt.claim.sub', $1, false)", [actor]); return client; }));
    try {
      for (const table of tables) {
        expect(await count(clients[0], table)).toBeGreaterThan(0);
        expect(await count(clients[1], table)).toBeGreaterThan(0);
        expect(await count(clients[2], table)).toBe(0);
      }
      await admin.query("update public.tenant_memberships set status = 'REVOKED' where tenant_id = $1 and principal_id = $2", [TA, A]);
      for (const table of tables) expect(await count(clients[3], table)).toBe(0);
      await admin.query("update public.tenant_memberships set status = 'ACTIVE' where tenant_id = $1 and principal_id = $2", [TA, A]);
    } finally { await Promise.all(clients.map((client) => client.end())); }
  });

  it("keeps authenticated writes and service-role mutation denied", async () => {
    for (const table of tables) {
      await rejected(service.query(`update public.${table} set created_at = created_at`));
      await rejected(service.query(`delete from public.${table}`));
    }
    const auth = new Client({ connectionString: databaseUrl }); await auth.connect(); await auth.query("set role authenticated"); await auth.query(`select set_config('request.jwt.claim.sub', '${A}', false)`);
    await rejected(auth.query(`insert into public.build002_signals default values`));
    await rejected(auth.query(`select public.build002_insert_signal('{}'::jsonb)`)); await auth.end();
  });

  it("keeps privileged update/delete triggers immutable", async () => {
    const rows: Array<[string, string]> = [
      ["build002_signal_requirements", "id"], ["build002_signals", "signal_id"], ["build002_dependency_snapshots", "id"],
      ["build002_signal_qualifications", "id"], ["build002_delegation_readiness", "id"],
    ];
    for (const [table, key] of rows) await rejected(admin.query(`update public.${table} set created_at = created_at where ${key} is not null`));
    for (const [table, key] of rows) await rejected(admin.query(`delete from public.${table} where ${key} is not null`));
  });

  it("serializes dependency, qualification and readiness duplicate writers", async () => {
    const depPayload = dependency(TA, TXA, "4".repeat(64), [req.multi], [{ requirementId: "multi", signalId: sig.s1, contentHash: h.s3 }]);
    const depClients = await Promise.all([1, 2].map(async () => { const c = new Client({ connectionString: databaseUrl }); await c.connect(); await c.query("set role service_role"); return c; }));
    const depResults = await Promise.allSettled(depClients.map((c) => rpc(c, "build002_insert_dependency_snapshot", [JSON.stringify(depPayload)])));
    expect(depResults.filter((r) => r.status === "fulfilled")).toHaveLength(1); expect(depResults.filter((r) => r.status === "rejected")).toHaveLength(1); await Promise.all(depClients.map((c) => c.end()));
    const qPayload = qualification("91000000-0000-4000-8000-000000000096", TA, TXA, "multi", req.multi, h.depMulti, [sig.s1, sig.s2, sig.s3], [h.s1, h.s2, h.s3], "5".repeat(64));
    const qClients = await Promise.all([1, 2].map(async () => { const c = new Client({ connectionString: databaseUrl }); await c.connect(); await c.query("set role service_role"); return c; }));
    const qResults = await Promise.allSettled(qClients.map((c) => rpc(c, "build002_insert_signal_qualification", [JSON.stringify(qPayload), depMultiId])));
    expect(qResults.filter((r) => r.status === "fulfilled")).toHaveLength(1); expect(qResults.filter((r) => r.status === "rejected")).toHaveLength(1); expect(await count(admin, "build002_qualification_signals", `qualification_id = '${qPayload.id}'`)).toBe(3); await Promise.all(qClients.map((c) => c.end()));
    const rPayload = readiness("92000000-0000-4000-8000-000000000096", TA, TXA, h.depReady, "3".repeat(64));
    const rClients = await Promise.all([1, 2].map(async () => { const c = new Client({ connectionString: databaseUrl }); await c.connect(); await c.query("set role service_role"); return c; }));
    const rResults = await Promise.allSettled(rClients.map((c) => rpc(c, "build002_insert_delegation_readiness", [JSON.stringify(rPayload), depReadyId, JSON.stringify([qid.r1, qid.r2, qid.r3])] )));
    expect(rResults.filter((r) => r.status === "fulfilled")).toHaveLength(1); expect(rResults.filter((r) => r.status === "rejected")).toHaveLength(1); expect(await count(admin, "build002_readiness_qualifications", `readiness_id = '${rPayload.id}'`)).toBe(3); await Promise.all(rClients.map((c) => c.end()));
  });

  it("round-trips native timestamptz through the production adapter shape", async () => {
    const result = await admin.query("select * from public.build002_signal_requirements where requirement_definition_hash = $1", [req.multi]);
    expect(result.rows[0].created_at).toBeInstanceOf(Date);
    expect((result.rows[0].created_at as Date).toISOString()).toBe(instant);
    const source = readFileSync(resolve(process.cwd(), "src/infrastructure/persistence/outcome/supabase-build002-persistence-repository.ts"), "utf8");
    expect(source).toContain("value instanceof Date ? value.toISOString() : String(value)");
  });

  it("binds domain hashes before the exclusive RPC boundary and keeps repository scope", async () => {
    const repositorySource = readFileSync(resolve(process.cwd(), "src/infrastructure/persistence/outcome/supabase-build002-persistence-repository.ts"), "utf8");
    expect(repositorySource).toMatch(/verifySignalRequirementHash\(requirement\)/);
    expect(repositorySource).toMatch(/verifySignalContentHash\(signal\)/);
    expect(repositorySource).toMatch(/verifyDependencySnapshotHash\(snapshot\)/);
    expect(repositorySource).toMatch(/verifyQualificationHash\(qualification\)/);
    expect(repositorySource).toMatch(/verifyReadinessHash\(readiness\)/);
    expect(repositorySource).toContain("this.client.rpc");
    expect(repositorySource).not.toMatch(/\.from\([^)]*\)\.insert/);
    const factories = readFileSync(resolve(process.cwd(), "src/infrastructure/persistence/supabase-repositories.ts"), "utf8");
    expect(factories).toContain("createTenantBuild002PersistenceRepository(client, scope)");
    expect(factories).toContain("requireTenantScope(ownerTenantId)");
    const r2 = readFileSync(resolve(process.cwd(), "supabase/migrations/20260819130000_build_002_b_r2_write_boundary.sql"), "utf8");
    expect(r2).toContain("security definer"); expect(r2).toContain("set search_path = pg_catalog, public"); expect(r2).toContain("revoke insert on table");
  });
});
