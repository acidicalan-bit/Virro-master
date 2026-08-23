import { describe, expect, it } from "vitest";
import { createDelegabilityAdmission, verifyDelegabilityAdmissionHash } from "@/src/domain/outcome/delegability-admission";
import { currentDefaultEvaluator } from "@/src/domain/outcome/signal-readiness";

const uuid = "00000000-0000-4000-8000-000000000001";
const material = {
  ownerTenantId: "00000000-0000-4000-8000-000000000010",
  principalId: "00000000-0000-4000-8000-000000000011",
  membershipId: "00000000-0000-4000-8000-000000000012",
  authorityCommitId: "00000000-0000-4000-8000-000000000013",
  outcomeTransactionId: "00000000-0000-4000-8000-000000000014",
  readinessId: "00000000-0000-4000-8000-000000000015",
  readinessContentHash: "a".repeat(64),
  historicalDependencySnapshotHash: "b".repeat(64),
  currentDependencySnapshotHash: "b".repeat(64),
  evaluator: currentDefaultEvaluator(),
  revalidatedAt: "2026-08-23T12:00:00.000Z",
};

describe("BUILD002-C1-D3 delegability admission", () => {
  it("creates an immutable positive-only admission with a verifiable canonical hash", () => {
    const admission = createDelegabilityAdmission(material, "2026-08-23T12:00:01.000Z", uuid);
    expect(admission.readinessState).toBe("READY");
    expect(admission.currentness).toBe("CURRENT");
    expect(admission.scope).toBe("DELEGABILITY_ONLY");
    expect(admission.executionAuthorityGranted).toBe(false);
    expect(admission.executionStarted).toBe(false);
    expect(verifyDelegabilityAdmissionHash(admission)).toBe(true);
    expect(Object.isFrozen(admission)).toBe(true);
  });

  it("rejects caller tampering with the admission hash", () => {
    const admission = createDelegabilityAdmission(material, "2026-08-23T12:00:01.000Z", uuid);
    expect(verifyDelegabilityAdmissionHash({ ...admission, currentness: "CURRENT", admissionContentHash: "c".repeat(64) })).toBe(false);
  });

  it("keeps identical retries idempotent at the content identity", () => {
    const first = createDelegabilityAdmission(material, "2026-08-23T12:00:01.000Z", uuid);
    const retry = createDelegabilityAdmission(material, "2026-08-23T12:01:01.000Z", "00000000-0000-4000-8000-000000000002");
    expect(retry.admissionContentHash).toBe(first.admissionContentHash);
  });
});
