import { createHash } from "node:crypto";
import { z } from "zod";

import { PRESERVATION_EVIDENCE_VERSION, PRESERVATION_POLICY_VERSION } from "@/src/domain/outcome/media/preservation";

const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const IdentifierSchema = z.string().trim().min(1).max(160);

export const VerificationDefinitionBindingSchema = z.object({
  verifierId: IdentifierSchema,
  verifierVersion: IdentifierSchema,
  verifierDefinitionHash: Sha256Schema,
  policyId: IdentifierSchema,
  policyVersion: IdentifierSchema,
  policyDefinitionHash: Sha256Schema,
}).strict();
export type VerificationDefinitionBinding = z.infer<typeof VerificationDefinitionBindingSchema>;
type VerificationDefinitionCandidate = Partial<VerificationDefinitionBinding> & {
  version?: string;
  policyVersion?: string;
};

export const PRECISION_EDIT_VERIFIER_ID = "precision-edit-same-spec-verifier" as const;
export const PRECISION_EDIT_VERIFIER_VERSION = "0.1.0" as const;
export const PRECISION_EDIT_POLICY_ID = "precision-edit-criterion-evidence-policy" as const;
export const PRECISION_EDIT_CRITERION_EVIDENCE_MAP_VERSION = "precision-edit-criterion-evidence-v0.1" as const;

// Only fields that change which assertions or evidence can satisfy a criterion
// belong in these material definitions. Operational timestamps and labels do not.
const PRECISION_EDIT_VERIFIER_MATERIAL = {
  verifierId: PRECISION_EDIT_VERIFIER_ID,
  verifierVersion: PRECISION_EDIT_VERIFIER_VERSION,
  methodologyVersion: "creative-assertions-v0.1",
  requiredAssertions: ["EDIT_REGION_HAS_CHANGE", "SOURCE_IMMUTABLE", "PROVENANCE_VALID"],
  resultRule: "all-required-assertions-must-pass",
} as const;

const PRECISION_EDIT_POLICY_MATERIAL = {
  policyId: PRECISION_EDIT_POLICY_ID,
  policyVersion: PRECISION_EDIT_CRITERION_EVIDENCE_MAP_VERSION,
  preservationPolicyVersion: PRESERVATION_POLICY_VERSION,
  preservationEvidenceVersion: PRESERVATION_EVIDENCE_VERSION,
  criteria: [
    { criterionId: "REQUESTED_EDIT_HAS_CHANGE", evidenceType: "METRIC", issuerRole: "VERIFIER" },
    { criterionId: "SOURCE_VERSION_MATCHES", evidenceType: "HASH", issuerRole: "VERIFIER" },
    { criterionId: "SAME_TASK_SPEC", evidenceType: "POLICY_CHECK", issuerRole: "SYSTEM_GATE" },
  ],
  qualificationRule: "exact-required-criterion-set-and-artifacts",
} as const;

export function createVerificationDefinitionFingerprint(material: unknown): string {
  return createHash("sha256").update(canonicalize(material)).digest("hex");
}

export function precisionEditVerificationBinding(): VerificationDefinitionBinding {
  return VerificationDefinitionBindingSchema.parse({
    verifierId: PRECISION_EDIT_VERIFIER_ID,
    verifierVersion: PRECISION_EDIT_VERIFIER_VERSION,
    verifierDefinitionHash: createVerificationDefinitionFingerprint(PRECISION_EDIT_VERIFIER_MATERIAL),
    policyId: PRECISION_EDIT_POLICY_ID,
    policyVersion: PRECISION_EDIT_CRITERION_EVIDENCE_MAP_VERSION,
    policyDefinitionHash: createVerificationDefinitionFingerprint(PRECISION_EDIT_POLICY_MATERIAL),
  });
}

export function verificationDefinitionMatches(
  candidate: VerificationDefinitionCandidate | null | undefined,
  expected: VerificationDefinitionBinding,
): boolean {
  const verifierVersion = candidate?.verifierVersion ?? candidate?.version;
  const policyVersion = candidate?.policyVersion;
  return Boolean(candidate)
    && candidate!.verifierId === expected.verifierId
    && verifierVersion === expected.verifierVersion
    && candidate!.verifierDefinitionHash === expected.verifierDefinitionHash
    && candidate!.policyId === expected.policyId
    && policyVersion === expected.policyVersion
    && candidate!.policyDefinitionHash === expected.policyDefinitionHash;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Verification definition cannot contain non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
      .join(",")}}`;
  }
  throw new Error(`Verification definition cannot contain ${typeof value}.`);
}
