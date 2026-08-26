// @vitest-environment node
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.BUILD002_NATIVE_PG_002E === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_002E_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const T = "002e0000-0000-4000-8000-000000000001";
const P = "002e0000-0000-4000-8000-000000000002";
const A1 = "002e0000-0000-4000-8000-000000000003";
const V1 = "002e0000-0000-4000-8000-000000000004";
const V2 = "002e0000-0000-4000-8000-000000000005";
const X1 = "002e0000-0000-4000-8000-000000000006";
const A2 = "002e0000-0000-4000-8000-000000000007";
const V3 = "002e0000-0000-4000-8000-000000000008";
const X2 = "002e0000-0000-4000-8000-000000000009";
const STUDY = "002e0000-0000-4000-8000-000000000010";
const STUDY2 = "002e0000-0000-4000-8000-000000000011";
const USER1 = "002e2000-0000-4000-8000-000000000001";
const USER2 = "002e2000-0000-4000-8000-000000000002";
const MEMBER1 = "002e2000-0000-4000-8000-000000000003";
const MEMBER2 = "002e2000-0000-4000-8000-000000000004";
const T2 = "002e2000-0000-4000-8000-000000000005";
const P2 = "002e2000-0000-4000-8000-000000000006";
const A3 = "002e2000-0000-4000-8000-000000000007";
const V4 = "002e2000-0000-4000-8000-000000000008";
const X3 = "002e2000-0000-4000-8000-000000000009";
const ATTACK_TX = "002e2000-0000-4000-8000-000000000010";
const AUTHORIZED_TX = "002e2000-0000-4000-8000-000000000011";

type CaseLineage = { asset:string; version:string; transaction:string; execution:string; raw:string; preserved:string; preservation:string };
const caseLineages: CaseLineage[] = Array.from({length:4},(_,index)=>({
  asset: testId(100+index), version: testId(200+index), transaction: testId(300+index),
  execution: testId(400+index), raw: testId(500+index), preserved: testId(600+index), preservation: testId(700+index),
}));

function connection(url: string, database: string): string {
  const parsed = new URL(url); parsed.pathname = `/${database}`; return parsed.toString();
}

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002 002-E R10 native PostgreSQL 17", () => {
  let root: Client;
  let dbName = "";
  let admin: Client;
  let replay1Catalog = "";

  beforeAll(async () => {
    root = new Client({ connectionString: connection(databaseUrl!, "postgres") });
    await root.connect();
    const prefix = `virro_002e_${process.pid}_${Date.now()}`;
    const replay1 = `${prefix}_replay1`;
    dbName = `${prefix}_replay2`;
    await replayFresh(replay1);
    const replay1Client=new Client({connectionString:connection(databaseUrl!,replay1)});
    await replay1Client.connect();
    replay1Catalog=await catalogFingerprint(replay1Client);
    await replay1Client.end();
    await root.query(`drop database "${replay1}" with (force)`);
    await replayFresh(dbName);
    admin = new Client({ connectionString: connection(databaseUrl!, dbName) });
    await admin.connect();
    await seed(admin);
  }, 180_000);

  afterAll(async () => {
    await admin?.end();
    if (root && dbName) await root.query(`drop database if exists "${dbName}" with (force)`);
    await root?.end();
  });

  it("replays cleanly twice on PostgreSQL 17 with the exact private fence relation", async () => {
    expect((await admin.query("show server_version_num")).rows[0].server_version_num).toMatch(/^17/);
    expect(await catalogFingerprint(admin)).toBe(replay1Catalog);
    const shape = await admin.query(`
      select
        (select count(*)::integer from information_schema.columns where table_schema='public' and table_name='build002_material_fences') columns,
        (select count(*)::integer from pg_constraint where conrelid='public.build002_material_fences'::regclass and contype='f') fks,
        (select count(*)::integer from pg_constraint where conrelid='public.build002_material_fences'::regclass and contype='u') secondary_unique,
        (select count(*)::integer from pg_trigger where tgrelid='public.build002_material_fences'::regclass and not tgisinternal) user_triggers,
        has_table_privilege('anon','public.build002_material_fences','INSERT,UPDATE,DELETE') anon_dml,
        has_table_privilege('authenticated','public.build002_material_fences','INSERT,UPDATE,DELETE') authenticated_dml`);
    expect(shape.rows[0]).toEqual({ columns: 5, fks: 0, secondary_unique: 0, user_triggers: 0, anon_dml: false, authenticated_dml: false });
    const bypasses=await admin.query(`
      select count(*)::integer count
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname like 'build002\\_002e\\_inner\\_%' escape '\\'
         and (has_function_privilege('anon',p.oid,'EXECUTE')
           or has_function_privilege('authenticated',p.oid,'EXECUTE')
           or has_function_privilege('service_role',p.oid,'EXECUTE'))`);
    expect(bypasses.rows[0].count).toBe(0);
  });

  it("serializes ten protected conflict classes without a deadlock", async () => {
    const common = { tenant_id: T, transaction_id: X1, asset_id: A1, version_id: V1 };
    const cases: Array<[string, string, Record<string, string>, string, string, Record<string, string>]> = [
      ["direct.outcome_transactions.update","MATERIAL_WRITER",common,"direct.execution_runs.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common],
      ["direct.partial_intents.insert","MATERIAL_WRITER",common,"direct.transaction_patches.insert","MATERIAL_WRITER",common],
      ["direct.assets.update","MATERIAL_WRITER",common,"direct.media_storage.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common],
      ["direct.field_outcomes.insert","MATERIAL_WRITER",common,"direct.evidence_receipts.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common],
      ["direct.candidate_assets.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common,"direct.preservation_runs.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common],
      ["direct.execution_runs.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common,"direct.candidate_preferences.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common],
      ["direct.state_commits.insert","SYNCHRONIZED_WAIT_PARTICIPANT",{...common,version_id:V2,previous_version_id:V1},"direct.state_commits.insert","SYNCHRONIZED_WAIT_PARTICIPANT",{...common,version_id:V1,previous_version_id:V2}],
      ["direct.preservation_strategy_runs.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common,"direct.cost_records.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common],
      ["direct.semantic_snapshots.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common,"direct.verification_runs.insert","SYNCHRONIZED_WAIT_PARTICIPANT",common],
      ["direct.preservation_study_cases.insert","SYNCHRONIZED_WAIT_PARTICIPANT",{...common,study_id:STUDY},"direct.preservation_study_cases.insert","SYNCHRONIZED_WAIT_PARTICIPANT",{tenant_id:T,transaction_id:X2,asset_id:A2,version_id:V3,study_id:STUDY}],
    ];
    for (const [leftOp,leftClass,leftContext,rightOp,rightClass,rightContext] of cases) {
      await proveWait(leftOp,leftClass,leftContext,rightOp,rightClass,rightContext);
    }
  }, 90_000);

  it("proves the W28 version-pair witness in all three canonical forms", async () => {
    const base = { tenant_id: T, transaction_id: X1, asset_id: A1 };
    const witnesses: Array<[Record<string, string>, Record<string, string>]> = [
      [{ ...base, version_id: V2, previous_version_id: V1 }, { ...base, version_id: V2, previous_version_id: V1 }],
      [{ ...base, version_id: V2, previous_version_id: V1 }, { ...base, version_id: V1, previous_version_id: V2 }],
      [{ ...base, version_id: V1, previous_version_id: V1 }, { ...base, version_id: V1, previous_version_id: V1 }],
    ];
    for (const [leftContext, rightContext] of witnesses) {
      await proveWait(
        "direct.state_commits.insert",
        "SYNCHRONIZED_WAIT_PARTICIPANT",
        leftContext,
        "direct.state_commits.insert",
        "SYNCHRONIZED_WAIT_PARTICIPANT",
        rightContext,
      );
      await proveParentWait(leftContext, rightContext);
    }
  }, 45_000);

  it("passes the seven-case preservation runtime matrix", async () => {
    await proveSameStudyCase("P01",STUDY,"same-plan",caseLineages[0],caseLineages[1]);
    await proveSameStudyCase("P02",STUDY,"left-plan",caseLineages[0],caseLineages[0],"right-plan");
    await proveSameStudyCase("P03",STUDY,"left-distinct",caseLineages[0],caseLineages[1],"right-distinct");
    await proveCrossStudyPrimaryKeyWait("P04");

    const before = await admin.query("select count(*)::integer count from public.preservation_study_cases");
    await expect(admin.query(caseInsert(testId(805),testId(999),"missing",caseLineages[0]))).rejects.toThrow("BUILD002_002E_PARENT_NOT_FOUND");
    const after = await admin.query("select count(*)::integer count from public.preservation_study_cases");
    expect(after.rows[0].count,"P05").toBe(before.rows[0].count);

    await proveStudyChain(false);
    await proveStudyChain(true);
  }, 90_000);

  it("rejects the canonical C03 cross-tenant insert before fence or parent waiting", async () => {
    const before=await fenceSnapshot();
    const holder=new Client({connectionString:connection(databaseUrl!,dbName)});
    const attacker=new Client({connectionString:connection(databaseUrl!,dbName)});
    await holder.connect(); await attacker.connect();
    try {
      await holder.query("begin");
      await holder.query("select public.build002_002e_route($1,$2,$3::jsonb)",[
        "direct.outcome_transactions.insert","MATERIAL_WRITER",
        JSON.stringify({tenant_id:T2,project_id:P2,transaction_id:ATTACK_TX,asset_id:A3,version_id:V4}),
      ]);
      await attacker.query("begin");
      await attacker.query("set local role authenticated");
      await attacker.query("select set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claim.sub',$1,true)",[USER1]);
      const pid=(await attacker.query("select pg_backend_pid() pid")).rows[0].pid;
      let settled=false;
      const pending=attacker.query(`insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,status,raw_request)
        values ($1,$2,$3,$4,$5,'DRAFT','C03')`,[ATTACK_TX,T2,P2,A3,V4])
        .then(()=>({error:null}),error=>({error})).finally(()=>{settled=true;});
      let observedLock=false;
      for(let attempt=0;attempt<20&&!settled;attempt+=1){
        const state=await admin.query("select wait_event_type from pg_stat_activity where pid=$1",[pid]);
        if(state.rows[0]?.wait_event_type==="Lock") observedLock=true;
        await new Promise(resolveDelay=>setTimeout(resolveDelay,25));
      }
      const result=await pending;
      expect(observedLock).toBe(false);
      expect(result.error?.code).toBe("42501");
      await holder.query("rollback"); await attacker.query("rollback");
      expect(await fenceSnapshot()).toEqual(before);
    } finally {
      await holder.query("rollback").catch(()=>undefined); await attacker.query("rollback").catch(()=>undefined);
      await holder.end(); await attacker.end();
    }
  });

  it("rejects cross-tenant lineage before a victim parent lock", async () => {
    const holder=new Client({connectionString:connection(databaseUrl!,dbName)});
    const attacker=new Client({connectionString:connection(databaseUrl!,dbName)});
    await holder.connect(); await attacker.connect();
    try {
      await holder.query("begin");
      await holder.query("select id from public.asset_versions where id=$1 for update",[V4]);
      await attacker.query("begin"); await attacker.query("set local role authenticated");
      await attacker.query("select set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claim.sub',$1,true)",[USER1]);
      const pid=(await attacker.query("select pg_backend_pid() pid")).rows[0].pid;
      let settled=false;
      const pending=attacker.query(`insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,status,raw_request)
        values ($1,$2,$3,$4,$5,'DRAFT','parent C03')`,[ATTACK_TX,T2,P2,A3,V4])
        .then(()=>({error:null}),error=>({error})).finally(()=>{settled=true;});
      let observedLock=false;
      for(let attempt=0;attempt<20&&!settled;attempt+=1){
        const state=await admin.query("select wait_event_type from pg_stat_activity where pid=$1",[pid]);
        if(state.rows[0]?.wait_event_type==="Lock") observedLock=true;
        await new Promise(resolveDelay=>setTimeout(resolveDelay,25));
      }
      const result=await pending;
      expect(observedLock).toBe(false); expect(result.error?.code).toBe("42501");
    } finally {
      await holder.query("rollback").catch(()=>undefined); await attacker.query("rollback").catch(()=>undefined);
      await holder.end(); await attacker.end();
    }
  });

  it("rejects a service-wrapper principal from another tenant before membership fences", async () => {
    const before=await fenceSnapshot();
    const holder=new Client({connectionString:connection(databaseUrl!,dbName)});
    const attacker=new Client({connectionString:connection(databaseUrl!,dbName)});
    await holder.connect(); await attacker.connect();
    try {
      const context={tenant_id:T2,principal_id:USER1,member_principal_id:USER2,membership_id:MEMBER2};
      await holder.query("begin");
      await holder.query(`select public.build002_002e_acquire_fences(
        public.build002_002e_derive_fences('rpc.revoke_tenant_membership',$1::jsonb))`,[JSON.stringify(context)]);
      await attacker.query("begin"); await attacker.query("set local role service_role");
      await attacker.query("select set_config('request.jwt.claim.role','service_role',true)");
      const pid=(await attacker.query("select pg_backend_pid() pid")).rows[0].pid;
      let settled=false;
      const pending=attacker.query("select * from public.revoke_tenant_membership($1,$2)",[MEMBER2,USER1])
        .then(()=>({error:null}),error=>({error})).finally(()=>{settled=true;});
      let observedLock=false;
      for(let attempt=0;attempt<20&&!settled;attempt+=1){
        const state=await admin.query("select wait_event_type from pg_stat_activity where pid=$1",[pid]);
        if(state.rows[0]?.wait_event_type==="Lock") observedLock=true;
        await new Promise(resolveDelay=>setTimeout(resolveDelay,25));
      }
      const result=await pending;
      expect(observedLock).toBe(false); expect(result.error?.code).toBe("42501");
      await holder.query("rollback"); await attacker.query("rollback");
      expect(await fenceSnapshot()).toEqual(before);
    } finally {
      await holder.query("rollback").catch(()=>undefined); await attacker.query("rollback").catch(()=>undefined);
      await holder.end(); await attacker.end();
    }
  });

  it("does not accept a caller-forged nested suppression marker", async () => {
    const holder=new Client({connectionString:connection(databaseUrl!,dbName)});
    const attacker=new Client({connectionString:connection(databaseUrl!,dbName)});
    await holder.connect(); await attacker.connect();
    try {
      await holder.query("begin");
      await holder.query("select public.build002_002e_route($1,$2,$3::jsonb)",[
        "direct.outcome_transactions.insert","MATERIAL_WRITER",
        JSON.stringify({tenant_id:T,project_id:P,transaction_id:AUTHORIZED_TX,asset_id:A1,version_id:V1}),
      ]);
      await attacker.query("begin"); await attacker.query("set local role authenticated");
      await attacker.query("select set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claim.sub',$1,true),set_config('build002.udre_active_operation','forged|00',true)",[USER1]);
      const pid=(await attacker.query("select pg_backend_pid() pid")).rows[0].pid;
      const pending=attacker.query(`insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,status,raw_request)
        values ($1,$2,$3,$4,$5,'DRAFT','forged')`,[AUTHORIZED_TX,T,P,A1,V1]);
      expect(await observesLock(pid)).toBe(true);
      await holder.query("rollback"); await pending; await attacker.query("rollback");
    } finally {
      await holder.query("rollback").catch(()=>undefined); await attacker.query("rollback").catch(()=>undefined);
      await holder.end(); await attacker.end();
    }
  });

  it("fails held-set additions and changed scopes with SQLSTATE 40001", async () => {
    const a=JSON.stringify([{kind:"TENANT_AUTHORITY",scope:{tenant_id:T}}]);
    const reordered=JSON.stringify([{scope:{tenant_id:T},kind:"TENANT_AUTHORITY"}]);
    const added=JSON.stringify([{kind:"TENANT_AUTHORITY",scope:{tenant_id:T}},{kind:"OUTCOME_TRANSACTION",scope:{tenant_id:T,outcome_transaction_id:X1}}]);
    const changed=JSON.stringify([{kind:"TENANT_AUTHORITY",scope:{tenant_id:T2}}]);
    await admin.query("select public.build002_002e_assert_held_fence_set($1::jsonb,$2::jsonb)",[a,reordered]);
    await expect(admin.query("select public.build002_002e_assert_held_fence_set($1::jsonb,$2::jsonb)",[a,added]))
      .rejects.toMatchObject({code:"40001"});
    await expect(admin.query("select public.build002_002e_assert_held_fence_set($1::jsonb,$2::jsonb)",[a,changed]))
      .rejects.toMatchObject({code:"40001"});
  });

  it("denies fixed update RPC cross-tenant and cross-lineage references", async () => {
    const client=new Client({connectionString:connection(databaseUrl!,dbName)}); await client.connect();
    try {
      await client.query("begin"); await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claim.sub',$1,true)",[USER1]);
      await client.query("select public.build002_002e_update_asset($1,$2,jsonb_build_object('name','authorized'))",[A1,T]);
      await expect(client.query("select public.build002_002e_update_asset($1,$2,jsonb_build_object('name','cross'))",[A3,T2]))
        .rejects.toMatchObject({code:"42501"});
      await client.query("rollback");
      await client.query("begin"); await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claim.sub',$1,true)",[USER1]);
      await expect(client.query("select public.build002_002e_update_asset($1,$2,jsonb_build_object('project_id',$3::text))",[A1,T,P2]))
        .rejects.toMatchObject({code:"42501"});
      await client.query("rollback");
      await client.query("begin"); await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claim.sub',$1,true)",[USER1]);
      await expect(client.query("select public.build002_002e_update_asset($1,$2,jsonb_build_object('current_version_id',$3::text))",[A1,T,V4]))
        .rejects.toMatchObject({code:"42501"});
      await client.query("rollback");
      await client.query("begin"); await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claim.sub',$1,true)",[USER1]);
      await expect(client.query("select public.build002_002e_update_outcome_transaction($1,$2,jsonb_build_object('asset_id',$3::text,'base_version_id',$4::text))",[X1,T,A3,V4]))
        .rejects.toMatchObject({code:"42501"});
    } finally { await client.query("rollback").catch(()=>undefined); await client.end(); }
  });

  it("denies anon, nonmember, and inexact service-role fixed RPC actors", async () => {
    const client=new Client({connectionString:connection(databaseUrl!,dbName)}); await client.connect();
    try {
      await client.query("begin"); await client.query("set local role anon");
      await expect(client.query("select public.build002_002e_update_asset($1,$2,jsonb_build_object('name','anon'))",[A1,T]))
        .rejects.toMatchObject({code:"42501"});
      await client.query("rollback");

      await client.query("begin"); await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claim.sub',$1,true)",[USER2]);
      await expect(client.query("select public.build002_002e_update_asset($1,$2,jsonb_build_object('name','nonmember'))",[A1,T]))
        .rejects.toMatchObject({code:"42501"});
      await client.query("rollback");

      await client.query("begin"); await client.query("set local role service_role");
      await client.query("select set_config('request.jwt.claim.role','authenticated',true)");
      await expect(client.query("select public.build002_002e_update_asset($1,$2,jsonb_build_object('name','wrong-claim'))",[A1,T]))
        .rejects.toMatchObject({code:"42501"});
      await client.query("rollback");

      await client.query("begin"); await client.query("set local role service_role");
      await client.query("select set_config('request.jwt.claim.role','service_role',true)");
      await client.query("select public.build002_002e_update_asset($1,$2,jsonb_build_object('name','exact-service'))",[A1,T]);
      await client.query("rollback");
    } finally { await client.query("rollback").catch(()=>undefined); await client.end(); }
  });

  it("cleans nested suppression after success and after an exception", async () => {
    const client=new Client({connectionString:connection(databaseUrl!,dbName)}); await client.connect();
    try {
      await client.query("begin"); await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claim.sub',$1,true)",[USER1]);
      await client.query("select public.build002_002e_update_asset($1,$2,jsonb_build_object('name','cleanup-success'))",[A1,T]);
      expect((await client.query("select current_setting('build002.udre_active_operation',true) marker")).rows[0].marker).toBe("");

      await client.query("savepoint cleanup_exception");
      await expect(client.query("select public.build002_002e_update_asset($1,$2,jsonb_build_object('name',null))",[A1,T]))
        .rejects.toMatchObject({code:"23502"});
      await client.query("rollback to savepoint cleanup_exception");
      expect((await client.query("select current_setting('build002.udre_active_operation',true) marker")).rows[0].marker).toBe("");
    } finally { await client.query("rollback").catch(()=>undefined); await client.end(); }
  });

  it("removes all legacy broad SHARE table locks from the effective function bodies", async () => {
    const definitions = await admin.query(`
      select lower(pg_get_functiondef(p.oid)) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname in (
         'build002_002e_inner_grant_mutation_lease','build002_grant_mutation_lease_r0',
         'build002_002e_inner_admit_delegability','build002_002e_inner_grant_execution_authority')`);
    expect(definitions.rows).toHaveLength(4);
    for (const row of definitions.rows) expect(row.definition).not.toMatch(/lock\s+table/i);
  });

  async function replayFresh(name: string): Promise<void> {
    await root.query(`drop database if exists "${name}" with (force)`);
    await root.query(`create database "${name}"`);
    const client = new Client({ connectionString: connection(databaseUrl!, name) });
    await client.connect();
    try {
      await client.query(`
        create extension if not exists pgcrypto;
        do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
        do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
        do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
        create schema auth; create table auth.users(id uuid primary key);
        create function auth.uid() returns uuid language sql stable
          as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        create schema storage;
        create table storage.buckets(id text primary key,name text not null unique,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);`);
      for (const migration of readdirSync(migrationsDir).filter((item)=>item.endsWith(".sql")).sort()) {
        await client.query(readFileSync(resolve(migrationsDir,migration),"utf8"));
      }
    } finally { await client.end(); }
  }

  async function catalogFingerprint(client:Client):Promise<string> {
    const catalog=await client.query(`
      select category,identity,detail from (
        select 'relation'::text category,n.nspname||'.'||c.relname identity,
               concat_ws('|',c.relkind,c.relpersistence,c.relrowsecurity,c.relforcerowsecurity) detail
          from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname in ('public','auth','storage')
        union all
        select 'column',table_schema||'.'||table_name||'.'||column_name,
               concat_ws('|',ordinal_position,data_type,udt_schema,udt_name,is_nullable,column_default)
          from information_schema.columns where table_schema in ('public','auth','storage')
        union all
        select 'constraint',n.nspname||'.'||c.relname||'.'||con.conname,pg_get_constraintdef(con.oid,true)
          from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
         where n.nspname in ('public','auth','storage')
        union all
        select 'trigger',n.nspname||'.'||c.relname||'.'||t.tgname,pg_get_triggerdef(t.oid,true)
          from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
         where n.nspname in ('public','auth','storage') and not t.tgisinternal
        union all
        select 'function',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
               concat_ws('|',p.prosecdef,p.provolatile,p.proacl::text,array_to_string(p.proconfig,','))
          from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname in ('public','auth','storage')
      ) manifest order by category,identity,detail`);
    return createHash("sha256").update(JSON.stringify(catalog.rows)).digest("hex");
  }

  async function seed(client: Client): Promise<void> {
    await client.query(`
      insert into public.tenants(id,kind,status) values ('${T}','ORGANIZATION','ACTIVE');
      insert into public.projects(id,owner_tenant_id,name) values ('${P}','${T}','002-E');
      insert into public.assets(id,owner_tenant_id,project_id,name) values ('${A1}','${T}','${P}','a1'),('${A2}','${T}','${P}','a2');
      insert into public.asset_versions(id,owner_tenant_id,asset_id,version_number,state,parent_version_id)
      values ('${V1}','${T}','${A1}',1,'{}',null),('${V3}','${T}','${A2}',1,'{}',null);
      insert into public.asset_versions(id,owner_tenant_id,asset_id,version_number,state,parent_version_id)
      values ('${V2}','${T}','${A1}',2,'{}','${V1}');
      select public.build002_002e_update_asset('${A1}','${T}',jsonb_build_object('current_version_id','${V1}'));
      select public.build002_002e_update_asset('${A2}','${T}',jsonb_build_object('current_version_id','${V3}'));
      insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,status,raw_request)
      values ('${X1}','${T}','${P}','${A1}','${V1}','DRAFT','x1'),('${X2}','${T}','${P}','${A2}','${V3}','DRAFT','x2');
      insert into public.preservation_value_studies(id,slug,name,protocol_version,target_case_count)
      values ('${STUDY}','002-e','002-E','1',20),('${STUDY2}','002-e-2','002-E-2','1',20);`);
    await client.query(`
      insert into auth.users(id) values ('${USER1}'),('${USER2}');
      insert into public.tenant_memberships(id,tenant_id,principal_id,role,status)
      values ('${MEMBER1}','${T}','${USER1}','OWNER','ACTIVE');
      insert into public.tenants(id,kind,status) values ('${T2}','ORGANIZATION','ACTIVE');
      insert into public.tenant_memberships(id,tenant_id,principal_id,role,status)
      values ('${MEMBER2}','${T2}','${USER2}','OWNER','ACTIVE');
      insert into public.projects(id,owner_tenant_id,name) values ('${P2}','${T2}','T2');
      insert into public.assets(id,owner_tenant_id,project_id,name) values ('${A3}','${T2}','${P2}','T2 asset');
      insert into public.asset_versions(id,owner_tenant_id,asset_id,version_number,state)
      values ('${V4}','${T2}','${A3}',1,'{}');
      select public.build002_002e_update_asset('${A3}','${T2}',jsonb_build_object('current_version_id','${V4}'));
      insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,status,raw_request)
      values ('${X3}','${T2}','${P2}','${A3}','${V4}','DRAFT','T2');`);
    for (const lineage of caseLineages) await seedCaseLineage(client,lineage);
  }

  async function proveWait(leftOp:string,leftClass:string,leftContext:Record<string,string>,rightOp:string,rightClass:string,rightContext:Record<string,string>):Promise<void> {
    const left = new Client({ connectionString: connection(databaseUrl!,dbName) });
    const right = new Client({ connectionString: connection(databaseUrl!,dbName) });
    await left.connect(); await right.connect();
    try {
      await left.query("begin"); await right.query("begin");
      await left.query("select public.build002_002e_route($1,$2,$3::jsonb)",[leftOp,leftClass,JSON.stringify(leftContext)]);
      const rightPid = (await right.query("select pg_backend_pid() pid")).rows[0].pid;
      const pending = right.query("select public.build002_002e_route($1,$2,$3::jsonb)",[rightOp,rightClass,JSON.stringify(rightContext)]);
      let waited = false;
      for (let attempt=0;attempt<40;attempt+=1) {
        const state = await admin.query("select wait_event_type from pg_stat_activity where pid=$1",[rightPid]);
        if (state.rows[0]?.wait_event_type === "Lock") { waited=true; break; }
        await new Promise((resolveDelay)=>setTimeout(resolveDelay,25));
      }
      expect(waited,`${leftOp} -> ${rightOp}`).toBe(true);
      await left.query("commit");
      await pending;
      await right.query("commit");
    } finally {
      await left.query("rollback").catch(()=>undefined); await right.query("rollback").catch(()=>undefined);
      await left.end(); await right.end();
    }
  }

  async function proveParentWait(leftContext:Record<string,string>,rightContext:Record<string,string>):Promise<void> {
    const left = new Client({ connectionString: connection(databaseUrl!,dbName) });
    const right = new Client({ connectionString: connection(databaseUrl!,dbName) });
    await left.connect(); await right.connect();
    const parents=(context:Record<string,string>)=>JSON.stringify([
      {rank:0,relation:"asset_versions",id:context.version_id},
      {rank:0,relation:"asset_versions",id:context.previous_version_id},
    ]);
    try {
      await left.query("begin"); await right.query("begin");
      await left.query("select public.build002_002e_lock_parents($1::jsonb)",[parents(leftContext)]);
      const rightPid=(await right.query("select pg_backend_pid() pid")).rows[0].pid;
      const pending=right.query("select public.build002_002e_lock_parents($1::jsonb)",[parents(rightContext)]);
      expect(await observesLock(rightPid),"W28 parent order").toBe(true);
      await left.query("rollback"); await pending; await right.query("rollback");
    } finally {
      await left.query("rollback").catch(()=>undefined); await right.query("rollback").catch(()=>undefined);
      await left.end(); await right.end();
    }
  }

  async function seedCaseLineage(client:Client,lineage:CaseLineage):Promise<void> {
    const zero="0".repeat(64);
    await client.query(`
      insert into public.assets(id,owner_tenant_id,project_id,name) values ('${lineage.asset}','${T}','${P}','case');
      insert into public.asset_versions(id,owner_tenant_id,asset_id,version_number,state) values ('${lineage.version}','${T}','${lineage.asset}',1,'{}');
      select public.build002_002e_update_asset('${lineage.asset}','${T}',jsonb_build_object('current_version_id','${lineage.version}'));
      insert into public.outcome_transactions(id,owner_tenant_id,project_id,asset_id,base_version_id,status,raw_request)
      values ('${lineage.transaction}','${T}','${P}','${lineage.asset}','${lineage.version}','DRAFT','case');
      insert into public.execution_runs(id,owner_tenant_id,transaction_id,status,executor,started_at,completed_at,latency_ms,cost_usd)
      values ('${lineage.execution}','${T}','${lineage.transaction}','SUCCESS','002-E',now(),now(),0,0);
      insert into public.candidate_assets(id,owner_tenant_id,transaction_id,execution_run_id,storage_key,mime_type,width,height,byte_size,sha256,roi,instruction,provider,model,cost_usd,candidate_type,source_version_id)
      values ('${lineage.raw}','${T}','${lineage.transaction}','${lineage.execution}','raw','image/png',1,1,1,'${zero}','{}','case','002-E','002-E',0,'RAW_PROVIDER','${lineage.version}');
      insert into public.preservation_runs(id,owner_tenant_id,transaction_id,execution_run_id,source_version_id,raw_candidate_id,policy_version,methodology_version,core_roi,coupled_band,status,started_at)
      values ('${lineage.preservation}','${T}','${lineage.transaction}','${lineage.execution}','${lineage.version}','${lineage.raw}','1','1','{}','{}','SUCCESS',now());
      insert into public.candidate_assets(id,owner_tenant_id,transaction_id,execution_run_id,storage_key,mime_type,width,height,byte_size,sha256,roi,instruction,provider,model,cost_usd,candidate_type,source_version_id,raw_candidate_id,preservation_run_id)
      values ('${lineage.preserved}','${T}','${lineage.transaction}','${lineage.execution}','preserved','image/png',1,1,1,'${zero}','{}','case','002-E','002-E',0,'PRESERVED','${lineage.version}','${lineage.raw}','${lineage.preservation}');`);
  }

  function caseInsert(id:string,study:string,plan:string,lineage:CaseLineage):string {
    const zero="0".repeat(64);
    return `insert into public.preservation_study_cases(
      id,study_id,plan_case_id,topology,task_type,transaction_id,execution_run_id,preservation_run_id,
      source_version_id,raw_candidate_id,preserved_candidate_id,source_storage_key,source_sha256,source_width,source_height,
      raw_storage_key,raw_sha256,raw_width,raw_height,preserved_storage_key,preserved_sha256,preserved_width,preserved_height,
      instruction,roi,coupled_band,provider,model,raw_metrics,preserved_metrics)
      values ('${id}','${study}','${plan}','LOCAL_INDEPENDENT','OTHER','${lineage.transaction}','${lineage.execution}','${lineage.preservation}',
      '${lineage.version}','${lineage.raw}','${lineage.preserved}','source','${zero}',1,1,'raw','${zero}',1,1,'preserved','${zero}',1,1,
      'case','{}','{}','002-E','002-E','{}','{}')`;
  }

  async function proveSameStudyCase(label:string,study:string,leftPlan:string,leftLineage:CaseLineage,rightLineage:CaseLineage,rightPlan=leftPlan):Promise<void> {
    const left=new Client({connectionString:connection(databaseUrl!,dbName)}); const right=new Client({connectionString:connection(databaseUrl!,dbName)});
    await left.connect(); await right.connect();
    try {
      await left.query("begin"); await right.query("begin");
      await left.query(caseInsert(testId(810),study,leftPlan,leftLineage));
      const pid=(await right.query("select pg_backend_pid() pid")).rows[0].pid;
      const pending=right.query(caseInsert(testId(811),study,rightPlan,rightLineage));
      expect(await observesLock(pid),label).toBe(true);
      await left.query("rollback"); await pending; await right.query("rollback");
    } finally {
      await left.query("rollback").catch(()=>undefined); await right.query("rollback").catch(()=>undefined); await left.end(); await right.end();
    }
  }

  async function proveCrossStudyPrimaryKeyWait(label:string):Promise<void> {
    const left=new Client({connectionString:connection(databaseUrl!,dbName)}); const right=new Client({connectionString:connection(databaseUrl!,dbName)});
    await left.connect(); await right.connect(); const id=testId(820);
    try {
      await left.query("begin"); await right.query("begin");
      await left.query(caseInsert(id,STUDY,"cross-a",caseLineages[0]));
      const pid=(await right.query("select pg_backend_pid() pid")).rows[0].pid;
      const pending=right.query(caseInsert(id,STUDY2,"cross-b",caseLineages[1]));
      expect(await observesLock(pid),label).toBe(true);
      await left.query("rollback"); await pending; await right.query("rollback");
    } finally {
      await left.query("rollback").catch(()=>undefined); await right.query("rollback").catch(()=>undefined); await left.end(); await right.end();
    }
  }

  async function proveStudyChain(four:boolean):Promise<void> {
    const sessions=await Promise.all(Array.from({length:four?4:3},async()=>{const client=new Client({connectionString:connection(databaseUrl!,dbName)});await client.connect();await client.query("begin");return client;}));
    const [a,b,c,d]=sessions; const shared=testId(four?841:831);
    try {
      await a.query(caseInsert(shared,STUDY,"chain-a",caseLineages[0]));
      const bPid=(await b.query("select pg_backend_pid() pid")).rows[0].pid;
      const bPending=b.query(caseInsert(shared,STUDY2,"chain-b",caseLineages[1]));
      expect(await observesLock(bPid),four?"P07-B":"P06-B").toBe(true);
      const cPid=(await c.query("select pg_backend_pid() pid")).rows[0].pid;
      const cPending=c.query(caseInsert(testId(four?842:832),STUDY,"chain-c",caseLineages[2]));
      expect(await observesLock(cPid),four?"P07-C":"P06-C").toBe(true);
      let dPending:Promise<unknown>|undefined;
      if(d){
        const dPid=(await d.query("select pg_backend_pid() pid")).rows[0].pid;
        dPending=d.query(caseInsert(testId(843),STUDY2,"chain-d",caseLineages[3]));
        expect(await observesLock(dPid),"P07-D").toBe(true);
      }
      await a.query("rollback"); await bPending; await cPending;
      if(d){ await b.query("rollback"); await dPending; }
    } finally {
      for(const client of sessions){await client.query("rollback").catch(()=>undefined);await client.end();}
    }
  }

  async function observesLock(pid:number):Promise<boolean> {
    for(let attempt=0;attempt<80;attempt+=1){
      const state=await admin.query("select wait_event_type from pg_stat_activity where pid=$1",[pid]);
      if(state.rows[0]?.wait_event_type==="Lock") return true;
      await new Promise((resolveDelay)=>setTimeout(resolveDelay,25));
    }
    return false;
  }

  async function fenceSnapshot():Promise<Array<{key:string;material:string;serialization:string}>>{
    return (await admin.query(`select fence_kind||':'||canonical_scope_identity::text key,
      material_revision::text material,serialization_revision::text serialization
      from public.build002_material_fences order by fence_kind,canonical_scope_identity`)).rows;
  }
});

function testId(value:number):string { return `002e0000-0000-4000-8000-${value.toString().padStart(12,"0")}`; }
