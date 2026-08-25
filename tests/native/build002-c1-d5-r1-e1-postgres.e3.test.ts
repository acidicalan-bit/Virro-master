// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { canonicalJson, canonicalSha256 } from "@/src/domain/outcome/specification/canonical";

const enabled = process.env.BUILD002_NATIVE_PG_C1_D5_R1_E1 === "true";
const databaseUrl = process.env.BUILD002_NATIVE_PG_C1_D5_R1_E1_URL ?? process.env.BUILD002_NATIVE_PG_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
function connection(url: string, database: string): string { const parsed = new URL(url); parsed.pathname = `/${database}`; return parsed.toString(); }

describe.runIf(enabled && Boolean(databaseUrl))("BUILD002-C1-D5-R1-E1 native evidence preflight", () => {
  let admin: Client;
  let isolatedDatabase = "";

  beforeAll(async () => {
    isolatedDatabase = `virro_d5_r1_e1_${process.pid}_${Date.now()}`;
    const root = new Client({ connectionString: connection(databaseUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${isolatedDatabase}" with (force)`);
    await root.query(`create database "${isolatedDatabase}"`);
    await root.end();
    admin = new Client({ connectionString: connection(databaseUrl!, isolatedDatabase) });
    await admin.connect();
    await admin.query("create extension if not exists pgcrypto; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$; create schema if not exists auth; create table if not exists auth.users(id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; create schema if not exists storage; create table if not exists storage.buckets(id text primary key, name text not null unique, public boolean not null default false);");
    const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    expect(migrations).toHaveLength(39);
    expect(migrations.at(-1)).toBe("20260825090000_build_002_c1_d5_r1_mutation_lease_freshness_semantic_binding.sql");
    for (const name of migrations) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
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

  it("measures the canonical RPC and table ACL without direct writes", async () => {
    const acl = await admin.query("select has_function_privilege('service_role','public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)','EXECUTE') as service_ok, has_function_privilege('anon','public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)','EXECUTE') as anon_ok, has_function_privilege('authenticated','public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)','EXECUTE') as auth_ok, has_table_privilege('service_role','public.build002_mutation_leases','INSERT') as service_insert, has_table_privilege('anon','public.build002_mutation_leases','INSERT') as anon_insert");
    expect(acl.rows[0]).toEqual({ service_ok: true, anon_ok: false, auth_ok: false, service_insert: false, anon_insert: false });
  });

  it("proves the cross-runtime canonical hash fixtures without normalization", async () => {
    const fixtures: unknown[] = ["backslash\\", "line\nfeed", "Unicode á", true, 7, 1.25, { nested: ["x", false, 2] }, ["requested.color", "2026-08-25T09:00:00.000Z"]];
    for (const fixture of fixtures) {
      const result = await admin.query("select public.build002_canonical_json($1::jsonb) as json, public.build002_canonical_sha256($1::jsonb) as hash", [JSON.stringify(fixture)]);
      expect(String(result.rows[0].json)).toBe(canonicalJson(fixture));
      expect(String(result.rows[0].hash)).toBe(canonicalSha256(fixture));
    }
  });
});
