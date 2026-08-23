import { describe, expect, it } from "vitest";

import { createDelegabilityAdmission, type DelegabilityAdmission } from "@/src/domain/outcome/delegability-admission";
import { currentDefaultEvaluator } from "@/src/domain/outcome/signal-readiness";
import { SupabaseDelegabilityAdmissionRepository } from "@/src/infrastructure/persistence/outcome/supabase-delegability-admission-repository";

const TENANT = "10000000-0000-4000-8000-000000000001";
const PRINCIPAL = "20000000-0000-4000-8000-000000000001";
const MEMBERSHIP = "30000000-0000-4000-8000-000000000001";
const AUTHORITY = "40000000-0000-4000-8000-000000000001";
const TRANSACTION = "50000000-0000-4000-8000-000000000001";
const READINESS = "60000000-0000-4000-8000-000000000001";

const material = {
  ownerTenantId: TENANT,
  principalId: PRINCIPAL,
  membershipId: MEMBERSHIP,
  authorityCommitId: AUTHORITY,
  outcomeTransactionId: TRANSACTION,
  readinessId: READINESS,
  readinessContentHash: "a".repeat(64),
  historicalDependencySnapshotHash: "b".repeat(64),
  currentDependencySnapshotHash: "b".repeat(64),
  evaluator: currentDefaultEvaluator(),
  revalidatedAt: "2026-08-23T12:00:00.000Z",
};

function row(admission: DelegabilityAdmission): Record<string, unknown> {
  return {
    schema_version: admission.schemaVersion,
    admission_id: admission.admissionId,
    owner_tenant_id: admission.ownerTenantId,
    principal_id: admission.principalId,
    membership_id: admission.membershipId,
    authority_commit_id: admission.authorityCommitId,
    outcome_transaction_id: admission.outcomeTransactionId,
    readiness_id: admission.readinessId,
    readiness_content_hash: admission.readinessContentHash,
    readiness_state: admission.readinessState,
    historical_dependency_snapshot_hash: admission.historicalDependencySnapshotHash,
    current_dependency_snapshot_hash: admission.currentDependencySnapshotHash,
    evaluator_schema_version: admission.evaluatorSchemaVersion,
    evaluator_version: admission.evaluatorVersion,
    evaluator_definition_hash: admission.evaluatorDefinitionHash,
    currentness: admission.currentness,
    revalidated_at: admission.revalidatedAt,
    admitted_at: admission.admittedAt,
    scope: admission.scope,
    execution_authority_granted: admission.executionAuthorityGranted,
    execution_started: admission.executionStarted,
    consequence_boundary: admission.consequenceBoundary,
    admission_content_hash: admission.admissionContentHash,
  };
}

function clientFor(persisted: Record<string, unknown>) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: persisted, error: null }),
  };
  return { from: () => chain } as never;
}

describe("BUILD002-C1-D3-R2 persisted admission integrity", () => {
  it("excludes admission identity and admittedAt while retaining revalidatedAt in the hash", () => {
    const first = createDelegabilityAdmission(material, "2026-08-23T12:00:01.000Z", "70000000-0000-4000-8000-000000000010");
    const sameEvidence = createDelegabilityAdmission(material, "2026-08-23T13:00:01.000Z", "70000000-0000-4000-8000-000000000011");
    const changedHistoricalTime = createDelegabilityAdmission({ ...material, revalidatedAt: "2026-08-23T12:00:01.000Z" }, "2026-08-23T13:00:01.000Z", "70000000-0000-4000-8000-000000000012");
    expect(sameEvidence.admissionContentHash).toBe(first.admissionContentHash);
    expect(changedHistoricalTime.admissionContentHash).not.toBe(first.admissionContentHash);
  });

  it("rejects a tampered persisted admission_content_hash on readback", async () => {
    const admission = createDelegabilityAdmission(material, "2026-08-23T12:00:01.000Z", "70000000-0000-4000-8000-000000000001");
    const persisted = row(admission);
    persisted.admission_content_hash = "0".repeat(64);
    const repository = new SupabaseDelegabilityAdmissionRepository(clientFor(persisted), TENANT);

    await expect(repository.findById(admission.admissionId)).rejects.toThrow("DELEGABILITY_ADMISSION_READBACK_FAILED");
  });

  it("returns a valid immutable persisted admission after canonical readback", async () => {
    const admission = createDelegabilityAdmission(material, "2026-08-23T12:00:01.000Z", "70000000-0000-4000-8000-000000000002");
    const repository = new SupabaseDelegabilityAdmissionRepository(clientFor(row(admission)), TENANT);

    await expect(repository.findById(admission.admissionId)).resolves.toEqual(admission);
  });
});
