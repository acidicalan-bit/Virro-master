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

describe("derived verifier independence", () => {
  it("rejects a declared-independent receipt when executor and verifier are the same actor", () => {
    const evaluation = evaluate(bindings({ verifierActorId: "actor:a" }));

    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.incompatibilities[0].reasons).toEqual(expect.arrayContaining([
      "EXECUTOR_VERIFIER_ACTOR_NOT_DISTINCT",
      "DECLARED_INDEPENDENCE_CONFLICTS_WITH_DERIVED_RELATIONSHIP",
    ]));
  });

  it("rejects distinct actors that share one execution context", () => {
    const evaluation = evaluate(bindings({ verifierContextId: "context:run-x" }));

    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.incompatibilities[0].reasons).toContain("EXECUTOR_VERIFIER_CONTEXT_NOT_DISTINCT");
  });

  it("rejects a missing executor binding", () => {
    const evaluation = evaluate({ executor: null, verifier: verifierBinding() });

    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.independenceAssessments[0].reasons).toContain("EXECUTOR_BINDING_MISSING");
  });

  it("rejects a missing verifier binding", () => {
    const evaluation = evaluate({ executor: executorBinding(), verifier: null });

    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.independenceAssessments[0].reasons).toContain("VERIFIER_BINDING_MISSING");
  });

  it.each([
    ["executor identity", bindings({ executorActorId: null }), "EXECUTOR_IDENTITY_MISSING"],
    ["verifier identity", bindings({ verifierActorId: null }), "VERIFIER_IDENTITY_MISSING"],
    ["executor context", bindings({ executorContextId: null }), "EXECUTOR_CONTEXT_MISSING"],
    ["verifier context", bindings({ verifierContextId: null }), "VERIFIER_CONTEXT_MISSING"],
  ] as const)("rejects a missing %s", (_label, participantBindings, reason) => {
    const evaluation = evaluate(participantBindings);

    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.independenceAssessments[0].reasons).toContain(reason);
  });

  it("rejects a fake independence declaration without participant relationships", () => {
    const evaluation = evaluate({ executor: null, verifier: null }, "INDEPENDENT_VERIFIER");

    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.compatibleEvidenceIds).toEqual([]);
  });

  it("does not make independence mandatory for a RECORDED_ONLY criterion", () => {
    const criterion = claim("RECORDED_ONLY");
    const evaluation = evaluateClaim(criterion, [receipt(criterion, bindings({ verifierActorId: "actor:a" }))]);

    expect(evaluation.status).toBe("PROVEN");
    expect(evaluation.independenceAssessments[0].status).toBe("NOT_STRUCTURALLY_INDEPENDENT");
  });

  it("accepts distinct stable actors and contexts classified as execution and verification", () => {
    const evaluation = evaluate(bindings(), "IMPLEMENTER", {
      executor: "Same display name",
      verifier: { name: "Same display name", role: "free-form display metadata" },
    });

    expect(evaluation.status).toBe("PROVEN");
    expect(evaluation.independenceAssessments[0]).toMatchObject({
      status: "STRUCTURALLY_INDEPENDENT",
      reasons: [],
    });
  });

  it("rejects a verifier context classified as execution", () => {
    const participantBindings = bindings();
    participantBindings.verifier!.role = "EXECUTION";
    const evaluation = evaluate(participantBindings);

    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.independenceAssessments[0].reasons).toContain("VERIFIER_ROLE_NOT_VERIFICATION");
  });

  it("removes the legacy caller-supplied independence field from the strict receipt contract", () => {
    const criterion = claim("INDEPENDENT_VERIFIER");
    const validReceipt = receipt(criterion, bindings());

    expect(DevelopmentEvidenceReceiptSchema.safeParse({
      ...validReceipt,
      independence: "INDEPENDENT_VERIFIER",
    }).success).toBe(false);
  });
});

function evaluate(
  participantBindings: DevelopmentEvidenceReceipt["participantBindings"],
  declaredIndependence: DevelopmentEvidenceReceipt["declaredIndependence"] = "INDEPENDENT_VERIFIER",
  displayMetadata: Pick<DevelopmentEvidenceReceipt, "executor" | "verifier"> = {
    executor: "Actor A",
    verifier: { name: "Actor B", role: "independent verifier" },
  },
) {
  const criterion = claim("INDEPENDENT_VERIFIER");
  return evaluateClaim(criterion, [receipt(criterion, participantBindings, declaredIndependence, displayMetadata)]);
}

function claim(independenceRequirement: CriterionDefinitionInput["independenceRequirement"]): AssuranceClaim {
  const definition: CriterionDefinitionInput = {
    criterionId: "derived-independence",
    criterionVersion: 1,
    subjectId: "CANONICAL_COMMIT",
    controlId: "POSTGRES_ATOMIC_COMMIT",
    requiredBoundaryId: "PGLITE_POSTGRES",
    acceptedEnvironmentClasses: ["LOCAL_REAL_BOUNDARY"],
    minimumEvidenceLevel: "E3_LOCAL_REAL_BOUNDARY",
    independenceRequirement,
    acceptedProvenanceClasses: ["DECLARED_ONLY"],
    acceptedRunnerCommands: [],
    artifactRequirement: "NONE",
  };
  return AssuranceClaimSchema.parse({
    scope: "CURRENT",
    buildId: "BUILD-001-R1.1",
    specId: "virro-vnext-build-001-trust-foundation",
    ...definition,
    criterionDefinitionHash: createCriterionDefinitionHash(definition),
    subject: "Canonical commit",
    control: "Atomic PostgreSQL RPC transition",
  });
}

function receipt(
  criterion: AssuranceClaim,
  participantBindings: DevelopmentEvidenceReceipt["participantBindings"],
  declaredIndependence: DevelopmentEvidenceReceipt["declaredIndependence"] = "INDEPENDENT_VERIFIER",
  displayMetadata: Pick<DevelopmentEvidenceReceipt, "executor" | "verifier"> = {
    executor: "Actor A",
    verifier: { name: "Actor B", role: "independent verifier" },
  },
): DevelopmentEvidenceReceipt {
  return DevelopmentEvidenceReceiptSchema.parse({
    evidenceId: crypto.randomUUID(),
    buildId: criterion.buildId,
    specId: criterion.specId,
    criterionId: criterion.criterionId,
    criterionVersion: criterion.criterionVersion,
    criterionDefinitionHash: criterion.criterionDefinitionHash,
    subjectId: criterion.subjectId,
    controlId: criterion.controlId,
    boundaryId: criterion.requiredBoundaryId,
    environmentClass: criterion.acceptedEnvironmentClasses[0],
    subject: criterion.subject,
    control: criterion.control,
    actualEvidenceLevel: criterion.minimumEvidenceLevel,
    boundaryTested: criterion.requiredBoundaryId,
    environment: criterion.acceptedEnvironmentClasses[0],
    ...displayMetadata,
    declaredIndependence,
    participantBindings,
    provenance: {
      kind: "REPOSITORY_TEST",
      source: "tests/assurance/derived-independence.test.ts",
      immutableRef: "501db46c421a351be789555dd1a09ca3252bb541",
    },
    provenanceClass: "DECLARED_ONLY",
    issuerKind: "TEST_FIXTURE",
    runnerObservation: null,
    commandTestIdentifier: "R1.1 derived independence matrix",
    result: "PASS",
    limitations: ["Participant provenance authenticity remains unresolved for F7 R2."],
    skippedReason: null,
    artifactRefs: [],
    artifactBindings: [],
    receiptIntegrity: null,
    baselineSha: "501db46c421a351be789555dd1a09ca3252bb541",
    resultSha: "501db46c421a351be789555dd1a09ca3252bb541",
    timestamp: "2026-08-15T23:00:00.000Z",
  });
}

type BindingOverrides = {
  executorActorId?: string | null;
  executorContextId?: string | null;
  verifierActorId?: string | null;
  verifierContextId?: string | null;
};

function bindings(overrides: BindingOverrides = {}): DevelopmentEvidenceReceipt["participantBindings"] {
  return {
    executor: executorBinding(overrides.executorActorId, overrides.executorContextId),
    verifier: verifierBinding(overrides.verifierActorId, overrides.verifierContextId),
  };
}

function executorBinding(
  actorId: string | null = "actor:a",
  contextId: string | null = "context:run-x",
): NonNullable<DevelopmentEvidenceReceipt["participantBindings"]["executor"]> {
  return { actorId, contextId, role: "EXECUTION" };
}

function verifierBinding(
  actorId: string | null = "actor:b",
  contextId: string | null = "context:run-y",
): NonNullable<DevelopmentEvidenceReceipt["participantBindings"]["verifier"]> {
  return { actorId, contextId, role: "VERIFICATION" };
}
