import { TaskSpecSchema, verifyTaskSpecHash, type TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import { CriterionEvidenceSchema, TaskSpecExecutionResultSchema, type CriterionEvidence, type SameSpecVerificationRun, type TaskSpecExecutionResult } from "@/src/application/outcome/specification/types";
import { roleAllowsCapability } from "@/src/application/outcome/specification/spec-lens";

export class SameSpecGateError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "SameSpecGateError";
  }
}

export function verifySameSpecExecution(
  spec: TaskSpec,
  result: TaskSpecExecutionResult,
  options: { idFactory?: () => string; clock?: () => string } = {},
): SameSpecVerificationRun {
  const canonicalSpec = validateCanonicalSpec(spec);
  const parsedResult = TaskSpecExecutionResultSchema.parse(result);
  assertSpecIdentity(canonicalSpec, parsedResult.taskSpecId, parsedResult.taskSpecHash, "EXECUTION_SPEC_MISMATCH");
  const evidenceByCriterion = new Map<string, CriterionEvidence>();
  const knownCriteria = new Map(canonicalSpec.criteria.map((criterion) => [criterion.id, criterion]));
  for (const rawEvidence of parsedResult.evidence) {
    const evidence = CriterionEvidenceSchema.parse(rawEvidence);
    assertSpecIdentity(canonicalSpec, evidence.taskSpecId, evidence.taskSpecHash, "EVIDENCE_SPEC_MISMATCH");
    if (!knownCriteria.has(evidence.criterionId)) throw new SameSpecGateError("UNKNOWN_CRITERION", `Evidence references unknown criterion ${evidence.criterionId}.`);
    if (evidenceByCriterion.has(evidence.criterionId)) throw new SameSpecGateError("DUPLICATE_EVIDENCE", `Duplicate evidence for ${evidence.criterionId}.`);
    evidenceByCriterion.set(evidence.criterionId, evidence);
  }
  const criteria = canonicalSpec.criteria.map((criterion) => {
    const evidence = evidenceByCriterion.get(criterion.id);
    let status = evidence?.status ?? "UNKNOWN";
    if (evidence && !criterion.evidenceTypes.includes(evidence.evidenceType)) status = "UNKNOWN";
    if (evidence?.evidenceType === "EXECUTOR_ASSERTION") status = "UNKNOWN";
    if (evidence && !issuerCanSatisfyVerifier(evidence.issuerRole, criterion.verifier)) status = "UNKNOWN";
    if (criterion.critical && status === "NOT_APPLICABLE") status = "UNKNOWN";
    return { criterionId: criterion.id, critical: criterion.critical, status, evidenceId: evidence?.id ?? null };
  });
  const blocked = criteria.some((criterion) => criterion.critical && criterion.status === "UNKNOWN");
  const unauthorizedCapability = parsedResult.capabilityProfile.some((capability) => !canonicalSpec.capabilityGrant.includes(capability) || !roleAllowsCapability(parsedResult.producerRole, capability));
  const failed = unauthorizedCapability || parsedResult.violations.length > 0 || criteria.some((criterion) => criterion.status === "FAIL");
  return {
    id: options.idFactory?.() ?? crypto.randomUUID(),
    taskSpecId: canonicalSpec.id,
    taskSpecHash: canonicalSpec.hash,
    executionResultId: parsedResult.id,
    status: failed ? "FAILED" : blocked ? "BLOCKED" : "PASSED",
    criteria,
    verifiedAt: options.clock?.() ?? new Date().toISOString(),
  };
}

export function authorizeSameSpecCommit(input: {
  taskSpec: TaskSpec;
  currentTaskSpecHash: string;
  verification: SameSpecVerificationRun;
  baseVersionStillCurrent: boolean;
}): void {
  const canonicalSpec = validateCanonicalSpec(input.taskSpec);
  if (canonicalSpec.status !== "READY") throw new SameSpecGateError("TASK_SPEC_NOT_READY", "Only READY Task Specs can authorize commit.");
  if (input.currentTaskSpecHash !== canonicalSpec.hash) throw new SameSpecGateError("STALE_TASK_SPEC", "A stale Task Spec cannot authorize commit.");
  assertSpecIdentity(canonicalSpec, input.verification.taskSpecId, input.verification.taskSpecHash, "VERIFICATION_SPEC_MISMATCH");
  if (!input.baseVersionStillCurrent) throw new SameSpecGateError("STALE_BASE_VERSION", "The canonical asset head changed after Task Spec compilation.");
  if (input.verification.status !== "PASSED") throw new SameSpecGateError("NO_PROOF_NO_COMMIT", "Verification must pass before commit.");
  if (input.verification.criteria.some((criterion) => criterion.critical && criterion.status !== "PASS")) throw new SameSpecGateError("CRITICAL_CRITERION_NOT_PROVEN", "Every critical criterion requires positive evidence.");
}

function validateCanonicalSpec(spec: TaskSpec): TaskSpec {
  const parsed = TaskSpecSchema.safeParse(spec);
  if (!parsed.success || !verifyTaskSpecHash(parsed.data)) throw new SameSpecGateError("INVALID_TASK_SPEC", "Task Spec schema or content hash is invalid.");
  return parsed.data;
}

function issuerCanSatisfyVerifier(issuerRole: CriterionEvidence["issuerRole"], verifier: TaskSpec["criteria"][number]["verifier"]): boolean {
  if (verifier === "HUMAN_REVIEW") return issuerRole === "HUMAN_EVALUATOR";
  if (verifier === "SAME_SPEC_GATE") return issuerRole === "SYSTEM_GATE";
  return issuerRole === "VERIFIER";
}

function assertSpecIdentity(spec: TaskSpec, id: string, hash: string, code: string): void {
  if (id !== spec.id || hash !== spec.hash) throw new SameSpecGateError(code, "Evidence/result does not belong to the canonical Task Spec id and hash.");
}
