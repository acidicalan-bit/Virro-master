import { describe, expect, it } from "vitest";

import { deriveFieldSemanticStatus, FIELD_ACCEPTANCE_SOURCE } from "@/src/domain/outcome/media/field-beta";

const base = {
  machineVerificationStatus: "PASSED" as const,
  legacySameSpecStatus: "BLOCKED" as const,
  hasValidSpecBinding: true,
  outcomeTenantId: "internal-lab",
  canonicalCommitPolicy: "VERIFIED_HUMAN_ACCEPTED_ONLY",
  serverAuthority: true,
};

function feedback(humanAccepted: boolean, overrides: Record<string, unknown> = {}) {
  return { humanAccepted, tenantId: "internal-lab", acceptanceSource: FIELD_ACCEPTANCE_SOURCE, recordedBy: "internal-evaluator" as const, ...overrides };
}

describe("VERIFY-SEMANTICS-001 field outcome projection", () => {
  it.each([
    ["A pending human review", null, "PASSED", "PENDING", "AWAITING_HUMAN", "NOT_ELIGIBLE"],
    ["B accepted human review", feedback(true), "PASSED", "ACCEPTED", "ACCEPTED", "ELIGIBLE"],
    ["C rejected human review", feedback(false), "PASSED", "REJECTED", "REJECTED", "NOT_ELIGIBLE"],
  ])("keeps machine and human dimensions distinct: %s", (_name, human, machine, humanStatus, outcome, eligibility) => {
    const result = deriveFieldSemanticStatus({ ...base, feedback: human });
    expect(result).toMatchObject({ machineSameSpecStatus: machine, humanAcceptanceStatus: humanStatus, outcomeAcceptanceStatus: outcome, commitEligibilityStatus: eligibility });
  });

  it("D: human acceptance cannot overwrite machine failure", () => {
    expect(deriveFieldSemanticStatus({ ...base, machineVerificationStatus: "FAILED", feedback: feedback(true) })).toMatchObject({ machineSameSpecStatus: "FAILED", outcomeAcceptanceStatus: "MACHINE_FAILED", commitEligibilityStatus: "NOT_ELIGIBLE" });
  });

  it("E: incomplete machine evidence remains independent of human state", () => {
    expect(deriveFieldSemanticStatus({ ...base, hasValidSpecBinding: false, feedback: feedback(true) })).toMatchObject({ machineSameSpecStatus: "INCOMPLETE", humanAcceptanceStatus: "ACCEPTED", outcomeAcceptanceStatus: "INCOMPLETE", commitEligibilityStatus: "NOT_ELIGIBLE" });
  });

  it("F: historical BLOCKED is not the current machine authority when binding is valid", () => {
    expect(deriveFieldSemanticStatus({ ...base, feedback: feedback(true) }).machineSameSpecStatus).toBe("PASSED");
  });

  it("G/H: foreign or untrusted acceptance does not create human acceptance", () => {
    expect(deriveFieldSemanticStatus({ ...base, feedback: feedback(true, { tenantId: "foreign" }) }).humanAcceptanceStatus).toBe("PENDING");
    expect(deriveFieldSemanticStatus({ ...base, feedback: feedback(true, { recordedBy: "client" }) }).humanAcceptanceStatus).toBe("PENDING");
  });
});
