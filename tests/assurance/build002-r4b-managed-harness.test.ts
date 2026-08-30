// @vitest-environment node

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// @ts-expect-error The versioned harness intentionally remains directly executable JavaScript.
import * as harness from "../../scripts/build002-r4b-managed-remote-assurance.mjs";

const TEMP_REF = "abcdefghijklmnopqrst";
const MAIN_REF = "deajvmrxghbqpgbvsmsf";
const FAILED_REF = "rmvkdrjasfgqnwxarwbq";
const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const harnessPath = resolve(process.cwd(), "scripts/build002-r4b-managed-remote-assurance.mjs");
const source = readFileSync(harnessPath, "utf8");
const BASE_HARNESS_SHA = "3d2724f007681bf34094f9a1df5a4b2023867ac6";

it("records the published base CLI default-runner defect authority", () => {
  const baseSource = execFileSync("git", ["show", `${BASE_HARNESS_SHA}:scripts/build002-r4b-managed-remote-assurance.mjs`], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  expect(baseSource).toContain('invariant(typeof dependencies.runConcurrency === "function", "BUILD002_R4B_CONCURRENCY_RUNNER_REQUIRED")');
  expect(baseSource).toContain("runCli().then");
});

function env(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    R4_B_TEMP_PROJECT_REF: TEMP_REF,
    R4_B_MAIN_PROJECT_REF: MAIN_REF,
    R4_B_SUPABASE_URL: `https://${TEMP_REF}.supabase.co`,
    R4_B_PUBLISHABLE_KEY: "sb_publishable_unit_test_value",
    R4_B_SERVICE_ROLE_KEY: "sb_secret_unit_test_value",
    R4_B_DATABASE_URL: `postgresql://postgres.${TEMP_REF}:unit-db-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    R4_B_RUN_ID: "unit-run-001",
    ...overrides,
  };
}

function expectCode(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error("EXPECTED_REJECTION_NOT_THROWN");
  } catch (error) {
    expect((error as { code?: string }).code).toBe(code);
  }
}

describe("BUILD002 R4-B managed harness security contract", () => {
  it("01 rejects the canonical main project ref", () => {
    expectCode(() => harness.loadHarnessConfig(env({ R4_B_TEMP_PROJECT_REF: MAIN_REF, R4_B_SUPABASE_URL: `https://${MAIN_REF}.supabase.co`, R4_B_DATABASE_URL: `postgresql://postgres.${MAIN_REF}:x@aws-0.pooler.supabase.com:5432/postgres` })), "BUILD002_R4B_MAIN_PROJECT_TARGET_FORBIDDEN");
  });

  it("02 rejects a main Supabase URL", () => {
    expectCode(() => harness.loadHarnessConfig(env({ R4_B_SUPABASE_URL: `https://${MAIN_REF}.supabase.co` })), "BUILD002_R4B_PROJECT_REF_SIGNAL_MISMATCH");
  });

  it("03 rejects a main database URL", () => {
    expectCode(() => harness.loadHarnessConfig(env({ R4_B_DATABASE_URL: `postgresql://postgres.${MAIN_REF}:x@aws-0.pooler.supabase.com:5432/postgres` })), "BUILD002_R4B_MAIN_PROJECT_TARGET_FORBIDDEN");
  });

  it("04 rejects the quarantined failed temporary project", () => {
    expectCode(() => harness.loadHarnessConfig(env({ R4_B_TEMP_PROJECT_REF: FAILED_REF, R4_B_SUPABASE_URL: `https://${FAILED_REF}.supabase.co`, R4_B_DATABASE_URL: `postgresql://postgres.${FAILED_REF}:x@aws-0.pooler.supabase.com:5432/postgres` })), "BUILD002_R4B_FAILED_FIXTURE_PROJECT_REUSE_FORBIDDEN");
  });

  it("05 rejects mismatched project-ref signals", () => {
    expectCode(() => harness.loadHarnessConfig(env({ R4_B_SUPABASE_URL: "https://zyxwvutsrqponmlkjihg.supabase.co" })), "BUILD002_R4B_PROJECT_REF_SIGNAL_MISMATCH");
  });

  it("06 rejects a missing run ID", () => {
    expectCode(() => harness.loadHarnessConfig(env({ R4_B_RUN_ID: undefined })), "BUILD002_R4B_RUN_ID_REQUIRED");
  });

  it("07 redacts a service secret", () => {
    expect(harness.redact("key=sb_secret_super_private")).toBe("key=[REDACTED_KEY]");
  });

  it("08 redacts a JWT", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature_value";
    expect(harness.redact(`Bearer ${token}`)).not.toContain(token);
  });

  it("09 redacts a database password and full configured URL", () => {
    const url = env().R4_B_DATABASE_URL!;
    const output = harness.redact({ databaseUrl: url, nested: `db=${url}` }, [url]);
    expect(JSON.stringify(output)).not.toContain("unit-db-password");
    expect(JSON.stringify(output)).not.toContain(url);
  });

  it("10 rejects an arbitrary external provider host", () => {
    expectCode(() => harness.assertAllowedNetworkTarget("https://api.openai.com/v1/models", TEMP_REF), "BUILD002_R4B_EXTERNAL_PROVIDER_HOST_FORBIDDEN");
  });

  it("11 requires Auth Admin to return a real user ID", async () => {
    const serviceClient = { auth: { admin: { createUser: async () => ({ data: { user: null }, error: null }) } } };
    const publishableClient = { auth: { signInWithPassword: async () => ({ data: null, error: null }) } };
    await expect(harness.createRealAuthPrincipal({ serviceClient, publishableClient, userClientFactory: () => ({}), runId: "x", label: "A" })).rejects.toMatchObject({ code: "BUILD002_R4B_REAL_AUTH_USER_ID_REQUIRED" });
  });

  it("12 has no remote SQL Auth-user fixture path", () => {
    expect(source.toLowerCase()).not.toMatch(/insert\s+into\s+auth\.users/);
    expect(source).toContain("auth.admin.createUser");
  });

  it("13 has no session-authorization command", () => {
    expect(source.toLowerCase()).not.toMatch(/set\s+session\s+authorization/);
  });

  it("14 never invokes an inner 002-E RPC", () => {
    expect(source).not.toMatch(/\.rpc\(\s*["']build002_002e_inner_/);
    expect(harness.SERVICE_AUTHORITY_RPC_ALLOWLIST.some((name: string) => name.startsWith("build002_002e_inner_"))).toBe(false);
  });

  it("15 freezes the canonical service authority allowlist at eleven", () => {
    expect(harness.SERVICE_AUTHORITY_RPC_ALLOWLIST).toHaveLength(11);
    expect(new Set(harness.SERVICE_AUTHORITY_RPC_ALLOWLIST).size).toBe(11);
  });

  it("16 assigns 002-E user mutations only to the user RPC allowlist", () => {
    expect(harness.USER_RPC_ALLOWLIST).toContain("build002_002e_update_asset");
    expect(harness.USER_RPC_ALLOWLIST).toContain("build002_002e_update_outcome_transaction");
    expect(harness.SERVICE_AUTHORITY_RPC_ALLOWLIST).not.toContain("build002_002e_update_asset");
  });

  it("17 enforces soft, no-new-class, and absolute deadline states", () => {
    let now = 0;
    const deadline = harness.createDeadline(60, () => now);
    now = 45 * 60_000;
    expect(deadline.state().softStop).toBe(true);
    now = 55 * 60_000;
    expect(deadline.state().noNewBehavioralClass).toBe(true);
    expectCode(() => deadline.assertCanStart(true), "BUILD002_R4B_NO_NEW_BEHAVIORAL_CLASS_AFTER_CUTOFF");
    now = 60 * 60_000;
    expectCode(() => deadline.assertCanStart(), "NOT_PROVEN_TIME_LIMIT");
  });

  it("18 stops dependent phases after one phase fails", async () => {
    const phases = harness.createPhaseController();
    await expect(phases.run("P2", async () => { throw new Error("fixture failed"); })).rejects.toThrow("fixture failed");
    await expect(phases.run("P3", async () => true)).rejects.toMatchObject({ code: "BUILD002_R4B_DEPENDENT_PHASE_BLOCKED" });
    expect(phases.failedPhase).toBe("P2");
  });

  it("19 produces evidence containing no supplied secrets", () => {
    const secret = "sb_secret_evidence_value";
    const evidence = harness.deterministicEvidence(harness.redact({ serviceRoleKey: secret, message: `Bearer ${secret}` }, [secret]));
    expect(JSON.stringify(evidence)).not.toContain(secret);
  });

  it("20 hashes normalized evidence deterministically", () => {
    const left = harness.deterministicEvidence({ z: 2, a: { y: 1, x: true } });
    const right = harness.deterministicEvidence({ a: { x: true, y: 1 }, z: 2 });
    expect(left.sha256).toBe(right.sha256);
  });

  it("21 exposes exactly preflight, plan, and execute CLI modes", async () => {
    const config = harness.loadHarnessConfig(env());
    expect(config.tempProjectRef).toBe(TEMP_REF);
    const plan = await harness.runCli(["--plan"], env());
    expect(plan.mode).toBe("plan");
    expect(plan.output.mode).toBe("plan");
  });

  it("22 rejects a force override", async () => {
    await expect(harness.runCli(["--plan", "--force"], env())).rejects.toMatchObject({ code: "BUILD002_R4B_FORCE_OVERRIDE_FORBIDDEN" });
  });

  it("23 allows only the exact temporary Supabase API host", () => {
    expect(harness.assertAllowedNetworkTarget(`https://${TEMP_REF}.supabase.co/auth/v1/user`, TEMP_REF)).toBe(true);
    expectCode(() => harness.assertAllowedNetworkTarget("https://example.com", TEMP_REF), "BUILD002_R4B_EXTERNAL_PROVIDER_HOST_FORBIDDEN");
  });

  it("24 requires every explicit environment input", () => {
    expectCode(() => harness.loadHarnessConfig(env({ R4_B_SERVICE_ROLE_KEY: undefined })), "BUILD002_R4B_REQUIRED_ENV_MISSING");
  });

  it("25 caps runtime at sixty minutes", () => {
    expectCode(() => harness.loadHarnessConfig(env({ R4_B_MAX_RUNTIME_MINUTES: "61" })), "BUILD002_R4B_MAX_RUNTIME_INVALID");
  });

  it("26 requires a session-mode database port", () => {
    expectCode(() => harness.loadHarnessConfig(env({ R4_B_DATABASE_URL: `postgresql://postgres.${TEMP_REF}:x@aws-0.pooler.supabase.com:6543/postgres` })), "BUILD002_R4B_SESSION_MODE_DATABASE_PORT_REQUIRED");
  });

  it("27 rejects an empty temporary project ref", () => {
    expectCode(() => harness.loadHarnessConfig(env({ R4_B_TEMP_PROJECT_REF: "" })), "BUILD002_R4B_REQUIRED_ENV_MISSING");
  });

  it("28 releases a two-party application barrier deterministically", async () => {
    const barrier = harness.createPromiseBarrier(2);
    const order: string[] = [];
    await Promise.all(["A", "B"].map(async (id) => { order.push(`arrive-${id}`); await barrier(); order.push(`leave-${id}`); }));
    expect(order.slice(0, 2).every((item) => item.startsWith("arrive-"))).toBe(true);
    expect(order.slice(2).every((item) => item.startsWith("leave-"))).toBe(true);
  });

  it("29 rejects unknown privileged RPCs", async () => {
    await expect(harness.callServiceAuthorityRpc({ rpc: async () => null }, "build002_unknown_privileged_function", {})).rejects.toMatchObject({ code: "BUILD002_R4B_NONCANONICAL_RPC_FORBIDDEN" });
  });

  it("30 emits a redacted plan with provider count zero", () => {
    const config = harness.loadHarnessConfig(env());
    const plan = harness.redactedPlan(config);
    expect(plan.providerCallCount).toBe(0);
    expect(JSON.stringify(plan)).not.toContain(config.serviceRoleKey);
    expect(JSON.stringify(plan)).not.toContain("unit-db-password");
  });

  it("31 keeps five trigger-guard remote cases versioned", () => {
    expect(harness.TRIGGER_GUARD_CASES.map((item: { guard: string }) => item.guard)).toEqual([
      "build002_delegability_admission_immutable",
      "build002_execution_authority_immutable",
      "build002_mutation_lease_immutable",
      "build002_readiness_authority_commit_immutable",
      "build002_readiness_authority_marker_graph_coherent",
    ]);
  });

  it("32 has no forbidden executable migration or privilege changes", () => {
    const forbidden = [
      /alter\s+table[\s\S]{0,80}disable\s+trigger/i,
      /disable\s+row\s+level\s+security/i,
      /grant[\s\S]{0,80}to\s+(authenticated|service_role)/i,
      /migration\s+repair/i,
    ];
    expect(forbidden.filter((pattern) => pattern.test(source))).toHaveLength(0);
  });

  it("33 selects the published canonical runner for the direct CLI path without runConcurrency injection", () => {
    expect(harness.selectConcurrencyRunner({})).toBe(harness.runManagedRemoteBehavioralAssurance);
    expect(source).not.toContain('invariant(typeof dependencies.runConcurrency === "function", "BUILD002_R4B_CONCURRENCY_RUNNER_REQUIRED")');
  });

  it("34 freezes every mandatory default-runner concurrency class", () => {
    expect(harness.MANDATORY_CONCURRENCY_CLASSES).toEqual([
      "D3_CONCURRENCY", "D4_CONCURRENCY", "D5_CONCURRENCY", "D5_STALE",
      "D6_RESERVATION_CONCURRENCY", "D6_CONSUMPTION_CONCURRENCY",
      "002E_ASSET_CONCURRENCY", "002E_TRANSACTION_CONCURRENCY",
      "FENCE_SERIALIZATION", "DEADLOCK_ORDER",
    ]);
  });

  it("35 keeps all five trigger guards on their canonical persisted tables", () => {
    expect(harness.TRIGGER_GUARD_CASES).toHaveLength(5);
    expect(harness.TRIGGER_GUARD_CASES.every((item: { table: string }) => item.table !== "build002_readiness_authority_markers")).toBe(true);
  });

  it("36 wires checkpointed terminal failure evidence", () => {
    expect(source).toContain("lastSuccessfulCheckpoint");
    expect(source).toContain("FAILED_${phases.failedPhase ?? \"UNKNOWN\"}");
  });

  it("37 keeps provider execution outside the managed assurance harness", () => {
    expect(source).toContain('providerExactlyOnce: "NOT_CLAIMED"');
    expect(source).toContain('postConsumptionPreProviderCrashUnknown: "PRESERVED"');
    expect(source).not.toMatch(/from\s+["'](?:openai|@anthropic-ai)/i);
  });
});

type QueryResult = { rows: Array<Record<string, unknown>> };

class LocalAdapter {
  constructor(private readonly client: Client) {}

  async rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
    const signature = harness.RPC_SIGNATURES[name] as Array<[string, string]> | undefined;
    if (!signature) throw new Error(`Unknown RPC: ${name}`);
    const placeholders = signature.map(([, type], index) => `$${index + 1}::${type}`).join(",");
    const values = signature.map(([key, type]) => type === "jsonb" ? JSON.stringify(args[key]) : args[key]);
    if (name === "provision_personal_tenant") {
      const tabular = await this.client.query(`select * from public.${name}(${placeholders})`, values) as QueryResult;
      return tabular.rows;
    }
    const result = await this.client.query(`select public.${name}(${placeholders}) as result`, values) as QueryResult;
    return result.rows[0].result;
  }

  async insert(table: string, row: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!/^[a-z0-9_]+$/.test(table)) throw new Error("Unsafe table");
    const columns = Object.keys(row);
    if (!columns.every((column) => /^[a-z0-9_]+$/.test(column))) throw new Error("Unsafe column");
    const typeResult = await this.client.query(
      "select column_name, data_type from information_schema.columns where table_schema='public' and table_name=$1",
      [table],
    ) as QueryResult;
    const types = new Map(typeResult.rows.map((column) => [column.column_name, column.data_type]));
    const sql = `insert into public.${table}(${columns.join(",")}) values (${columns.map((_, index) => `$${index + 1}`).join(",")}) returning *`;
    const values = columns.map((column) => {
      const value = row[column];
      return types.get(column) === "jsonb" || types.get(column) === "json" ? JSON.stringify(value) : value;
    });
    const result = await this.client.query(sql, values) as QueryResult;
    return result.rows[0];
  }

  async select(table: string, columns: string, filters: Record<string, unknown> = {}): Promise<Array<Record<string, unknown>>> {
    if (!/^[a-z0-9_]+$/.test(table) || !/^[a-z0-9_, ]+$/.test(columns)) throw new Error("Unsafe select");
    const entries = Object.entries(filters);
    const where = entries.length ? ` where ${entries.map(([column], index) => `${column}=$${index + 1}`).join(" and ")}` : "";
    const result = await this.client.query(`select ${columns} from public.${table}${where}`, entries.map(([, value]) => value)) as QueryResult;
    return result.rows;
  }
}

const localPgUrl = process.env.BUILD002_R4B_LOCAL_PG_URL ?? process.env.BUILD002_NATIVE_PG_URL;

describe.runIf(Boolean(localPgUrl))("BUILD002 R4-B local PostgreSQL 17 managed-fixture rehearsal", () => {
  let root: Client;
  let admin: Client;
  let service: Client;
  let authenticatedA: Client;
  let authenticatedB: Client;
  let databaseName = "";
  let databaseUrl = "";
  let migrationNames: string[] = [];

  const userA = "a4100000-0000-4000-8000-000000000001";
  const userB = "a4100000-0000-4000-8000-000000000002";

  function connection(database: string): string {
    const parsed = new URL(localPgUrl!);
    parsed.pathname = `/${database}`;
    return parsed.toString();
  }

  async function roleClient(role: "service_role" | "authenticated", principalId?: string): Promise<Client> {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query(`set role ${role}`);
    await client.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
    if (principalId) await client.query("select set_config('request.jwt.claim.sub',$1,false)", [principalId]);
    return client;
  }

  beforeAll(async () => {
    databaseName = `virro_r4b_f1_${process.pid}_${Date.now()}`;
    root = new Client({ connectionString: connection("postgres") });
    await root.connect();
    await root.query(`create database "${databaseName}"`);
    databaseUrl = connection(databaseName);
    admin = new Client({ connectionString: databaseUrl });
    await admin.connect();
    await admin.query(`
      create extension if not exists pgcrypto;
      do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
      create schema if not exists auth;
      create table if not exists auth.users(id uuid primary key);
      create or replace function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;
      create schema if not exists storage;
      create table if not exists storage.buckets(
        id text primary key, name text not null unique, public boolean not null default false,
        file_size_limit bigint, allowed_mime_types text[]
      );
    `);
    migrationNames = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    expect(migrationNames).toHaveLength(45);
    for (const name of migrationNames) await admin.query(readFileSync(resolve(migrationsDir, name), "utf8"));
    // LOCAL_ONLY managed-Auth emulation primitive. The production harness has no SQL path to auth.users.
    await admin.query("insert into auth.users(id) values ($1),($2)", [userA, userB]);
    service = await roleClient("service_role");
    authenticatedA = await roleClient("authenticated", userA);
    authenticatedB = await roleClient("authenticated", userB);
  }, 180_000);

  afterAll(async () => {
    await Promise.allSettled([authenticatedA?.end(), authenticatedB?.end(), service?.end(), admin?.end()]);
    if (root && databaseName) await root.query(`drop database if exists "${databaseName}" with (force)`);
    await root?.end();
  }, 60_000);

  it("replays all 45 migrations on PostgreSQL 17", async () => {
    const version = await admin.query("select current_setting('server_version_num') as version");
    expect(version.rows[0].version).toMatch(/^17/);
    expect(migrationNames).toHaveLength(45);
  });

  it("proves authenticated and service-role local contexts", async () => {
    const auth = await authenticatedA.query("select current_user as role, auth.uid()::text as uid");
    expect(auth.rows[0]).toEqual({ role: "authenticated", uid: userA });
    const trusted = await service.query("select current_user as role, current_setting('request.jwt.claim.role',true) as claim");
    expect(trusted.rows[0]).toEqual({ role: "service_role", claim: "service_role" });
  });

  it("rehearses managed tenant/resource bootstrap, D0-D6, 002-E, cross-tenant, and a two-session race", async () => {
    const serviceAdapter = new LocalAdapter(service);
    const userAdapterA = new LocalAdapter(authenticatedA);
    const userAdapterB = new LocalAdapter(authenticatedB);
    const tenantA = await harness.provisionPersonalTenant(serviceAdapter, userA);
    const tenantB = await harness.provisionPersonalTenant(serviceAdapter, userB);
    expect(tenantA.tenantId).not.toBe(tenantB.tenantId);
    const fixtureA = await harness.bootstrapUserResources(userAdapterA, tenantA, "A");
    const fixtureB = await harness.bootstrapUserResources(userAdapterB, tenantB, "B");
    const startedAt = new Date().toISOString();
    const graphA = await harness.buildAuthorityGraph({ serviceAdapter, context: {
      runId: "local-r4b-A", startedAt, principalId: userA, membershipId: tenantA.membershipId,
      tenantId: tenantA.tenantId, projectId: fixtureA.project.id, assetId: fixtureA.asset.id,
      versionId: fixtureA.version.id, transactionId: fixtureA.transaction.id,
      rawRequest: fixtureA.transaction.raw_request, versionState: fixtureA.version.state,
    } });
    const graphB = await harness.buildAuthorityGraph({ serviceAdapter, context: {
      runId: "local-r4b-B", startedAt, principalId: userB, membershipId: tenantB.membershipId,
      tenantId: tenantB.tenantId, projectId: fixtureB.project.id, assetId: fixtureB.asset.id,
      versionId: fixtureB.version.id, transactionId: fixtureB.transaction.id,
      rawRequest: fixtureB.transaction.raw_request, versionState: fixtureB.version.state,
    } });
    expect(graphA.providerCallCount).toBe(0);
    expect(graphA.reservation.reservation_id).toEqual(expect.any(String));
    await harness.callUserRpc(userAdapterA, "build002_002e_update_asset", { p_asset_id: fixtureA.asset.id, p_owner_tenant_id: tenantA.tenantId, p_patch: { description: "local managed rehearsal" } });
    await expect(harness.callUserRpc(userAdapterA, "build002_002e_update_asset", { p_asset_id: fixtureB.asset.id, p_owner_tenant_id: tenantB.tenantId, p_patch: { description: "forbidden" } })).rejects.toThrow(/NOT_AUTHORIZED|PREAUTH|permission/i);

    const runnerEvidence = await harness.runManagedRemoteBehavioralAssurance({
      config: { databaseUrl, runId: "local-r4b-default-runner", tempProjectRef: TEMP_REF },
      principals: [{ userId: userA }, { userId: userB }], tenants: [tenantA, tenantB],
      fixtures: [fixtureA, fixtureB], graphs: [graphA, graphB], deadline: harness.createDeadline(10),
    });
    expect(runnerEvidence.concurrency.map((item: { class: string }) => item.class).sort()).toEqual([...harness.MANDATORY_CONCURRENCY_CLASSES].sort());
    expect(runnerEvidence.concurrency.every((item: { pass: boolean }) => item.pass)).toBe(true);
    expect(runnerEvidence.triggerGuards).toMatchObject({ caseCount: 5, passCount: 5 });
    expect(runnerEvidence.hashResults.every((item: { pass: boolean }) => item.pass)).toBe(true);
    expect(runnerEvidence.providerBoundary.providerCallCount).toBe(0);
  }, 300_000);
});
