// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  AssuranceClaimSchema,
  createCriterionDefinitionHash,
  createLocalEvidenceRunner,
  createReceiptIntegrityDigest,
  createRunnerCommandRequirement,
  DevelopmentEvidenceReceiptSchema,
  evaluateClaim,
  type AssuranceClaim,
  type CriterionDefinitionInput,
  type DevelopmentEvidenceReceipt,
} from "@/src/assurance/development-evidence.mts";

const repositories: string[] = [];
const PASS_COMMAND = createRunnerCommandRequirement("assurance:runner-self-test:pass");

afterEach(() => {
  for (const repository of repositories.splice(0)) rmSync(repository, { recursive: true, force: true });
});

describe("BUILD 001-F7-R2.2 authority capability encapsulation", () => {
  it("returns only a frozen non-authoritative context snapshot", () => {
    const runner = createRunner(createRepository());
    const context = runner.evaluationContext();

    expect(Object.keys(context)).toEqual(["contextId"]);
    expect(Object.getOwnPropertyNames(context)).not.toContain("authority");
    expect(Object.isFrozen(context)).toBe(true);
    expect(() => {
      (context as unknown as Record<string, unknown>).authority = { verify: () => ({ status: "VALID" }) };
    }).toThrow();
  });

  it("rejects caller-owned context replacements and forged receipts", async () => {
    const runner = createRunner(createRepository());
    const claim = createClaim();
    const issued = await issue(runner, claim);
    const forged = reseal({
      ...structuredClone(issued),
      evidenceId: randomUUID(),
      runnerObservation: {
        ...issued.runnerObservation!,
        args: ["-e", "process.exit(0)"],
      },
    });
    const callerContext = {
      ...runner.evaluationContext(),
      authority: { verify: () => ({ status: "VALID", reasons: [] }) },
    } as never;

    const evaluation = evaluateClaim(claim, [forged], callerContext);
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.provenanceAssessments[0].reasons).toContain("AUTHORITATIVE_ISSUANCE_RECORD_MISSING");
  });

  it("qualifies a legitimate runner-issued receipt through the safe context", async () => {
    const runner = createRunner(createRepository());
    const claim = createClaim();
    const receipt = await issue(runner, claim);

    expect(evaluateClaim(claim, [receipt], runner.evaluationContext()).status).toBe("PROVEN");
  });

  it("does not grant authoritative provenance to a manually constructed receipt", async () => {
    const runner = createRunner(createRepository());
    const claim = createClaim();
    const issued = await issue(runner, claim);
    const manual = reseal({ ...structuredClone(issued), evidenceId: randomUUID() });

    expect(evaluateClaim(claim, [manual]).status).toBe("NOT_PROVEN");
    expect(evaluateClaim(claim, [manual]).provenanceAssessments[0].reasons).toContain(
      "AUTHORITATIVE_ISSUANCE_RECORD_MISSING",
    );
  });

  it("keeps R2.1 command binding strict while authority stays private", async () => {
    const runner = createRunner(createRepository());
    const claim = createClaim({ ...PASS_COMMAND, commandDefinitionHash: "a".repeat(64) });
    const receipt = await issue(runner, claim);

    const evaluation = evaluateClaim(claim, [receipt], runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.incompatibilities[0].reasons).toContain("COMMAND_DEFINITION_HASH_MISMATCH");

    const requirement = createRunnerCommandRequirement(PASS_COMMAND.commandId);
    requirement.commandId = "mutated";
    expect(createRunnerCommandRequirement(PASS_COMMAND.commandId)).toEqual(PASS_COMMAND);
  });
});

function createRunner(repository: string) {
  return createLocalEvidenceRunner({ repositoryRoot: repository, issuerId: "runner:r2-2-encapsulation" });
}

function createClaim(command = PASS_COMMAND): AssuranceClaim {
  const definition: CriterionDefinitionInput = {
    criterionId: "authority-capability-encapsulation",
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
  };
  return AssuranceClaimSchema.parse({
    scope: "CURRENT",
    buildId: "BUILD-001-F7-R2.2",
    specId: "virro-vnext-build-001-trust-foundation",
    ...definition,
    criterionDefinitionHash: createCriterionDefinitionHash(definition),
    subject: "Authority capability encapsulation",
    control: "Private provenance authority",
  });
}

async function issue(runner: ReturnType<typeof createRunner>, claim: AssuranceClaim) {
  return runner.run({
    claim,
    actualEvidenceLevel: "E0_STATIC",
    boundaryId: "REPOSITORY_STATIC_INSPECTION",
    environmentClass: "STATIC_ANALYSIS",
    boundaryTested: "repository-local authority context",
    environment: "temporary clean Git repository",
    commandId: PASS_COMMAND.commandId,
    artifactPaths: ["artifact.log"],
  });
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

function createRepository(): string {
  const repository = mkdtempSync(join(tmpdir(), "virro-r2-2-"));
  repositories.push(repository);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repository, windowsHide: true });
  writeFileSync(join(repository, ".gitignore"), "artifact.log\n");
  writeFileSync(join(repository, "source.txt"), "revision A\n");
  writeFileSync(join(repository, "artifact.log"), "artifact bytes\n");
  git("init", "--quiet");
  git("config", "user.email", "assurance@example.invalid");
  git("config", "user.name", "VIRRO Assurance Test");
  git("add", ".gitignore", "source.txt");
  git("commit", "--quiet", "-m", "revision A");
  return repository;
}
