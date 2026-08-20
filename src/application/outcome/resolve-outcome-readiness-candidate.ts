import { immutableCopy } from "@/src/domain/outcome/specification/canonical";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { ResolvedOutcomeDependencySnapshot } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import {
  currentDefaultEvaluator,
  evaluateDelegationReadiness,
  evaluateSignalQualification,
  instantEquals,
  parseInstant,
  sameEvaluatorIdentity,
  verifyDependencySnapshotHash,
  verifyEvaluatorIdentity,
  verifyQualificationHash,
  verifyReadinessHash,
  type DelegationReadiness,
  type DependencySnapshot,
  type EvaluatorIdentity,
  type SignalQualification,
} from "@/src/domain/outcome/signal-readiness";

export type ReadinessCandidateClock = Readonly<{ now(): string }>;

export type ResolvedOutcomeReadinessCandidate = Readonly<{
  ownerTenantId: string;
  outcomeTransactionId: string;
  evaluationTime: string;
  evaluator: EvaluatorIdentity;
  dependencySnapshot: DependencySnapshot;
  qualifications: readonly SignalQualification[];
  readiness: DelegationReadiness;
  consistency: "NON_ATOMIC_CANDIDATE_EVALUATION";
}>;

export type OutcomeReadinessCandidateErrorCode =
  | "READINESS_CANDIDATE_AUTHORITY_MISMATCH"
  | "READINESS_CANDIDATE_UNIVERSE_MISMATCH"
  | "READINESS_CANDIDATE_DEPENDENCY_INVALID"
  | "READINESS_CANDIDATE_EVALUATOR_INVALID"
  | "READINESS_CANDIDATE_GENERATION_FAILED";

export class OutcomeReadinessCandidateError extends Error {
  constructor(readonly code: OutcomeReadinessCandidateErrorCode, message = code) {
    super(message);
    this.name = "OutcomeReadinessCandidateError";
  }
}

export class OutcomeReadinessCandidateResolver {
  constructor(private readonly clock: ReadinessCandidateClock = { now: () => new Date().toISOString() }) {}

  resolve(
    authority: ResolvedOutcomeRequirementAuthority,
    signalUniverse: ResolvedOutcomeSignalUniverse,
    resolvedDependency: ResolvedOutcomeDependencySnapshot,
  ): ResolvedOutcomeReadinessCandidate {
    this.assertComposition(authority, signalUniverse, resolvedDependency);
    const dependency = resolvedDependency.dependencySnapshot;
    if (!verifyDependencySnapshotHash(dependency)) throw new OutcomeReadinessCandidateError("READINESS_CANDIDATE_DEPENDENCY_INVALID");

    let evaluationTime: string;
    try {
      evaluationTime = parseInstant(this.clock.now());
    } catch {
      throw new OutcomeReadinessCandidateError("READINESS_CANDIDATE_GENERATION_FAILED");
    }
    const evaluator = currentDefaultEvaluator();
    if (!verifyEvaluatorIdentity(evaluator)) throw new OutcomeReadinessCandidateError("READINESS_CANDIDATE_EVALUATOR_INVALID");

    const requirements = [...authority.signalRequirements].sort((left, right) => left.requirementId.localeCompare(right.requirementId));
    const qualifications = requirements.map((requirement) => {
      const entry = signalUniverse.requirements.find((candidate) =>
        candidate.requirement.requirementId === requirement.requirementId
        && candidate.requirement.requirementDefinitionHash === requirement.requirementDefinitionHash);
      if (!entry) throw new OutcomeReadinessCandidateError("READINESS_CANDIDATE_UNIVERSE_MISMATCH");
      try {
        const qualification = evaluateSignalQualification({
          requirement,
          signals: [...entry.signals],
          currentDependencySnapshot: dependency,
          evaluator,
          evaluationTime,
        });
        if (!verifyQualificationHash(qualification)
          || qualification.ownerTenantId !== authority.ownerTenantId
          || qualification.transactionId !== authority.outcomeTransactionId
          || qualification.requirementDefinitionHash !== requirement.requirementDefinitionHash
          || qualification.dependencySnapshotHash !== dependency.dependencySnapshotHash
          || !sameEvaluatorIdentity(qualification.evaluator, evaluator)
          || !instantEquals(qualification.qualifiedAt, evaluationTime)) {
          throw new Error("invalid qualification");
        }
        return qualification;
      } catch (error) {
        if (error instanceof OutcomeReadinessCandidateError) throw error;
        throw new OutcomeReadinessCandidateError("READINESS_CANDIDATE_GENERATION_FAILED");
      }
    });

    let readiness: DelegationReadiness;
    try {
      readiness = evaluateDelegationReadiness({
        subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: authority.ownerTenantId, transactionId: authority.outcomeTransactionId },
        requirements,
        qualifications: [...qualifications],
        dependencySnapshot: dependency,
        taskSpecHash: dependency.taskSpecHash,
        sourceAssetVersionHash: dependency.sourceAssetVersionHash,
        blueprintHash: dependency.blueprintHash,
        policyHash: dependency.policyHash,
        policyBlock: null,
        conditionCodes: [],
        evaluator,
        evaluationTime,
      });
    } catch {
      throw new OutcomeReadinessCandidateError("READINESS_CANDIDATE_GENERATION_FAILED");
    }
    if (!verifyReadinessHash(readiness)
      || readiness.ownerTenantId !== authority.ownerTenantId
      || readiness.transactionId !== authority.outcomeTransactionId
      || readiness.dependencySnapshotHash !== dependency.dependencySnapshotHash
      || !sameEvaluatorIdentity(readiness.evaluator, evaluator)
      || !instantEquals(readiness.createdAt, evaluationTime)
      || readiness.conditionCodes.length !== 0) {
      throw new OutcomeReadinessCandidateError("READINESS_CANDIDATE_GENERATION_FAILED");
    }
    return immutableCopy({
      ownerTenantId: authority.ownerTenantId,
      outcomeTransactionId: authority.outcomeTransactionId,
      evaluationTime,
      evaluator,
      dependencySnapshot: dependency,
      qualifications,
      readiness,
      consistency: "NON_ATOMIC_CANDIDATE_EVALUATION",
    });
  }

  private assertComposition(
    authority: ResolvedOutcomeRequirementAuthority,
    universe: ResolvedOutcomeSignalUniverse,
    resolvedDependency: ResolvedOutcomeDependencySnapshot,
  ): void {
    if (authority.ownerTenantId !== universe.ownerTenantId
      || authority.outcomeTransactionId !== universe.outcomeTransactionId
      || authority.ownerTenantId !== resolvedDependency.ownerTenantId
      || authority.outcomeTransactionId !== resolvedDependency.outcomeTransactionId
      || resolvedDependency.dependencySnapshot.ownerTenantId !== authority.ownerTenantId
      || resolvedDependency.dependencySnapshot.transactionId !== authority.outcomeTransactionId) {
      throw new OutcomeReadinessCandidateError("READINESS_CANDIDATE_AUTHORITY_MISMATCH");
    }
    const requirements = [...authority.signalRequirements].sort((a, b) => a.requirementId.localeCompare(b.requirementId));
    const entries = [...universe.requirements].sort((a, b) => a.requirement.requirementId.localeCompare(b.requirement.requirementId));
    const hashes = [...resolvedDependency.dependencySnapshot.requirementDefinitionHashes].sort();
    if (requirements.length !== entries.length
      || new Set(requirements.map((r) => r.requirementId)).size !== requirements.length
      || requirements.some((r, i) => entries[i]?.requirement.requirementId !== r.requirementId || entries[i]?.requirement.requirementDefinitionHash !== r.requirementDefinitionHash)
      || hashes.length !== requirements.length
      || hashes.some((hash, i) => hash !== requirements[i]?.requirementDefinitionHash)) {
      throw new OutcomeReadinessCandidateError("READINESS_CANDIDATE_UNIVERSE_MISMATCH");
    }
    const expected = new Set(resolvedDependency.dependencySnapshot.signalReferences.map((ref) => `${ref.requirementId}:${ref.signalId}:${ref.contentHash}`));
    const actual = new Set(entries.flatMap((entry) => entry.signals.map((signal) => `${entry.requirement.requirementId}:${signal.signalId}:${signal.contentHash}`)));
    if (expected.size !== actual.size || [...expected].some((value) => !actual.has(value))) {
      throw new OutcomeReadinessCandidateError("READINESS_CANDIDATE_DEPENDENCY_INVALID");
    }
  }
}
