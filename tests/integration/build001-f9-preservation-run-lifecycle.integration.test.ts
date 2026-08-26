// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterEach, describe, expect, it } from "vitest";

type Db = { exec(sql: string): Promise<unknown>; query<T extends Record<string, unknown>>(sql: string): Promise<{ rows: T[] }>; close(): Promise<void> };
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const T = "f9100000-0000-4000-8000-000000000001";
const F = {
  project: "f9200000-0000-4000-8000-000000000001", project2: "f9200000-0000-4000-8000-000000000002", asset: "f9300000-0000-4000-8000-000000000001", asset2: "f9300000-0000-4000-8000-000000000002", version: "f9400000-0000-4000-8000-000000000001", version2: "f9400000-0000-4000-8000-000000000002", tx: "f9500000-0000-4000-8000-000000000001", tx2: "f9500000-0000-4000-8000-000000000002", exec: "f9600000-0000-4000-8000-000000000001", exec2: "f9600000-0000-4000-8000-000000000002", receipt: "f9700000-0000-4000-8000-000000000001", verification: "f9700000-0000-4000-8000-000000000002", raw: "f9800000-0000-4000-8000-000000000001", raw2: "f9800000-0000-4000-8000-000000000003", preserved: "f9800000-0000-4000-8000-000000000002", run: "f9900000-0000-4000-8000-000000000001",
};

describe("BUILD 001-F9 PreservationRun lifecycle boundary", () => {
  const dbs: Db[] = [];
  afterEach(async () => { for (const db of dbs.splice(0)) await db.close(); });

  it("reproduces the pre-F9 update rejection while insert remains valid", async () => {
    const db = await openDb(false); dbs.push(db); await seed(db);
    await expectSqlError(db, `update public.preservation_runs set status='SUCCESS' where id='${F.run}'`, /TRUST_STATE_COMMIT_IMMUTABLE/);
  }, 30_000);

  it("allows only the supported lifecycle transition and protects lineage", async () => {
    const db = await openDb(true); dbs.push(db); await seed(db); await applyHardening(db);
    await db.exec(`
      insert into public.candidate_assets(id,owner_tenant_id,transaction_id,execution_run_id,storage_key,mime_type,width,height,byte_size,sha256,roi,instruction,provider,model,cost_usd,committed,candidate_type,source_version_id,raw_candidate_id,preservation_run_id)
      values ('${F.preserved}','${T}','${F.tx}','${F.exec}','f9/preserved','image/png',1,1,1,repeat('b',64),'{}','f9','f9','f9',null,false,'PRESERVED','${F.version}','${F.raw}','${F.run}');
    `);
    await expectSqlError(db, `update public.preservation_runs set preserved_candidate_id='${F.raw}' where id='${F.run}'`, /TRUST_PRESERVED_CANDIDATE_MISMATCH/);
    await db.exec(`
      update public.preservation_runs
      set preserved_candidate_id='${F.preserved}', zones='{"CORE":{}}', status='SUCCESS', processing_time_ms=1.5, completed_at=now()
      where id='${F.run}';
    `);
    const state = await db.query<{ status: string; preserved: string; processing: number }>(`select status, preserved_candidate_id::text as preserved, processing_time_ms::numeric as processing from public.preservation_runs where id='${F.run}'`);
    expect(state.rows[0]).toMatchObject({ status: "SUCCESS", preserved: F.preserved, processing: "1.500" });
    const immutableUpdates = [
      ["owner_tenant_id", "'f9100000-0000-4000-8000-000000000099'"], ["transaction_id", `'${F.tx2}'`], ["execution_run_id", `'${F.exec2}'`], ["source_version_id", `'${F.version2}'`], ["raw_candidate_id", `'${F.raw2}'`], ["policy_version", "'changed'"], ["methodology_version", "'changed'"], ["core_roi", "'{\"changed\":true}'"], ["coupled_band", "'{\"changed\":true}'"], ["started_at", "now() + interval '1 minute'"] as const,
    ];
    for (const [column, value] of immutableUpdates) await expectSqlError(db, `update public.preservation_runs set ${column}=${value} where id='${F.run}'`, /TRUST_/);
    await expectSqlError(db, `update public.preservation_runs set preserved_candidate_id=null where id='${F.run}'`, /TRUST_PRESERVATION_RUN_LIFECYCLE_IMMUTABLE/);
    await expectSqlError(db, `update public.evidence_receipts set target='changed' where id='${F.receipt}'`, /TRUST_STATE_COMMIT_IMMUTABLE/);
    await expectSqlError(db, `update public.verification_runs set status='FAILED' where id='${F.verification}'`, /TRUST_STATE_COMMIT_IMMUTABLE/);
    await expectSqlError(db, `update public.candidate_assets set sha256=repeat('c',64) where id='${F.raw}'`, /TRUST_STATE_COMMIT_IMMUTABLE|TRUST_CANONICAL_CANDIDATE_IMMUTABLE/);
  }, 30_000);
});

async function openDb(withFix: boolean): Promise<Db> {
  const db = new PGlite({ extensions: { pgcrypto } }) as unknown as Db;
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema storage; create table storage.buckets(id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);`);
  for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql") && !item.includes("002e_r10") && (withFix || !item.startsWith("20260818200000"))).sort()) await db.exec(readFileSync(resolve(migrationsDir, name), "utf8"));
  return db;
}

async function applyHardening(db: Db): Promise<void> {
  const name = readdirSync(migrationsDir).find((item) => item.includes("002e_r10_stale_concurrency_hardening"));
  if (name) await db.exec(readFileSync(resolve(migrationsDir, name), "utf8"));
}

async function seed(db: Db): Promise<void> {
  await db.exec(`
    insert into public.tenants(id,kind,status) values ('${T}','ORGANIZATION','ACTIVE');
    insert into public.projects(id,owner_tenant_id,name) values ('${F.project}','${T}','f9'),('${F.project2}','${T}','f9-2');
    insert into public.assets(id,owner_tenant_id,project_id,name) values ('${F.asset}','${T}','${F.project}','f9'),('${F.asset2}','${T}','${F.project2}','f9-2');
    insert into public.asset_versions(id,owner_tenant_id,asset_id,version_number,state) values ('${F.version}','${T}','${F.asset}',1,'{}'),('${F.version2}','${T}','${F.asset2}',1,'{}');
    update public.assets set current_version_id='${F.version}' where id='${F.asset}';
    update public.assets set current_version_id='${F.version2}' where id='${F.asset2}';
    insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,status,raw_request) values ('${F.tx}','${T}','${F.project}','${F.asset}','${F.version}','DRAFT','f9'),('${F.tx2}','${T}','${F.project2}','${F.asset2}','${F.version2}','DRAFT','f9-2');
    insert into public.execution_runs(id,owner_tenant_id,transaction_id,status,executor,started_at,completed_at,latency_ms,cost_usd) values ('${F.exec}','${T}','${F.tx}','SUCCESS','f9',now(),now(),1,0),('${F.exec2}','${T}','${F.tx2}','SUCCESS','f9-2',now(),now(),1,0);
    insert into public.evidence_receipts(id,owner_tenant_id,transaction_id,execution_run_id,base_version_id,operation,target,requested_effect,observed_effect,executor,started_at,completed_at,cost_usd,success) values ('${F.receipt}','${T}','${F.tx}','${F.exec}','${F.version}','f9','f9','{}','{}','f9',now(),now(),0,true);
    insert into public.verification_runs(id,owner_tenant_id,transaction_id,execution_run_id,status) values ('${F.verification}','${T}','${F.tx}','${F.exec}','PASSED');
    insert into public.candidate_assets(id,owner_tenant_id,transaction_id,execution_run_id,storage_key,mime_type,width,height,byte_size,sha256,roi,instruction,provider,model,cost_usd,committed,candidate_type,source_version_id) values ('${F.raw}','${T}','${F.tx}','${F.exec}','f9/raw','image/png',1,1,1,repeat('a',64),'{}','f9','f9','f9',0,false,'RAW_PROVIDER','${F.version}'),('${F.raw2}','${T}','${F.tx2}','${F.exec2}','f9/raw2','image/png',1,1,1,repeat('d',64),'{}','f9','f9','f9',0,false,'RAW_PROVIDER','${F.version2}');
    insert into public.preservation_runs(id,owner_tenant_id,transaction_id,execution_run_id,source_version_id,raw_candidate_id,policy_version,methodology_version,core_roi,coupled_band,status,started_at) values ('${F.run}','${T}','${F.tx}','${F.exec}','${F.version}','${F.raw}','f9','f9','{}','{}','RUNNING',now());
  `);
}

async function expectSqlError(db: Db, sql: string, pattern: RegExp): Promise<void> { await expect(db.exec(sql)).rejects.toThrow(pattern); }
