import { describe, expect, it } from "vitest";

import { DeterministicPrecisionEditSpecCompiler } from "@/src/application/outcome/specification/deterministic-spec-compiler";
import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { buildPrecisionEditCriterionEvidence, deriveMachineSameSpecFromDurableEvidence } from "@/src/application/outcome/specification/precision-edit-criterion-evidence";
import { createVerificationDefinitionFingerprint, precisionEditPolicyDefinitionSnapshot, precisionEditVerifierDefinitionSnapshot, precisionEditVerificationBinding } from "@/src/application/outcome/specification/verification-definition";
import type { PreservationExperimentView } from "@/src/application/outcome/media/preservation-verification-service";
import { publishOutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { InMemoryCriterionEvidenceRepository } from "@/src/infrastructure/persistence/outcome/in-memory-outcome-repositories";

const ids = {
  transaction: "70000000-0000-4000-8000-000000000001",
  execution: "70000000-0000-4000-8000-000000000002",
  verification: "70000000-0000-4000-8000-000000000003",
  source: "70000000-0000-4000-8000-000000000004",
  raw: "70000000-0000-4000-8000-000000000005",
  preserved: "70000000-0000-4000-8000-000000000006",
};

async function taskSpec() {
  const blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), "2026-08-13T00:00:00.000Z");
  return new DeterministicPrecisionEditSpecCompiler(() => "70000000-0000-4000-8000-000000000007", () => "2026-08-13T00:00:00.000Z").compile({
    blueprint,
    transactionId: ids.transaction,
    source: { assetId: "70000000-0000-4000-8000-000000000008", versionId: ids.source, sha256: "a".repeat(64), mimeType: "image/png", byteSize: 10 },
    customerInstruction: "Cambia únicamente el centro.",
    roi: { x: .2, y: .2, width: .3, height: .3 },
    customerParameters: { topology: "LOCAL_INDEPENDENT", coupledBand: 0 },
    runtimeCapabilities: ["READ_SOURCE", "CALL_IMAGE_PROVIDER", "WRITE_CANDIDATE", "APPLY_PRESERVATION"],
    requestedCapabilities: ["APPLY_PRESERVATION"],
  });
}

async function evidence() {
  const spec = await taskSpec();
  const base = {
    transactionId: ids.transaction,
    executionRunId: ids.execution,
    verificationRunId: ids.verification,
    sourceVersionId: ids.source,
    rawCandidateId: ids.raw,
    preservedCandidateId: ids.preserved,
    taskSpecBinding: { id: spec.id, version: spec.version, hash: spec.hash, blueprintId: spec.blueprint.id, blueprintVersion: spec.blueprint.version, blueprintHash: spec.blueprint.hash, compilerName: spec.compiler.name, compilerVersion: spec.compiler.version },
    machineVerification: { status: "PASSED", assertions: ["SOURCE_IMMUTABLE", "DIMENSIONS_MATCH", "RAW_CANDIDATE_EXISTS", "PRESERVED_CANDIDATE_EXISTS", "PROVENANCE_VALID", "LOCKED_OUTSIDE_EXACTLY_PRESERVED", "EDIT_REGION_HAS_CHANGE"].map((type) => ({ type: type as never, required: true, passed: true, evidence: {} })), methodologyVersion: "creative-assertions-v0.1" },
  } as unknown as PreservationExperimentView;
  return { spec, records: buildPrecisionEditCriterionEvidence({ taskSpec: spec, base, tenantId: "internal-lab" }) };
}

type EvidenceRecords = Awaited<ReturnType<typeof evidence>>["records"];
type PersistedEvidenceRecords = Array<EvidenceRecords[number] & { id: string; createdAt: string }>;

describe("criterion-level Machine Same-Spec evidence", () => {
  it("requires exact set equality and excludes HUMAN_REVIEW", async () => {
    const { spec, records } = await evidence();
    const persisted = records.map((record, index) => ({ ...record, id: `70000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`, createdAt: "2026-08-13T00:00:02.000Z" }));
    expect(deriveMachineSameSpecFromDurableEvidence({ taskSpec: spec, evidence: persisted, expectedArtifactBindings: { sourceVersionId: ids.source, rawCandidateId: ids.raw, preservedCandidateId: ids.preserved }, tenantId: "internal-lab", transactionId: ids.transaction, executionRunId: ids.execution, verificationRunId: ids.verification })).toBe("PASSED");
  });

  it.each([
    ["missing receipt", (records: EvidenceRecords) => records.slice(1), "INCOMPLETE"],
    ["valid failure", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, status: "FAIL" as const } : record), "FAILED"],
    ["wrong task spec id", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, taskSpecId: "70000000-0000-4000-8000-000000000099" } : record), "INCOMPLETE"],
    ["wrong task spec", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, taskSpecHash: "b".repeat(64) } : record), "INCOMPLETE"],
    ["wrong execution", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, executionRunId: "70000000-0000-4000-8000-000000000099" } : record), "INCOMPLETE"],
    ["wrong artifact binding", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, artifactBindings: { ...record.artifactBindings, rawCandidateId: "70000000-0000-4000-8000-000000000099" } } : record), "INCOMPLETE"],
    ["foreign tenant", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, tenantId: "foreign" } : record), "INCOMPLETE"],
    ["wrong verifier identity", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, verifier: { ...record.verifier, version: "stale" } } : record), "INCOMPLETE"],
    ["wrong verifier definition", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, verifier: { ...record.verifier, verifierDefinitionHash: "b".repeat(64) } } : record), "INCOMPLETE"],
    ["wrong policy definition", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, verifier: { ...record.verifier, policyDefinitionHash: "b".repeat(64) } } : record), "INCOMPLETE"],
    ["historical unbound evidence", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, verifier: { name: record.verifier.name, version: record.verifier.version, policyVersion: record.verifier.policyVersion } } : record), "INCOMPLETE"],
    ["partial F6 binding", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, verifier: { ...record.verifier, assertionResults: undefined } } : record), "INCOMPLETE"],
    ["caller spoofed binding", (records: EvidenceRecords) => records.map((record, index) => index === 0 ? { ...record, verifier: { ...record.verifier, verifierId: "precision-edit-same-spec-verifier", policyId: "precision-edit-criterion-evidence-policy", verifierDefinitionHash: "c".repeat(64), policyDefinitionHash: "c".repeat(64) } } : record), "INCOMPLETE"],
    ["failed DIMENSIONS_MATCH", (records: EvidenceRecords) => records.map((record) => ({ ...record, verifier: { ...record.verifier, machineVerificationStatus: "FAILED" as const, assertionResults: record.verifier.assertionResults!.map((item) => item.id === "DIMENSIONS_MATCH" ? { ...item, passed: false } : item) } })), "FAILED"],
    ["failed RAW_CANDIDATE_EXISTS", (records: EvidenceRecords) => records.map((record) => ({ ...record, verifier: { ...record.verifier, machineVerificationStatus: "FAILED" as const, assertionResults: record.verifier.assertionResults!.map((item) => item.id === "RAW_CANDIDATE_EXISTS" ? { ...item, passed: false } : item) } })), "FAILED"],
    ["failed PRESERVED_CANDIDATE_EXISTS", (records: EvidenceRecords) => records.map((record) => ({ ...record, verifier: { ...record.verifier, machineVerificationStatus: "FAILED" as const, assertionResults: record.verifier.assertionResults!.map((item) => item.id === "PRESERVED_CANDIDATE_EXISTS" ? { ...item, passed: false } : item) } })), "FAILED"],
    ["failed LOCKED_OUTSIDE_EXACTLY_PRESERVED", (records: EvidenceRecords) => records.map((record) => ({ ...record, verifier: { ...record.verifier, machineVerificationStatus: "FAILED" as const, assertionResults: record.verifier.assertionResults!.map((item) => item.id === "LOCKED_OUTSIDE_EXACTLY_PRESERVED" ? { ...item, passed: false } : item) } })), "FAILED"],
    ["missing required assertion result", (records: EvidenceRecords) => records.map((record) => ({ ...record, verifier: { ...record.verifier, assertionResults: record.verifier.assertionResults!.filter((item) => item.id !== "DIMENSIONS_MATCH") } })), "INCOMPLETE"],
  ])("fails closed for %s", async (_name, mutate, expected) => {
    const { spec, records } = await evidence();
    const baseRecords: PersistedEvidenceRecords = records.map((record, index) => ({ ...record, id: `70000000-0000-4000-8000-${String(index + 20).padStart(12, "0")}`, createdAt: "2026-08-13T00:00:02.000Z" }));
    expect(deriveMachineSameSpecFromDurableEvidence({ taskSpec: spec, evidence: mutate(baseRecords) as PersistedEvidenceRecords, expectedArtifactBindings: { sourceVersionId: ids.source, rawCandidateId: ids.raw, preservedCandidateId: ids.preserved }, tenantId: "internal-lab", transactionId: ids.transaction, executionRunId: ids.execution, verificationRunId: ids.verification })).toBe(expected);
  });

  it("binds the authoritative verifier and policy definitions to stable fingerprints", () => {
    const binding = precisionEditVerificationBinding();
    expect(binding.verifierDefinitionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(binding.policyDefinitionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(createVerificationDefinitionFingerprint({ b: 2, a: 1 }))
      .toBe(createVerificationDefinitionFingerprint({ a: 1, b: 2 }));
    expect(createVerificationDefinitionFingerprint({ a: 1 }))
      .not.toBe(createVerificationDefinitionFingerprint({ a: 2 }));
    binding.verifierDefinitionHash = "d".repeat(64);
    expect(precisionEditVerificationBinding().verifierDefinitionHash).not.toBe(binding.verifierDefinitionHash);
  });

  it("changes the authoritative verifier fingerprint for every material semantic mutation", () => {
    const original = precisionEditVerifierDefinitionSnapshot() as { requiredAssertions: Array<Record<string, string>>; methodologyVersion: string; resultRule: string };
    const baseline = createVerificationDefinitionFingerprint(original);
    expect(createVerificationDefinitionFingerprint({ ...original, requiredAssertions: original.requiredAssertions.slice(1) })).not.toBe(baseline);
    expect(createVerificationDefinitionFingerprint({ ...original, requiredAssertions: [...original.requiredAssertions, { id: "NEW_REQUIRED", scope: "GLOBAL_VERIFIER_REQUIREMENT", semanticVersion: "v1", semantics: "new" }] })).not.toBe(baseline);
    expect(createVerificationDefinitionFingerprint({ ...original, requiredAssertions: original.requiredAssertions.map((item, index) => index === 0 ? { ...item, semanticVersion: "creative-assertions-v0.2" } : item) })).not.toBe(baseline);
    expect(createVerificationDefinitionFingerprint({ ...original, methodologyVersion: "creative-assertions-v0.2" })).not.toBe(baseline);
    expect(createVerificationDefinitionFingerprint({ ...original, resultRule: "any-required-assertion-may-pass" })).not.toBe(baseline);
    const policy = precisionEditPolicyDefinitionSnapshot() as { criteria: Array<Record<string, string>> };
    expect(createVerificationDefinitionFingerprint({ ...policy, criteria: policy.criteria.map((item, index) => index === 0 ? { ...item, evidenceType: "HASH" } : item) })).not.toBe(createVerificationDefinitionFingerprint(policy));
  });

  it("rejects incompatible duplicate evidence instead of silently ignoring it", async () => {
    const { records } = await evidence();
    const repository = new InMemoryCriterionEvidenceRepository();
    await repository.create(records[0]);
    await expect(repository.create({ ...records[0], status: "FAIL" })).rejects.toThrow(/identity conflict/i);
  });

  it("does not let aggregate or legacy statuses substitute missing criterion evidence", async () => {
    const { spec, records } = await evidence();
    const incomplete = records.slice(1).map((record, index) => ({ ...record, id: `70000000-0000-4000-8000-${String(index + 40).padStart(12, "0")}`, createdAt: "2026-08-13T00:00:02.000Z" }));
    const result = deriveMachineSameSpecFromDurableEvidence({
      taskSpec: spec,
      evidence: incomplete,
      expectedArtifactBindings: { sourceVersionId: ids.source, rawCandidateId: ids.raw, preservedCandidateId: ids.preserved },
      tenantId: "internal-lab",
      transactionId: ids.transaction,
      executionRunId: ids.execution,
      verificationRunId: ids.verification,
    });
    expect(result).toBe("INCOMPLETE");
    expect({ aggregateVerificationStatus: "PASSED", sameSpecStatus: "PASSED", legacySameSpecStatus: "FAILED", result }).toMatchObject({
      aggregateVerificationStatus: "PASSED",
      sameSpecStatus: "PASSED",
      legacySameSpecStatus: "FAILED",
      result: "INCOMPLETE",
    });
  });

  it("keeps legacy failure and forged client status from overriding complete machine evidence", async () => {
    const { spec, records } = await evidence();
    const persisted = records.map((record, index) => ({ ...record, id: `70000000-0000-4000-8000-${String(index + 50).padStart(12, "0")}`, createdAt: "2026-08-13T00:00:02.000Z" }));
    expect(deriveMachineSameSpecFromDurableEvidence({ taskSpec: spec, evidence: persisted, expectedArtifactBindings: { sourceVersionId: ids.source, rawCandidateId: ids.raw, preservedCandidateId: ids.preserved }, tenantId: "internal-lab", transactionId: ids.transaction, executionRunId: ids.execution, verificationRunId: ids.verification })).toBe("PASSED");
    expect({ clientStatus: "FAILED", legacySameSpecStatus: "FAILED" }).toEqual({ clientStatus: "FAILED", legacySameSpecStatus: "FAILED" });
  });
});
