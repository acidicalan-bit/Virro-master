// @vitest-environment node

import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.BUILD002_C0_B_INDEPENDENT === "true";
const sourceUrl = process.env.BUILD002_C0_B_INDEPENDENT_URL;
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const C0_MIGRATION = "20260819140000_build_002_c0_requirement_catalog.sql";

function dbUrl(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

describe.runIf(enabled && Boolean(sourceUrl))("independent C0-B R2 structural closure", () => {
  let root: Client;
  let admin: Client;
  let databaseName: string;
  let migrations: string[];

  beforeAll(async () => {
    databaseName = `virro_verify_c0_b_${process.pid}_${Date.now()}`;
    root = new Client({ connectionString: dbUrl(sourceUrl!, "postgres") });
    await root.connect();
    await root.query(`drop database if exists "${databaseName}" with (force)`);
    await root.query(`create database "${databaseName}"`);
    await root.end();
    admin = new Client({ connectionString: dbUrl(sourceUrl!, databaseName) });
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
    migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    for (const migration of migrations) {
      await admin.query(readFileSync(resolve(migrationsDir, migration), "utf8"));
    }
    console.info("INDEPENDENT_C0_B_MIGRATION_CHAIN", JSON.stringify({
      postgres: (await admin.query<{ version: string }>("select version() as version")).rows[0].version,
      count: migrations.length,
      first: migrations[0],
      last: migrations.at(-1),
      c0Occurrences: migrations.filter((name) => name === C0_MIGRATION).length,
    }));
  }, 60_000);

  afterAll(async () => {
    await admin?.end();
    if (sourceUrl && databaseName) {
      root = new Client({ connectionString: dbUrl(sourceUrl, "postgres") });
      await root.connect();
      await root.query(`drop database if exists "${databaseName}" with (force)`);
      await root.end();
    }
  });

  it("proves a privileged version-1 non-null previous hash can persist", async () => {
    const id = randomUUID();
    const version = 1;
    const previousVersionHash = "a".repeat(64);
    const definition = {
      id,
      version,
      previousVersionHash,
      schemaVersion: "outcome-blueprint-v0.1",
      outcomeType: "INDEPENDENT_STRUCTURAL_CONTROL",
    };
    await admin.query(`
      insert into public.outcome_blueprints(
        id, version, hash, previous_version_hash, status, published_at, definition
      ) values ($1, $2, $3, $4, 'PUBLISHED', now(), $5::jsonb)
    `, [id, version, "b".repeat(64), previousVersionHash, JSON.stringify(definition)]);
    const persisted = await admin.query<{ count: number }>(
      "select count(*)::integer as count from public.outcome_blueprints where id = $1 and version = $2",
      [id, version],
    );
    expect(persisted.rows[0].count).toBe(0);
  });
});
