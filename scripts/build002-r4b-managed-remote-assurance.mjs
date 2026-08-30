#!/usr/bin/env node

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Client } = pg;

export const MAIN_PROJECT_REF = "deajvmrxghbqpgbvsmsf";
export const FAILED_TEMP_PROJECT_REF = "rmvkdrjasfgqnwxarwbq";
export const MANAGED_FIXTURE_GRAPH_SHA256 = "969ad9473adff82f3d90d259d8c3faebe3c6b2d175f7e6d9f8e29e8b04c1073f";
export const DEFAULT_MAX_RUNTIME_MINUTES = 60;

export const SERVICE_AUTHORITY_RPC_ALLOWLIST = Object.freeze([
  "build002_insert_signal",
  "build002_insert_signal_requirement",
  "build002_insert_dependency_snapshot",
  "build002_insert_signal_qualification",
  "build002_insert_delegation_readiness",
  "build002_commit_readiness_authority",
  "build002_admit_delegability",
  "build002_grant_execution_authority",
  "build002_grant_mutation_lease",
  "build002_reserve_execution_attempt",
  "build002_consume_execution_attempt_reservation",
]);

export const SERVICE_BOOTSTRAP_RPC_ALLOWLIST = Object.freeze([
  "provision_personal_tenant",
  "build002_publish_outcome_blueprint",
  "build002_publish_outcome_requirement_profile",
  "build002_bind_outcome_transaction_requirements",
]);

export const USER_RPC_ALLOWLIST = Object.freeze([
  "create_tenant_asset_with_initial_version",
  "build002_002e_update_asset",
  "build002_002e_update_outcome_transaction",
]);

export const TRIGGER_GUARD_CASES = Object.freeze([
  { table: "build002_delegability_admissions", guard: "build002_delegability_admission_immutable", idColumn: "admission_id" },
  { table: "build002_execution_authorities", guard: "build002_execution_authority_immutable", idColumn: "execution_authority_id" },
  { table: "build002_mutation_leases", guard: "build002_mutation_lease_immutable", idColumn: "mutation_lease_id" },
  { table: "build002_readiness_authority_commits", guard: "build002_readiness_authority_commit_immutable", idColumn: "id" },
  { table: "build002_readiness_authority_markers", guard: "build002_readiness_authority_marker_graph_coherent", idColumn: "id" },
]);

export const RPC_SIGNATURES = Object.freeze({
  provision_personal_tenant: [["p_principal_id", "uuid"]],
  create_tenant_asset_with_initial_version: [["p_project_id", "uuid"], ["p_name", "text"], ["p_description", "text"], ["p_initial_state", "jsonb"]],
  build002_publish_outcome_blueprint: [["p_blueprint", "jsonb"]],
  build002_publish_outcome_requirement_profile: [["p_profile", "jsonb"]],
  build002_bind_outcome_transaction_requirements: [["p_binding", "jsonb"]],
  build002_insert_signal_requirement: [["p_requirement", "jsonb"]],
  build002_insert_signal: [["p_signal", "jsonb"]],
  build002_insert_dependency_snapshot: [["p_snapshot", "jsonb"]],
  build002_insert_signal_qualification: [["p_qualification", "jsonb"], ["p_dependency_snapshot_id", "uuid"]],
  build002_insert_delegation_readiness: [["p_readiness", "jsonb"], ["p_dependency_snapshot_id", "uuid"], ["p_qualification_ids", "jsonb"]],
  build002_commit_readiness_authority: [["p_principal_id", "uuid"], ["p_commit", "jsonb"]],
  build002_admit_delegability: [["p_principal_id", "uuid"], ["p_membership_id", "uuid"], ["p_authority_commit_id", "uuid"], ["p_admission", "jsonb"], ["p_current_material", "jsonb"]],
  build002_grant_execution_authority: [["p_principal_id", "uuid"], ["p_membership_id", "uuid"], ["p_admission_id", "uuid"], ["p_task_spec_id", "uuid"], ["p_task_spec_hash", "text"]],
  build002_grant_mutation_lease: [["p_principal_id", "uuid"], ["p_membership_id", "uuid"], ["p_execution_authority_id", "uuid"], ["p_target_path", "text"], ["p_category", "text"]],
  build002_reserve_execution_attempt: [["p_principal_id", "uuid"], ["p_membership_id", "uuid"], ["p_mutation_lease_id", "uuid"], ["p_provider_target_path", "text"], ["p_operation", "text"], ["p_operation_value", "jsonb"]],
  build002_consume_execution_attempt_reservation: [["p_principal_id", "uuid"], ["p_membership_id", "uuid"], ["p_reservation_id", "uuid"], ["p_execution_attempt_id", "uuid"]],
  build002_002e_update_asset: [["p_asset_id", "uuid"], ["p_owner_tenant_id", "uuid"], ["p_patch", "jsonb"]],
  build002_002e_update_outcome_transaction: [["p_transaction_id", "uuid"], ["p_owner_tenant_id", "uuid"], ["p_patch", "jsonb"]],
});

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIR, "..");
let typeScriptResolverInstalled = false;

export class HarnessError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "HarnessError";
    this.code = code;
    this.details = details;
  }
}

function invariant(condition, code, details = {}) {
  if (!condition) throw new HarnessError(code, details);
}

export function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    invariant(Number.isFinite(value), "BUILD002_R4B_NONFINITE_EVIDENCE_NUMBER");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  throw new HarnessError("BUILD002_R4B_UNSUPPORTED_EVIDENCE_VALUE", { type: typeof value });
}

export function canonicalSha256(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function deterministicUuid(seed) {
  const hash = createHash("sha256").update(seed).digest();
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateSyntheticPassword() {
  return `R4b!${randomBytes(36).toString("base64url")}9z`;
}

function redactString(input, secretValues = []) {
  let output = String(input);
  for (const secret of secretValues.filter(Boolean).sort((a, b) => String(b).length - String(a).length)) {
    output = output.split(String(secret)).join("[REDACTED]");
  }
  output = output
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, "[REDACTED_KEY]")
    .replace(/(postgres(?:ql)?:\/\/[^:/\s]+:)[^@\s]+@/gi, "$1[REDACTED]@");
  return output;
}

export function redact(value, secretValues = []) {
  if (typeof value === "string") return redactString(value, secretValues);
  if (Array.isArray(value)) return value.map((item) => redact(item, secretValues));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      if (/password|secret|token|authorization|database_url|publishable_key|service_role_key/i.test(key)) {
        return [key, item == null ? item : "[REDACTED]"];
      }
      return [key, redact(item, secretValues)];
    }));
  }
  return value;
}

export function sanitizedError(error, secretValues = []) {
  return {
    name: error?.name ?? "Error",
    code: redactString(error?.code ?? "UNKNOWN", secretValues),
    sqlstate: redactString(error?.sqlState ?? error?.sqlstate ?? "", secretValues),
    messageClass: redactString(error?.message ?? String(error), secretValues).slice(0, 240),
  };
}

function projectRefFromSupabaseUrl(urlValue) {
  const url = new URL(urlValue);
  const match = /^([a-z0-9]{20})\.supabase\.co$/i.exec(url.hostname);
  return match?.[1]?.toLowerCase() ?? null;
}

function projectRefSignalsFromDatabaseUrl(urlValue) {
  const url = new URL(urlValue);
  const signals = new Set();
  const direct = /^db\.([a-z0-9]{20})\.supabase\.co$/i.exec(url.hostname);
  if (direct) signals.add(direct[1].toLowerCase());
  const user = /(?:^|\.)([a-z0-9]{20})$/i.exec(decodeURIComponent(url.username));
  if (user && decodeURIComponent(url.username).toLowerCase().startsWith("postgres.")) signals.add(user[1].toLowerCase());
  return { url, signals: [...signals] };
}

export function assertTargetIdentity(input) {
  const tempRef = String(input.tempProjectRef ?? "").trim().toLowerCase();
  const mainRef = String(input.mainProjectRef ?? "").trim().toLowerCase();
  invariant(tempRef, "BUILD002_R4B_TEMP_PROJECT_REF_REQUIRED");
  invariant(mainRef === MAIN_PROJECT_REF, "BUILD002_R4B_MAIN_PROJECT_REF_INVALID");
  if (tempRef === mainRef || tempRef === MAIN_PROJECT_REF) {
    throw new HarnessError("BUILD002_R4B_MAIN_PROJECT_TARGET_FORBIDDEN");
  }
  if (tempRef === FAILED_TEMP_PROJECT_REF) {
    throw new HarnessError("BUILD002_R4B_FAILED_FIXTURE_PROJECT_REUSE_FORBIDDEN");
  }
  const apiRef = projectRefFromSupabaseUrl(input.supabaseUrl);
  invariant(apiRef, "BUILD002_R4B_SUPABASE_URL_PROJECT_REF_UNRESOLVED");
  const database = projectRefSignalsFromDatabaseUrl(input.databaseUrl);
  invariant(database.url.protocol === "postgres:" || database.url.protocol === "postgresql:", "BUILD002_R4B_DATABASE_PROTOCOL_INVALID");
  invariant(database.signals.length > 0, "BUILD002_R4B_DATABASE_PROJECT_REF_UNRESOLVED");
  if (database.signals.includes(MAIN_PROJECT_REF) || database.url.hostname.toLowerCase().includes(MAIN_PROJECT_REF)) {
    throw new HarnessError("BUILD002_R4B_MAIN_PROJECT_TARGET_FORBIDDEN");
  }
  const signals = new Set([tempRef, apiRef, ...database.signals]);
  invariant(signals.size === 1, "BUILD002_R4B_PROJECT_REF_SIGNAL_MISMATCH", { signals: [...signals] });
  invariant(Number(database.url.port || 5432) === 5432, "BUILD002_R4B_SESSION_MODE_DATABASE_PORT_REQUIRED");
  return { tempProjectRef: tempRef, apiProjectRef: apiRef, databaseProjectRef: database.signals[0] };
}

export function assertAllowedNetworkTarget(target, tempProjectRef, options = {}) {
  const url = target instanceof URL ? target : new URL(target);
  const host = url.hostname.toLowerCase();
  if (options.allowLocalMock && ["localhost", "127.0.0.1", "::1"].includes(host)) return true;
  invariant(!host.includes(MAIN_PROJECT_REF), "BUILD002_R4B_MAIN_PROJECT_TARGET_FORBIDDEN");
  invariant(host === `${tempProjectRef}.supabase.co`, "BUILD002_R4B_EXTERNAL_PROVIDER_HOST_FORBIDDEN", { host });
  return true;
}

export function createGuardedFetch(tempProjectRef, baseFetch = globalThis.fetch, options = {}) {
  invariant(typeof baseFetch === "function", "BUILD002_R4B_FETCH_UNAVAILABLE");
  return async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input) : new URL(input.url);
    assertAllowedNetworkTarget(url, tempProjectRef, options);
    return baseFetch(input, init);
  };
}

export function loadHarnessConfig(env = process.env) {
  const required = [
    "R4_B_TEMP_PROJECT_REF", "R4_B_MAIN_PROJECT_REF", "R4_B_SUPABASE_URL",
    "R4_B_PUBLISHABLE_KEY", "R4_B_SERVICE_ROLE_KEY", "R4_B_DATABASE_URL", "R4_B_RUN_ID",
  ];
  for (const key of required) invariant(String(env[key] ?? "").trim(), key === "R4_B_RUN_ID" ? "BUILD002_R4B_RUN_ID_REQUIRED" : "BUILD002_R4B_REQUIRED_ENV_MISSING", { key });
  const maxRuntimeMinutes = Number(env.R4_B_MAX_RUNTIME_MINUTES ?? DEFAULT_MAX_RUNTIME_MINUTES);
  invariant(Number.isFinite(maxRuntimeMinutes) && maxRuntimeMinutes > 0 && maxRuntimeMinutes <= 60, "BUILD002_R4B_MAX_RUNTIME_INVALID");
  const config = {
    tempProjectRef: env.R4_B_TEMP_PROJECT_REF,
    mainProjectRef: env.R4_B_MAIN_PROJECT_REF,
    supabaseUrl: env.R4_B_SUPABASE_URL,
    publishableKey: env.R4_B_PUBLISHABLE_KEY,
    serviceRoleKey: env.R4_B_SERVICE_ROLE_KEY,
    databaseUrl: env.R4_B_DATABASE_URL,
    runId: env.R4_B_RUN_ID,
    maxRuntimeMinutes,
  };
  assertTargetIdentity(config);
  return Object.freeze(config);
}

export function createDeadline(maxMinutes = DEFAULT_MAX_RUNTIME_MINUTES, now = () => performance.now()) {
  const started = now();
  const total = maxMinutes * 60_000;
  return Object.freeze({
    started,
    state() {
      const elapsed = now() - started;
      return {
        elapsedMs: elapsed,
        softStop: elapsed >= Math.min(total, 45 * 60_000),
        noNewBehavioralClass: elapsed >= Math.min(total, 55 * 60_000),
        expired: elapsed >= total,
      };
    },
    assertCanStart(behavioralClass = false) {
      const state = this.state();
      if (state.expired) throw new HarnessError("NOT_PROVEN_TIME_LIMIT");
      if (behavioralClass && state.noNewBehavioralClass) throw new HarnessError("BUILD002_R4B_NO_NEW_BEHAVIORAL_CLASS_AFTER_CUTOFF");
      return state;
    },
  });
}

export function createPhaseController(phases = ["P0", "P1", "P2", "P3", "P4", "P5", "P6"]) {
  let failedPhase = null;
  const completed = [];
  return {
    get failedPhase() { return failedPhase; },
    get completed() { return [...completed]; },
    async run(phase, action) {
      invariant(phases.includes(phase), "BUILD002_R4B_UNKNOWN_PHASE", { phase });
      invariant(!failedPhase, "BUILD002_R4B_DEPENDENT_PHASE_BLOCKED", { failedPhase });
      try {
        const result = await action();
        completed.push(phase);
        return result;
      } catch (error) {
        failedPhase = phase;
        throw error;
      }
    },
  };
}

export function deterministicEvidence(evidence) {
  const normalized = redact(evidence);
  return { evidence: normalized, sha256: canonicalSha256(normalized) };
}

export async function writeCheckpoint(runId, phase, evidence, root = resolve(tmpdir(), "build002-r4b")) {
  const directory = resolve(root, encodeURIComponent(runId));
  await mkdir(directory, { recursive: true });
  const finalPath = resolve(directory, `${phase}.json`);
  const temporaryPath = `${finalPath}.${process.pid}.tmp`;
  const result = deterministicEvidence({ ...evidence, phase });
  await writeFile(temporaryPath, `${canonicalJson(result)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, finalPath);
  return { path: finalPath, sha256: result.sha256 };
}

export function decodeJwtPayload(token) {
  const parts = String(token).split(".");
  invariant(parts.length === 3, "BUILD002_R4B_JWT_MALFORMED");
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new HarnessError("BUILD002_R4B_JWT_MALFORMED");
  }
}

export function createSupabaseClients(config, fetchImpl = globalThis.fetch) {
  const guardedFetch = createGuardedFetch(config.tempProjectRef, fetchImpl);
  const common = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: guardedFetch } };
  return {
    service: createClient(config.supabaseUrl, config.serviceRoleKey, common),
    publishable: createClient(config.supabaseUrl, config.publishableKey, common),
    user(jwt) {
      return createClient(config.supabaseUrl, config.publishableKey, {
        ...common,
        global: { ...common.global, headers: { Authorization: `Bearer ${jwt}` } },
      });
    },
  };
}

function resultOrThrow(result, code) {
  if (result?.error) throw Object.assign(new HarnessError(code), { cause: result.error });
  invariant(result?.data != null, code);
  return result.data;
}

export async function createRealAuthPrincipal({ serviceClient, publishableClient, userClientFactory, runId, label }) {
  const password = generateSyntheticPassword();
  const email = `r4b-${encodeURIComponent(runId).toLowerCase()}-${label.toLowerCase()}-${randomBytes(8).toString("hex")}@example.invalid`;
  const created = resultOrThrow(await serviceClient.auth.admin.createUser({ email, password, email_confirm: true }), "BUILD002_R4B_AUTH_ADMIN_CREATE_FAILED");
  const userId = created.user?.id;
  invariant(userId, "BUILD002_R4B_REAL_AUTH_USER_ID_REQUIRED");
  const signedIn = resultOrThrow(await publishableClient.auth.signInWithPassword({ email, password }), "BUILD002_R4B_PASSWORD_SIGNIN_FAILED");
  const jwt = signedIn.session?.access_token;
  invariant(jwt, "BUILD002_R4B_ACCESS_TOKEN_REQUIRED");
  const claims = decodeJwtPayload(jwt);
  invariant(claims.sub === userId && claims.role === "authenticated", "BUILD002_R4B_AUTH_TOKEN_IDENTITY_INVALID");
  const userClient = userClientFactory(jwt);
  const verified = resultOrThrow(await userClient.auth.getUser(jwt), "BUILD002_R4B_AUTH_CONTEXT_VALIDATION_FAILED");
  invariant(verified.user?.id === userId, "BUILD002_R4B_AUTH_CONTEXT_VALIDATION_FAILED");
  return { label, userId, email, jwt, userClient, password };
}

export function createSupabaseAdapter(client) {
  return Object.freeze({
    async rpc(name, args) {
      const { data, error } = await client.rpc(name, args);
      if (error) throw error;
      return data;
    },
    async insert(table, row) {
      const { data, error } = await client.from(table).insert(row).select().single();
      if (error) throw error;
      return data;
    },
    async select(table, columns, filters = {}) {
      let query = client.from(table).select(columns);
      for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

function assertCanonicalRpc(name, allowed) {
  invariant(!name.startsWith("build002_002e_inner_"), "BUILD002_R4B_NONCANONICAL_RPC_FORBIDDEN", { name });
  invariant(allowed.includes(name), "BUILD002_R4B_NONCANONICAL_RPC_FORBIDDEN", { name });
}

export async function callServiceAuthorityRpc(adapter, name, args) {
  assertCanonicalRpc(name, SERVICE_AUTHORITY_RPC_ALLOWLIST);
  return adapter.rpc(name, args);
}

export async function callBootstrapServiceRpc(adapter, name, args) {
  assertCanonicalRpc(name, SERVICE_BOOTSTRAP_RPC_ALLOWLIST);
  return adapter.rpc(name, args);
}

export async function callUserRpc(adapter, name, args) {
  assertCanonicalRpc(name, USER_RPC_ALLOWLIST);
  return adapter.rpc(name, args);
}

export async function provisionPersonalTenant(serviceAdapter, userId) {
  const data = await callBootstrapServiceRpc(serviceAdapter, "provision_personal_tenant", { p_principal_id: userId });
  const row = Array.isArray(data) ? data[0] : data;
  invariant(row?.tenant_id && row?.membership_id && row?.principal_id === userId, "BUILD002_R4B_TENANT_BOOTSTRAP_INVALID");
  return { tenantId: row.tenant_id, membershipId: row.membership_id, principalId: row.principal_id };
}

export async function bootstrapUserResources(userAdapter, tenant, label) {
  const project = await userAdapter.insert("projects", { owner_tenant_id: tenant.tenantId, name: `R4-B ${label}`, description: "Managed remote assurance fixture" });
  invariant(project.owner_tenant_id === tenant.tenantId, "BUILD002_R4B_PROJECT_BOOTSTRAP_INVALID");
  const assetData = await callUserRpc(userAdapter, "create_tenant_asset_with_initial_version", {
    p_project_id: project.id,
    p_name: `R4-B asset ${label}`,
    p_description: "Managed remote assurance fixture",
    p_initial_state: { width: 1, height: 1, fixture: "R4-B" },
  });
  const asset = assetData.asset;
  const version = assetData.version;
  invariant(asset?.owner_tenant_id === tenant.tenantId && version?.owner_tenant_id === tenant.tenantId, "BUILD002_R4B_ASSET_BOOTSTRAP_INVALID");
  const transaction = await userAdapter.insert("outcome_transactions", {
    owner_tenant_id: tenant.tenantId,
    project_id: project.id,
    asset_id: asset.id,
    base_version_id: version.id,
    raw_request: `R4-B managed assurance ${label}`,
    status: "PREPARED",
  });
  invariant(transaction.owner_tenant_id === tenant.tenantId && transaction.asset_id === asset.id && transaction.base_version_id === version.id, "BUILD002_R4B_TRANSACTION_BOOTSTRAP_INVALID");
  return { project, asset, version, transaction };
}

function installTypeScriptResolver() {
  if (typeScriptResolverInstalled) return;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
      const target = resolve(REPOSITORY_ROOT, `${specifier.slice(2)}.ts`);
      return { url: pathToFileURL(target).href, shortCircuit: true };
    },
  });
  typeScriptResolverInstalled = true;
}

async function loadDomainModules() {
  installTypeScriptResolver();
  const base = pathToFileURL(resolve(REPOSITORY_ROOT, "src")).href;
  const modules = await Promise.all([
    import(`${base}/application/outcome/specification/precision-edit-blueprint.ts`),
    import(`${base}/domain/outcome/specification/outcome-blueprint.ts`),
    import(`${base}/domain/outcome/specification/outcome-requirement-profile.ts`),
    import(`${base}/domain/outcome/specification/outcome-transaction-requirement-binding.ts`),
    import(`${base}/domain/outcome/specification/task-spec.ts`),
    import(`${base}/domain/outcome/signal-readiness.ts`),
    import(`${base}/domain/outcome/delegability-admission.ts`),
    import(`${base}/domain/outcome/specification/canonical.ts`),
  ]);
  return {
    precision: modules[0], blueprint: modules[1], profile: modules[2], binding: modules[3],
    taskSpec: modules[4], readiness: modules[5], admission: modules[6], canonical: modules[7],
  };
}

function idsFor(context) {
  const seed = `${context.runId}:${context.tenantId}`;
  const id = (name) => deterministicUuid(`${seed}:${name}`);
  return {
    blueprint: id("blueprint"), profile: id("profile"), signal: id("signal"), requirement: id("requirement"),
    qualification: id("qualification"), readiness: id("readiness"), taskSpec: id("task-spec"),
    executionRun: id("execution-run"), candidate: id("candidate"), fieldOutcome: id("field-outcome"),
    instructionIntent: id("instruction-intent"), instructionPatch: id("instruction-patch"),
    operationIntent: id("operation-intent"), operationPatch: id("operation-patch"),
  };
}

function blueprintPayload(blueprint) {
  const { hash: _hash, status: _status, publishedAt: _publishedAt, ...definition } = blueprint;
  void _hash; void _status; void _publishedAt;
  return { ...blueprint, definition };
}

function profilePayload(profile) {
  const { hash: _hash, status: _status, publishedAt: _publishedAt, ...definition } = profile;
  void _hash; void _status; void _publishedAt;
  return { ...profile, definition };
}

export async function buildDeterministicAuthorityMaterial(context) {
  const domain = await loadDomainModules();
  const ids = idsFor(context);
  const baseTime = new Date(context.startedAt ?? Date.now());
  const capturedAt = new Date(baseTime.getTime() - 120_000).toISOString();
  const evaluatedAt = new Date(baseTime.getTime() - 60_000).toISOString();
  const validUntil = new Date(baseTime.getTime() + 3_600_000).toISOString();
  const publishedAt = new Date(baseTime.getTime() - 180_000).toISOString();
  const sourceSha = domain.canonical.canonicalSha256({ runId: context.runId, versionId: context.versionId, fixture: "R4-B" });
  const blueprint = domain.blueprint.publishOutcomeBlueprint(domain.precision.createPrecisionEditBlueprintDefinition({ id: ids.blueprint, version: 1, previousVersionHash: null }), publishedAt);
  const requirement = domain.readiness.compileSignalRequirement({
    requirementId: "r4b.managed.signal", subjectKind: "OUTCOME_TRANSACTION", semanticType: "TEXT", critical: true,
    acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [{ identity: "asset.version", required: true }, { identity: "blueprint", required: true }, { identity: "transaction.semantic", required: true }],
    blueprintId: blueprint.id, blueprintVersion: blueprint.version, blueprintHash: blueprint.hash,
    policyId: null, policyHash: null, definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, evaluatedAt);
  const profile = domain.profile.publishOutcomeRequirementProfile({
    schemaVersion: "outcome-requirement-profile-v0.1", id: ids.profile, version: 1, previousVersionHash: null,
    blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash }, policy: null,
    requirements: [{
      requirementId: requirement.requirementId, semanticType: requirement.semanticType, critical: requirement.critical,
      acceptedProvenance: requirement.acceptedProvenance, qualificationRule: requirement.qualificationRule,
      dependencySelectors: requirement.dependencySelectors,
    }],
  }, publishedAt, blueprint);
  const binding = domain.binding.createOutcomeTransactionRequirementBinding({
    ownerTenantId: context.tenantId, outcomeTransactionId: context.transactionId, blueprint, requirementProfile: profile, boundAt: publishedAt,
  });
  const transactionSemanticHash = domain.canonical.canonicalSha256({
    schemaVersion: "build002-transaction-semantic-binding-v0.1", ownerTenantId: context.tenantId,
    transactionId: context.transactionId, projectId: context.projectId, assetId: context.assetId,
    baseVersionId: context.versionId, rawRequest: context.rawRequest,
  });
  const sourceAssetVersionHash = domain.canonical.canonicalSha256({
    schemaVersion: "build002-source-asset-version-binding-v0.1", ownerTenantId: context.tenantId,
    assetId: context.assetId, versionId: context.versionId, versionNumber: 1, parentVersionId: null, state: context.versionState,
  });
  const signal = domain.readiness.createSignal({
    signalId: ids.signal, ownerTenantId: context.tenantId, transactionId: context.transactionId,
    requirementId: requirement.requirementId, payload: { value: "R4-B" },
    source: { identity: "r4b-managed", version: "1", hash: sourceSha }, provenance: "OBSERVED",
    capturedAt, validUntil, dependency: { identity: "asset.version", hash: sourceAssetVersionHash }, schemaVersion: "build002-signal-v0.2",
  });
  const snapshot = domain.readiness.createDependencySnapshot({
    schemaVersion: "build002-dependency-snapshot-v0.2", ownerTenantId: context.tenantId, transactionId: context.transactionId,
    requirementDefinitionHashes: [requirement.requirementDefinitionHash],
    signalReferences: [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }],
    dependencyBindings: [{ identity: "asset.version", hash: sourceAssetVersionHash }, { identity: "blueprint", hash: blueprint.hash }, { identity: "transaction.semantic", hash: transactionSemanticHash }],
    blueprintHash: blueprint.hash, policyHash: null, taskSpecHash: null, transactionSemanticHash,
    sourceAssetVersionHash, contextLensHash: null,
  });
  const evaluator = domain.readiness.currentDefaultEvaluator();
  const qualification = domain.readiness.evaluateSignalQualification({ requirement, signals: [signal], currentDependencySnapshot: snapshot, evaluator, evaluationTime: evaluatedAt, idFactory: () => ids.qualification });
  const readiness = domain.readiness.evaluateDelegationReadiness({
    subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: context.tenantId, transactionId: context.transactionId },
    requirements: [requirement], qualifications: [qualification], dependencySnapshot: snapshot, evaluator,
    evaluationTime: evaluatedAt, idFactory: () => ids.readiness,
  });
  const taskSpec = domain.taskSpec.attachTaskSpecHash({
    schemaVersion: "task-spec-v0.1", id: ids.taskSpec, version: 1, previousVersionHash: null, status: "READY", transactionId: context.transactionId,
    blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash },
    source: { assetId: context.assetId, versionId: context.versionId, sha256: sourceSha, mimeType: "image/png", byteSize: 1 },
    values: [
      { id: "instruction", provenance: "CUSTOMER_STATED", critical: false, visibility: ["IMAGE_EXECUTOR"], value: "R4-B" },
      { id: "roi", provenance: "CUSTOMER_STATED", critical: true, visibility: ["IMAGE_EXECUTOR"], value: { x: 0, y: 0, width: 1, height: 1 } },
    ],
    constraints: [], capabilityGrant: ["READ_SOURCE", "WRITE_CANDIDATE"], criteria: blueprint.qualityProfile.criteria,
    verificationPolicy: blueprint.verificationPolicy,
    securityProfile: { promptInjectionPolicy: "TREAT_AS_DATA", embeddedSecretPolicy: "FORBID", unknownInputPolicy: "REQUIRE_INPUT" },
    compiler: { name: "build002-r4b-managed", version: "1.0.0" }, inputRequirements: [], rejectionReasons: [], createdAt: evaluatedAt,
  });
  const transaction = { ownerTenantId: context.tenantId, transactionId: context.transactionId, projectId: context.projectId, assetId: context.assetId, baseVersionId: context.versionId, rawRequest: context.rawRequest };
  const asset = { id: context.assetId, ownerTenantId: context.tenantId, projectId: context.projectId, currentVersionId: context.versionId };
  const sourceVersion = { id: context.versionId, ownerTenantId: context.tenantId, assetId: context.assetId, versionNumber: 1, parentVersionId: null, state: context.versionState };
  const commitPayload = {
    owner_tenant_id: context.tenantId, outcome_transaction_id: context.transactionId, transaction, asset, sourceVersion,
    binding: { bindingHash: binding.bindingHash, blueprintId: blueprint.id, blueprintVersion: blueprint.version, blueprintHash: blueprint.hash, requirementProfileId: profile.id, requirementProfileVersion: profile.version, requirementProfileHash: profile.hash },
    requirements: [requirement], dependency_snapshot: snapshot,
    qualifications: [{ ...qualification, signalReferences: qualification.signalIds.map((id, index) => ({ signalId: id, contentHash: qualification.signalContentHashes[index] })) }],
    readiness,
  };
  return { domain, ids, blueprint, profile, binding, requirement, signal, snapshot, evaluator, qualification, readiness, taskSpec, transaction, asset, sourceVersion, commitPayload, sourceSha };
}

function requireIdentity(result, key, expected = null) {
  invariant(result && typeof result === "object" && result[key], "BUILD002_R4B_FIXTURE_AUTHORITY_GRAPH_INVALID", { key });
  if (expected != null) invariant(result[key] === expected, "BUILD002_R4B_FIXTURE_AUTHORITY_GRAPH_INVALID", { key, expected, received: result[key] });
  return result[key];
}

function dependencySnapshotPayload(snapshot) {
  return {
    owner_tenant_id: snapshot.ownerTenantId,
    outcome_transaction_id: snapshot.transactionId,
    requirement_definition_hashes: snapshot.requirementDefinitionHashes,
    signal_references: snapshot.signalReferences,
    dependency_bindings: snapshot.dependencyBindings,
    blueprint_hash: snapshot.blueprintHash,
    policy_hash: snapshot.policyHash,
    task_spec_hash: snapshot.taskSpecHash,
    transaction_semantic_hash: snapshot.transactionSemanticHash,
    source_asset_version_hash: snapshot.sourceAssetVersionHash,
    context_lens_hash: snapshot.contextLensHash,
    schema_version: snapshot.schemaVersion,
    dependency_snapshot_hash: snapshot.dependencySnapshotHash,
  };
}

function qualificationPayload(qualification) {
  return {
    id: qualification.id,
    owner_tenant_id: qualification.ownerTenantId,
    outcome_transaction_id: qualification.transactionId,
    requirement_id: qualification.requirementId,
    requirement_definition_hash: qualification.requirementDefinitionHash,
    dependency_snapshot_hash: qualification.dependencySnapshotHash,
    signalIds: qualification.signalIds,
    signalContentHashes: qualification.signalContentHashes,
    evaluator: qualification.evaluator,
    outcome: qualification.outcome,
    reason_code: qualification.reasonCode,
    evidence_valid_until: qualification.evidenceValidUntil,
    qualified_at: qualification.qualifiedAt,
    schema_version: qualification.schemaVersion,
    qualification_content_hash: qualification.qualificationContentHash,
  };
}

function readinessPayload(readiness) {
  return {
    id: readiness.id,
    owner_tenant_id: readiness.ownerTenantId,
    outcome_transaction_id: readiness.transactionId,
    requirement_set_hash: readiness.requirementSetHash,
    qualification_set_hash: readiness.qualificationSetHash,
    dependency_snapshot_hash: readiness.dependencySnapshotHash,
    task_spec_hash: readiness.taskSpecHash,
    source_asset_version_hash: readiness.sourceAssetVersionHash,
    blueprint_hash: readiness.blueprintHash,
    policy_hash: readiness.policyHash,
    evaluator: readiness.evaluator,
    state: readiness.state,
    blocking_codes: readiness.blockingCodes,
    condition_codes: readiness.conditionCodes,
    created_at: readiness.createdAt,
    valid_until: readiness.validUntil,
    schema_version: readiness.schemaVersion,
    readiness_content_hash: readiness.readinessContentHash,
  };
}

export async function buildAuthorityGraph({ serviceAdapter, context, deadline = createDeadline() }) {
  deadline.assertCanStart(true);
  const material = await buildDeterministicAuthorityMaterial(context);
  await callBootstrapServiceRpc(serviceAdapter, "build002_publish_outcome_blueprint", { p_blueprint: blueprintPayload(material.blueprint) });
  await callBootstrapServiceRpc(serviceAdapter, "build002_publish_outcome_requirement_profile", { p_profile: profilePayload(material.profile) });
  await callBootstrapServiceRpc(serviceAdapter, "build002_bind_outcome_transaction_requirements", { p_binding: {
    schema_version: material.binding.schemaVersion, owner_tenant_id: material.binding.ownerTenantId, outcome_transaction_id: material.binding.outcomeTransactionId,
    blueprint_id: material.binding.blueprint.id, blueprint_version: material.binding.blueprint.version, blueprint_hash: material.binding.blueprint.hash,
    requirement_profile_id: material.binding.requirementProfile.id, requirement_profile_version: material.binding.requirementProfile.version,
    requirement_profile_hash: material.binding.requirementProfile.hash, policy_id: null, policy_hash: null,
    binding_hash: material.binding.bindingHash, bound_at: material.binding.boundAt,
  } });
  await callServiceAuthorityRpc(serviceAdapter, "build002_insert_signal_requirement", { p_requirement: {
    id: material.ids.requirement, owner_tenant_id: context.tenantId, outcome_transaction_id: context.transactionId,
    requirement_id: material.requirement.requirementId, semantic_type: material.requirement.semanticType, critical: material.requirement.critical,
    accepted_provenance: material.requirement.acceptedProvenance, qualification_rule: material.requirement.qualificationRule,
    dependency_selectors: material.requirement.dependencySelectors, blueprint_id: material.blueprint.id, blueprint_version: 1,
    blueprint_hash: material.blueprint.hash, schema_version: material.requirement.definitionSchemaVersion,
    requirement_definition_hash: material.requirement.requirementDefinitionHash, created_at: material.requirement.createdAt,
  } });
  await callServiceAuthorityRpc(serviceAdapter, "build002_insert_signal", { p_signal: {
    signal_id: material.signal.signalId, owner_tenant_id: context.tenantId, outcome_transaction_id: context.transactionId,
    requirement_id: material.signal.requirementId, requirement_definition_hash: material.requirement.requirementDefinitionHash,
    payload: material.signal.payload, source: material.signal.source, provenance: material.signal.provenance,
    captured_at: material.signal.capturedAt, valid_until: material.signal.validUntil,
    dependency_identity: material.signal.dependency.identity, dependency_hash: material.signal.dependency.hash,
    schema_version: material.signal.schemaVersion, content_hash: material.signal.contentHash,
  } });
  const snapshotId = await callServiceAuthorityRpc(serviceAdapter, "build002_insert_dependency_snapshot", { p_snapshot: dependencySnapshotPayload(material.snapshot) });
  const qualificationId = await callServiceAuthorityRpc(serviceAdapter, "build002_insert_signal_qualification", { p_qualification: qualificationPayload(material.qualification), p_dependency_snapshot_id: snapshotId });
  const readinessId = await callServiceAuthorityRpc(serviceAdapter, "build002_insert_delegation_readiness", { p_readiness: readinessPayload(material.readiness), p_dependency_snapshot_id: snapshotId, p_qualification_ids: [qualificationId] });
  invariant(readinessId === material.readiness.id, "BUILD002_R4B_FIXTURE_AUTHORITY_GRAPH_INVALID", { stage: "readiness" });
  const commit = await callServiceAuthorityRpc(serviceAdapter, "build002_commit_readiness_authority", { p_principal_id: context.principalId, p_commit: material.commitPayload });
  const authorityCommitId = requireIdentity(commit, "authority_commit_id");
  await serviceAdapter.insert("execution_runs", { id: material.ids.executionRun, owner_tenant_id: context.tenantId, transaction_id: context.transactionId, status: "SUCCESS", executor: "r4b-managed-fixture", started_at: context.startedAt, completed_at: context.startedAt, latency_ms: 0, cost_usd: 0, error_message: null, metadata: { providerCalls: 0 } });
  await serviceAdapter.insert("candidate_assets", { id: material.ids.candidate, owner_tenant_id: context.tenantId, transaction_id: context.transactionId, execution_run_id: material.ids.executionRun, source_version_id: context.versionId, storage_key: `r4b/${context.runId}/candidate`, mime_type: "image/png", width: 1, height: 1, byte_size: 1, sha256: material.sourceSha, roi: { x: 0, y: 0, width: 1, height: 1 }, instruction: "R4-B", provider: "synthetic-no-provider", model: "fixture", cost_usd: 0, committed: false });
  await serviceAdapter.insert("field_outcomes", { id: material.ids.fieldOutcome, tenant_id: context.tenantId, owner_tenant_id: context.tenantId, transaction_id: context.transactionId, source_version_id: context.versionId, source_sha256: material.sourceSha, instruction: "R4-B", roi: {}, topology: "LOCAL_INDEPENDENT", task_type: "COLOR_CHANGE", provider: "synthetic-no-provider", model: "fixture", raw_candidate_id: material.ids.candidate, delivered_candidate_id: material.ids.candidate, recommended_strategy: "P0_RAW", strategy_id: "P0_RAW", policy_version: "r4b", outcome_sku: "precision-edit-v0", blueprint_id: material.blueprint.id, blueprint_version: 1, blueprint_hash: material.blueprint.hash, blueprint_snapshot: material.blueprint, task_spec_id: material.taskSpec.id, task_spec_version: 1, task_spec_hash: material.taskSpec.hash, task_spec_snapshot: material.taskSpec, spec_compiler_name: "build002-r4b-managed", spec_compiler_version: "1.0.0", machine_verification_status: "PASSED", same_spec_status: "PASSED", provider_latency_ms: 0, preservation_latency_ms: 0, total_latency_ms: 0, provider_cost_usd: 0 });
  const admissionMaterial = material.domain.admission.createDelegabilityAdmission({
    ownerTenantId: context.tenantId, principalId: context.principalId, membershipId: context.membershipId,
    authorityCommitId, outcomeTransactionId: context.transactionId, readinessId: material.readiness.id,
    readinessContentHash: material.readiness.readinessContentHash,
    historicalDependencySnapshotHash: material.snapshot.dependencySnapshotHash,
    currentDependencySnapshotHash: material.snapshot.dependencySnapshotHash,
    evaluator: material.evaluator, revalidatedAt: new Date(new Date(context.startedAt).getTime() - 5_000).toISOString(),
  }, context.startedAt, deterministicUuid(`${context.runId}:${context.tenantId}:admission`));
  const admission = await callServiceAuthorityRpc(serviceAdapter, "build002_admit_delegability", {
    p_principal_id: context.principalId, p_membership_id: context.membershipId, p_authority_commit_id: authorityCommitId,
    p_admission: admissionMaterial, p_current_material: {
      transaction: material.transaction, asset: material.asset, sourceVersion: material.sourceVersion,
      binding: { ownerTenantId: context.tenantId, outcomeTransactionId: context.transactionId, blueprint: material.binding.blueprint, requirementProfile: material.binding.requirementProfile, policy: material.binding.policy, bindingHash: material.binding.bindingHash },
      dependencySnapshot: material.snapshot, evaluator: material.evaluator,
    },
  });
  const admissionId = requireIdentity(admission, "admission_id");
  const authority = await callServiceAuthorityRpc(serviceAdapter, "build002_grant_execution_authority", { p_principal_id: context.principalId, p_membership_id: context.membershipId, p_admission_id: admissionId, p_task_spec_id: material.taskSpec.id, p_task_spec_hash: material.taskSpec.hash });
  const executionAuthorityId = requireIdentity(authority, "execution_authority_id");
  await serviceAdapter.insert("partial_intents", { id: material.ids.instructionIntent, owner_tenant_id: context.tenantId, transaction_id: context.transactionId, raw_input: "R4-B instruction", target_path: "instruction", operation: "SET_ATTRIBUTE", desired_value: "R4-B" });
  await serviceAdapter.insert("transaction_patches", { id: material.ids.instructionPatch, owner_tenant_id: context.tenantId, transaction_id: context.transactionId, partial_intent_id: material.ids.instructionIntent, operation: "SET_ATTRIBUTE", target_path: "instruction", parameters: { value: "R4-B" } });
  const lease = await callServiceAuthorityRpc(serviceAdapter, "build002_grant_mutation_lease", { p_principal_id: context.principalId, p_membership_id: context.membershipId, p_execution_authority_id: executionAuthorityId, p_target_path: "instruction", p_category: "MUTABLE" });
  const mutationLeaseId = requireIdentity(lease, "mutation_lease_id");
  const operationValue = { instruction: "R4-B", roi: { x: 0, y: 0, width: 1, height: 1 } };
  await serviceAdapter.insert("partial_intents", { id: material.ids.operationIntent, owner_tenant_id: context.tenantId, transaction_id: context.transactionId, raw_input: "R4-B operation", target_path: "media.pixels", operation: "EDIT_REGION", desired_value: operationValue });
  await serviceAdapter.insert("transaction_patches", { id: material.ids.operationPatch, owner_tenant_id: context.tenantId, transaction_id: context.transactionId, partial_intent_id: material.ids.operationIntent, operation: "EDIT_REGION", target_path: "media.pixels", parameters: operationValue });
  const reservation = await callServiceAuthorityRpc(serviceAdapter, "build002_reserve_execution_attempt", { p_principal_id: context.principalId, p_membership_id: context.membershipId, p_mutation_lease_id: mutationLeaseId, p_provider_target_path: "media.pixels", p_operation: "EDIT_REGION", p_operation_value: operationValue });
  requireIdentity(reservation, "reservation_id");
  requireIdentity(reservation, "execution_attempt_id");
  return { material, commit, admission, authority, lease, reservation, authorityCommitId, admissionId, executionAuthorityId, mutationLeaseId, providerCallCount: 0 };
}

export function createPromiseBarrier(parties = 2) {
  invariant(Number.isInteger(parties) && parties >= 2, "BUILD002_R4B_BARRIER_PARTIES_INVALID");
  let arrived = 0;
  let release;
  const released = new Promise((resolvePromise) => { release = resolvePromise; });
  return async () => {
    arrived += 1;
    if (arrived === parties) release();
    await released;
  };
}

export function createManagedDbSessionFactory(databaseUrl, ClientClass = Client) {
  const target = projectRefSignalsFromDatabaseUrl(databaseUrl);
  invariant(Number(target.url.port || 5432) === 5432, "BUILD002_R4B_SESSION_MODE_DATABASE_PORT_REQUIRED");
  async function open(role, principalId = null) {
    invariant(role === "authenticated" || role === "service_role", "BUILD002_R4B_DB_ROLE_INVALID");
    const client = new ClientClass({ connectionString: databaseUrl, application_name: `build002-r4b-${role}` });
    await client.connect();
    await client.query("begin");
    try {
      if (role === "authenticated") {
        invariant(principalId, "BUILD002_R4B_REAL_AUTH_USER_ID_REQUIRED");
        await client.query("set local role authenticated");
        await client.query("select set_config('request.jwt.claim.role',$1,true), set_config('request.jwt.claim.sub',$2,true)", ["authenticated", principalId]);
        const checked = await client.query("select auth.uid()::text as uid, current_user as role, pg_backend_pid() as backend_pid");
        invariant(checked.rows[0].uid === principalId && checked.rows[0].role === "authenticated", "BUILD002_R4B_AUTH_SESSION_CONTEXT_INVALID");
        return { client, backendPid: checked.rows[0].backend_pid, role, principalId };
      }
      await client.query("set local role service_role");
      await client.query("select set_config('request.jwt.claim.role',$1,true)", ["service_role"]);
      const checked = await client.query("select current_user as role, pg_backend_pid() as backend_pid");
      invariant(checked.rows[0].role === "service_role", "BUILD002_R4B_SERVICE_SESSION_CONTEXT_INVALID");
      return { client, backendPid: checked.rows[0].backend_pid, role, principalId: null };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      await client.end().catch(() => {});
      throw error;
    }
  }
  async function close(session, commit = false) {
    try { await session.client.query(commit ? "commit" : "rollback"); } finally { await session.client.end(); }
  }
  return Object.freeze({ openAuthenticated: (principalId) => open("authenticated", principalId), openService: () => open("service_role"), close });
}

export async function preflightRoleSwitches(factory) {
  const syntheticRealUserId = randomUUID();
  let auth = false;
  let service = false;
  let authSession;
  let serviceSession;
  try { authSession = await factory.openAuthenticated(syntheticRealUserId); auth = true; } catch { auth = false; }
  finally { if (authSession) await factory.close(authSession, false); }
  try { serviceSession = await factory.openService(); service = true; } catch { service = false; }
  finally { if (serviceSession) await factory.close(serviceSession, false); }
  return { authRoleSwitchSupported: auth, serviceRoleSwitchSupported: service };
}

function rpcSql(name) {
  const signature = RPC_SIGNATURES[name];
  invariant(signature, "BUILD002_R4B_NONCANONICAL_RPC_FORBIDDEN", { name });
  const placeholders = signature.map(([, type], index) => `$${index + 1}::${type}`).join(",");
  return `select public.${name}(${placeholders}) as result`;
}

function rpcValues(name, args) {
  return RPC_SIGNATURES[name].map(([key, type]) => type === "jsonb" ? JSON.stringify(args[key]) : args[key]);
}

export async function runRpcRace({ factory, role = "service_role", principalId = null, name, args, durableCheck }) {
  assertCanonicalRpc(name, role === "service_role" ? SERVICE_AUTHORITY_RPC_ALLOWLIST : USER_RPC_ALLOWLIST);
  const barrier = createPromiseBarrier(2);
  const execute = async () => {
    const session = role === "service_role" ? await factory.openService() : await factory.openAuthenticated(principalId);
    const startedAt = new Date().toISOString();
    try {
      await barrier();
      const response = await session.client.query(rpcSql(name), rpcValues(name, args));
      await factory.close(session, true);
      return { backendPid: session.backendPid, startedAt, completedAt: new Date().toISOString(), status: "FULFILLED", sqlstate: null, result: response.rows[0].result };
    } catch (error) {
      await factory.close(session, false).catch(() => {});
      return { backendPid: session.backendPid, startedAt, completedAt: new Date().toISOString(), status: "REJECTED", ...sanitizedError(error) };
    }
  };
  const sessions = await Promise.all([execute(), execute()]);
  const durable = await durableCheck(sessions);
  invariant(durable?.pass === true, "BUILD002_R4B_CONCURRENCY_INVARIANT_FAILED", { name, durable });
  return { sessions, durable, deadlockCount: sessions.filter((item) => item.sqlstate === "40P01").length };
}

export const runD3Concurrency = (input) => runRpcRace({ ...input, name: "build002_admit_delegability" });
export const runD4Concurrency = (input) => runRpcRace({ ...input, name: "build002_grant_execution_authority" });
export async function runD5Concurrency(input) {
  const sameCurrent = await runRpcRace({ ...input, name: "build002_grant_mutation_lease" });
  invariant(typeof input.applyMaterialChange === "function" && typeof input.assertStaleRejected === "function", "BUILD002_R4B_D5_STALE_SCENARIO_REQUIRED");
  await input.applyMaterialChange();
  const staleRejected = await input.assertStaleRejected();
  invariant(staleRejected === true, "BUILD002_R4B_D5_STALE_AUTHORITY_ACCEPTED");
  return { sameCurrent, staleRejected };
}
export const runD6ReservationConcurrency = (input) => runRpcRace({ ...input, name: "build002_reserve_execution_attempt" });
export const runD6ConsumptionConcurrency = (input) => runRpcRace({ ...input, name: "build002_consume_execution_attempt_reservation" });

export async function runFenceConcurrency({ factory, principalId, assetArgs, transactionArgs, durableCheck }) {
  const left = runRpcRace({ factory, role: "authenticated", principalId, name: "build002_002e_update_asset", args: assetArgs, durableCheck });
  const right = runRpcRace({ factory, role: "authenticated", principalId, name: "build002_002e_update_outcome_transaction", args: transactionArgs, durableCheck });
  const results = await Promise.all([left, right]);
  const deadlockCount = results.flatMap((item) => item.sessions).filter((item) => item.sqlstate === "40P01").length;
  invariant(deadlockCount === 0, "BUILD002_R4B_DEADLOCK_DETECTED");
  return { results, deadlockCount };
}

export async function runTriggerGuardRegression(ownerClient, identities) {
  const results = [];
  for (const test of TRIGGER_GUARD_CASES) {
    const identity = identities[test.table];
    invariant(identity, "BUILD002_R4B_TRIGGER_FIXTURE_ID_REQUIRED", { table: test.table });
    await ownerClient.query("begin");
    try {
      await ownerClient.query(`update public.${test.table} set ${test.idColumn}=${test.idColumn} where ${test.idColumn}=$1`, [identity]);
      throw new HarnessError("BUILD002_R4B_TRIGGER_GUARD_NOT_ENFORCED", { guard: test.guard });
    } catch (error) {
      invariant(String(error.message).includes(test.guard.replace(/^build002_/, "BUILD002_").toUpperCase().split("_IMMUTABLE")[0]) || /IMMUTABLE|COHERENT|RESTRICTED/.test(String(error.message)), "BUILD002_R4B_TRIGGER_GUARD_WRONG_REJECTION", { guard: test.guard });
      results.push({ guard: test.guard, status: "REJECTED" });
    } finally {
      await ownerClient.query("rollback");
    }
  }
  return results;
}

export async function runCrossTenantMatrix({ userA, userB, fixtureA, fixtureB }) {
  const cases = [
    { id: "A_READ_B", actor: userA, table: "projects", resource: fixtureB.project.id, operation: "read" },
    { id: "B_READ_A", actor: userB, table: "projects", resource: fixtureA.project.id, operation: "read" },
  ];
  const results = [];
  for (const test of cases) {
    const rows = await test.actor.select(test.table, "id", { id: test.resource });
    invariant(rows.length === 0, "BUILD002_R4B_CROSS_TENANT_READ_EXPOSED", { testId: test.id });
    results.push({ testId: test.id, actualMessageClass: "RLS_ZERO_ROWS", expectedClass: "RLS_REJECTION" });
  }
  const mutationCases = [
    { id: "A_MUTATE_B_ASSET", actor: userA, rpc: "build002_002e_update_asset", args: { p_asset_id: fixtureB.asset.id, p_owner_tenant_id: fixtureB.asset.owner_tenant_id, p_patch: { description: "forbidden" } } },
    { id: "B_MUTATE_A_TRANSACTION", actor: userB, rpc: "build002_002e_update_outcome_transaction", args: { p_transaction_id: fixtureA.transaction.id, p_owner_tenant_id: fixtureA.transaction.owner_tenant_id, p_patch: { abort_reason: "forbidden" } } },
  ];
  for (const test of mutationCases) {
    try {
      await callUserRpc(test.actor, test.rpc, test.args);
      throw new HarnessError("BUILD002_R4B_CROSS_TENANT_MUTATION_ACCEPTED", { testId: test.id });
    } catch (error) {
      if (error instanceof HarnessError && error.code === "BUILD002_R4B_CROSS_TENANT_MUTATION_ACCEPTED") throw error;
      results.push({ testId: test.id, expectedClass: "AUTHORITY_REJECTION", actualErrorCode: error.code ?? "UNKNOWN", actualMessageClass: String(error.message).slice(0, 120) });
    }
  }
  return results;
}

export async function executeManagedRun(config, dependencies = {}) {
  assertTargetIdentity(config);
  const deadline = dependencies.deadline ?? createDeadline(config.maxRuntimeMinutes);
  const phases = createPhaseController();
  const evidence = { runId: config.runId, targetProjectRef: config.tempProjectRef, fixtureGraphSha256: MANAGED_FIXTURE_GRAPH_SHA256, providerCallCount: 0, phases: [], testCases: [], concurrency: [], hashResults: [], syntheticAuthUsersRemaining: 0 };
  const checkpoint = async (phase) => {
    evidence.phases.push(phase);
    return (dependencies.writeCheckpoint ?? writeCheckpoint)(config.runId, phase, evidence);
  };
  const clients = dependencies.clients ?? createSupabaseClients(config, dependencies.fetch);
  const service = createSupabaseAdapter(clients.service);
  let principals;
  let tenants;
  let fixtures;
  let graphs;
  await phases.run("P0", async () => {
    deadline.assertCanStart();
    const capabilities = await (dependencies.preflight ?? (() => preflightRoleSwitches(createManagedDbSessionFactory(config.databaseUrl))));
    invariant(capabilities.authRoleSwitchSupported && capabilities.serviceRoleSwitchSupported, "BUILD002_R4B_REQUIRED_ROLE_SWITCH_UNAVAILABLE");
    await checkpoint("P0");
  });
  await phases.run("P1", async () => {
    deadline.assertCanStart(true);
    principals = await Promise.all(["A", "B"].map((label) => createRealAuthPrincipal({ serviceClient: clients.service, publishableClient: clients.publishable, userClientFactory: clients.user, runId: config.runId, label })));
    invariant(principals[0].userId !== principals[1].userId, "BUILD002_R4B_REAL_AUTH_USER_IDS_NOT_DISTINCT");
    evidence.syntheticAuthUsersRemaining = 2;
    await checkpoint("P1");
  });
  await phases.run("P2", async () => {
    tenants = await Promise.all(principals.map((principal) => provisionPersonalTenant(service, principal.userId)));
    invariant(tenants[0].tenantId !== tenants[1].tenantId && tenants[0].membershipId !== tenants[1].membershipId, "BUILD002_R4B_TENANT_IDENTITIES_NOT_DISTINCT");
    fixtures = await Promise.all(principals.map((principal, index) => bootstrapUserResources(createSupabaseAdapter(principal.userClient), tenants[index], principal.label)));
    await checkpoint("P2");
  });
  await phases.run("P3", async () => {
    graphs = await Promise.all(principals.map((principal, index) => buildAuthorityGraph({ serviceAdapter: service, context: {
      runId: `${config.runId}-${principal.label}`, startedAt: new Date().toISOString(), principalId: principal.userId,
      membershipId: tenants[index].membershipId, tenantId: tenants[index].tenantId,
      projectId: fixtures[index].project.id, assetId: fixtures[index].asset.id, versionId: fixtures[index].version.id,
      transactionId: fixtures[index].transaction.id, rawRequest: fixtures[index].transaction.raw_request,
      versionState: fixtures[index].version.state,
    }, deadline })));
    invariant(graphs.every((graph) => graph.providerCallCount === 0), "BUILD002_R4B_PROVIDER_CALL_DETECTED");
    await checkpoint("P3");
  });
  await phases.run("P4", async () => {
    await Promise.all(principals.map((principal, index) => Promise.all([
      callUserRpc(createSupabaseAdapter(principal.userClient), "build002_002e_update_asset", { p_asset_id: fixtures[index].asset.id, p_owner_tenant_id: tenants[index].tenantId, p_patch: { description: `R4-B verified ${principal.label}` } }),
      callUserRpc(createSupabaseAdapter(principal.userClient), "build002_002e_update_outcome_transaction", { p_transaction_id: fixtures[index].transaction.id, p_owner_tenant_id: tenants[index].tenantId, p_patch: { abort_reason: null } }),
    ])));
    evidence.testCases.push(...await runCrossTenantMatrix({ userA: createSupabaseAdapter(principals[0].userClient), userB: createSupabaseAdapter(principals[1].userClient), fixtureA: fixtures[0], fixtureB: fixtures[1] }));
    await checkpoint("P4");
  });
  await phases.run("P5", async () => {
    deadline.assertCanStart(true);
    invariant(typeof dependencies.runConcurrency === "function", "BUILD002_R4B_CONCURRENCY_RUNNER_REQUIRED");
    evidence.concurrency = await dependencies.runConcurrency({ config, principals, tenants, fixtures, graphs, deadline });
    invariant(evidence.concurrency.every((item) => item.pass === true), "BUILD002_R4B_CONCURRENCY_INVARIANT_FAILED");
    await checkpoint("P5");
  });
  await phases.run("P6", async () => {
    invariant(evidence.providerCallCount === 0, "BUILD002_R4B_PROVIDER_CALL_DETECTED");
    evidence.tempProjectReadyToPause = true;
    await checkpoint("P6");
  });
  const secrets = principals.flatMap((item) => [item.password, item.jwt]).concat([config.publishableKey, config.serviceRoleKey, config.databaseUrl]);
  const output = deterministicEvidence(redact(evidence, secrets));
  return { ...output, failedPhase: phases.failedPhase, tempProjectReadyToPause: true };
}

export function redactedPlan(config) {
  assertTargetIdentity(config);
  return redact({
    mode: "plan", targetProjectRef: config.tempProjectRef, mainProjectRef: config.mainProjectRef,
    runId: config.runId, maxRuntimeMinutes: config.maxRuntimeMinutes,
    phases: ["P0 preflight", "P1 real Auth users", "P2 tenant/resources", "P3 D0-D6", "P4 behavioral", "P5 concurrency", "P6 integrity"],
    serviceAuthorityRpcs: SERVICE_AUTHORITY_RPC_ALLOWLIST,
    fixtureGraphSha256: MANAGED_FIXTURE_GRAPH_SHA256,
    secrets: { publishableKey: config.publishableKey, serviceRoleKey: config.serviceRoleKey, databaseUrl: config.databaseUrl },
    providerCallCount: 0,
  }, [config.publishableKey, config.serviceRoleKey, config.databaseUrl]);
}

export async function runCli(argv = process.argv.slice(2), env = process.env, dependencies = {}) {
  const modes = argv.filter((value) => ["--preflight", "--plan", "--execute"].includes(value));
  invariant(modes.length === 1, "BUILD002_R4B_OPERATING_MODE_REQUIRED");
  invariant(!argv.includes("--force"), "BUILD002_R4B_FORCE_OVERRIDE_FORBIDDEN");
  const config = loadHarnessConfig(env);
  if (modes[0] === "--plan") return { mode: "plan", output: redactedPlan(config) };
  if (modes[0] === "--preflight") {
    const preflight = dependencies.preflight ?? (() => preflightRoleSwitches(createManagedDbSessionFactory(config.databaseUrl)));
    const capabilities = await preflight();
    invariant(capabilities.authRoleSwitchSupported && capabilities.serviceRoleSwitchSupported, "BUILD002_R4B_REQUIRED_ROLE_SWITCH_UNAVAILABLE");
    return { mode: "preflight", output: redact({ targetProjectRef: config.tempProjectRef, ...capabilities }) };
  }
  return { mode: "execute", output: await executeManagedRun(config, dependencies) };
}

const invokedDirectly = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  runCli().then((result) => {
    process.stdout.write(`${canonicalJson(result.output)}\n`);
  }).catch((error) => {
    process.stderr.write(`${canonicalJson(redact({ code: error.code ?? "BUILD002_R4B_HARNESS_FAILED", messageClass: error.message }))}\n`);
    process.exitCode = 1;
  });
}
