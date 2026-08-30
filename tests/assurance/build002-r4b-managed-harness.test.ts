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

type ManagedRole = "authenticated" | "service_role";
type ManagedFailureStage = "CONNECT" | "BEGIN" | "SET_ROLE" | "SET_CLAIMS" | "ROLLBACK" | "CLOSE";
type ManagedBehavior = {
  failStage?: ManagedFailureStage;
  error?: Error & { code?: string; sqlstate?: string };
  contextMismatch?: boolean;
};

function managedError(code: string, message = code, sqlstate?: string): Error & { code: string; sqlstate?: string } {
  return Object.assign(new Error(message), { code, ...(sqlstate ? { sqlstate } : {}) });
}

function fakeManagedClientClass(
  behavior: Partial<Record<ManagedRole, ManagedBehavior>> = {},
  events: string[] = [],
) {
  return class FakeManagedClient {
    private readonly role: ManagedRole;
    private principalId: string | null = null;

    constructor(options: { application_name: string }) {
      this.role = options.application_name.endsWith("authenticated") ? "authenticated" : "service_role";
      events.push(`${this.role}:create`);
    }

    async connect(): Promise<void> {
      events.push(`${this.role}:connect`);
      if (behavior[this.role]?.failStage === "CONNECT") throw behavior[this.role]!.error;
    }

    async query(sql: string, values: unknown[] = []): Promise<QueryResult> {
      const normalized = sql.toLowerCase();
      if (normalized === "begin") {
        events.push(`${this.role}:begin`);
        if (behavior[this.role]?.failStage === "BEGIN") throw behavior[this.role]!.error;
        return { rows: [] };
      }
      if (normalized.startsWith("set local role")) {
        events.push(`${this.role}:set-role`);
        if (behavior[this.role]?.failStage === "SET_ROLE") throw behavior[this.role]!.error;
        return { rows: [] };
      }
      if (normalized.includes("set_config")) {
        events.push(`${this.role}:set-claims`);
        if (behavior[this.role]?.failStage === "SET_CLAIMS") throw behavior[this.role]!.error;
        if (this.role === "authenticated") this.principalId = String(values[1]);
        return { rows: [] };
      }
      if (normalized.includes("auth.uid()")) {
        events.push(`${this.role}:context`);
        return { rows: [{
          uid: behavior[this.role]?.contextMismatch ? "00000000-0000-4000-8000-000000000000" : this.principalId,
          role: behavior[this.role]?.contextMismatch ? "postgres" : "authenticated",
          backend_pid: 101,
        }] };
      }
      if (normalized.includes("current_user")) {
        events.push(`${this.role}:context`);
        return { rows: [{ role: behavior[this.role]?.contextMismatch ? "postgres" : "service_role", backend_pid: 102 }] };
      }
      if (normalized === "rollback") {
        events.push(`${this.role}:rollback`);
        if (behavior[this.role]?.failStage === "ROLLBACK") throw behavior[this.role]!.error;
        return { rows: [] };
      }
      if (normalized === "commit") return { rows: [] };
      throw new Error(`Unexpected fake query: ${sql}`);
    }

    async end(): Promise<void> {
      events.push(`${this.role}:end`);
      if (behavior[this.role]?.failStage === "CLOSE") throw behavior[this.role]!.error;
    }
  };
}

async function detailedPreflight(
  behavior: Partial<Record<ManagedRole, ManagedBehavior>> = {},
  events: string[] = [],
) {
  const databaseUrl = `postgresql://postgres.${TEMP_REF}:diagnostic-db-password@db.${TEMP_REF}.supabase.co:5432/postgres`;
  const factory = harness.createManagedDbSessionFactory(databaseUrl, fakeManagedClientClass(behavior, events));
  return harness.preflightRoleSwitchesDetailed(factory, "a4100000-0000-4000-8000-000000000001");
}

async function executeWithP0Failure() {
  const diagnostics = await detailedPreflight({
    authenticated: { failStage: "CONNECT", error: managedError("ECONNREFUSED") },
  });
  const checkpoints: Array<{ phase: string; evidence: Record<string, unknown> }> = [];
  let authUsersCreated = 0;
  const clients = {
    service: { auth: { admin: { createUser: async () => { authUsersCreated += 1; throw new Error("P1_MUST_NOT_START"); } } } },
    publishable: {},
    user: () => ({}),
  };
  let caught: unknown;
  try {
    await harness.executeManagedRun(harness.loadHarnessConfig(env()), {
      clients,
      preflightDetailed: async () => diagnostics,
      writeCheckpoint: async (_runId: string, phase: string, evidence: Record<string, unknown>) => {
        checkpoints.push({ phase, evidence: structuredClone(evidence) });
        return { path: "local", sha256: "local" };
      },
    });
  } catch (error) {
    caught = error;
  }
  return { authUsersCreated, caught: caught as { code?: string; details?: Record<string, unknown> }, checkpoints, diagnostics };
}

describe("BUILD002 R4-B P0 detailed diagnostic remediation", () => {
  it("01 freezes all nine managed-session lifecycle stages", () => {
    expect(harness.MANAGED_SESSION_STAGES).toEqual([
      "CLIENT_CREATE", "CONNECT", "BEGIN", "SET_ROLE", "SET_CLAIMS", "CONTEXT_VALIDATE", "READY", "ROLLBACK", "CLOSE",
    ]);
  });

  it("02 preserves authenticated TLS certificate failures", async () => {
    const result = await detailedPreflight({ authenticated: { failStage: "CONNECT", error: managedError("SELF_SIGNED_CERT_IN_CHAIN") } });
    expect(result.authenticated).toMatchObject({ pass: false, stageReached: "CONNECT", diagnosticCode: "AUTH_CONNECT_FAILED", error: { code: "SELF_SIGNED_CERT_IN_CHAIN", errorClass: "TLS_CONFIGURATION_FAILURE" } });
  });

  it("03 preserves authenticated ECONNREFUSED without retry", async () => {
    const events: string[] = [];
    const result = await detailedPreflight({ authenticated: { failStage: "CONNECT", error: managedError("ECONNREFUSED") } }, events);
    expect(result.authenticated).toMatchObject({ stageReached: "CONNECT", error: { errorClass: "NETWORK_CONNECTIVITY_FAILURE" } });
    expect(events.filter((event) => event === "authenticated:connect")).toHaveLength(1);
  });

  it("04 preserves authenticated ETIMEDOUT without retry", async () => {
    const result = await detailedPreflight({ authenticated: { failStage: "CONNECT", error: managedError("ETIMEDOUT") } });
    expect(result.authenticated).toMatchObject({ stageReached: "CONNECT", error: { errorClass: "CONNECTION_TIMEOUT" } });
  });

  it("05 classifies authenticated BEGIN failure and closes the client", async () => {
    const events: string[] = [];
    const result = await detailedPreflight({ authenticated: { failStage: "BEGIN", error: managedError("XX001") } }, events);
    expect(result.authenticated).toMatchObject({ stageReached: "BEGIN", diagnosticCode: "AUTH_BEGIN_FAILED", beginSuccess: false, cleanupSuccess: true });
    expect(events).toContain("authenticated:end");
    expect(events).not.toContain("authenticated:rollback");
  });

  it("06 classifies authenticated SET ROLE 42501 as permission failure", async () => {
    const result = await detailedPreflight({ authenticated: { failStage: "SET_ROLE", error: managedError("42501", "permission denied", "42501") } });
    expect(result.authenticated).toMatchObject({ stageReached: "SET_ROLE", diagnosticCode: "AUTH_SET_ROLE_FAILED", error: { sqlstate: "42501", errorClass: "ROLE_PERMISSION_FAILURE" } });
  });

  it("07 distinguishes authenticated claim setup failure", async () => {
    const result = await detailedPreflight({ authenticated: { failStage: "SET_CLAIMS", error: managedError("XX002") } });
    expect(result.authenticated).toMatchObject({ stageReached: "SET_CLAIMS", diagnosticCode: "AUTH_SET_CLAIMS_FAILED", setRoleSuccess: true, claimsSet: false });
  });

  it("08 preserves authenticated UID context mismatch", async () => {
    const result = await detailedPreflight({ authenticated: { contextMismatch: true } });
    expect(result.authenticated).toMatchObject({ stageReached: "CONTEXT_VALIDATE", diagnosticCode: "AUTH_UID_CONTEXT_FAILED", uidContextMatch: false, error: { errorClass: "CONTEXT_VALIDATION_FAILURE" } });
  });

  it("09 preserves service-role connect failure independently", async () => {
    const result = await detailedPreflight({ service_role: { failStage: "CONNECT", error: managedError("ENOTFOUND") } });
    expect(result.serviceRole).toMatchObject({ stageReached: "CONNECT", diagnosticCode: "SERVICE_CONNECT_FAILED", error: { errorClass: "DNS_FAILURE" } });
    expect(result.authRoleSwitchSupported).toBe(true);
  });

  it("10 classifies service SET ROLE 42501 as permission failure", async () => {
    const result = await detailedPreflight({ service_role: { failStage: "SET_ROLE", error: managedError("42501", "permission denied", "42501") } });
    expect(result.serviceRole).toMatchObject({ stageReached: "SET_ROLE", diagnosticCode: "SERVICE_SET_ROLE_FAILED", error: { sqlstate: "42501", errorClass: "ROLE_PERMISSION_FAILURE" } });
  });

  it("11 distinguishes service claim setup failure", async () => {
    const result = await detailedPreflight({ service_role: { failStage: "SET_CLAIMS", error: managedError("XX003") } });
    expect(result.serviceRole).toMatchObject({ stageReached: "SET_CLAIMS", diagnosticCode: "SERVICE_SET_CLAIMS_FAILED", setRoleSuccess: true, claimsSet: false });
  });

  it("12 preserves service context mismatch", async () => {
    const result = await detailedPreflight({ service_role: { contextMismatch: true } });
    expect(result.serviceRole).toMatchObject({ stageReached: "CONTEXT_VALIDATE", diagnosticCode: "SERVICE_CONTEXT_FAILED", contextValidated: false, error: { errorClass: "CONTEXT_VALIDATION_FAILURE" } });
  });

  it("13 records cleanup failure without replacing the establishment result", async () => {
    const result = await detailedPreflight({ authenticated: { failStage: "ROLLBACK", error: managedError("XX004") } });
    expect(result.authenticated).toMatchObject({ pass: false, stageReached: "ROLLBACK", diagnosticCode: "AUTH_CLEANUP_FAILED", cleanupSuccess: false, error: { errorClass: "CLEANUP_FAILURE" } });
  });

  it("14 completes detailed authenticated and service-role success", async () => {
    const result = await detailedPreflight();
    expect(result).toMatchObject({ authRoleSwitchSupported: true, serviceRoleSwitchSupported: true });
    for (const item of [result.authenticated, result.serviceRole]) {
      expect(item).toMatchObject({ pass: true, connectSuccess: true, beginSuccess: true, setRoleSuccess: true, claimsSet: true, contextValidated: true, cleanupSuccess: true });
    }
  });

  it("15 preserves the compatible boolean preflight API on one implementation path", async () => {
    const factory = harness.createManagedDbSessionFactory(
      `postgresql://postgres.${TEMP_REF}:x@db.${TEMP_REF}.supabase.co:5432/postgres`,
      fakeManagedClientClass(),
    );
    await expect(harness.preflightRoleSwitches(factory)).resolves.toEqual({ authRoleSwitchSupported: true, serviceRoleSwitchSupported: true });
  });

  it("16 closes a client after an early CONNECT failure without ROLLBACK", async () => {
    const events: string[] = [];
    const result = await detailedPreflight({ authenticated: { failStage: "CONNECT", error: managedError("ECONNREFUSED") } }, events);
    expect(result.authenticated.cleanupSuccess).toBe(true);
    expect(events).toContain("authenticated:end");
    expect(events).not.toContain("authenticated:rollback");
  });

  it("17 returns detailed redacted diagnostics from CLI preflight", async () => {
    const diagnostics = await detailedPreflight();
    const result = await harness.runCli(["--preflight"], env(), { preflightDetailed: async () => diagnostics });
    expect(result.output).toMatchObject({ authRoleSwitchSupported: true, serviceRoleSwitchSupported: true, authenticated: { pass: true }, serviceRole: { pass: true } });
  });

  it("18 preserves P0 root diagnostics in FAILED_P0 evidence and blocks P1", async () => {
    const result = await executeWithP0Failure();
    expect(result.caught).toMatchObject({ code: "BUILD002_R4B_REQUIRED_ROLE_SWITCH_UNAVAILABLE", details: { failedPhase: "P0", lastSuccessfulCheckpoint: null } });
    expect(result.checkpoints).toHaveLength(1);
    expect(result.checkpoints[0]).toMatchObject({ phase: "FAILED_P0", evidence: { failedPhase: "P0", lastSuccessfulCheckpoint: null, preflightDiagnostics: { authenticated: { stageReached: "CONNECT", error: { code: "ECONNREFUSED", errorClass: "NETWORK_CONNECTIVITY_FAILURE" } } } } });
    expect(result.authUsersCreated).toBe(0);
  });

  it("19 keeps checkpoint and CLI stderr root diagnostics consistent", async () => {
    const result = await executeWithP0Failure();
    const checkpoint = result.checkpoints[0].evidence as { preflightDiagnostics: { authenticated: { error: { errorClass: string } } } };
    const stderr = harness.cliFailureOutput(result.caught);
    expect(stderr.preflightDiagnosticSummary.authenticated.errorClass).toBe(checkpoint.preflightDiagnostics.authenticated.error.errorClass);
    expect(stderr.preflightDiagnosticSummary.authenticated).toMatchObject({ role: "authenticated", stage: "CONNECT", code: "ECONNREFUSED" });
  });

  it("20 redacts every sentinel secret from detailed diagnostics and stderr", async () => {
    const password = "diagnostic-db-password";
    const databaseUrl = `postgresql://postgres.${TEMP_REF}:${password}@db.${TEMP_REF}.supabase.co:5432/postgres`;
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sentinel_signature";
    const serviceKey = "sb_secret_p0_diagnostic_sentinel";
    const publishableKey = "sb_publishable_p0_diagnostic_sentinel";
    const message = `${databaseUrl} ${jwt} ${serviceKey} ${publishableKey}`;
    const factory = harness.createManagedDbSessionFactory(databaseUrl, fakeManagedClientClass({ authenticated: { failStage: "CONNECT", error: managedError("SELF_SIGNED_CERT_IN_CHAIN", message) } }));
    const diagnostics = await harness.preflightRoleSwitchesDetailed(factory);
    const serialized = JSON.stringify({ diagnostics, stderr: harness.cliFailureOutput(new harness.HarnessError("X", { preflightDiagnosticSummary: harness.preflightDiagnosticSummary(diagnostics) })) });
    for (const secret of [password, databaseUrl, jwt, serviceKey, publishableKey]) expect(serialized).not.toContain(secret);
  });

  it("21 performs no automatic P0 retry", async () => {
    const events: string[] = [];
    await detailedPreflight({
      authenticated: { failStage: "CONNECT", error: managedError("ECONNREFUSED") },
      service_role: { failStage: "CONNECT", error: managedError("ETIMEDOUT") },
    }, events);
    expect(events.filter((event) => event.endsWith(":connect"))).toEqual(["authenticated:connect", "service_role:connect"]);
  });

  it("22 permits P0 success to transition to P1", async () => {
    const diagnostics = await detailedPreflight();
    let authUsersCreated = 0;
    let failedPhase = "";
    const clients = {
      service: { auth: { admin: { createUser: async () => { authUsersCreated += 1; throw new Error("LOCAL_P1_REACHED"); } } } },
      publishable: {},
      user: () => ({}),
    };
    await expect(harness.executeManagedRun(harness.loadHarnessConfig(env()), {
      clients,
      preflightDetailed: async () => diagnostics,
      writeCheckpoint: async (_runId: string, phase: string) => { failedPhase = phase; return { path: "local", sha256: "local" }; },
    })).rejects.toThrow("LOCAL_P1_REACHED");
    expect(authUsersCreated).toBeGreaterThan(0);
    expect(failedPhase).toBe("FAILED_P1");
  });

  it("23 classifies database authentication SQLSTATE without message inference", async () => {
    const result = await detailedPreflight({ authenticated: { failStage: "CONNECT", error: managedError("28P01", "opaque", "28P01") } });
    expect(result.authenticated).toMatchObject({ stageReached: "CONNECT", error: { sqlstate: "28P01", errorClass: "DATABASE_AUTHENTICATION_FAILURE" } });
  });

  it("24 distinguishes service BEGIN failure and closes the client", async () => {
    const events: string[] = [];
    const result = await detailedPreflight({ service_role: { failStage: "BEGIN", error: managedError("XX005") } }, events);
    expect(result.serviceRole).toMatchObject({ stageReached: "BEGIN", diagnosticCode: "SERVICE_BEGIN_FAILED", beginSuccess: false, cleanupSuccess: true });
    expect(events).toContain("service_role:end");
    expect(events).not.toContain("service_role:rollback");
  });

  it("25 distinguishes service cleanup failure", async () => {
    const result = await detailedPreflight({ service_role: { failStage: "CLOSE", error: managedError("XX006") } });
    expect(result.serviceRole).toMatchObject({ pass: false, stageReached: "CLOSE", diagnosticCode: "SERVICE_CLEANUP_FAILED", cleanupSuccess: false, error: { errorClass: "CLEANUP_FAILURE" } });
  });

  it("26 routes direct CLI failures through the sanitized diagnostic serializer", () => {
    expect(source).toContain("canonicalJson(cliFailureOutput(error))");
    const output = harness.cliFailureOutput(new harness.HarnessError("BUILD002_R4B_REQUIRED_ROLE_SWITCH_UNAVAILABLE", {
      failedPhase: "P0",
      lastSuccessfulCheckpoint: null,
      preflightDiagnosticSummary: { authenticated: { role: "authenticated", stage: "SET_ROLE", code: "42501", sqlstate: "42501", errorClass: "ROLE_PERMISSION_FAILURE" } },
    }));
    expect(output).toMatchObject({ code: "BUILD002_R4B_REQUIRED_ROLE_SWITCH_UNAVAILABLE", failedPhase: "P0", preflightDiagnosticSummary: { authenticated: { errorClass: "ROLE_PERMISSION_FAILURE" } } });
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
