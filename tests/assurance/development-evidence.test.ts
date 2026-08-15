// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  DevelopmentEvidenceReceiptSchema,
  evaluateClaim,
  type AssuranceClaim,
  type DevelopmentEvidenceReceipt,
  type EvidenceLevel,
  type EvidenceResult,
} from "@/src/assurance/development-evidence.mts";

describe("development evidence claim satisfaction", () => {
  it("does not let E1 satisfy an E3 requirement", () => {
    expect(evaluateClaim(claim("E3_LOCAL_REAL_BOUNDARY"), [receipt({ actual: "E1_MODEL" })]).status).toBe("NOT_PROVEN");
  });

  it("does not let E3 satisfy an E4 requirement", () => {
    expect(evaluateClaim(claim("E4_REMOTE_STAGING"), [receipt({ actual: "E3_LOCAL_REAL_BOUNDARY", required: "E4_REMOTE_STAGING" })]).status).toBe("NOT_PROVEN");
  });

  it.each([
    ["E3_LOCAL_REAL_BOUNDARY", "E3_LOCAL_REAL_BOUNDARY"],
    ["E4_REMOTE_STAGING", "E3_LOCAL_REAL_BOUNDARY"],
  ] as const)("allows %s to satisfy %s when the receipt passes", (actual, required) => {
    expect(evaluateClaim(claim(required), [receipt({ actual, required })]).status).toBe("PROVEN");
  });

  it("fails on a matching FAIL regardless of its tier", () => {
    const evaluation = evaluateClaim(claim("E4_REMOTE_STAGING"), [receipt({ actual: "E0_STATIC", required: "E4_REMOTE_STAGING", result: "FAIL" })]);
    expect(evaluation.status).toBe("FAILED");
  });

  it("does not count SKIPPED_ENVIRONMENT as PASS", () => {
    const evaluation = evaluateClaim(claim("E4_REMOTE_STAGING"), [receipt({
      actual: "E4_REMOTE_STAGING",
      required: "E4_REMOTE_STAGING",
      result: "SKIPPED_ENVIRONMENT",
      skippedReason: "No isolated Supabase staging project was supplied.",
    })]);
    expect(evaluation.status).toBe("SKIPPED");
    expect(evaluation.skippedReasons).toEqual(["No isolated Supabase staging project was supplied."]);
  });

  it("does not count UNKNOWN as PASS", () => {
    expect(evaluateClaim(claim("E4_REMOTE_STAGING"), [receipt({ actual: "E0_STATIC", required: "E4_REMOTE_STAGING", result: "UNKNOWN" })]).status).toBe("UNKNOWN");
  });

  it("does not use evidence from another criterion", () => {
    expect(evaluateClaim(claim("E1_MODEL"), [receipt({ criterionId: "different-criterion" })]).status).toBe("NOT_PROVEN");
  });

  it.each([
    { override: { buildId: "BUILD-OTHER" }, source: "wrong build" },
    { override: { specId: "spec-other" }, source: "wrong spec" },
  ] as const)("does not use evidence from the $source", ({ override }) => {
    expect(evaluateClaim(claim("E1_MODEL"), [receipt(override)]).status).toBe("NOT_PROVEN");
  });

  it("preserves independent verifier metadata", () => {
    const independent = receipt({ independence: "INDEPENDENT_VERIFIER" });
    const evaluation = evaluateClaim(claim("E1_MODEL"), [independent]);
    expect(evaluation.consideredEvidence[0].verifier).toEqual({ name: "F7 verifier", role: "independent security verifier" });
    expect(evaluation.consideredEvidence[0].independence).toBe("INDEPENDENT_VERIFIER");
  });

  it("keeps limitations visible in evaluated output", () => {
    const evaluation = evaluateClaim(claim("E3_LOCAL_REAL_BOUNDARY"), [receipt({
      actual: "E1_MODEL",
      limitations: ["No PostgreSQL engine was exercised."],
    })]);
    expect(evaluation.limitations).toContain("No PostgreSQL engine was exercised.");
    expect(evaluation.limitations).toContain("E1_MODEL cannot satisfy E3_LOCAL_REAL_BOUNDARY.");
  });

  it("requires an explicit reason for environment skips", () => {
    expect(() => receipt({ result: "SKIPPED_ENVIRONMENT", skippedReason: null })).toThrow(/requires a reason/);
  });
});

function claim(requiredEvidenceLevel: EvidenceLevel): AssuranceClaim {
  return {
    scope: "CURRENT",
    buildId: "BUILD-001",
    specId: "virro-vnext-build-001",
    criterionId: "atomic-commit",
    subject: "Canonical commit",
    control: "Atomic state transition",
    requiredEvidenceLevel,
  };
}

function receipt(overrides: {
  actual?: EvidenceLevel;
  required?: EvidenceLevel;
  result?: EvidenceResult;
  skippedReason?: string | null;
  criterionId?: string;
  buildId?: string;
  specId?: string;
  independence?: DevelopmentEvidenceReceipt["independence"];
  limitations?: string[];
} = {}): DevelopmentEvidenceReceipt {
  return DevelopmentEvidenceReceiptSchema.parse({
    evidenceId: crypto.randomUUID(),
    buildId: overrides.buildId ?? "BUILD-001",
    specId: overrides.specId ?? "virro-vnext-build-001",
    criterionId: overrides.criterionId ?? "atomic-commit",
    subject: "Canonical commit",
    control: "Atomic state transition",
    requiredEvidenceLevel: overrides.required ?? "E1_MODEL",
    actualEvidenceLevel: overrides.actual ?? "E1_MODEL",
    boundaryTested: "Test fixture",
    environment: "Vitest",
    executor: "Vitest",
    verifier: { name: "F7 verifier", role: "independent security verifier" },
    independence: overrides.independence ?? "AUTOMATED_GATE",
    provenance: { kind: "REPOSITORY_TEST", source: "tests/assurance/development-evidence.test.ts", immutableRef: "33556d8dcb4f1542cb80706f10068aa77fef1006" },
    commandTestIdentifier: "development evidence evaluator fixture",
    result: overrides.result ?? "PASS",
    limitations: overrides.limitations ?? [],
    skippedReason: overrides.skippedReason ?? null,
    artifactRefs: [],
    baselineSha: "33556d8dcb4f1542cb80706f10068aa77fef1006",
    resultSha: "33556d8dcb4f1542cb80706f10068aa77fef1006",
    timestamp: "2026-08-15T18:10:00.000Z",
  });
}
