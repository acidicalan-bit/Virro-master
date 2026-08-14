import type { OutcomeBlueprintDefinition } from "@/src/domain/outcome/specification/outcome-blueprint";

export const PRECISION_EDIT_BLUEPRINT_ID = "50000000-0000-4000-8000-000000000001";

export function createPrecisionEditBlueprintDefinition(
  overrides: Partial<OutcomeBlueprintDefinition> = {},
): OutcomeBlueprintDefinition {
  const base: OutcomeBlueprintDefinition = {
    schemaVersion: "outcome-blueprint-v0.1",
    id: PRECISION_EDIT_BLUEPRINT_ID,
    version: 1,
    previousVersionHash: null,
    sku: { code: "PRECISION_EDIT_V01", digitalGoodClass: "OUTCOME_BLUEPRINT" },
    outcomeType: "PRECISION_IMAGE_EDIT",
    seller: { sellerId: "platform", displayName: "Digital Outcomes Platform" },
    variables: [
      { id: "instruction", kind: "PARAMETERIZED", description: "Customer-requested image edit.", critical: true, visibility: ["IMAGE_EXECUTOR", "VERIFIER"], valueType: "STRING", required: true },
      { id: "roi", kind: "PARAMETERIZED", description: "Normalized authorized edit region.", critical: true, visibility: ["IMAGE_EXECUTOR", "PRESERVATION_ENGINE", "VERIFIER"], valueType: "OBJECT", required: true },
      { id: "topology", kind: "PARAMETERIZED", description: "Observed or inferred edit topology.", critical: false, visibility: ["PRESERVATION_ENGINE", "VERIFIER"], valueType: "STRING", required: false, defaultValue: "LOCAL_INDEPENDENT", allowedValues: ["LOCAL_INDEPENDENT", "LOCAL_COUPLED", "STRUCTURAL", "GLOBAL"] },
      { id: "coupledBand", kind: "PARAMETERIZED", description: "Optional coupled preservation band.", critical: false, visibility: ["PRESERVATION_ENGINE", "VERIFIER"], valueType: "NUMBER", required: false, allowedValues: [0, 0.03, 0.04, 0.05, 0.08, 0.16] },
      { id: "providerGenerationCount", kind: "FIXED", description: "Exactly one raw provider generation.", critical: true, visibility: ["IMAGE_EXECUTOR", "VERIFIER"], value: 1, overridePolicy: "DENY" },
      { id: "canonicalCommitPolicy", kind: "FIXED", description: "Only verified and explicitly accepted output may commit.", critical: true, visibility: ["VERIFIER"], value: "VERIFIED_HUMAN_ACCEPTED_ONLY", overridePolicy: "DENY" },
      { id: "localCoupledNeedsBand", kind: "CONDITIONAL", description: "LOCAL_COUPLED requires an explicit coupled band.", critical: true, visibility: ["PRESERVATION_ENGINE", "VERIFIER"], when: { variableId: "topology", equals: "LOCAL_COUPLED" }, then: { variableId: "coupledBand", required: true } },
    ],
    deliverable: { mediaType: "image/png", description: "One immutable Precision Edit candidate with provenance and verification evidence." },
    capabilityPolicy: {
      required: ["READ_SOURCE", "CALL_IMAGE_PROVIDER", "WRITE_CANDIDATE"],
      optional: ["APPLY_PRESERVATION"],
      denied: ["READ_PRIVATE_CONTEXT", "NETWORK_ACCESS", "EXECUTE_CODE", "ACCESS_SECRETS", "COMMIT_CANONICAL"],
    },
    securityProfile: {
      unknownInputPolicy: "REQUIRE_INPUT",
      promptInjectionPolicy: "TREAT_AS_DATA",
      embeddedSecretPolicy: "FORBID",
      allowedMimeTypes: ["image/png"],
      maxSourceBytes: 10_000_000,
      operatorNotes: "Internal policy detail; never include in executor lenses.",
    },
    qualityProfile: {
      criteria: [
        { id: "REQUESTED_EDIT_HAS_CHANGE", description: "The authorized edit region contains measurable change.", critical: true, verifier: "PIXEL_DIFF", evidenceTypes: ["METRIC"], roles: ["IMAGE_EXECUTOR", "VERIFIER"] },
        { id: "SOURCE_VERSION_MATCHES", description: "Execution uses the bound immutable source version.", critical: true, verifier: "EXACT_HASH", evidenceTypes: ["HASH"], roles: ["IMAGE_EXECUTOR", "PRESERVATION_ENGINE", "VERIFIER"] },
        { id: "SAME_TASK_SPEC", description: "All result and evidence references match the current Task Spec hash.", critical: true, verifier: "SAME_SPEC_GATE", evidenceTypes: ["POLICY_CHECK"], roles: ["VERIFIER"] },
        { id: "HUMAN_ACCEPTED", description: "A human accepts the delivered candidate independently of machine checks.", critical: true, verifier: "HUMAN_REVIEW", evidenceTypes: ["HUMAN_JUDGMENT"], roles: ["VERIFIER"] },
      ],
    },
    budget: { maxProviderCalls: 1, maxCostUsd: null, maxLatencyMs: null },
    verificationPolicy: { requireSameSpecHash: true, criticalUnknownBlocksCommit: true, executorDoneIsEvidence: false },
  };
  return { ...base, ...overrides };
}
