import type {
  DelegationReadiness,
  DependencySnapshot,
  SignalQualification,
  SignalRequirement,
  EvaluatorIdentity,
} from "@/src/domain/outcome/signal-readiness";

export type ReadinessAuthorityTransactionMaterial = Readonly<{
  ownerTenantId: string;
  transactionId: string;
  projectId: string;
  assetId: string;
  baseVersionId: string;
  rawRequest: string;
}>;

export type ReadinessAuthorityAssetMaterial = Readonly<{
  id: string;
  ownerTenantId: string;
  projectId: string;
  currentVersionId: string | null;
}>;

export type ReadinessAuthorityVersionMaterial = Readonly<{
  id: string;
  ownerTenantId: string;
  assetId: string;
  versionNumber: number;
  parentVersionId: string | null;
  state: Record<string, unknown>;
}>;

export type ReadinessAuthorityBindingMaterial = Readonly<{
  bindingHash: string;
  blueprintId: string;
  blueprintVersion: number;
  blueprintHash: string;
  requirementProfileId: string;
  requirementProfileVersion: number;
  requirementProfileHash: string;
}>;

export type ReadinessAuthorityCommitInput = Readonly<{
  principalId: string;
  ownerTenantId: string;
  outcomeTransactionId: string;
  transaction: ReadinessAuthorityTransactionMaterial;
  asset: ReadinessAuthorityAssetMaterial;
  sourceVersion: ReadinessAuthorityVersionMaterial;
  binding: ReadinessAuthorityBindingMaterial;
  requirements: readonly SignalRequirement[];
  dependencySnapshot: DependencySnapshot;
  qualifications: readonly SignalQualification[];
  readiness: DelegationReadiness;
}>;

export type ReadinessAuthorityCommitRecord = Readonly<{
  authorityCommitId: string;
  ownerTenantId: string;
  outcomeTransactionId: string;
  principalId: string;
  dependencySnapshotId: string;
  dependencySnapshotHash: string;
  readinessId: string;
  readinessContentHash: string;
  evaluationTime: string;
  committedAt: string;
  schemaVersion: "build002-readiness-authority-commit-v0.1";
}>;

export interface ReadinessAuthorityCommitRepository {
  commit(input: ReadinessAuthorityCommitInput): Promise<ReadinessAuthorityCommitRecord>;
  findById(id: string): Promise<ReadinessAuthorityCommitRecord | null>;
  findByReadinessId(readinessId: string): Promise<ReadinessAuthorityCommitRecord | null>;
}

export type ReadinessAuthorityEvaluator = EvaluatorIdentity;
