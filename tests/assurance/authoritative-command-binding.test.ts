// @vitest-environment node

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  AssuranceClaimSchema,
  createAuthoritativeCommandDefinitionHash,
  createCriterionDefinitionHash,
  createLocalEvidenceRunner,
  createReceiptIntegrityDigest,
  createRunnerCommandRequirement,
  DevelopmentEvidenceReceiptSchema,
  evaluateClaim,
  type AssuranceClaim,
  type AuthoritativeCommandDefinition,
  type CriterionDefinitionInput,
  type DevelopmentEvidenceReceipt,
  type RunnerCommandRequirement,
} from "@/src/assurance/development-evidence.mts";

const temporaryRepositories: string[] = [];
const PASS_COMMAND_ID = "assurance:runner-self-test:pass";
const PASS_COMMAND = createRunnerCommandRequirement(PASS_COMMAND_ID);
const TEST_SQL_COMMAND = createRunnerCommandRequirement("test:sql");
const TEST_SQL_SCRIPT = "vitest run tests/integration/build001-f1-canonical-commit.integration.test.ts --reporter=verbose";

afterEach(() => {
  delete process.env.NODE_OPTIONS;
  for (const repository of temporaryRepositories.splice(0)) rmSync(repository, { recursive: true, force: true });
});

describe("F7-R2.1 authoritative command definition binding", () => {
  it("rejects caller rebinding of test:sql to a surrogate process", async () => {
    const repository = createRepository({ testSqlScript: "node -e \"process.exit(0)\"" });
    const claim = createClaim(TEST_SQL_COMMAND);
    const runner = createLocalEvidenceRunner({
      repositoryRoot: repository,
      issuerId: "runner:attacker-selected",
      commandRegistry: {
        "test:sql": { executable: process.execPath, args: ["-e", "process.exit(0)"] },
      },
    } as never);

    await expect(runner.run(runInput(claim, "test:sql"))).rejects.toThrow(/PACKAGE_SCRIPT_BINDING_MISMATCH/);
  });

  it("rejects a correct command ID with the wrong definition hash", async () => {
    const issued = await issueSelfTest(createClaim({ ...PASS_COMMAND, commandDefinitionHash: "a".repeat(64) }));
    const evaluation = evaluateClaim(issued.claim, [issued.receipt], issued.runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.incompatibilities[0].reasons).toContain("COMMAND_DEFINITION_HASH_MISMATCH");
  });

  it("rejects copied command ID with forged executable and argv", async () => {
    const issued = await issueSelfTest();
    const forged = structuredClone(issued.receipt);
    forged.runnerObservation!.executable = "forged-node";
    forged.runnerObservation!.args = ["-e", "process.exit(0)"];
    const receipt = reseal(forged);

    const evaluation = evaluateClaim(issued.claim, [receipt], issued.runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.provenanceAssessments[0].reasons).toContain("COMMAND_OBSERVATION_INTEGRITY_MISMATCH");
  });

  it.each(["unknown-command", "ASSURANCE:RUNNER-SELF-TEST:PASS", ` ${PASS_COMMAND_ID}`])(
    "fails closed for unknown, alias, case, or whitespace ID: %s",
    async (commandId) => {
      const repository = createRepository();
      const runner = createRunner(repository);
      await expect(runner.run(runInput(createClaim(PASS_COMMAND), commandId))).rejects.toThrow();
    },
  );

  it("does not let a test-only custom registry issue runner-recorded provenance", async () => {
    const repository = createRepository();
    const runner = createLocalEvidenceRunner({
      repositoryRoot: repository,
      issuerId: "runner:test-injection-attempt",
      commandRegistry: {
        "test-only:custom": { executable: process.execPath, args: ["-e", "process.exit(0)"] },
      },
    } as never);
    await expect(runner.run(runInput(createClaim(PASS_COMMAND), "test-only:custom"))).rejects.toThrow(
      /UNAUTHORIZED_RUNNER_COMMAND/,
    );
  });

  it("rejects a changed command definition while the runner uses the repository definition", async () => {
    const changedDefinition: AuthoritativeCommandDefinition = {
      commandId: PASS_COMMAND_ID,
      executable: "NODE_RUNTIME",
      argv: ["-e", "process.exit(0)"],
      workingDirectoryPolicy: "REPOSITORY_ROOT",
      packageScriptBinding: null,
    };
    const changedRequirement = {
      commandId: PASS_COMMAND_ID,
      commandDefinitionHash: createAuthoritativeCommandDefinitionHash(changedDefinition),
    };
    expect(changedRequirement.commandDefinitionHash).not.toBe(PASS_COMMAND.commandDefinitionHash);

    const issued = await issueSelfTest(createClaim(changedRequirement));
    expect(evaluateClaim(issued.claim, [issued.receipt], issued.runner.evaluationContext()).status).toBe("NOT_PROVEN");
  });

  it("hashes command semantics canonically and changes for execution-defining fields", () => {
    const definition: AuthoritativeCommandDefinition = {
      commandId: "test:sql",
      executable: "NODE_RUNTIME",
      argv: ["node_modules/vitest/vitest.mjs", "run", "suite-a.ts"],
      workingDirectoryPolicy: "REPOSITORY_ROOT",
      packageScriptBinding: { scriptName: "test:sql", expectedDefinition: "vitest run suite-a.ts" },
    };
    const reordered: AuthoritativeCommandDefinition = {
      packageScriptBinding: { expectedDefinition: "vitest run suite-a.ts", scriptName: "test:sql" },
      workingDirectoryPolicy: "REPOSITORY_ROOT",
      argv: ["node_modules/vitest/vitest.mjs", "run", "suite-a.ts"],
      executable: "NODE_RUNTIME",
      commandId: "test:sql",
    };
    const argvChanged = { ...definition, argv: [...definition.argv, "--reporter=verbose"] };
    const scriptChanged = {
      ...definition,
      packageScriptBinding: { scriptName: "test:sql", expectedDefinition: "vitest run suite-b.ts" },
    };

    expect(createAuthoritativeCommandDefinitionHash(reordered)).toBe(
      createAuthoritativeCommandDefinitionHash(definition),
    );
    expect(createAuthoritativeCommandDefinitionHash(argvChanged)).not.toBe(
      createAuthoritativeCommandDefinitionHash(definition),
    );
    expect(createAuthoritativeCommandDefinitionHash(scriptChanged)).not.toBe(
      createAuthoritativeCommandDefinitionHash(definition),
    );
  });

  it("produces authoritative evidence only for the exact repository-controlled self-test definition", async () => {
    const issued = await issueSelfTest();
    const evaluation = evaluateClaim(issued.claim, [issued.receipt], issued.runner.evaluationContext());

    expect(evaluation.status).toBe("PROVEN");
    expect(issued.receipt.runnerObservation).toMatchObject({
      commandId: PASS_COMMAND_ID,
      commandDefinitionHash: PASS_COMMAND.commandDefinitionHash,
      executable: process.execPath,
      args: ["-e", "require('node:fs').readFileSync('source.txt'); process.exit(0)"],
      workingDirectoryPolicy: "REPOSITORY_ROOT",
      exitCode: 0,
    });
  });

  it("sanitizes NODE_OPTIONS instead of allowing process-level Node rebinding", async () => {
    process.env.NODE_OPTIONS = "--require=definitely-missing-r2-1-module";
    const issued = await issueSelfTest();
    expect(issued.receipt.result).toBe("PASS");
  });

  it("executes the real SQL assurance lane through its authoritative definition", async () => {
    const repository = createSqlRepository();
    const claim = createClaim(TEST_SQL_COMMAND, {
      requiredBoundaryId: "PGLITE_POSTGRES",
      acceptedEnvironmentClasses: ["LOCAL_REAL_BOUNDARY"],
      minimumEvidenceLevel: "E3_LOCAL_REAL_BOUNDARY",
    });
    const runner = createRunner(repository);
    const receipt = await runner.run({
      ...runInput(claim, "test:sql"),
      actualEvidenceLevel: "E3_LOCAL_REAL_BOUNDARY",
      boundaryId: "PGLITE_POSTGRES",
      environmentClass: "LOCAL_REAL_BOUNDARY",
      boundaryTested: "real local PGlite/PostgreSQL canonical commit suite",
    });

    expect(evaluateClaim(claim, [receipt], runner.evaluationContext()).status).toBe("PROVEN");
    expect(receipt.runnerObservation).toMatchObject({
      commandId: "test:sql",
      commandDefinitionHash: TEST_SQL_COMMAND.commandDefinitionHash,
      executable: process.execPath,
      args: [
        "node_modules/vitest/vitest.mjs",
        "run",
        "tests/integration/build001-f1-canonical-commit.integration.test.ts",
        "--reporter=verbose",
      ],
      exitCode: 0,
    });
  }, 45_000);
});

function createClaim(
  command: RunnerCommandRequirement,
  overrides: Partial<CriterionDefinitionInput> = {},
): AssuranceClaim {
  const definition: CriterionDefinitionInput = {
    criterionId: "authoritative-command-binding",
    criterionVersion: 1,
    subjectId: "CANONICAL_COMMIT",
    controlId: "POSTGRES_ATOMIC_COMMIT",
    requiredBoundaryId: "REPOSITORY_STATIC_INSPECTION",
    acceptedEnvironmentClasses: ["STATIC_ANALYSIS"],
    minimumEvidenceLevel: "E0_STATIC",
    independenceRequirement: "AUTOMATED_OR_INDEPENDENT",
    acceptedProvenanceClasses: ["RUNNER_RECORDED"],
    acceptedRunnerCommands: [command],
    artifactRequirement: "AT_LEAST_ONE",
    ...overrides,
  };
  return AssuranceClaimSchema.parse({
    scope: "CURRENT",
    buildId: "BUILD-001-F7-R2.1",
    specId: "virro-vnext-build-001-trust-foundation",
    ...definition,
    criterionDefinitionHash: createCriterionDefinitionHash(definition),
    subject: "Canonical commit",
    control: "Authoritative command definition binding",
  });
}

function runInput(claim: AssuranceClaim, commandId = PASS_COMMAND_ID) {
  return {
    claim,
    actualEvidenceLevel: "E0_STATIC" as const,
    boundaryId: "REPOSITORY_STATIC_INSPECTION" as const,
    environmentClass: "STATIC_ANALYSIS" as const,
    boundaryTested: "repository-controlled assurance command",
    environment: "temporary clean Git repository",
    commandId,
    artifactPaths: ["artifact.log"],
  };
}

async function issueSelfTest(claim = createClaim(PASS_COMMAND)) {
  const repository = createRepository();
  const runner = createRunner(repository);
  const receipt = await runner.run(runInput(claim));
  return { repository, claim, runner, receipt };
}

function createRunner(repository: string) {
  return createLocalEvidenceRunner({ repositoryRoot: repository, issuerId: "runner:r2-1-authoritative" });
}

function createRepository(options: { testSqlScript?: string } = {}): string {
  const repository = mkdtempSync(join(tmpdir(), "virro-r2-1-"));
  temporaryRepositories.push(repository);
  git(repository, "init", "-q");
  git(repository, "config", "core.autocrlf", "false");
  git(repository, "config", "user.email", "assurance@example.invalid");
  git(repository, "config", "user.name", "VIRRO Assurance Test");
  writeFileSync(join(repository, ".gitignore"), "artifact.log\nnode_modules\n");
  writeFileSync(join(repository, "source.txt"), "revision A\n");
  writeFileSync(join(repository, "artifact.log"), "artifact bytes\n");
  if (options.testSqlScript) {
    writeFileSync(join(repository, "package.json"), JSON.stringify({ scripts: { "test:sql": options.testSqlScript } }));
  }
  git(repository, "add", ".");
  git(repository, "commit", "-q", "-m", "revision A");
  return repository;
}

function createSqlRepository(): string {
  const repository = createRepository({ testSqlScript: TEST_SQL_SCRIPT });
  mkdirSync(join(repository, "tests", "integration"), { recursive: true });
  cpSync(
    resolve("tests/integration/build001-f1-canonical-commit.integration.test.ts"),
    join(repository, "tests", "integration", "build001-f1-canonical-commit.integration.test.ts"),
  );
  cpSync(resolve("supabase"), join(repository, "supabase"), { recursive: true });
  symlinkSync(resolve("node_modules"), join(repository, "node_modules"), "junction");
  git(repository, "add", ".");
  git(repository, "commit", "-q", "-m", "add SQL assurance lane");
  return repository;
}

function reseal(receipt: DevelopmentEvidenceReceipt): DevelopmentEvidenceReceipt {
  return DevelopmentEvidenceReceiptSchema.parse({
    ...receipt,
    receiptIntegrity: {
      algorithm: "SHA256",
      canonicalization: "VIRRO_CANONICAL_JSON_V1",
      digest: createReceiptIntegrityDigest(receipt),
    },
  });
}

function git(repository: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: repository, encoding: "utf8", windowsHide: true }).trim();
}
