#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const LAUNCHER_SCHEMA_VERSION = "build002-r4b-audited-launcher-v1";
export const CANONICAL_HARNESS_RELATIVE_PATH = "scripts/build002-r4b-managed-remote-assurance.mjs";
export const CANONICAL_HARNESS_GIT_BLOB = "487138d48f7bdb1a2bf916d934101404c9d97e45";
export const CANONICAL_FIXTURE_GRAPH_SHA256 = "969ad9473adff82f3d90d259d8c3faebe3c6b2d175f7e6d9f8e29e8b04c1073f";
export const MAX_BEHAVIORAL_CHILD_ATTEMPTS = 1;

export const REQUIRED_R4_B_ENV_KEYS = Object.freeze([
  "R4_B_TEMP_PROJECT_REF",
  "R4_B_MAIN_PROJECT_REF",
  "R4_B_SUPABASE_URL",
  "R4_B_PUBLISHABLE_KEY",
  "R4_B_SERVICE_ROLE_KEY",
  "R4_B_DATABASE_URL",
  "R4_B_RUN_ID",
  "R4_B_MAX_RUNTIME_MINUTES",
]);

export const AUDITED_CHILD_ENV_ALLOWLIST = Object.freeze([
  ...REQUIRED_R4_B_ENV_KEYS,
  "PGSSLROOTCERT",
  "SystemRoot",
  "WINDIR",
  "TEMP",
  "TMP",
  "TMPDIR",
]);

export const FORBIDDEN_NODE_ENV_KEYS = Object.freeze([
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_REPL_EXTERNAL_MODULE",
  "NODE_V8_COVERAGE",
  "NODE_TLS_REJECT_UNAUTHORIZED",
]);

const SECRET_ENV_KEYS = new Set([
  "R4_B_PUBLISHABLE_KEY",
  "R4_B_SERVICE_ROLE_KEY",
  "R4_B_DATABASE_URL",
]);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const HARNESS_PATH = resolve(REPOSITORY_ROOT, CANONICAL_HARNESS_RELATIVE_PATH);
const CHECKPOINT_ROOT = resolve(tmpdir(), "build002-r4b");
const LAUNCHER_EVIDENCE_ROOT = resolve(tmpdir(), "build002-r4b-launcher");

export class LauncherError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "LauncherError";
    this.code = code;
    this.details = details;
  }
}

function invariant(condition, code, details = {}) {
  if (!condition) throw new LauncherError(code, details);
}

export function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    invariant(Number.isFinite(value), "BUILD002_R4B_AUDITED_LAUNCHER_NONFINITE_NUMBER");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  throw new LauncherError("BUILD002_R4B_AUDITED_LAUNCHER_UNSUPPORTED_VALUE", { type: typeof value });
}

export function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canonicalSha256(value) {
  return sha256Bytes(Buffer.from(canonicalJson(value), "utf8"));
}

export function gitBlobSha(bytes) {
  const content = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const header = Buffer.from(`blob ${content.length}\0`, "utf8");
  return createHash("sha1").update(header).update(content).digest("hex");
}

export function validateLauncherArgs(argv) {
  invariant(
    Array.isArray(argv) && argv.length === 1 && argv[0] === "--execute",
    "BUILD002_R4B_AUDITED_LAUNCHER_EXACT_EXECUTE_MODE_REQUIRED",
  );
}

function validateTlsConfiguration(childEnvironment) {
  let databaseUrl;
  let supabaseUrl;
  try {
    databaseUrl = new URL(childEnvironment.R4_B_DATABASE_URL);
    supabaseUrl = new URL(childEnvironment.R4_B_SUPABASE_URL);
  } catch {
    throw new LauncherError("BUILD002_R4B_AUDITED_LAUNCHER_URL_INVALID");
  }
  invariant(supabaseUrl.protocol === "https:", "BUILD002_R4B_AUDITED_LAUNCHER_HTTPS_REQUIRED");
  invariant(
    databaseUrl.protocol === "postgres:" || databaseUrl.protocol === "postgresql:",
    "BUILD002_R4B_AUDITED_LAUNCHER_DATABASE_PROTOCOL_INVALID",
  );
  invariant(databaseUrl.searchParams.get("sslmode") === "verify-full", "BUILD002_R4B_AUDITED_LAUNCHER_VERIFY_FULL_REQUIRED");
  const urlRoot = databaseUrl.searchParams.get("sslrootcert");
  invariant(Boolean(urlRoot), "BUILD002_R4B_AUDITED_LAUNCHER_SSL_ROOT_REQUIRED");
  invariant(isAbsolute(urlRoot) && isAbsolute(childEnvironment.PGSSLROOTCERT), "BUILD002_R4B_AUDITED_LAUNCHER_SSL_ROOT_ABSOLUTE_REQUIRED");
  invariant(
    resolve(urlRoot) === resolve(childEnvironment.PGSSLROOTCERT),
    "BUILD002_R4B_AUDITED_LAUNCHER_SSL_ROOT_MISMATCH",
  );
}

export function buildAuditedChildEnvironment(parentEnvironment) {
  const childEnvironment = Object.create(null);
  for (const key of AUDITED_CHILD_ENV_ALLOWLIST) {
    if (parentEnvironment[key] !== undefined) childEnvironment[key] = String(parentEnvironment[key]);
  }
  for (const key of REQUIRED_R4_B_ENV_KEYS) {
    invariant(String(childEnvironment[key] ?? "").trim(), "BUILD002_R4B_AUDITED_LAUNCHER_REQUIRED_ENV_MISSING", { key });
  }
  invariant(
    String(childEnvironment.PGSSLROOTCERT ?? "").trim(),
    "BUILD002_R4B_AUDITED_LAUNCHER_REQUIRED_ENV_MISSING",
    { key: "PGSSLROOTCERT" },
  );
  invariant(
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(childEnvironment.R4_B_RUN_ID)
      && ![".", ".."].includes(childEnvironment.R4_B_RUN_ID),
    "BUILD002_R4B_AUDITED_LAUNCHER_RUN_ID_INVALID",
  );
  invariant(/^[a-z0-9]{20}$/.test(childEnvironment.R4_B_TEMP_PROJECT_REF), "BUILD002_R4B_AUDITED_LAUNCHER_TARGET_REF_INVALID");
  for (const key of FORBIDDEN_NODE_ENV_KEYS) {
    invariant(!Object.hasOwn(childEnvironment, key), "BUILD002_R4B_AUDITED_LAUNCHER_FORBIDDEN_NODE_ENV", { key });
  }
  validateTlsConfiguration(childEnvironment);
  const environmentManifest = AUDITED_CHILD_ENV_ALLOWLIST.map((key) => ({
    key,
    present: Object.hasOwn(childEnvironment, key),
    secret: SECRET_ENV_KEYS.has(key),
  }));
  return { childEnvironment, environmentManifest };
}

export async function verifyHarnessBinding(harnessPath = HARNESS_PATH) {
  const bytes = await readFile(harnessPath);
  const blobSha = gitBlobSha(bytes);
  invariant(blobSha === CANONICAL_HARNESS_GIT_BLOB, "BUILD002_R4B_AUDITED_LAUNCHER_HARNESS_BLOB_MISMATCH", {
    expected: CANONICAL_HARNESS_GIT_BLOB,
    actual: blobSha,
  });
  return { bytes, blobSha, fileSha256: sha256Bytes(bytes) };
}

export async function runtimeBinding(launcherPath = SCRIPT_PATH, executablePath = process.execPath) {
  const [launcherBytes, executableBytes] = await Promise.all([
    readFile(launcherPath),
    readFile(executablePath),
  ]);
  return {
    launcherFileSha256: sha256Bytes(launcherBytes),
    nodeExecutableSha256: sha256Bytes(executableBytes),
  };
}

export async function runChildProcess({ executable, argv, cwd, env, spawnImpl = spawn }) {
  const stdoutChunks = [];
  const stderrChunks = [];
  let stdoutChunkCount = 0;
  let stderrChunkCount = 0;
  const startedAt = new Date().toISOString();
  let child;
  try {
    child = spawnImpl(executable, argv, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return {
      pid: null,
      startedAt,
      closedAt: new Date().toISOString(),
      exitCode: null,
      signal: null,
      processErrorCode: error?.code ?? "SPAWN_THROWN",
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
      stdoutChunkCount,
      stderrChunkCount,
      behavioralChildAttemptCount: 1,
    };
  }
  child.stdout.on("data", (chunk) => {
    stdoutChunkCount += 1;
    stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  child.stderr.on("data", (chunk) => {
    stderrChunkCount += 1;
    stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  const completion = await new Promise((resolveCompletion) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolveCompletion(result);
    };
    child.once("error", (error) => finish({ exitCode: null, signal: null, processErrorCode: error?.code ?? "SPAWN_ERROR" }));
    child.once("close", (exitCode, signal) => finish({ exitCode, signal: signal ?? null, processErrorCode: null }));
  });
  return {
    pid: child.pid ?? null,
    startedAt,
    closedAt: new Date().toISOString(),
    ...completion,
    stdout: Buffer.concat(stdoutChunks),
    stderr: Buffer.concat(stderrChunks),
    stdoutChunkCount,
    stderrChunkCount,
    behavioralChildAttemptCount: 1,
  };
}

function parseExactCanonicalOutput(stdout) {
  invariant(stdout.length > 0, "BUILD002_R4B_AUDITED_LAUNCHER_SUCCESS_WITH_EMPTY_STDOUT");
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(stdout);
  } catch {
    throw new LauncherError("BUILD002_R4B_AUDITED_LAUNCHER_STDOUT_NOT_UTF8");
  }
  invariant(text.endsWith("\n"), "BUILD002_R4B_AUDITED_LAUNCHER_STDOUT_NEWLINE_REQUIRED");
  const body = text.slice(0, -1);
  invariant(!body.includes("\n") && !body.includes("\r"), "BUILD002_R4B_AUDITED_LAUNCHER_MULTIPLE_STDOUT_RECORDS");
  let output;
  try {
    output = JSON.parse(body);
  } catch {
    throw new LauncherError("BUILD002_R4B_AUDITED_LAUNCHER_STDOUT_JSON_INVALID");
  }
  invariant(canonicalJson(output) === body, "BUILD002_R4B_AUDITED_LAUNCHER_STDOUT_NOT_CANONICAL");
  return output;
}

export function validateSuccessfulChildResult(result, expected) {
  invariant(result.exitCode === 0, "BUILD002_R4B_AUDITED_LAUNCHER_CHILD_FAILED", { exitCode: result.exitCode });
  invariant(result.stdoutChunkCount > 0 && result.stdout.length > 0, "BUILD002_R4B_AUDITED_LAUNCHER_SUCCESS_WITH_EMPTY_STDOUT");
  const output = parseExactCanonicalOutput(result.stdout);
  invariant(output && typeof output === "object" && !Array.isArray(output), "BUILD002_R4B_AUDITED_LAUNCHER_OUTPUT_SHAPE_INVALID");
  invariant(
    Object.keys(output).sort().join(",") === "evidence,failedPhase,sha256,tempProjectReadyToPause",
    "BUILD002_R4B_AUDITED_LAUNCHER_OUTPUT_SHAPE_INVALID",
  );
  invariant(output.failedPhase === null, "BUILD002_R4B_AUDITED_LAUNCHER_FAILED_PHASE_PRESENT");
  invariant(output.tempProjectReadyToPause === true, "BUILD002_R4B_AUDITED_LAUNCHER_TARGET_NOT_READY_TO_PAUSE");
  const evidence = output.evidence;
  invariant(evidence && typeof evidence === "object" && !Array.isArray(evidence), "BUILD002_R4B_AUDITED_LAUNCHER_EVIDENCE_INVALID");
  invariant(evidence.runId === expected.runId, "BUILD002_R4B_AUDITED_LAUNCHER_RUN_ID_MISMATCH");
  invariant(evidence.targetProjectRef === expected.targetProjectRef, "BUILD002_R4B_AUDITED_LAUNCHER_TARGET_REF_MISMATCH");
  invariant(
    evidence.fixtureGraphSha256 === CANONICAL_FIXTURE_GRAPH_SHA256,
    "BUILD002_R4B_AUDITED_LAUNCHER_FIXTURE_GRAPH_MISMATCH",
  );
  invariant(evidence.providerCallCount === 0, "BUILD002_R4B_AUDITED_LAUNCHER_PROVIDER_CALL_DETECTED");
  invariant(
    Array.isArray(evidence.phases) && evidence.phases.join(",") === "P0,P1,P2,P3,P4,P5,P6",
    "BUILD002_R4B_AUDITED_LAUNCHER_PHASE_CHAIN_INVALID",
  );
  invariant(canonicalSha256(evidence) === output.sha256, "BUILD002_R4B_AUDITED_LAUNCHER_FINAL_EVIDENCE_HASH_MISMATCH");
  return output;
}

export async function validateP6CrossBinding(output, checkpointRoot = CHECKPOINT_ROOT) {
  const runDirectory = resolve(checkpointRoot, encodeURIComponent(output.evidence.runId));
  const p6Path = resolve(runDirectory, "P6.json");
  let bytes;
  try {
    bytes = await readFile(p6Path);
  } catch {
    throw new LauncherError("BUILD002_R4B_AUDITED_LAUNCHER_P6_MISSING");
  }
  let checkpoint;
  try {
    checkpoint = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new LauncherError("BUILD002_R4B_AUDITED_LAUNCHER_P6_INVALID");
  }
  const evidence = checkpoint?.evidence;
  invariant(evidence?.runId === output.evidence.runId, "BUILD002_R4B_AUDITED_LAUNCHER_P6_RUN_ID_MISMATCH");
  invariant(evidence?.targetProjectRef === output.evidence.targetProjectRef, "BUILD002_R4B_AUDITED_LAUNCHER_P6_TARGET_MISMATCH");
  invariant(
    evidence?.fixtureGraphSha256 === output.evidence.fixtureGraphSha256,
    "BUILD002_R4B_AUDITED_LAUNCHER_P6_FIXTURE_GRAPH_MISMATCH",
  );
  invariant(evidence?.phase === "P6", "BUILD002_R4B_AUDITED_LAUNCHER_P6_PHASE_INVALID");
  invariant(
    Array.isArray(evidence?.phases) && evidence.phases.join(",") === "P0,P1,P2,P3,P4,P5,P6",
    "BUILD002_R4B_AUDITED_LAUNCHER_P6_PHASE_CHAIN_INVALID",
  );
  invariant(checkpoint.sha256 === canonicalSha256(evidence), "BUILD002_R4B_AUDITED_LAUNCHER_P6_HASH_MISMATCH");
  return { present: true, fileSha256: sha256Bytes(bytes), evidenceSha256: checkpoint.sha256 };
}

export async function readFailureCheckpointSummary(runId, checkpointRoot = CHECKPOINT_ROOT) {
  const runDirectory = resolve(checkpointRoot, encodeURIComponent(runId));
  let names;
  try {
    names = await readdir(runDirectory);
  } catch {
    return null;
  }
  const failedName = names.filter((name) => /^FAILED_[A-Z0-9_]+\.json$/.test(name)).sort().at(-1);
  if (!failedName) return null;
  try {
    const checkpoint = JSON.parse(await readFile(resolve(runDirectory, failedName), "utf8"));
    return {
      checkpoint: failedName,
      failedPhase: checkpoint?.evidence?.failedPhase ?? null,
      lastSuccessfulCheckpoint: checkpoint?.evidence?.lastSuccessfulCheckpoint ?? null,
      errorCode: checkpoint?.evidence?.errorCode ?? null,
    };
  } catch {
    return { checkpoint: failedName, failedPhase: null, lastSuccessfulCheckpoint: null, errorCode: "FAILED_CHECKPOINT_UNREADABLE" };
  }
}

async function atomicWrite(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, bytes, { mode: 0o600, flag: "wx" });
  await rename(temporaryPath, path);
  await chmod(path, 0o600);
}

export async function persistLauncherArtifacts({ evidenceRoot = LAUNCHER_EVIDENCE_ROOT, runId, stdout, stderr, manifest }) {
  const directory = resolve(evidenceRoot, encodeURIComponent(runId));
  const stdoutPath = resolve(directory, "child.stdout");
  const stderrPath = resolve(directory, "child.stderr");
  const manifestPath = resolve(directory, "launcher-manifest.json");
  await atomicWrite(stdoutPath, stdout);
  await atomicWrite(stderrPath, stderr);
  const manifestSha256 = canonicalSha256(manifest);
  const envelope = { manifest, sha256: manifestSha256 };
  await atomicWrite(manifestPath, Buffer.from(`${canonicalJson(envelope)}\n`, "utf8"));
  return { directory, stdoutPath, stderrPath, manifestPath, manifestSha256, envelope };
}

function knownSecretValues(childEnvironment) {
  const values = [
    childEnvironment.R4_B_SERVICE_ROLE_KEY,
    childEnvironment.R4_B_PUBLISHABLE_KEY,
    childEnvironment.R4_B_DATABASE_URL,
  ];
  try {
    values.push(decodeURIComponent(new URL(childEnvironment.R4_B_DATABASE_URL).password));
  } catch {
    // URL validation occurs before execution; retain a deterministic empty addition here.
  }
  return [...new Set(values.filter(Boolean))];
}

export function evidenceSecretLeakCount(buffers, secrets) {
  let count = 0;
  for (const buffer of buffers) {
    const text = Buffer.isBuffer(buffer) ? buffer.toString("utf8") : String(buffer);
    for (const secret of secrets) count += text.split(secret).length - 1;
  }
  return count;
}

function errorCode(error) {
  return error?.code ?? "BUILD002_R4B_AUDITED_LAUNCHER_FAILED";
}

export async function runAuditedLauncher(argv, parentEnvironment) {
  validateLauncherArgs(argv);
  const { childEnvironment, environmentManifest } = buildAuditedChildEnvironment(parentEnvironment);
  const harnessBinding = await verifyHarnessBinding(HARNESS_PATH);
  const bindings = await runtimeBinding(SCRIPT_PATH, process.execPath);
  const childArgv = [CANONICAL_HARNESS_RELATIVE_PATH, "--execute"];
  const childResult = await runChildProcess({
    executable: process.execPath,
    argv: childArgv,
    cwd: REPOSITORY_ROOT,
    env: childEnvironment,
  });
  let finalOutput = null;
  let p6 = null;
  let failureCheckpoint = null;
  let validationError = null;
  if (childResult.exitCode === 0) {
    try {
      finalOutput = validateSuccessfulChildResult(childResult, {
        runId: childEnvironment.R4_B_RUN_ID,
        targetProjectRef: childEnvironment.R4_B_TEMP_PROJECT_REF,
      });
      p6 = await validateP6CrossBinding(finalOutput, CHECKPOINT_ROOT);
    } catch (error) {
      validationError = error;
    }
  } else {
    failureCheckpoint = await readFailureCheckpointSummary(childEnvironment.R4_B_RUN_ID, CHECKPOINT_ROOT);
    validationError = new LauncherError("BUILD002_R4B_AUDITED_LAUNCHER_CHILD_FAILED", {
      exitCode: childResult.exitCode,
      processErrorCode: childResult.processErrorCode,
    });
  }
  const baseManifest = {
    schemaVersion: LAUNCHER_SCHEMA_VERSION,
    launcherFileSha256: bindings.launcherFileSha256,
    harnessGitBlobSha: harnessBinding.blobSha,
    harnessFileSha256: harnessBinding.fileSha256,
    nodeExecutableSha256: bindings.nodeExecutableSha256,
    nodeVersion: process.version,
    cwd: REPOSITORY_ROOT,
    childExecutable: process.execPath,
    childArgv,
    shell: false,
    stdio: { stdin: "ignore", stdout: "pipe", stderr: "pipe" },
    allowedEnvironment: environmentManifest,
    forbiddenNodeEnvironment: FORBIDDEN_NODE_ENV_KEYS.map((key) => ({ key, present: false })),
    childEnvironmentExplicitAllowlistOnly: true,
    runId: childEnvironment.R4_B_RUN_ID,
    targetProjectRef: childEnvironment.R4_B_TEMP_PROJECT_REF,
    childPid: childResult.pid,
    startedAt: childResult.startedAt,
    closedAt: childResult.closedAt,
    exitCode: childResult.exitCode,
    signal: childResult.signal,
    processErrorCode: childResult.processErrorCode,
    stdoutChunkCount: childResult.stdoutChunkCount,
    stdoutByteLength: childResult.stdout.length,
    stdoutSha256: sha256Bytes(childResult.stdout),
    stderrChunkCount: childResult.stderrChunkCount,
    stderrByteLength: childResult.stderr.length,
    stderrSha256: sha256Bytes(childResult.stderr),
    p6Present: p6?.present ?? false,
    p6FileSha256: p6?.fileSha256 ?? null,
    p6EvidenceSha256: p6?.evidenceSha256 ?? null,
    finalEvidenceHashMatch: Boolean(finalOutput),
    behavioralChildAttemptCount: childResult.behavioralChildAttemptCount,
    failureCheckpoint,
    launcherErrorCode: validationError ? errorCode(validationError) : null,
  };
  const secrets = knownSecretValues(childEnvironment);
  const leakCount = evidenceSecretLeakCount(
    [childResult.stdout, childResult.stderr, Buffer.from(canonicalJson(baseManifest), "utf8")],
    secrets,
  );
  const manifest = {
    ...baseManifest,
    launcherErrorCode: leakCount !== 0
      ? "BUILD002_R4B_AUDITED_LAUNCHER_SECRET_LEAK_DETECTED"
      : baseManifest.launcherErrorCode,
    launcherEvidenceSecretLeakCount: leakCount,
  };
  const persisted = await persistLauncherArtifacts({
    runId: childEnvironment.R4_B_RUN_ID,
    stdout: childResult.stdout,
    stderr: childResult.stderr,
    manifest,
  });
  if (leakCount !== 0) {
    throw new LauncherError("BUILD002_R4B_AUDITED_LAUNCHER_SECRET_LEAK_DETECTED", { manifestPath: persisted.manifestPath });
  }
  if (validationError) throw validationError;
  return persisted.envelope;
}

const invokedDirectly = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  runAuditedLauncher(process.argv.slice(2), process.env).then((result) => {
    process.stdout.write(`${canonicalJson(result)}\n`);
  }).catch((error) => {
    process.stderr.write(`${canonicalJson({ code: errorCode(error) })}\n`);
    process.exitCode = 1;
  });
}
