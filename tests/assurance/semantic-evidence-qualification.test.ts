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
} from "@/src/assurance/development-evidence.mts";

describe("F7-R1 false-proof regression", () => {
  it("rejects an unrelated E5 workflow for an E4 cross-tenant RLS criterion", () => {
    const requirement = rlsClaim();
    expect(evaluateClaim(requirement, [receipt(requirement, {
      controlId: "NEXT_LEGACY_ROUTE_ISOLATION",
      boundaryId: "DEPLOYED_WEB_WORKFLOW",
      environmentClass: "DEPLOYED_E2E",
      actualEvidenceLevel: "E5_DEPLOYED_E2E",
    })]).status).toBe("NOT_PROVEN");
  });

  it("rejects E4 Storage evidence for an E4 RLS criterion", () => {
    const requirement = rlsClaim();
    expect(evaluateClaim(requirement, [receipt(requirement, {
      subjectId: "TENANT_STORAGE",
      controlId: "STORAGE_TENANT_ISOLATION",
      boundaryId: "SUPABASE_REMOTE_STORAGE",
    })]).status).toBe("NOT_PROVEN");
  });

  it("rejects an E3 PostgreSQL trigger for an E3 HTTP authentication criterion", () => {
    const requirement = makeClaim({
      criterionId: "http-authentication",
      subjectId: "REQUEST_IDENTITY",
      controlId: "HTTP_AUTHENTICATION",
      requiredBoundaryId: "LOCAL_HTTP_AUTH_BOUNDARY",
      acceptedEnvironmentClasses: ["LOCAL_REAL_BOUNDARY"],
      minimumEvidenceLevel: "E3_LOCAL_REAL_BOUNDARY",
    });
    expect(evaluateClaim(requirement, [receipt(requirement, {
      subjectId: "CANDIDATE_ASSET",
      controlId: "POSTGRES_CANDIDATE_IMMUTABILITY",
      boundaryId: "PGLITE_POSTGRES",
    })]).status).toBe("NOT_PROVEN");
  });

  it("rejects an unrelated E5 workflow for E3 atomicity", () => {
    const requirement = atomicClaim();
    expect(evaluateClaim(requirement, [receipt(requirement, {
      controlId: "NEXT_LEGACY_ROUTE_ISOLATION",
      boundaryId: "DEPLOYED_WEB_WORKFLOW",
      environmentClass: "DEPLOYED_E2E",
      actualEvidenceLevel: "E5_DEPLOYED_E2E",
    })]).status).toBe("NOT_PROVEN");
  });

  it("invalidates an old receipt when the same criterion ID changes control semantics", () => {
    const original = atomicClaim();
    const oldReceipt = receipt(original);
    const changed = makeClaim({
      criterionId: original.criterionId,
      criterionVersion: 2,
      subjectId: original.subjectId,
      controlId: "POSTGRES_COMMIT_IDEMPOTENCY",
      requiredBoundaryId: original.requiredBoundaryId,
      acceptedEnvironmentClasses: original.acceptedEnvironmentClasses,
      minimumEvidenceLevel: original.minimumEvidenceLevel,
    });
    const evaluation = evaluateClaim(changed, [oldReceipt]);
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.incompatibilities[0].reasons).toContain("CRITERION_DEFINITION_HASH_MISMATCH");
    expect(evaluation.incompatibilities[0].reasons).toContain("CONTROL_ID_MISMATCH");
  });

  it("invalidates an old receipt when the same criterion ID changes boundary semantics", () => {
    const original = atomicClaim();
    const oldReceipt = receipt(original);
    const changed = makeClaim({
      criterionId: original.criterionId,
      criterionVersion: 2,
      subjectId: original.subjectId,
      controlId: original.controlId,
      requiredBoundaryId: "SUPABASE_REMOTE_RPC",
      acceptedEnvironmentClasses: ["REMOTE_STAGING"],
      minimumEvidenceLevel: "E4_REMOTE_STAGING",
    });
    const evaluation = evaluateClaim(changed, [oldReceipt]);
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.incompatibilities[0].reasons).toContain("CRITERION_DEFINITION_HASH_MISMATCH");
    expect(evaluation.incompatibilities[0].reasons).toContain("BOUNDARY_ID_MISMATCH");
  });

  it("rejects a claim whose semantics drift without a new definition hash", () => {
    const original = atomicClaim();
    expect(() => AssuranceClaimSchema.parse({
      ...original,
      controlId: "POSTGRES_COMMIT_IDEMPOTENCY",
    })).toThrow(/does not match the authoritative criterion semantics/);
  });

  it("does not aggregate ten E1 receipts into E3", () => {
    const requirement = atomicClaim();
    const weak = Array.from({ length: 10 }, () => receipt(requirement, {
      boundaryId: "TRUST_HARNESS_MODEL",
      environmentClass: "LOCAL_MODEL",
      actualEvidenceLevel: "E1_MODEL",
    }));
    expect(evaluateClaim(requirement, weak).status).toBe("NOT_PROVEN");
  });

  it("does not aggregate E2 plus E3 into E4", () => {
    const requirement = rlsClaim();
    const weak = [
      receipt(requirement, {
        controlId: "NEXT_LEGACY_ROUTE_ISOLATION",
        boundaryId: "NEXT_ROUTE_HANDLER",
        environmentClass: "LOCAL_APPLICATION",
        actualEvidenceLevel: "E2_APPLICATION",
      }),
      receipt(requirement, {
        controlId: "POSTGRES_CANDIDATE_IMMUTABILITY",
        boundaryId: "PGLITE_POSTGRES",
        environmentClass: "LOCAL_REAL_BOUNDARY",
        actualEvidenceLevel: "E3_LOCAL_REAL_BOUNDARY",
      }),
    ];
    expect(evaluateClaim(requirement, weak).status).toBe("NOT_PROVEN");
  });
});

describe("F7-R1 positive controls", () => {
  it("proves F1 atomic commit with compatible PGlite E3 evidence", () => {
    const requirement = atomicClaim();
    expect(evaluateClaim(requirement, [receipt(requirement)])).toMatchObject({
      status: "PROVEN",
      compatibleEvidenceIds: [expect.any(String)],
    });
  });

  it("proves F2 route isolation with compatible Next handler E2 evidence", () => {
    const requirement = makeClaim({
      buildId: "BUILD-001-F2",
      criterionId: "legacy-route-isolation",
      subjectId: "LEGACY_PRECISION_EDIT_ROUTE",
      controlId: "NEXT_LEGACY_ROUTE_ISOLATION",
      requiredBoundaryId: "NEXT_ROUTE_HANDLER",
      acceptedEnvironmentClasses: ["LOCAL_APPLICATION"],
      minimumEvidenceLevel: "E2_APPLICATION",
    });
    expect(evaluateClaim(requirement, [receipt(requirement)])).toMatchObject({ status: "PROVEN" });
  });
});

type DefinitionOverrides = Partial<CriterionDefinitionInput> & { buildId?: string };

function atomicClaim(): AssuranceClaim {
  return makeClaim({
    criterionId: "atomic-commit",
    subjectId: "CANONICAL_COMMIT",
    controlId: "POSTGRES_ATOMIC_COMMIT",
    requiredBoundaryId: "PGLITE_POSTGRES",
    acceptedEnvironmentClasses: ["LOCAL_REAL_BOUNDARY"],
    minimumEvidenceLevel: "E3_LOCAL_REAL_BOUNDARY",
  });
}

function rlsClaim(): AssuranceClaim {
  return makeClaim({
    criterionId: "deployed-rls",
    subjectId: "TENANT_DATA",
    controlId: "SUPABASE_RLS_TENANT_READ",
    requiredBoundaryId: "SUPABASE_REMOTE_RLS",
    acceptedEnvironmentClasses: ["REMOTE_STAGING"],
    minimumEvidenceLevel: "E4_REMOTE_STAGING",
  });
}

function makeClaim(overrides: DefinitionOverrides): AssuranceClaim {
  const definition: CriterionDefinitionInput = {
    criterionId: overrides.criterionId ?? "criterion",
    criterionVersion: overrides.criterionVersion ?? 1,
    subjectId: overrides.subjectId ?? "CANONICAL_COMMIT",
    controlId: overrides.controlId ?? "POSTGRES_ATOMIC_COMMIT",
    requiredBoundaryId: overrides.requiredBoundaryId ?? "PGLITE_POSTGRES",
    acceptedEnvironmentClasses: overrides.acceptedEnvironmentClasses ?? ["LOCAL_REAL_BOUNDARY"],
    minimumEvidenceLevel: overrides.minimumEvidenceLevel ?? "E3_LOCAL_REAL_BOUNDARY",
    independenceRequirement: overrides.independenceRequirement ?? "AUTOMATED_OR_INDEPENDENT",
  };
  return AssuranceClaimSchema.parse({
    scope: "CURRENT",
    buildId: overrides.buildId ?? "BUILD-001",
    specId: "virro-vnext-build-001-trust-foundation",
    ...definition,
    criterionDefinitionHash: createCriterionDefinitionHash(definition),
    subject: definition.subjectId,
    control: definition.controlId,
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
    boundaryTested: requirement.requiredBoundaryId,
    environment: requirement.acceptedEnvironmentClasses[0],
    executor: "F7-R1",
    verifier: { name: "F7-R1", role: "security assurance" },
    independence: "AUTOMATED_GATE",
    provenance: { kind: "REPOSITORY_TEST", source: "tests/assurance/semantic-evidence-qualification.test.ts", immutableRef: "2b6196a382565267069f836f878a82d80df9f223" },
    commandTestIdentifier: "F7-R1 semantic qualification",
    result: "PASS",
    limitations: [],
    skippedReason: null,
    artifactRefs: [],
    baselineSha: "2b6196a382565267069f836f878a82d80df9f223",
    resultSha: "2b6196a382565267069f836f878a82d80df9f223",
    timestamp: "2026-08-15T20:20:00.000Z",
    ...overrides,
  });
}
