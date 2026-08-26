// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterEach, describe, expect, it } from "vitest";

type Db = { exec(sql: string): Promise<unknown>; close(): Promise<void> };
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const A = "20000000-0000-4000-8000-000000000001";
const B = "20000000-0000-4000-8000-000000000002";
const ACTOR = "10000000-0000-4000-8000-000000000001";
const ids = {
  projectA: "30000000-0000-4000-8000-000000000001", projectB: "30000000-0000-4000-8000-000000000002",
  assetA: "40000000-0000-4000-8000-000000000001", assetB: "40000000-0000-4000-8000-000000000002",
  versionA: "50000000-0000-4000-8000-000000000001", versionB: "50000000-0000-4000-8000-000000000002",
  txA: "60000000-0000-4000-8000-000000000001", txB: "60000000-0000-4000-8000-000000000002",
  execA: "70000000-0000-4000-8000-000000000001", execB: "70000000-0000-4000-8000-000000000002",
  execA2: "70000000-0000-4000-8000-000000000003", receiptA: "80000000-0000-4000-8000-000000000001", receiptB: "80000000-0000-4000-8000-000000000002",
  candidateA: "90000000-0000-4000-8000-000000000001", candidateB: "90000000-0000-4000-8000-000000000002", candidateA2: "90000000-0000-4000-8000-000000000003",
  runA: "a0000000-0000-4000-8000-000000000001", runB: "a0000000-0000-4000-8000-000000000002", runA2: "a0000000-0000-4000-8000-000000000003",
};

describe("BUILD 001-F8 asset-scoped trigger boundary", () => {
  const dbs: Db[] = [];
  afterEach(async () => { for (const db of dbs.splice(0)) await db.close(); });

  it("reproduces the pre-F8 heterogeneous OLD-row failure on all three tables", async () => {
    const db = await openDb(false); dbs.push(db); await seed(db);
    const statements = [
      `insert into public.media_storage(storage_key,mime_type,width,height,byte_size,sha256,asset_id) values ('a','image/png',1,1,1,repeat('a',64),'${ids.assetA}')`,
      `insert into public.image_evidence(evidence_receipt_id,source_hash,candidate_hash,source_width,source_height,candidate_width,candidate_height,normalized_total_diff,normalized_roi_diff,normalized_outside_roi_diff,methodology) values ('${ids.receiptA}',repeat('a',64),repeat('b',64),1,1,1,1,0,0,0,'f8')`,
      `insert into public.preservation_evidence(preservation_run_id,candidate_id,candidate_type,methodology_version,mean_total_pixel_diff,changed_pixel_ratio_total,mean_core_pixel_diff,changed_pixel_ratio_core,mean_coupled_pixel_diff,changed_pixel_ratio_coupled,mean_locked_outside_pixel_diff,changed_pixel_ratio_locked_outside) values ('${ids.runA}','${ids.candidateA}','RAW_PROVIDER','f8',0,0,0,0,0,0,0,0)`,
    ];
    for (const sql of statements) await expectReject(db, sql, /record "old" has no field/);
  }, 30_000);

  it("derives ownership and rejects conflicting or mutable references after F8", async () => {
    const db = await openDb(true); dbs.push(db); await seed(db); await applyHardening(db);
    await db.exec(`
      insert into public.media_storage(storage_key,mime_type,width,height,byte_size,sha256,asset_id)
      values ('a','image/png',1,1,1,repeat('a',64),'${ids.assetA}');
      insert into public.image_evidence(evidence_receipt_id,source_hash,candidate_hash,source_width,source_height,candidate_width,candidate_height,normalized_total_diff,normalized_roi_diff,normalized_outside_roi_diff,methodology)
      values ('${ids.receiptA}',repeat('a',64),repeat('b',64),1,1,1,1,0,0,0,'f8');
      insert into public.preservation_evidence(preservation_run_id,candidate_id,candidate_type,methodology_version,mean_total_pixel_diff,changed_pixel_ratio_total,mean_core_pixel_diff,changed_pixel_ratio_core,mean_coupled_pixel_diff,changed_pixel_ratio_coupled,mean_locked_outside_pixel_diff,changed_pixel_ratio_locked_outside)
      values ('${ids.runA}','${ids.candidateA}','RAW_PROVIDER','f8',0,0,0,0,0,0,0,0);
    `);
    const owners = await (db as unknown as { query<T>(sql: string): Promise<{ rows: T[] }> }).query<{ media: string; image: string; preservation: string }>(`
      select (select owner_tenant_id::text from public.media_storage where storage_key='a') media,
             (select owner_tenant_id::text from public.image_evidence where evidence_receipt_id='${ids.receiptA}') image,
             (select owner_tenant_id::text from public.preservation_evidence where preservation_run_id='${ids.runA}') preservation`);
    expect(owners.rows[0]).toEqual({ media: A, image: A, preservation: A });
    await expectReject(db, `insert into public.media_storage(owner_tenant_id,storage_key,mime_type,width,height,byte_size,sha256,asset_id) values ('${B}','b','image/png',1,1,1,repeat('a',64),'${ids.assetA}')`, /TRUST_RESOURCE_OWNER_MISMATCH/);
    await expectReject(db, `insert into public.image_evidence(owner_tenant_id,evidence_receipt_id,source_hash,candidate_hash,source_width,source_height,candidate_width,candidate_height,normalized_total_diff,normalized_roi_diff,normalized_outside_roi_diff,methodology) values ('${B}','${ids.receiptA}',repeat('a',64),repeat('b',64),1,1,1,1,0,0,0,'f8')`, /TRUST_RESOURCE_OWNER_MISMATCH/);
    await expectReject(db, `insert into public.preservation_evidence(owner_tenant_id,preservation_run_id,candidate_id,candidate_type,methodology_version,mean_total_pixel_diff,changed_pixel_ratio_total,mean_core_pixel_diff,changed_pixel_ratio_core,mean_coupled_pixel_diff,changed_pixel_ratio_coupled,mean_locked_outside_pixel_diff,changed_pixel_ratio_locked_outside) values ('${B}','${ids.runA}','${ids.candidateA}','RAW_PROVIDER','f8',0,0,0,0,0,0,0,0)`, /TRUST_RESOURCE_OWNER_MISMATCH/);
    await expectReject(db, `update public.media_storage set asset_id='${ids.assetB}' where storage_key='a'`, /TRUST_RESOURCE_REFERENCE_IMMUTABLE/);
    await expectReject(db, `update public.media_storage set owner_tenant_id='${B}' where storage_key='a'`, /TRUST_OWNER_IMMUTABLE/);
    await expectReject(db, `update public.image_evidence set evidence_receipt_id='${ids.receiptB}' where evidence_receipt_id='${ids.receiptA}'`, /TRUST_RESOURCE_REFERENCE_IMMUTABLE/);
    await expectReject(db, `update public.image_evidence set owner_tenant_id='${B}' where evidence_receipt_id='${ids.receiptA}'`, /TRUST_OWNER_IMMUTABLE/);
    await expectReject(db, `update public.preservation_evidence set preservation_run_id='${ids.runA2}' where preservation_run_id='${ids.runA}'`, /TRUST_RESOURCE_REFERENCE_IMMUTABLE/);
    await expectReject(db, `update public.preservation_evidence set candidate_id='${ids.candidateA2}' where preservation_run_id='${ids.runA}'`, /TRUST_RESOURCE_REFERENCE_IMMUTABLE/);
    await expectReject(db, `update public.preservation_evidence set owner_tenant_id='${B}' where preservation_run_id='${ids.runA}'`, /TRUST_OWNER_IMMUTABLE/);
  }, 30_000);
});

async function openDb(withFix: boolean): Promise<Db> {
  const db = new PGlite({ extensions: { pgcrypto } }) as unknown as Db;
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema storage; create table storage.buckets(id text primary key, name text not null unique, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);`);
  for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql") && !item.includes("002e_r10") && (withFix || !item.startsWith("20260817190000"))).sort()) await db.exec(readFileSync(resolve(migrationsDir, name), "utf8"));
  return db;
}

async function applyHardening(db: Db): Promise<void> {
  const name = readdirSync(migrationsDir).find((item) => item.includes("002e_r10_stale_concurrency_hardening"));
  if (name) await db.exec(readFileSync(resolve(migrationsDir, name), "utf8"));
}

async function seed(db: Db): Promise<void> {
  await db.exec(`
    insert into auth.users(id) values ('${ACTOR}');
    insert into public.tenants(id,kind,personal_owner_principal_id,status) values ('${A}','PERSONAL','${ACTOR}','ACTIVE'),('${B}','ORGANIZATION',null,'ACTIVE');
    insert into public.tenant_memberships(id,tenant_id,principal_id,role,status) values ('30000000-0000-4000-8000-000000000003','${A}','${ACTOR}','OWNER','ACTIVE');
    insert into public.projects(id,owner_tenant_id,name) values ('${ids.projectA}','${A}','f8-a'),('${ids.projectB}','${B}','f8-b');
    insert into public.assets(id,owner_tenant_id,project_id,name) values ('${ids.assetA}','${A}','${ids.projectA}','a'),('${ids.assetB}','${B}','${ids.projectB}','b');
    insert into public.asset_versions(id,owner_tenant_id,asset_id,version_number,state) values ('${ids.versionA}','${A}','${ids.assetA}',1,'{}'::jsonb),('${ids.versionB}','${B}','${ids.assetB}',1,'{}'::jsonb);
    update public.assets set current_version_id='${ids.versionA}' where id='${ids.assetA}';
    update public.assets set current_version_id='${ids.versionB}' where id='${ids.assetB}';
    insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,status,raw_request) values ('${ids.txA}','${A}','${ids.projectA}','${ids.assetA}','${ids.versionA}','DRAFT','f8'),('${ids.txB}','${B}','${ids.projectB}','${ids.assetB}','${ids.versionB}','DRAFT','f8');
    insert into public.execution_runs(id,owner_tenant_id,transaction_id,status,executor,started_at,completed_at,latency_ms,cost_usd) values ('${ids.execA}','${A}','${ids.txA}','SUCCESS','f8',now(),now(),1,0),('${ids.execB}','${B}','${ids.txB}','SUCCESS','f8',now(),now(),1,0),('${ids.execA2}','${A}','${ids.txA}','SUCCESS','f8-2',now(),now(),1,0);
    insert into public.evidence_receipts(id,owner_tenant_id,transaction_id,execution_run_id,base_version_id,operation,target,requested_effect,observed_effect,executor,started_at,completed_at,cost_usd,success) values ('${ids.receiptA}','${A}','${ids.txA}','${ids.execA}','${ids.versionA}','f8','a','{}','{}','f8',now(),now(),0,true),('${ids.receiptB}','${B}','${ids.txB}','${ids.execB}','${ids.versionB}','f8','b','{}','{}','f8',now(),now(),0,true);
    insert into public.candidate_assets(id,owner_tenant_id,transaction_id,execution_run_id,storage_key,mime_type,width,height,byte_size,sha256,roi,instruction,provider,model,cost_usd,committed,candidate_type,source_version_id,raw_candidate_id) values ('${ids.candidateA}','${A}','${ids.txA}','${ids.execA}','a','image/png',1,1,1,repeat('a',64),'{}','f8','f8','f8',0,false,'RAW_PROVIDER','${ids.versionA}',null),('${ids.candidateB}','${B}','${ids.txB}','${ids.execB}','b','image/png',1,1,1,repeat('b',64),'{}','f8','f8','f8',0,false,'RAW_PROVIDER','${ids.versionB}',null),('${ids.candidateA2}','${A}','${ids.txA}','${ids.execA2}','a2','image/png',1,1,1,repeat('c',64),'{}','f8','f8','f8',0,false,'RAW_PROVIDER','${ids.versionA}',null);
    insert into public.preservation_runs(id,owner_tenant_id,transaction_id,execution_run_id,source_version_id,raw_candidate_id,policy_version,methodology_version,core_roi,coupled_band,status,started_at) values ('${ids.runA}','${A}','${ids.txA}','${ids.execA}','${ids.versionA}','${ids.candidateA}','f8','f8','{}','{}','SUCCESS',now()),('${ids.runB}','${B}','${ids.txB}','${ids.execB}','${ids.versionB}','${ids.candidateB}','f8','f8','{}','{}','SUCCESS',now()),('${ids.runA2}','${A}','${ids.txA}','${ids.execA2}','${ids.versionA}','${ids.candidateA2}','f8','f8','{}','{}','SUCCESS',now());
  `);
}

async function expectReject(db: Db, sql: string, pattern: RegExp): Promise<void> {
  await expect(db.exec(sql)).rejects.toThrow(pattern);
}
