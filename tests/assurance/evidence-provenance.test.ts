// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  AssuranceClaimSchema,
  canonicalizeJson,
  canonicalizeJsonText,
  createCriterionDefinitionHash,
  createLocalEvidenceRunner,
  createReceiptIntegrityDigest,
  DevelopmentEvidenceReceiptSchema,
  evaluateClaim,
  hashExactArtifactBytes,
  type AssuranceClaim,
  type CriterionDefinitionInput,
  type DevelopmentEvidenceReceipt,
  type LocalEvidenceRunner,
  type ProvenanceClass,
} from "@/src/assurance/development-evidence.mts";

const temporaryRepositories: string[] = [];

afterEach(() => {
  for (const repository of temporaryRepositories.splice(0)) rmSync(repository, { recursive: true, force: true });
});

describe("F7-R2 evidence integrity and provenance", () => {
  it("rejects a syntactically perfect manually forged runner receipt", async () => {
    const issued = await issueFixture();
    const forged = structuredClone(issued.receipt);
    forged.participantBindings.executor!.actorId = "actor:forged-executor";
    forged.participantBindings.executor!.contextId = "context:forged-execution";
    forged.participantBindings.verifier!.actorId = "actor:forged-verifier";
    forged.participantBindings.verifier!.contextId = "context:forged-verification";
    forged.artifactRefs = ["fabricated.log"];
    forged.artifactBindings = [{
      path: "fabricated.log",
      algorithm: "SHA256",
      integrityMode: "EXACT_BYTES",
      digest: "f".repeat(64),
      sizeBytes: 12,
    }];
    const perfectForgery = reseal(forged);
    const exposedAuthority = issued.runner.evaluationContext().authority as {
      record(token: symbol, receipt: DevelopmentEvidenceReceipt): void;
    };
    expect(() => exposedAuthority.record(Symbol("forged"), perfectForgery)).toThrow(/UNAUTHORIZED_ISSUANCE_RECORD/);

    const evaluation = evaluateClaim(issued.claim, [perfectForgery]);
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.provenanceAssessments[0].reasons).toContain("AUTHORITATIVE_ISSUANCE_RECORD_MISSING");

    const fakeAuthorityEvaluation = evaluateClaim(issued.claim, [perfectForgery], {
      authority: { verify: () => ({ status: "VALID" as const, reasons: [] }) },
    });
    expect(fakeAuthorityEvaluation.status).toBe("NOT_PROVEN");
    expect(fakeAuthorityEvaluation.provenanceAssessments[0].reasons).toContain(
      "AUTHORITATIVE_ISSUANCE_RECORD_MISSING",
    );
  });

  it.each(["actor", "context"] as const)("rejects post-issuance fake %s IDs", async (target) => {
    const issued = await issueFixture();
    const mutated = structuredClone(issued.receipt);
    if (target === "actor") mutated.participantBindings.verifier!.actorId = "actor:forged-verifier";
    else mutated.participantBindings.verifier!.contextId = "context:forged-verification";

    const evaluation = evaluateClaim(issued.claim, [reseal(mutated)], issued.runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.provenanceAssessments[0].reasons).toContain("ISSUED_RECEIPT_MUTATED");
  });

  it("rejects a receipt after the source revision advances", async () => {
    const issued = await issueFixture();
    writeFileSync(join(issued.repository, "source.txt"), "revision B\n", "utf8");
    git(issued.repository, "add", "source.txt");
    git(issued.repository, "commit", "-m", "revision B");

    const evaluation = evaluateClaim(issued.claim, [issued.receipt], issued.runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.provenanceAssessments[0].reasons).toContain("STALE_SOURCE_REVISION");
  });

  it("rejects a baseline SHA outside the executed source history", async () => {
    const repository = createRepository();
    const claim = provenanceClaim(["RUNNER_RECORDED"]);
    const runner = createTestRunner(repository);

    await expect(runner.run({ ...runInput(claim), baselineSha: "a".repeat(40) })).rejects.toThrow(
      /BASELINE_NOT_ANCESTOR/,
    );
  });

  it("rejects qualification and issuance from a dirty source tree", async () => {
    const issued = await issueFixture();
    writeFileSync(join(issued.repository, "source.txt"), "dirty source\n", "utf8");

    const evaluation = evaluateClaim(issued.claim, [issued.receipt], issued.runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.provenanceAssessments[0].reasons).toContain("SOURCE_WORKTREE_DIRTY");
    await expect(issued.runner.run(runInput(issued.claim))).rejects.toThrow(/DIRTY_WORKTREE/);
  });

  it("rejects a missing artifact", async () => {
    const issued = await issueFixture();
    unlinkSync(join(issued.repository, "artifact.log"));

    const evaluation = evaluateClaim(issued.claim, [issued.receipt], issued.runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.provenanceAssessments[0].reasons).toContain("ARTIFACT_MISSING_OR_UNSAFE:artifact.log");
  });

  it("detects artifact replacement at the same repository path", async () => {
    const issued = await issueFixture();
    writeFileSync(join(issued.repository, "artifact.log"), "replacement bytes\n", "utf8");

    const evaluation = evaluateClaim(issued.claim, [issued.receipt], issued.runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.provenanceAssessments[0].reasons).toContain("ARTIFACT_INTEGRITY_MISMATCH:artifact.log");
  });

  it("rejects runner evidence without an artifact when the criterion requires one", async () => {
    const repository = createRepository();
    const claim = provenanceClaim(["RUNNER_RECORDED"]);
    const runner = createTestRunner(repository);
    const receipt = await runner.run({ ...runInput(claim), artifactPaths: [] });

    const evaluation = evaluateClaim(claim, [receipt], runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.incompatibilities[0].reasons).toContain("REQUIRED_ARTIFACT_BINDING_MISSING");
  });

  it.each([
    "result",
    "actor",
    "context",
    "command",
    "artifactRef",
    "artifactDigest",
    "sourceSha",
    "criterionHash",
  ] as const)(
    "rejects post-issuance receipt mutation: %s",
    async (target) => {
      const issued = await issueFixture();
      const mutated = structuredClone(issued.receipt);
      if (target === "result") {
        mutated.result = "FAIL";
        mutated.runnerObservation!.exitCode = 3;
      }
      if (target === "actor") mutated.participantBindings.executor!.actorId = "actor:mutated-executor";
      if (target === "context") mutated.participantBindings.executor!.contextId = "context:mutated-execution";
      if (target === "command") {
        mutated.commandTestIdentifier = "observed failure";
        mutated.provenance.source = "observed failure";
        mutated.runnerObservation!.commandId = "observed failure";
        mutated.runnerObservation!.args = ["-e", "process.exit(3)"];
        mutated.runnerObservation!.commandDigest = "b".repeat(64);
      }
      if (target === "artifactRef") {
        mutated.artifactRefs = ["mutated-artifact.log"];
        mutated.artifactBindings[0].path = "mutated-artifact.log";
      }
      if (target === "artifactDigest") mutated.artifactBindings[0].digest = "a".repeat(64);
      if (target === "sourceSha") {
        mutated.resultSha = "a".repeat(40);
        mutated.provenance.immutableRef = "a".repeat(40);
        mutated.runnerObservation!.sourceSha = "a".repeat(40);
      }
      if (target === "criterionHash") mutated.criterionDefinitionHash = "a".repeat(64);

      const evaluation = evaluateClaim(issued.claim, [reseal(mutated)], issued.runner.evaluationContext());
      expect(evaluation.status).toBe("NOT_PROVEN");
      expect(evaluation.provenanceAssessments[0].reasons).toContain("ISSUED_RECEIPT_MUTATED");
    },
  );

  it("canonicalizes semantic JSON independently of order, formatting, and CRLF", () => {
    expect(canonicalizeJson({ z: 1, a: { y: true, x: false } })).toBe(
      canonicalizeJson({ a: { x: false, y: true }, z: 1 }),
    );
    expect(canonicalizeJsonText('{\r\n  "b": 2,\r\n  "a": 1\r\n}\r\n')).toBe(
      canonicalizeJsonText('{"a":1,"b":2}\n'),
    );
    expect(hashExactArtifactBytes(Buffer.from("line\r\n"))).not.toBe(hashExactArtifactBytes(Buffer.from("line\n")));
  });

  it("issues and qualifies legitimate local runner evidence", async () => {
    const issued = await issueFixture();
    const evaluation = evaluateClaim(issued.claim, [issued.receipt], issued.runner.evaluationContext());

    expect(evaluation.status).toBe("PROVEN");
    expect(evaluation.provenanceAssessments[0]).toMatchObject({ status: "VALID", reasons: [] });
    expect(issued.receipt.provenanceClass).toBe("RUNNER_RECORDED");
    expect(issued.receipt.runnerObservation).toMatchObject({
      sourceSha: git(issued.repository, "rev-parse", "HEAD"),
      dirty: false,
      exitCode: 0,
    });
    expect(issued.receipt.artifactBindings[0].digest).toMatch(/^[0-9a-f]{64}$/);
    expect(issued.receipt.receiptIntegrity?.digest).toBe(createReceiptIntegrityDigest(issued.receipt));
  });

  it("derives FAIL from the observed command exit instead of caller metadata", async () => {
    const repository = createRepository();
    const claim = provenanceClaim(["RUNNER_RECORDED"]);
    const runner = createTestRunner(repository);
    const receipt = await runner.run({
      ...runInput(claim),
      commandId: "observed failure",
    });

    expect(receipt.result).toBe("FAIL");
    expect(receipt.runnerObservation?.exitCode).toBe(3);
    expect(evaluateClaim(claim, [receipt], runner.evaluationContext()).status).toBe("FAILED");
  });

  it("rejects an otherwise valid receipt when its provenance class is insufficient", async () => {
    const repository = createRepository();
    const claim = provenanceClaim(["CI_ATTESTED"]);
    const runner = createTestRunner(repository);
    const receipt = await runner.run(runInput(claim));

    const evaluation = evaluateClaim(claim, [receipt], runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.incompatibilities[0].reasons).toContain("PROVENANCE_CLASS_NOT_ACCEPTED");
  });

  it("does not promote a locally modeled CI claim to actual CI attestation", async () => {
    const repository = createRepository();
    const claim = provenanceClaim(["CI_ATTESTED"]);
    const runner = createTestRunner(repository);
    const local = await runner.run(runInput(claim));
    const modeledCi = structuredClone(local);
    modeledCi.provenanceClass = "CI_ATTESTED";
    modeledCi.issuerKind = "AUTHORITATIVE_CI";
    const receipt = reseal(modeledCi);

    const evaluation = evaluateClaim(claim, [receipt], runner.evaluationContext());
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.provenanceAssessments[0].reasons).toContain("ATTESTED_PROVENANCE_AUTHORITY_UNAVAILABLE");
  });

  it("rejects unsafe artifact paths at the authoritative runner", async () => {
    const repository = createRepository();
    const claim = provenanceClaim(["RUNNER_RECORDED"]);
    const runner = createTestRunner(repository);
    await expect(runner.run({ ...runInput(claim), artifactPaths: ["../outside.log"] })).rejects.toThrow(/safe repository-relative/);
  });

  it("rejects caller-selected commands outside the runner registry", async () => {
    const repository = createRepository();
    const claim = provenanceClaim(["RUNNER_RECORDED"]);
    const runner = createTestRunner(repository);
    await expect(runner.run({ ...runInput(claim), commandId: "pnpm test:sql" })).rejects.toThrow(/UNAUTHORIZED_RUNNER_COMMAND/);
  });

  it("pins every third-party action in the assurance workflow to an immutable SHA", () => {
    const workflow = readFileSync(".github/workflows/assurance.yml", "utf8");
    const references = [...workflow.matchAll(/uses:\s+[^@\s]+@([^\s]+)/g)].map((match) => match[1]);
    expect(references.length).toBeGreaterThan(0);
    expect(references.every((reference) => /^[0-9a-f]{40}$/.test(reference))).toBe(true);
  });
});

function provenanceClaim(acceptedProvenanceClasses: ProvenanceClass[]): AssuranceClaim {
  const definition: CriterionDefinitionInput = {
    criterionId: "runner-provenance",
    criterionVersion: 2,
    subjectId: "CANONICAL_COMMIT",
    controlId: "POSTGRES_ATOMIC_COMMIT",
    requiredBoundaryId: "REPOSITORY_STATIC_INSPECTION",
    acceptedEnvironmentClasses: ["STATIC_ANALYSIS"],
    minimumEvidenceLevel: "E0_STATIC",
    independenceRequirement: "AUTOMATED_OR_INDEPENDENT",
    acceptedProvenanceClasses,
    acceptedRunnerCommandIds: ["deterministic repository fixture", "observed failure"],
    artifactRequirement: "AT_LEAST_ONE",
  };
  return AssuranceClaimSchema.parse({
    scope: "CURRENT",
    buildId: "BUILD-001-F7-R2",
    specId: "virro-vnext-build-001-trust-foundation",
    ...definition,
    criterionDefinitionHash: createCriterionDefinitionHash(definition),
    subject: "Canonical commit",
    control: "Repository runner provenance",
  });
}

function runInput(claim: AssuranceClaim) {
  return {
    claim,
    actualEvidenceLevel: "E0_STATIC" as const,
    boundaryId: "REPOSITORY_STATIC_INSPECTION" as const,
    environmentClass: "STATIC_ANALYSIS" as const,
    boundaryTested: "repository-local Node.js process",
    environment: "temporary clean Git repository",
    commandId: "deterministic repository fixture",
    artifactPaths: ["artifact.log"],
    limitations: ["Local runner recording is not external attestation."],
  };
}

async function issueFixture(): Promise<{
  repository: string;
  claim: AssuranceClaim;
  runner: LocalEvidenceRunner;
  receipt: DevelopmentEvidenceReceipt;
}> {
  const repository = createRepository();
  const claim = provenanceClaim(["RUNNER_RECORDED"]);
  const runner = createTestRunner(repository);
  const receipt = await runner.run(runInput(claim));
  return { repository, claim, runner, receipt };
}

function createTestRunner(repository: string): LocalEvidenceRunner {
  return createLocalEvidenceRunner({
    repositoryRoot: repository,
    issuerId: "runner:test-local",
    commandRegistry: {
      "deterministic repository fixture": {
        executable: process.execPath,
        args: ["-e", "require('node:fs').readFileSync('source.txt'); process.exit(0)"],
      },
      "observed failure": { executable: process.execPath, args: ["-e", "process.exit(3)"] },
    },
  });
}

function createRepository(): string {
  const repository = mkdtempSync(join(tmpdir(), "virro-r2-"));
  temporaryRepositories.push(repository);
  git(repository, "init", "--quiet");
  git(repository, "config", "core.autocrlf", "false");
  git(repository, "config", "user.email", "assurance@example.invalid");
  git(repository, "config", "user.name", "VIRRO Assurance Test");
  writeFileSync(join(repository, ".gitignore"), "artifact.log\n", "utf8");
  writeFileSync(join(repository, "source.txt"), "revision A\n", "utf8");
  writeFileSync(join(repository, "artifact.log"), "original artifact bytes\n", "utf8");
  git(repository, "add", ".gitignore", "source.txt");
  git(repository, "commit", "--quiet", "-m", "revision A");
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
