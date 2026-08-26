// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = {
  exec(sql: string): Promise<unknown>;
  query<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close(): Promise<void>;
};

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const USER = "020e0000-0000-4000-8000-000000000001";
const TENANT = "020e0000-0000-4000-8000-000000000002";
const MEMBERSHIP = "020e0000-0000-4000-8000-000000000003";
const PROJECT = "020e0000-0000-4000-8000-000000000004";
const ASSET = "020e0000-0000-4000-8000-000000000005";
const VERSION = "020e0000-0000-4000-8000-000000000006";
const TX = "020e0000-0000-4000-8000-000000000007";

describe("BUILD002 002-E R10 implementation boundary", () => {
  let db: Db;

  beforeAll(async () => {
    db = new PGlite({ extensions: { pgcrypto } }) as unknown as Db;
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create schema storage;
      create table storage.buckets(
        id text primary key, name text not null unique, public boolean not null default false,
        file_size_limit bigint, allowed_mime_types text[]
      );
    `);
    for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort()) {
      await db.exec(readFileSync(resolve(migrationsDir, name), "utf8"));
    }
    await db.exec(`
      insert into auth.users(id) values ('${USER}');
      insert into public.tenants(id,kind,personal_owner_principal_id,status)
      values ('${TENANT}','PERSONAL','${USER}','ACTIVE');
      insert into public.tenant_memberships(id,tenant_id,principal_id,role,status)
      values ('${MEMBERSHIP}','${TENANT}','${USER}','OWNER','ACTIVE');
      insert into public.projects(id,owner_tenant_id,name) values ('${PROJECT}','${TENANT}','002-E');
      set request.jwt.claim.sub='${USER}';
      insert into public.assets(id,owner_tenant_id,project_id,name)
      values ('${ASSET}','${TENANT}','${PROJECT}','002-E asset');
      insert into public.asset_versions(id,owner_tenant_id,asset_id,version_number,state)
      values ('${VERSION}','${TENANT}','${ASSET}',1,'{}'::jsonb);
      select public.build002_002e_update_asset(
        '${ASSET}','${TENANT}',jsonb_build_object('current_version_id','${VERSION}')
      );
      insert into public.outcome_transactions(
        id,owner_tenant_id,project_id,asset_id,base_version_id,status,raw_request
      ) values ('${TX}','${TENANT}','${PROJECT}','${ASSET}','${VERSION}','DRAFT','002-E');
    `);
  }, 30_000);

  afterAll(async () => db?.close());

  it("replays in the portable PostgreSQL runtime with the exact fence catalog shape", async () => {
    const version = await db.query<{ version: string }>("select current_setting('server_version_num') as version");
    expect(version.rows[0].version).toMatch(/^18/);

    const columns = await db.query<{ column_name: string; data_type: string }>(`
      select column_name,data_type from information_schema.columns
       where table_schema='public' and table_name='build002_material_fences'
       order by ordinal_position`);
    expect(columns.rows).toEqual([
      { column_name: "fence_kind", data_type: "text" },
      { column_name: "identity_schema_version", data_type: "integer" },
      { column_name: "canonical_scope_identity", data_type: "jsonb" },
      { column_name: "material_revision", data_type: "bigint" },
      { column_name: "serialization_revision", data_type: "bigint" },
    ]);

    const catalog = await db.query<{ fks: number; secondary_unique: number; user_triggers: number }>(`
      select
        (select count(*)::integer from pg_constraint where conrelid='public.build002_material_fences'::regclass and contype='f') fks,
        (select count(*)::integer from pg_constraint where conrelid='public.build002_material_fences'::regclass and contype='u') secondary_unique,
        (select count(*)::integer from pg_trigger where tgrelid='public.build002_material_fences'::regclass and not tgisinternal) user_triggers`);
    expect(catalog.rows[0]).toEqual({ fks: 0, secondary_unique: 0, user_triggers: 0 });
  });

  it("denies fence DML and exposes no generic fence RPC", async () => {
    const acl = await db.query<{ anon: boolean; authenticated: boolean; service: boolean }>(`
      select has_table_privilege('anon','public.build002_material_fences','INSERT,UPDATE,DELETE') anon,
             has_table_privilege('authenticated','public.build002_material_fences','INSERT,UPDATE,DELETE') authenticated,
             has_table_privilege('service_role','public.build002_material_fences','INSERT,UPDATE,DELETE') service`);
    expect(acl.rows[0]).toEqual({ anon: false, authenticated: false, service: false });
    const generic = await db.query<{ count: number }>(`
      select count(*)::integer count from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname in ('lockfence','acquirearbitraryfence','bootstrapfence')`);
    expect(generic.rows[0].count).toBe(0);
  });

  it("advances serialization but not material revision for a wait-only writer", async () => {
    const before = await outcomeFence();
    await db.exec(`
      insert into public.execution_runs(
        id,owner_tenant_id,transaction_id,status,executor,started_at,completed_at,latency_ms,cost_usd
      ) values ('020e0000-0000-4000-8000-000000000008','${TENANT}','${TX}','SUCCESS','002-E',now(),now(),0,0)`);
    const after = await outcomeFence();
    expect(after.material).toBe(before.material);
    expect(after.serialization).toBe(before.serialization + 1);
  });

  it("requires fixed RPC routing for protected updates and preserves the routed update", async () => {
    await expect(db.exec(`update public.assets set name='unrouted' where id='${ASSET}'`))
      .rejects.toThrow("BUILD002_002E_DIRECT_UPDATE_REQUIRES_FIXED_RPC");
    await db.exec(`select public.build002_002e_update_asset('${ASSET}','${TENANT}',jsonb_build_object('name','routed'))`);
    const row = await db.query<{ name: string }>(`select name from public.assets where id='${ASSET}'`);
    expect(row.rows[0].name).toBe("routed");
  });

  it("locks the exact study parent and fails before child insertion when it is absent", async () => {
    const before = await fenceSnapshot();
    await expect(db.exec(`
      insert into public.preservation_study_cases(study_id,transaction_id,source_version_id)
      values ('020e0000-0000-4000-8000-000000000099','${TX}','${VERSION}')`))
      .rejects.toThrow("BUILD002_002E_PARENT_NOT_FOUND");
    const rows = await db.query<{ count: number }>("select count(*)::integer count from public.preservation_study_cases");
    expect(rows.rows[0].count).toBe(0);
    expect(await fenceSnapshot()).toEqual(before);
  });

  async function outcomeFence(): Promise<{ material: number; serialization: number }> {
    const result = await db.query<{ material: number; serialization: number }>(`
      select material_revision::integer material,serialization_revision::integer serialization
        from public.build002_material_fences
       where fence_kind='OUTCOME_TRANSACTION'
         and canonical_scope_identity=jsonb_build_object('outcome_transaction_id','${TX}'::uuid,'tenant_id','${TENANT}'::uuid)`);
    return result.rows[0];
  }

  async function fenceSnapshot(): Promise<Array<{ key: string; material: string; serialization: string }>> {
    const result = await db.query<{ key: string; material: string; serialization: string }>(`
      select fence_kind || ':' || identity_schema_version::text || ':' || canonical_scope_identity::text key,
             material_revision::text material,serialization_revision::text serialization
        from public.build002_material_fences
       order by fence_kind,identity_schema_version,canonical_scope_identity`);
    return result.rows;
  }
});
