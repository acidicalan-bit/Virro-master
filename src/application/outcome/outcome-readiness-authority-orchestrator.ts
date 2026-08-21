import type { AuthorityContext } from "@/src/domain/auth/authority";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { ResolvedOutcomeDependencySnapshot } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import type { ResolvedOutcomeReadinessCandidate } from "@/src/application/outcome/resolve-outcome-readiness-candidate";
import type {
  ReadinessAuthorityCommitRecord,
  ReadinessAuthorityCommitRepository,
} from "@/src/application/ports/outcome/readiness-authority-commit-repository";
import type { OutcomeReadinessAuthorityCommitMaterial } from "@/src/application/outcome/resolve-outcome-readiness-authority-commit-material";
import { immutableCopy } from "@/src/domain/outcome/specification/canonical";

type RequirementAuthorityResolver = Readonly<{
  resolve(input: Readonly<{ authority: AuthorityContext; outcomeTransactionId: string }>): Promise<ResolvedOutcomeRequirementAuthority>;
}>;
type SignalUniverseResolver = Readonly<{ resolve(authority: ResolvedOutcomeRequirementAuthority): Promise<ResolvedOutcomeSignalUniverse> }>;
type DependencySnapshotResolver = Readonly<{
  resolve(authority: ResolvedOutcomeRequirementAuthority, universe: ResolvedOutcomeSignalUniverse): Promise<ResolvedOutcomeDependencySnapshot>;
}>;
type ReadinessCandidateResolver = Readonly<{
  resolve(authority: ResolvedOutcomeRequirementAuthority, universe: ResolvedOutcomeSignalUniverse, dependency: ResolvedOutcomeDependencySnapshot): ResolvedOutcomeReadinessCandidate;
}>;
type MaterialResolver = Readonly<{
  resolve(input: Readonly<{ authority: ResolvedOutcomeRequirementAuthority; dependency: ResolvedOutcomeDependencySnapshot }>): Promise<OutcomeReadinessAuthorityCommitMaterial>;
}>;

export type OutcomeReadinessAuthorityOrchestratorDependencies = Readonly<{
  requirementAuthority: RequirementAuthorityResolver;
  signalUniverse: SignalUniverseResolver;
  dependencySnapshot: DependencySnapshotResolver;
  readinessCandidate: ReadinessCandidateResolver;
  material: MaterialResolver;
  commit: ReadinessAuthorityCommitRepository;
}>;

export type OutcomeReadinessAuthorityOrchestrationInput = Readonly<{
  authority: AuthorityContext;
  outcomeTransactionId: string;
}>;

export type OutcomeReadinessAuthorityOrchestrationResult = Readonly<{
  authorityCommit: ReadinessAuthorityCommitRecord;
  readiness: ResolvedOutcomeReadinessCandidate["readiness"];
  authorityScope: "COMMIT_TIME_SERIALIZED";
  postCommitCurrentness: "REVALIDATION_REQUIRED_FOR_CONSEQUENCE";
}>;

export type OutcomeReadinessAuthorityOrchestrationErrorCode =
  | "AUTHORITY_PHASE_FAILED"
  | "SIGNAL_UNIVERSE_PHASE_FAILED"
  | "DEPENDENCY_PHASE_FAILED"
  | "READINESS_PHASE_FAILED"
  | "MATERIAL_PHASE_FAILED"
  | "COMMIT_REJECTED";

export class OutcomeReadinessAuthorityOrchestrationError extends Error {
  constructor(readonly code: OutcomeReadinessAuthorityOrchestrationErrorCode, message = code) {
    super(message);
    this.name = "OutcomeReadinessAuthorityOrchestrationError";
  }
}

export class OutcomeReadinessAuthorityOrchestrator {
  private readonly operations: Readonly<{
    requirementAuthority: RequirementAuthorityResolver["resolve"];
    signalUniverse: SignalUniverseResolver["resolve"];
    dependencySnapshot: DependencySnapshotResolver["resolve"];
    readinessCandidate: ReadinessCandidateResolver["resolve"];
    material: MaterialResolver["resolve"];
    commit: ReadinessAuthorityCommitRepository["commit"];
  }>;

  constructor(dependencies: OutcomeReadinessAuthorityOrchestratorDependencies) {
    this.operations = Object.freeze({
      requirementAuthority: dependencies.requirementAuthority.resolve.bind(dependencies.requirementAuthority),
      signalUniverse: dependencies.signalUniverse.resolve.bind(dependencies.signalUniverse),
      dependencySnapshot: dependencies.dependencySnapshot.resolve.bind(dependencies.dependencySnapshot),
      readinessCandidate: dependencies.readinessCandidate.resolve.bind(dependencies.readinessCandidate),
      material: dependencies.material.resolve.bind(dependencies.material),
      commit: dependencies.commit.commit.bind(dependencies.commit),
    });
  }

  async run(input: OutcomeReadinessAuthorityOrchestrationInput): Promise<OutcomeReadinessAuthorityOrchestrationResult> {
    if (!input || !input.authority) {
      throw new OutcomeReadinessAuthorityOrchestrationError("AUTHORITY_PHASE_FAILED");
    }
    const authority = immutableCopy({
      principalId: input.authority.principalId,
      tenantId: input.authority.tenantId,
      membershipId: input.authority.membershipId,
      membershipRole: input.authority.membershipRole,
      sessionId: input.authority.sessionId,
      authenticationAssurance: input.authority.authenticationAssurance,
      authoritySource: input.authority.authoritySource,
      authorizationTimestamp: input.authority.authorizationTimestamp,
    });
    const outcomeTransactionId = input.outcomeTransactionId;
    const resolvedAuthority = await this.phase("AUTHORITY_PHASE_FAILED", () => this.operations.requirementAuthority({ authority, outcomeTransactionId }));
    const universe = await this.phase("SIGNAL_UNIVERSE_PHASE_FAILED", () => this.operations.signalUniverse(resolvedAuthority));
    const dependency = await this.phase("DEPENDENCY_PHASE_FAILED", () => this.operations.dependencySnapshot(resolvedAuthority, universe));
    const candidate = await this.phase("READINESS_PHASE_FAILED", () => this.operations.readinessCandidate(resolvedAuthority, universe, dependency));
    if (candidate.ownerTenantId !== resolvedAuthority.ownerTenantId
      || candidate.outcomeTransactionId !== resolvedAuthority.outcomeTransactionId
      || candidate.dependencySnapshot.dependencySnapshotHash !== dependency.dependencySnapshot.dependencySnapshotHash
      || candidate.readiness.ownerTenantId !== resolvedAuthority.ownerTenantId
      || candidate.readiness.transactionId !== resolvedAuthority.outcomeTransactionId) {
      throw new OutcomeReadinessAuthorityOrchestrationError("READINESS_PHASE_FAILED");
    }
    const material = await this.phase("MATERIAL_PHASE_FAILED", () => this.operations.material({ authority: resolvedAuthority, dependency }));

    let record: ReadinessAuthorityCommitRecord;
    try {
      record = await this.operations.commit({
        principalId: authority.principalId,
        ownerTenantId: resolvedAuthority.ownerTenantId,
        outcomeTransactionId: resolvedAuthority.outcomeTransactionId,
        transaction: material.transaction,
        asset: material.asset,
        sourceVersion: material.sourceVersion,
        binding: material.binding,
        requirements: resolvedAuthority.signalRequirements,
        dependencySnapshot: candidate.dependencySnapshot,
        qualifications: candidate.qualifications,
        readiness: candidate.readiness,
      });
    } catch {
      throw new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED");
    }

    if (record.ownerTenantId !== resolvedAuthority.ownerTenantId
      || record.outcomeTransactionId !== resolvedAuthority.outcomeTransactionId
      || record.principalId !== authority.principalId
      || record.dependencySnapshotHash !== candidate.dependencySnapshot.dependencySnapshotHash
      || record.readinessContentHash !== candidate.readiness.readinessContentHash) {
      throw new OutcomeReadinessAuthorityOrchestrationError("COMMIT_REJECTED");
    }

    return immutableCopy({
      authorityCommit: record,
      readiness: candidate.readiness,
      authorityScope: "COMMIT_TIME_SERIALIZED" as const,
      postCommitCurrentness: "REVALIDATION_REQUIRED_FOR_CONSEQUENCE" as const,
    });
  }

  private async phase<T>(code: OutcomeReadinessAuthorityOrchestrationErrorCode, operation: () => Promise<T> | T): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new OutcomeReadinessAuthorityOrchestrationError(code);
    }
  }
}

export function createOutcomeReadinessAuthorityOrchestrator(
  dependencies: OutcomeReadinessAuthorityOrchestratorDependencies,
): OutcomeReadinessAuthorityOrchestrator {
  return new OutcomeReadinessAuthorityOrchestrator(dependencies);
}
