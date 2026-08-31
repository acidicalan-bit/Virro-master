// @vitest-environment node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

// @ts-expect-error The audited production launcher intentionally remains directly executable JavaScript.
import * as launcher from "../../scripts/build002-r4b-audited-launcher.mjs";

const TEMP_REF = "abcdefghijklmnopqrst";
const MAIN_REF = "deajvmrxghbqpgbvsmsf";
const RUN_ID = "build002-r4b-launcher-unit";
const createdRoots: string[] = [];

function temporaryRoot(): string {
  const root = mkdtempSync(resolve(tmpdir(), "build002-r4b-launcher-test-"));
  createdRoots.push(root);
  return root;
}

afterEach(() => {
  while (createdRoots.length > 0) rmSync(createdRoots.pop()!, { recursive: true, force: true });
});

function parentEnvironment(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const caPath = resolve(tmpdir(), "build002-r4b-test-ca.crt");
  return {
    NODE_ENV: "test",
    R4_B_TEMP_PROJECT_REF: TEMP_REF,
    R4_B_MAIN_PROJECT_REF: MAIN_REF,
    R4_B_SUPABASE_URL: `https://${TEMP_REF}.supabase.co`,
    R4_B_PUBLISHABLE_KEY: "sb_publishable_launcher_test",
    R4_B_SERVICE_ROLE_KEY: "sb_secret_launcher_test",
    R4_B_DATABASE_URL: `postgresql://postgres.${TEMP_REF}:test-password@db.${TEMP_REF}.supabase.co:5432/postgres?sslmode=verify-full&sslrootcert=${encodeURIComponent(caPath)}`,
    R4_B_RUN_ID: RUN_ID,
    R4_B_MAX_RUNTIME_MINUTES: "60",
    PGSSLROOTCERT: caPath,
    SystemRoot: "C:\\Windows",
    WINDIR: "C:\\Windows",
    TEMP: tmpdir(),
    TMP: tmpdir(),
    ...overrides,
  };
}

function validOutput(overrides: Record<string, unknown> = {}): Buffer {
  const evidence = {
    runId: RUN_ID,
    targetProjectRef: TEMP_REF,
    fixtureGraphSha256: launcher.CANONICAL_FIXTURE_GRAPH_SHA256,
    providerCallCount: 0,
    phases: ["P0", "P1", "P2", "P3", "P4", "P5", "P6"],
    ...((overrides.evidence as Record<string, unknown> | undefined) ?? {}),
  };
  const output = {
    evidence,
    sha256: launcher.canonicalSha256(evidence),
    failedPhase: null,
    tempProjectReadyToPause: true,
    ...overrides,
  };
  if (overrides.evidence) output.evidence = evidence;
  return Buffer.from(`${launcher.canonicalJson(output)}\n`, "utf8");
}

function successfulResult(stdout: Buffer) {
  return { exitCode: 0, stdoutChunkCount: stdout.length > 0 ? 1 : 0, stdout };
}

describe("BUILD002 R4-B audited launcher", () => {
  it("accepts only the exact execute CLI argument", () => {
    expect(() => launcher.validateLauncherArgs(["--execute"])).not.toThrow();
    for (const argv of [[], ["--plan"], ["--preflight"], ["--force"], ["--execute", "extra"], ["--unknown"]]) {
      expect(() => launcher.validateLauncherArgs(argv)).toThrowError(
        expect.objectContaining({ code: "BUILD002_R4B_AUDITED_LAUNCHER_EXACT_EXECUTE_MODE_REQUIRED" }),
      );
    }
  });

  it("sanitizes inherited Node injection variables through an explicit allowlist", () => {
    const maliciousParent = parentEnvironment({
      NODE_OPTIONS: "--require C:\\sentinel\\must-not-run.cjs",
      NODE_PATH: "C:\\sentinel\\modules",
      NODE_V8_COVERAGE: "C:\\sentinel\\coverage",
      NODE_REPL_EXTERNAL_MODULE: "C:\\sentinel\\external.mjs",
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
      UNRELATED_PARENT_VALUE: "not-allowed",
    });
    const { childEnvironment, environmentManifest } = launcher.buildAuditedChildEnvironment(maliciousParent);
    expect(Object.keys(childEnvironment).every((key) => launcher.AUDITED_CHILD_ENV_ALLOWLIST.includes(key))).toBe(true);
    for (const key of launcher.FORBIDDEN_NODE_ENV_KEYS) expect(childEnvironment).not.toHaveProperty(key);
    expect(childEnvironment).not.toHaveProperty("UNRELATED_PARENT_VALUE");
    expect(environmentManifest.find((item: { key: string }) => item.key === "R4_B_DATABASE_URL")).toMatchObject({ present: true, secret: true });
    expect(() => launcher.buildAuditedChildEnvironment(parentEnvironment({ R4_B_RUN_ID: ".." })))
      .toThrowError(expect.objectContaining({ code: "BUILD002_R4B_AUDITED_LAUNCHER_RUN_ID_INVALID" }));
  });

  it("captures and persists exact raw stdout and stderr bytes", async () => {
    const result = await launcher.runChildProcess({
      executable: process.execPath,
      argv: ["-e", "process.stdout.write(Buffer.from('chunk-one|'));setTimeout(()=>process.stdout.write(Buffer.from('chunk-two\\n')),20);process.stderr.write(Buffer.from('stderr-sentinel'));"],
      cwd: process.cwd(),
      env: { SystemRoot: process.env.SystemRoot ?? "C:\\Windows" },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toEqual(Buffer.from("chunk-one|chunk-two\n"));
    expect(result.stderr).toEqual(Buffer.from("stderr-sentinel"));
    expect(result.stdoutChunkCount).toBeGreaterThan(0);
    const root = temporaryRoot();
    const manifest = { schemaVersion: "test", stdoutSha256: launcher.sha256Bytes(result.stdout) };
    const persisted = await launcher.persistLauncherArtifacts({ evidenceRoot: root, runId: RUN_ID, stdout: result.stdout, stderr: result.stderr, manifest });
    expect(readFileSync(persisted.stdoutPath)).toEqual(result.stdout);
    expect(readFileSync(persisted.stderrPath)).toEqual(result.stderr);
    const envelope = JSON.parse(readFileSync(persisted.manifestPath, "utf8"));
    expect(envelope.sha256).toBe(launcher.canonicalSha256(manifest));
  });

  it("rejects exit zero with empty stdout using the exact error code", () => {
    expect(() => launcher.validateSuccessfulChildResult(successfulResult(Buffer.alloc(0)), { runId: RUN_ID, targetProjectRef: TEMP_REF }))
      .toThrowError(expect.objectContaining({ code: "BUILD002_R4B_AUDITED_LAUNCHER_SUCCESS_WITH_EMPTY_STDOUT" }));
  });

  it("preserves nonzero output and never retries the child", async () => {
    let attempts = 0;
    const result = await launcher.runChildProcess({
      executable: process.execPath,
      argv: ["-e", "process.stdout.write('failed-stdout');process.stderr.write('failed-stderr');process.exitCode=7"],
      cwd: process.cwd(),
      env: { SystemRoot: process.env.SystemRoot ?? "C:\\Windows" },
      spawnImpl: (...args: Parameters<typeof spawn>) => {
        attempts += 1;
        return spawn(...args);
      },
    });
    expect(attempts).toBe(1);
    expect(result.behavioralChildAttemptCount).toBe(1);
    expect(result.exitCode).toBe(7);
    expect(result.stdout.toString()).toBe("failed-stdout");
    expect(result.stderr.toString()).toBe("failed-stderr");
    const root = temporaryRoot();
    const persisted = await launcher.persistLauncherArtifacts({
      evidenceRoot: root,
      runId: RUN_ID,
      stdout: result.stdout,
      stderr: result.stderr,
      manifest: { schemaVersion: "failed-test", exitCode: result.exitCode },
    });
    expect(readFileSync(persisted.stdoutPath, "utf8")).toBe("failed-stdout");
    expect(readFileSync(persisted.stderrPath, "utf8")).toBe("failed-stderr");
  });

  it("freezes a single production behavioral attempt and exact child command", () => {
    const source = readFileSync(resolve(process.cwd(), "scripts/build002-r4b-audited-launcher.mjs"), "utf8");
    expect(launcher.MAX_BEHAVIORAL_CHILD_ATTEMPTS).toBe(1);
    expect(source.match(/const childResult = await runChildProcess\(\{/g)).toHaveLength(1);
    expect(source).toContain('const childArgv = [CANONICAL_HARNESS_RELATIVE_PATH, "--execute"]');
    expect(source).toContain("executable: process.execPath");
    expect(source).toContain("shell: false");
    expect(source).toContain('stdio: ["ignore", "pipe", "pipe"]');
  });

  it("rejects wrong harness bytes before the production spawn site", async () => {
    const root = temporaryRoot();
    const wrongHarness = resolve(root, "wrong-harness.mjs");
    writeFileSync(wrongHarness, "export const wrong = true;\n");
    await expect(launcher.verifyHarnessBinding(wrongHarness)).rejects.toMatchObject({ code: "BUILD002_R4B_AUDITED_LAUNCHER_HARNESS_BLOB_MISMATCH" });
    const source = readFileSync(resolve(process.cwd(), "scripts/build002-r4b-audited-launcher.mjs"), "utf8");
    expect(source.indexOf("verifyHarnessBinding(HARNESS_PATH)")).toBeLessThan(source.indexOf("const childResult = await runChildProcess({"));
  });

  it("validates the exact successful output structure and evidence hash", () => {
    const valid = validOutput();
    expect(launcher.validateSuccessfulChildResult(successfulResult(valid), { runId: RUN_ID, targetProjectRef: TEMP_REF }).sha256)
      .toBe(launcher.canonicalSha256(JSON.parse(valid.toString()).evidence));
    const malformedCases = [
      Buffer.alloc(0),
      Buffer.from(`${valid.toString()}${valid.toString()}`),
      Buffer.from("{not-json}\n"),
      validOutput({ failedPhase: "P5" }),
      validOutput({ evidence: { targetProjectRef: "zyxwvutsrqponmlkjihg" } }),
      validOutput({ evidence: { runId: "wrong-run" } }),
      validOutput({ sha256: "0".repeat(64) }),
    ];
    for (const bytes of malformedCases) {
      expect(() => launcher.validateSuccessfulChildResult(successfulResult(bytes), { runId: RUN_ID, targetProjectRef: TEMP_REF })).toThrow();
    }
  });

  it("cross-binds P6 without modifying the canonical checkpoint directory", async () => {
    const root = temporaryRoot();
    const checkpointRoot = resolve(root, "build002-r4b");
    const launcherRoot = resolve(root, "build002-r4b-launcher");
    const output = JSON.parse(validOutput().toString());
    const p6Evidence = { ...output.evidence, phase: "P6" };
    const p6 = { evidence: p6Evidence, sha256: launcher.canonicalSha256(p6Evidence) };
    const runDirectory = resolve(checkpointRoot, encodeURIComponent(RUN_ID));
    const { mkdirSync } = await import("node:fs");
    mkdirSync(runDirectory, { recursive: true });
    const p6Path = resolve(runDirectory, "P6.json");
    writeFileSync(p6Path, `${launcher.canonicalJson(p6)}\n`);
    const before = readFileSync(p6Path);
    const binding = await launcher.validateP6CrossBinding(output, checkpointRoot);
    expect(binding.present).toBe(true);
    await launcher.persistLauncherArtifacts({ evidenceRoot: launcherRoot, runId: RUN_ID, stdout: validOutput(), stderr: Buffer.alloc(0), manifest: { schemaVersion: "test" } });
    expect(readFileSync(p6Path)).toEqual(before);
    expect(readFileSync(resolve(launcherRoot, RUN_ID, "child.stdout"))).toEqual(validOutput());
  });

  it("contains none of the forbidden production launcher patterns", () => {
    const source = readFileSync(resolve(process.cwd(), "scripts/build002-r4b-audited-launcher.mjs"), "utf8");
    const forbidden = [
      /\.\.\.process\.env/,
      /env\s*:\s*process\.env/,
      /shell\s*:\s*true/,
      /\bexec\s*\(/,
      /\beval\s*\(/,
      /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/,
      /rejectUnauthorized\s*:\s*false/,
      /["']--force["']/,
      /for\s*\([^)]*attempt|while\s*\(/,
      /import[^\n]+build002-r4b-managed-remote-assurance/,
    ];
    expect(forbidden.filter((pattern) => pattern.test(source))).toHaveLength(0);
  });

  it("computes Git blob and SHA256 bindings from raw bytes", () => {
    const bytes = Buffer.from("audited-launcher-binding\n");
    const expectedBlob = createHash("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
    expect(launcher.gitBlobSha(bytes)).toBe(expectedBlob);
    expect(launcher.sha256Bytes(bytes)).toBe(createHash("sha256").update(bytes).digest("hex"));
  });
});
