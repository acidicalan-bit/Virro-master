import type { PreservationExperimentView } from "@/src/application/outcome/media/preservation-verification-service";
import type { CreateCriterionEvidenceRecord, CriterionEvidenceRecord } from "@/src/domain/outcome/criterion-evidence";
import type { TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import {
  PRECISION_EDIT_CRITERION_EVIDENCE_MAP_VERSION,
  PRECISION_EDIT_VERIFIER_ID,
  PRECISION_EDIT_VERIFIER_VERSION,
  evaluatePrecisionEditAssertionResults,
  precisionEditVerificationBinding,
  verificationDefinitionMatches,
} from "@/src/application/outcome/specification/verification-definition";

export { PRECISION_EDIT_CRITERION_EVIDENCE_MAP_VERSION, PRECISION_EDIT_VERIFIER_VERSION } from "@/src/application/outcome/specification/verification-definition";
export const PRECISION_EDIT_VERIFIER_NAME = PRECISION_EDIT_VERIFIER_ID;

type Assertion = PreservationExperimentView["machineVerification"]["assertions"][number];

export function buildPrecisionEditCriterionEvidence(input: {
  taskSpec: TaskSpec;
  base: PreservationExperimentView;
  tenantId: string;
}): CreateCriterionEvidenceRecord[] {
  const { taskSpec, base, tenantId } = input;
  const assertions = new Map(base.machineVerification.assertions.map((assertion) => [assertion.type, assertion]));
  const edit = requiredAssertion(assertions, "EDIT_REGION_HAS_CHANGE");
  const source = requiredAssertion(assertions, "SOURCE_IMMUTABLE");
  const provenance = requiredAssertion(assertions, "PROVENANCE_VALID");
  const specMatches = Boolean(
    base.taskSpecBinding
      && base.taskSpecBinding.id === taskSpec.id
      && base.taskSpecBinding.hash === taskSpec.hash
      && base.taskSpecBinding.blueprintId === taskSpec.blueprint.id
      && base.taskSpecBinding.blueprintHash === taskSpec.blueprint.hash
      && base.executionRunId
      && base.verificationRunId,
  );
  const common = {
    tenantId,
    transactionId: base.transactionId,
    verificationRunId: base.verificationRunId,
    executionRunId: base.executionRunId,
    taskSpecId: taskSpec.id,
    taskSpecVersion: taskSpec.version,
    taskSpecHash: taskSpec.hash,
    artifactBindings: {
      sourceVersionId: base.sourceVersionId,
      rawCandidateId: base.rawCandidateId,
      preservedCandidateId: base.preservedCandidateId,
    },
    verifier: (() => {
      const binding = precisionEditVerificationBinding();
      const assertionResults = base.machineVerification.assertions.map(({ type, passed }) => ({ id: type, required: true as const, passed }));
      return {
        name: PRECISION_EDIT_VERIFIER_NAME,
        version: binding.verifierVersion,
        policyVersion: binding.policyVersion,
        verifierId: binding.verifierId,
        verifierDefinitionHash: binding.verifierDefinitionHash,
        policyId: binding.policyId,
        policyDefinitionHash: binding.policyDefinitionHash,
        assertionResults,
        machineVerificationStatus: base.machineVerification.status,
      };
    })(),
  } as const;
  return [
    record(common, "REQUESTED_EDIT_HAS_CHANGE", edit.passed ? "PASS" : "FAIL", "METRIC", "VERIFIER", `verification://${base.verificationRunId}/REQUESTED_EDIT_HAS_CHANGE`, { sourceAssertion: edit }),
    record(common, "SOURCE_VERSION_MATCHES", source.passed && provenance.passed ? "PASS" : "FAIL", "HASH", "VERIFIER", `verification://${base.verificationRunId}/SOURCE_VERSION_MATCHES`, { sourceAssertion: source, provenanceAssertion: provenance }),
    record(common, "SAME_TASK_SPEC", specMatches ? "PASS" : "FAIL", "POLICY_CHECK", "SYSTEM_GATE", `verification://${base.verificationRunId}/SAME_TASK_SPEC`, {
      mappingVersion: PRECISION_EDIT_CRITERION_EVIDENCE_MAP_VERSION,
      expectedTaskSpecId: taskSpec.id,
      expectedTaskSpecHash: taskSpec.hash,
      executionRunId: base.executionRunId,
      verificationRunId: base.verificationRunId,
      taskSpecBinding: base.taskSpecBinding ?? null,
    }),
  ];
}

function record(
  common: Omit<CreateCriterionEvidenceRecord, "id" | "createdAt" | "criterionId" | "status" | "evidenceType" | "issuerRole" | "evidenceRef" | "details">,
  criterionId: string,
  status: CreateCriterionEvidenceRecord["status"],
  evidenceType: CreateCriterionEvidenceRecord["evidenceType"],
  issuerRole: CreateCriterionEvidenceRecord["issuerRole"],
  evidenceRef: string,
  details: Record<string, unknown>,
): CreateCriterionEvidenceRecord {
  return { ...common, criterionId, status, evidenceType, issuerRole, evidenceRef, details };
}

function requiredAssertion(assertions: Map<string, Assertion>, type: string): Assertion {
  const assertion = assertions.get(type);
  if (!assertion) throw new Error(`Missing required Precision Edit assertion ${type}.`);
  return assertion;
}

export function deriveMachineSameSpecFromDurableEvidence(input: {
  taskSpec: TaskSpec;
  evidence: CriterionEvidenceRecord[];
  expectedArtifactBindings: {
    sourceVersionId: string;
    rawCandidateId: string;
    preservedCandidateId: string;
  };
  tenantId: string;
  transactionId: string;
  executionRunId: string;
  verificationRunId: string;
}): "PASSED" | "FAILED" | "INCOMPLETE" {
  const required = input.taskSpec.criteria.filter((criterion) => criterion.critical && criterion.verifier !== "HUMAN_REVIEW");
  const relevant = input.evidence.filter((evidence) => required.some((criterion) => criterion.id === evidence.criterionId));
  const byCriterion = new Map<string, CriterionEvidenceRecord>();
  let globalVerifierStatus: "PASSED" | "FAILED" | "INCOMPLETE" | null = null;
  for (const evidence of relevant) {
    if (byCriterion.has(evidence.criterionId)) return "INCOMPLETE";
    if (
      evidence.tenantId !== input.tenantId
      || evidence.transactionId !== input.transactionId
      || evidence.executionRunId !== input.executionRunId
      || evidence.verificationRunId !== input.verificationRunId
      || evidence.taskSpecId !== input.taskSpec.id
      || evidence.taskSpecVersion !== input.taskSpec.version
      || evidence.taskSpecHash !== input.taskSpec.hash
      || evidence.artifactBindings.sourceVersionId !== input.expectedArtifactBindings.sourceVersionId
      || evidence.artifactBindings.rawCandidateId !== input.expectedArtifactBindings.rawCandidateId
      || evidence.artifactBindings.preservedCandidateId !== input.expectedArtifactBindings.preservedCandidateId
      || evidence.verifier.name !== PRECISION_EDIT_VERIFIER_NAME
      || evidence.verifier.version !== PRECISION_EDIT_VERIFIER_VERSION
      || evidence.verifier.policyVersion !== PRECISION_EDIT_CRITERION_EVIDENCE_MAP_VERSION
      || !verificationDefinitionMatches(evidence.verifier, precisionEditVerificationBinding())
    ) return "INCOMPLETE";
    const currentGlobalStatus = evaluatePrecisionEditAssertionResults(evidence.verifier.assertionResults);
    if (currentGlobalStatus === "INCOMPLETE") return "INCOMPLETE";
    if (evidence.verifier.machineVerificationStatus !== currentGlobalStatus) return "INCOMPLETE";
    if (globalVerifierStatus && globalVerifierStatus !== currentGlobalStatus) return "INCOMPLETE";
    globalVerifierStatus = currentGlobalStatus;
    const criterion = required.find((item) => item.id === evidence.criterionId)!;
    if (!criterion.evidenceTypes.includes(evidence.evidenceType) || evidence.status === "UNKNOWN") return "INCOMPLETE";
    byCriterion.set(evidence.criterionId, evidence);
  }
  if (byCriterion.size !== required.length) return "INCOMPLETE";
  if (!globalVerifierStatus) return "INCOMPLETE";
  if (globalVerifierStatus === "FAILED") return "FAILED";
  if ([...byCriterion.values()].some((evidence) => evidence.status === "FAIL")) return "FAILED";
  return "PASSED";
}
