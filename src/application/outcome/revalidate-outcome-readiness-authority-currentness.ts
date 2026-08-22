import type { AuthorityContext } from "@/src/domain/auth/authority";
import {
  currentDefaultEvaluator,
  evaluateReadinessValidity,
  instantEquals,
  parseInstant,
  sameEvaluatorIdentity,
  verifyDependencySnapshotHash,
  verifyEvaluatorIdentity,
  verifyReadinessHash,
  DelegationReadinessSchema,
  DependencySnapshotSchema,
  type DelegationReadiness,
  type DependencySnapshot,
  type EvaluatorIdentity,
  type ReadinessValidityState,
} from "@/src/domain/outcome/signal-readiness";
import { immutableCopy } from "@/src/domain/outcome/specification/canonical";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import {
  OutcomeDependencySnapshotError,
  type ResolvedOutcomeDependencySnapshot,
} from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import type { Build002PersistenceRepository, Build002TenantSnapshotScope } from "@/src/application/ports/outcome/build002-persistence-repository";
import type { ReadinessAuthorityCommitRecord } from "@/src/application/ports/outcome/readiness-authority-commit-repository";
import type { ReadinessAuthorityCommitScopedReader } from "@/src/application/ports/outcome/readiness-authority-commit-scoped-reader";

type RequirementAuthorityResolver = Readonly<{
  resolve(input: Readonly<{ authority: AuthorityContext; outcomeTransactionId: string }>): Promise<ResolvedOutcomeRequirementAuthority>;
}>;
type SignalUniverseResolver = Readonly<{ resolve(authority: ResolvedOutcomeRequirementAuthority): Promise<ResolvedOutcomeSignalUniverse> }>;
type DependencySnapshotResolver = Readonly<{
  resolve(authority: ResolvedOutcomeRequirementAuthority, universe: ResolvedOutcomeSignalUniverse): Promise<ResolvedOutcomeDependencySnapshot>;
}>;

export type OutcomeReadinessCurrentnessInput = Readonly<{
  authority: AuthorityContext;
  authorityCommitId: string;
}>;

export type ReadinessCurrentnessReasonCode =
  | "DEPENDENCY_SNAPSHOT_CHANGED"
  | "EVALUATOR_CHANGED"
  | "READINESS_EXPIRED"
  | "SOURCE_ASSET_HEAD_CHANGED";

export type OutcomeReadinessCurrentnessResult = Readonly<{
  authorityCommit: ReadinessAuthorityCommitRecord;
  historicalReadiness: DelegationReadiness;
  currentness: ReadinessValidityState;
  reasonCodes: readonly ReadinessCurrentnessReasonCode[];
  revalidatedAt: string;
  currentDependencySnapshotHash: string | null;
  assessmentScope: "NON_ATOMIC_POST_COMMIT_CURRENTNESS";
  consequenceBoundary: "SERIALIZED_RECHECK_REQUIRED_FOR_CONSEQUENCE";
}>;

export type OutcomeReadinessCurrentnessDependencies = Readonly<{
  scopedCommitReader: ReadinessAuthorityCommitScopedReader;
  requirementAuthority: RequirementAuthorityResolver;
  signalUniverse: SignalUniverseResolver;
  dependencySnapshot: DependencySnapshotResolver;
  persistence: Pick<Build002PersistenceRepository, "findReadiness" | "findDependencySnapshot">;
  clock?: Readonly<{ now(): string }>;
  evaluator?: Readonly<{ current(): EvaluatorIdentity }>;
}>;

export type OutcomeReadinessCurrentnessErrorCode =
  | "AUTHORITY_COMMIT_NOT_FOUND"
  | "HISTORICAL_GRAPH_INVALID"
  | "CURRENTNESS_PHASE_FAILED";

export class OutcomeReadinessCurrentnessError extends Error {
  constructor(readonly code: OutcomeReadinessCurrentnessErrorCode, message = code) {
    super(message);
    this.name = "OutcomeReadinessCurrentnessError";
  }
}

export class OutcomeReadinessAuthorityCurrentnessRevalidator {
  private readonly operations: Readonly<{
    findCommit: ReadinessAuthorityCommitScopedReader["findByScopedId"];
    resolveAuthority: RequirementAuthorityResolver["resolve"];
    resolveUniverse: SignalUniverseResolver["resolve"];
    resolveDependency: DependencySnapshotResolver["resolve"];
    findReadiness: Build002PersistenceRepository["findReadiness"];
    findDependency: Build002PersistenceRepository["findDependencySnapshot"];
  }>;
  private readonly clock: Readonly<{ now(): string }>;
  private readonly evaluator: Readonly<{ current(): EvaluatorIdentity }>;

  constructor(dependencies: OutcomeReadinessCurrentnessDependencies) {
    this.operations = Object.freeze({
      findCommit: dependencies.scopedCommitReader.findByScopedId.bind(dependencies.scopedCommitReader),
      resolveAuthority: dependencies.requirementAuthority.resolve.bind(dependencies.requirementAuthority),
      resolveUniverse: dependencies.signalUniverse.resolve.bind(dependencies.signalUniverse),
      resolveDependency: dependencies.dependencySnapshot.resolve.bind(dependencies.dependencySnapshot),
      findReadiness: dependencies.persistence.findReadiness.bind(dependencies.persistence),
      findDependency: dependencies.persistence.findDependencySnapshot.bind(dependencies.persistence),
    });
    this.clock = dependencies.clock ?? { now: () => new Date().toISOString() };
    this.evaluator = dependencies.evaluator ?? { current: currentDefaultEvaluator };
  }

  async run(input: OutcomeReadinessCurrentnessInput): Promise<OutcomeReadinessCurrentnessResult> {
    const authority = copyAuthority(input?.authority);
    const authorityCommitId = typeof input?.authorityCommitId === "string" ? input.authorityCommitId : "";
    if (!authority || !authorityCommitId.trim()) throw new OutcomeReadinessCurrentnessError("AUTHORITY_COMMIT_NOT_FOUND");

    let commit: ReadinessAuthorityCommitRecord | null;
    try {
      commit = await this.operations.findCommit({ ownerTenantId: authority.tenantId, authorityCommitId });
    } catch {
      throw new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED");
    }
    if (!commit) throw new OutcomeReadinessCurrentnessError("AUTHORITY_COMMIT_NOT_FOUND");
    assertCommitShape(commit, authority.tenantId);

    let resolvedAuthority: ResolvedOutcomeRequirementAuthority;
    try {
      resolvedAuthority = await this.operations.resolveAuthority({ authority, outcomeTransactionId: commit.outcomeTransactionId });
    } catch {
      throw new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED");
    }
    if (resolvedAuthority.ownerTenantId !== authority.tenantId
      || resolvedAuthority.outcomeTransactionId !== commit.outcomeTransactionId
      || commit.ownerTenantId !== authority.tenantId) {
      throw new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID");
    }

    const scope: Build002TenantSnapshotScope = {
      ownerTenantId: commit.ownerTenantId,
      outcomeTransactionId: commit.outcomeTransactionId,
    };
    const historicalReadiness = await this.readHistoricalReadiness(scope, commit);
    const historicalDependency = await this.readHistoricalDependency(scope, commit, historicalReadiness);

    let revalidatedAt: string;
    let currentEvaluator: EvaluatorIdentity;
    try {
      revalidatedAt = parseInstant(this.clock.now());
      currentEvaluator = this.evaluator.current();
      if (!verifyEvaluatorIdentity(currentEvaluator)) throw new Error("invalid evaluator");
    } catch {
      throw new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED");
    }

    let universe: ResolvedOutcomeSignalUniverse;
    try {
      universe = await this.operations.resolveUniverse(resolvedAuthority);
    } catch {
      throw new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED");
    }

    let currentDependency: ResolvedOutcomeDependencySnapshot;
    try {
      currentDependency = await this.operations.resolveDependency(resolvedAuthority, universe);
    } catch (error) {
      if (error instanceof OutcomeDependencySnapshotError && error.code === "SOURCE_ASSET_HEAD_CHANGED") {
        return this.result(commit, historicalReadiness, "STALE", ["SOURCE_ASSET_HEAD_CHANGED"], revalidatedAt, null);
      }
      throw new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED");
    }
    const currentSnapshot = validateCurrentDependency(currentDependency, resolvedAuthority);
    let currentness: ReadinessValidityState;
    try {
      currentness = evaluateReadinessValidity(historicalReadiness, currentSnapshot, revalidatedAt, currentEvaluator);
    } catch {
      throw new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED");
    }
    const reasonCodes = reasonCodesFor(currentness, historicalReadiness, historicalDependency, currentSnapshot, currentEvaluator);
    return this.result(commit, historicalReadiness, currentness, reasonCodes, revalidatedAt, currentSnapshot.dependencySnapshotHash);
  }

  private async readHistoricalReadiness(scope: Build002TenantSnapshotScope, commit: ReadinessAuthorityCommitRecord): Promise<DelegationReadiness> {
    let readiness: DelegationReadiness | null;
    try {
      readiness = await this.operations.findReadiness(scope, commit.readinessId);
    } catch {
      throw new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED");
    }
    if (!readiness) throw new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID");
    try {
      const parsed = DelegationReadinessSchema.parse(readiness);
      if (!verifyReadinessHash(parsed)
        || !verifyEvaluatorIdentity(parsed.evaluator)
        || parsed.id !== commit.readinessId
        || parsed.ownerTenantId !== commit.ownerTenantId
        || parsed.transactionId !== commit.outcomeTransactionId
        || parsed.readinessContentHash !== commit.readinessContentHash
        || parsed.dependencySnapshotHash !== commit.dependencySnapshotHash
        || !instantEquals(parsed.createdAt, commit.evaluationTime)) {
        throw new Error("historical readiness mismatch");
      }
      return immutableCopy(parsed);
    } catch {
      throw new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID");
    }
  }

  private async readHistoricalDependency(scope: Build002TenantSnapshotScope, commit: ReadinessAuthorityCommitRecord, readiness: DelegationReadiness): Promise<DependencySnapshot> {
    let dependency: DependencySnapshot | null;
    try {
      dependency = await this.operations.findDependency(scope, commit.dependencySnapshotHash);
    } catch {
      throw new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED");
    }
    try {
      const parsed = DependencySnapshotSchema.parse(dependency);
      if (!verifyDependencySnapshotHash(parsed)
        || parsed.ownerTenantId !== commit.ownerTenantId
        || parsed.transactionId !== commit.outcomeTransactionId
        || parsed.dependencySnapshotHash !== commit.dependencySnapshotHash
        || readiness.dependencySnapshotHash !== parsed.dependencySnapshotHash) {
        throw new Error("historical dependency mismatch");
      }
      return immutableCopy(parsed);
    } catch {
      throw new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID");
    }
  }

  private result(
    commit: ReadinessAuthorityCommitRecord,
    historicalReadiness: DelegationReadiness,
    currentness: ReadinessValidityState,
    reasonCodes: readonly ReadinessCurrentnessReasonCode[],
    revalidatedAt: string,
    currentDependencySnapshotHash: string | null,
  ): OutcomeReadinessCurrentnessResult {
    return immutableCopy({
      authorityCommit: commit,
      historicalReadiness,
      currentness,
      reasonCodes,
      revalidatedAt,
      currentDependencySnapshotHash,
      assessmentScope: "NON_ATOMIC_POST_COMMIT_CURRENTNESS" as const,
      consequenceBoundary: "SERIALIZED_RECHECK_REQUIRED_FOR_CONSEQUENCE" as const,
    });
  }
}

export function createOutcomeReadinessAuthorityCurrentnessRevalidator(
  dependencies: OutcomeReadinessCurrentnessDependencies,
): OutcomeReadinessAuthorityCurrentnessRevalidator {
  return new OutcomeReadinessAuthorityCurrentnessRevalidator(dependencies);
}

function copyAuthority(input: AuthorityContext | undefined): AuthorityContext | null {
  if (!input) return null;
  try {
    return immutableCopy({
      principalId: input.principalId,
      tenantId: input.tenantId,
      membershipId: input.membershipId,
      membershipRole: input.membershipRole,
      sessionId: input.sessionId,
      authenticationAssurance: input.authenticationAssurance,
      authoritySource: input.authoritySource,
      authorizationTimestamp: input.authorizationTimestamp,
    });
  } catch {
    return null;
  }
}

function assertCommitShape(commit: ReadinessAuthorityCommitRecord, tenantId: string): void {
  if (!commit.authorityCommitId.trim()
    || commit.ownerTenantId !== tenantId
    || !commit.outcomeTransactionId.trim()
    || !commit.principalId.trim()
    || !commit.dependencySnapshotHash.trim()
    || !commit.readinessId.trim()
    || !commit.readinessContentHash.trim()) {
    throw new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID");
  }
  try {
    parseInstant(commit.evaluationTime);
    parseInstant(commit.committedAt);
  } catch {
    throw new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID");
  }
}

function validateCurrentDependency(
  resolved: ResolvedOutcomeDependencySnapshot,
  authority: ResolvedOutcomeRequirementAuthority,
): DependencySnapshot {
  try {
    const snapshot = DependencySnapshotSchema.parse(resolved.dependencySnapshot);
    if (resolved.ownerTenantId !== authority.ownerTenantId
      || resolved.outcomeTransactionId !== authority.outcomeTransactionId
      || snapshot.ownerTenantId !== authority.ownerTenantId
      || snapshot.transactionId !== authority.outcomeTransactionId
      || !verifyDependencySnapshotHash(snapshot)) {
      throw new Error("invalid current dependency");
    }
    return snapshot;
  } catch {
    throw new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED");
  }
}

function reasonCodesFor(
  currentness: ReadinessValidityState,
  readiness: DelegationReadiness,
  historicalDependency: DependencySnapshot,
  currentDependency: DependencySnapshot,
  currentEvaluator: EvaluatorIdentity,
): ReadinessCurrentnessReasonCode[] {
  if (currentness === "CURRENT") return [];
  if (currentness === "EXPIRED") return ["READINESS_EXPIRED"];
  if (!sameEvaluatorIdentity(readiness.evaluator, currentEvaluator)) return ["EVALUATOR_CHANGED"];
  if (historicalDependency.dependencySnapshotHash !== currentDependency.dependencySnapshotHash) return ["DEPENDENCY_SNAPSHOT_CHANGED"];
  return [];
}
