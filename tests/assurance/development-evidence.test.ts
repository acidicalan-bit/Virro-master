// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  AssuranceClaimSchema,
  createCriterionDefinitionHash,
  DevelopmentEvidenceReceiptSchema,
  evaluateClaim,
  type AssuranceClaim,
  type CriterionDefinitionInput,
  type DevelopmentEvidenceReceipt,
  type EvidenceLevel,
} from "@/src/assurance/development-evidence.mts";

describe("development evidence claim satisfaction", () => {
  it("does not let E1 satisfy an E3 requirement", () => {
    const requirement = claim("E3_LOCAL_REAL_BOUNDARY");
    expect(evaluateClaim(requirement, [receipt(requirement, {
      actualEvidenceLevel: "E1_MODEL",
      boundaryId: "TRUST_HARNESS_MODEL",
      environmentClass: "LOCAL_MODEL",
    })]).status).toBe("NOT_PROVEN");
  });

  it("does not let E3 satisfy an E4 requirement", () => {
    const requirement = claim("E4_REMOTE_STAGING", {
      requiredBoundaryId: "SUPABASE_REMOTE_RLS",
      acceptedEnvironmentClasses: ["REMOTE_STAGING"],
    });
    expect(evaluateClaim(requirement, [receipt(requirement, {
      actualEvidenceLevel: "E3_LOCAL_REAL_BOUNDARY",
      boundaryId: "PGLITE_POSTGRES",
      environmentClass: "LOCAL_REAL_BOUNDARY",
    })]).status).toBe("NOT_PROVEN");
  });

  it("proves a claim with an exact semantic and minimum-level match", () => {
    const requirement = claim("E3_LOCAL_REAL_BOUNDARY");
    expect(evaluateClaim(requirement, [receipt(requirement)]).status).toBe("PROVEN");
  });

  it("allows a higher class only when environment and boundary compatibility are explicit", () => {
    const requirement = claim("E3_LOCAL_REAL_BOUNDARY", {
      acceptedEnvironmentClasses: ["LOCAL_REAL_BOUNDARY", "DEPLOYED_E2E"],
    });
    expect(evaluateClaim(requirement, [receipt(requirement, {
      actualEvidenceLevel: "E5_DEPLOYED_E2E",
      environmentClass: "DEPLOYED_E2E",
    })]).status).toBe("PROVEN");
  });

  it("fails only when compatible evidence exercises the required control", () => {
    const requirement = claim("E3_LOCAL_REAL_BOUNDARY");
    expect(evaluateClaim(requirement, [receipt(requirement, { result: "FAIL" })]).status).toBe("FAILED");
    expect(evaluateClaim(requirement, [receipt(requirement, {
      result: "FAIL",
      controlId: "POSTGRES_CANDIDATE_IMMUTABILITY",
    })]).status).toBe("NOT_PROVEN");
  });

  it("does not count SKIPPED_ENVIRONMENT as PASS", () => {
    const requirement = claim("E4_REMOTE_STAGING", {
      requiredBoundaryId: "SUPABASE_REMOTE_RPC",
      acceptedEnvironmentClasses: ["REMOTE_STAGING"],
      controlId: "SUPABASE_RPC_ACL",
    });
    const evaluation = evaluateClaim(requirement, [receipt(requirement, {
      actualEvidenceLevel: "E0_STATIC",
      boundaryId: "NOT_EXECUTED",
      environmentClass: "NOT_EXECUTED",
      result: "SKIPPED_ENVIRONMENT",
      skippedReason: "No isolated Supabase staging project was supplied.",
    })]);
    expect(evaluation.status).toBe("SKIPPED");
    expect(evaluation.skippedReasons).toEqual(["No isolated Supabase staging project was supplied."]);
  });

  it("does not count UNKNOWN as PASS", () => {
    const requirement = claim("E4_REMOTE_STAGING", {
      requiredBoundaryId: "SUPABASE_REMOTE_RLS",
      acceptedEnvironmentClasses: ["REMOTE_STAGING"],
    });
    expect(evaluateClaim(requirement, [receipt(requirement, {
      actualEvidenceLevel: "E0_STATIC",
      boundaryId: "NOT_EXECUTED",
      environmentClass: "NOT_EXECUTED",
      result: "UNKNOWN",
    })]).status).toBe("UNKNOWN");
  });

  it("does not use evidence from another criterion", () => {
    const requirement = claim("E3_LOCAL_REAL_BOUNDARY");
    expect(evaluateClaim(requirement, [receipt(requirement, { criterionId: "different-criterion" })]).status).toBe("NOT_PROVEN");
  });

  it.each([
    { override: { buildId: "BUILD-OTHER" }, source: "wrong build" },
    { override: { specId: "spec-other" }, source: "wrong spec" },
  ] as const)("does not use evidence from the $source", ({ override }) => {
    const requirement = claim("E3_LOCAL_REAL_BOUNDARY");
    expect(evaluateClaim(requirement, [receipt(requirement, override)]).status).toBe("NOT_PROVEN");
  });

  it("preserves declared metadata but derives structural independence", () => {
    const requirement = claim("E3_LOCAL_REAL_BOUNDARY");
    const evaluation = evaluateClaim(requirement, [receipt(requirement, {
      declaredIndependence: "INDEPENDENT_VERIFIER",
      participantBindings: independentBindings(),
    })]);
    expect(evaluation.consideredEvidence[0].verifier).toEqual({ name: "F7 verifier", role: "independent security verifier" });
    expect(evaluation.consideredEvidence[0].declaredIndependence).toBe("INDEPENDENT_VERIFIER");
    expect(evaluation.independenceAssessments[0].status).toBe("STRUCTURALLY_INDEPENDENT");
  });

  it("enforces criterion-specific independence", () => {
    const requirement = claim("E3_LOCAL_REAL_BOUNDARY", { independenceRequirement: "INDEPENDENT_VERIFIER" });
    expect(evaluateClaim(requirement, [receipt(requirement, {
      declaredIndependence: "INDEPENDENT_VERIFIER",
      participantBindings: sameActorBindings(),
    })]).status).toBe("NOT_PROVEN");
    expect(evaluateClaim(requirement, [receipt(requirement, {
      declaredIndependence: "IMPLEMENTER",
      participantBindings: independentBindings(),
    })]).status).toBe("PROVEN");
  });

  it("keeps limitations and incompatibility reasons visible", () => {
    const requirement = claim("E3_LOCAL_REAL_BOUNDARY");
    const evaluation = evaluateClaim(requirement, [receipt(requirement, {
      actualEvidenceLevel: "E1_MODEL",
      boundaryId: "TRUST_HARNESS_MODEL",
      environmentClass: "LOCAL_MODEL",
      limitations: ["No PostgreSQL engine was exercised."],
    })]);
    expect(evaluation.limitations).toContain("No PostgreSQL engine was exercised.");
    expect(evaluation.incompatibilities[0].reasons).toContain("BOUNDARY_ID_MISMATCH");
    expect(evaluation.incompatibilities[0].reasons).toContain("EVIDENCE_LEVEL_BELOW_MINIMUM");
  });

  it("requires an explicit reason for environment skips", () => {
    const requirement = claim("E3_LOCAL_REAL_BOUNDARY");
    expect(() => receipt(requirement, {
      actualEvidenceLevel: "E0_STATIC",
      boundaryId: "NOT_EXECUTED",
      environmentClass: "NOT_EXECUTED",
      result: "SKIPPED_ENVIRONMENT",
      skippedReason: null,
    })).toThrow(/requires a reason/);
  });
});

type ClaimOverrides = Partial<Omit<CriterionDefinitionInput, "criterionId" | "criterionVersion">>;

function claim(minimumEvidenceLevel: EvidenceLevel, overrides: ClaimOverrides = {}): AssuranceClaim {
  const definition: CriterionDefinitionInput = {
    criterionId: "atomic-commit",
    criterionVersion: 1,
    subjectId: overrides.subjectId ?? "CANONICAL_COMMIT",
    controlId: overrides.controlId ?? "POSTGRES_ATOMIC_COMMIT",
    requiredBoundaryId: overrides.requiredBoundaryId ?? "PGLITE_POSTGRES",
    acceptedEnvironmentClasses: overrides.acceptedEnvironmentClasses ?? ["LOCAL_REAL_BOUNDARY"],
    minimumEvidenceLevel,
    independenceRequirement: overrides.independenceRequirement ?? "AUTOMATED_OR_INDEPENDENT",
  };
  return AssuranceClaimSchema.parse({
    scope: "CURRENT",
    buildId: "BUILD-001",
    specId: "virro-vnext-build-001",
    ...definition,
    criterionDefinitionHash: createCriterionDefinitionHash(definition),
    subject: "Canonical commit",
    control: "Atomic state transition",
  });
}

function receipt(requirement: AssuranceClaim, overrides: Partial<DevelopmentEvidenceReceipt> = {}): DevelopmentEvidenceReceipt {
  return DevelopmentEvidenceReceiptSchema.parse({
    evidenceId: crypto.randomUUID(),
    buildId: requirement.buildId,
    specId: requirement.specId,
    criterionId: requirement.criterionId,
    criterionVersion: requirement.criterionVersion,
    criterionDefinitionHash: requirement.criterionDefinitionHash,
    subjectId: requirement.subjectId,
    controlId: requirement.controlId,
    boundaryId: requirement.requiredBoundaryId,
    environmentClass: requirement.acceptedEnvironmentClasses[0],
    subject: requirement.subject,
    control: requirement.control,
    actualEvidenceLevel: requirement.minimumEvidenceLevel,
    boundaryTested: "Test fixture",
    environment: "Vitest",
    executor: "Vitest",
    verifier: { name: "F7 verifier", role: "independent security verifier" },
    declaredIndependence: "AUTOMATED_GATE",
    participantBindings: automatedGateBindings(),
    provenance: { kind: "REPOSITORY_TEST", source: "tests/assurance/development-evidence.test.ts", immutableRef: "2b6196a382565267069f836f878a82d80df9f223" },
    commandTestIdentifier: "development evidence evaluator fixture",
    result: "PASS",
    limitations: [],
    skippedReason: null,
    artifactRefs: [],
    baselineSha: "2b6196a382565267069f836f878a82d80df9f223",
    resultSha: "2b6196a382565267069f836f878a82d80df9f223",
    timestamp: "2026-08-15T20:10:00.000Z",
    ...overrides,
  });
}

function automatedGateBindings(): DevelopmentEvidenceReceipt["participantBindings"] {
  return {
    executor: { actorId: "actor:test-executor", contextId: "context:test-execution", role: "EXECUTION" },
    verifier: { actorId: "actor:test-gate", contextId: "context:test-gate", role: "AUTOMATED_GATE" },
  };
}

function independentBindings(): DevelopmentEvidenceReceipt["participantBindings"] {
  return {
    executor: { actorId: "actor:executor-a", contextId: "context:execution-x", role: "EXECUTION" },
    verifier: { actorId: "actor:verifier-b", contextId: "context:verification-y", role: "VERIFICATION" },
  };
}

function sameActorBindings(): DevelopmentEvidenceReceipt["participantBindings"] {
  return {
    executor: { actorId: "actor:same", contextId: "context:execution-x", role: "EXECUTION" },
    verifier: { actorId: "actor:same", contextId: "context:verification-y", role: "VERIFICATION" },
  };
}
