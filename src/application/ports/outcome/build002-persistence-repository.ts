import type {
  DelegationReadiness,
  DependencySnapshot,
  Signal,
  SignalQualification,
  SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";

export type Build002TenantSnapshotScope = {
  ownerTenantId: string;
  outcomeTransactionId: string;
};

export type Build002ReadinessQualificationLink = {
  qualificationId: string;
  qualificationContentHash: string;
};

export interface Build002PersistenceRepository {
  insertRequirementSnapshot(scope: Build002TenantSnapshotScope, requirement: SignalRequirement): Promise<SignalRequirement>;
  findRequirementSnapshot(scope: Build002TenantSnapshotScope, requirementDefinitionHash: string): Promise<SignalRequirement | null>;
  insertSignal(scope: Build002TenantSnapshotScope, requirementDefinitionHash: string, signal: Signal): Promise<Signal>;
  findSignal(scope: Build002TenantSnapshotScope, signalId: string): Promise<Signal | null>;
  listSignalsForRequirement(scope: Build002TenantSnapshotScope, requirementDefinitionHash: string): Promise<Signal[]>;
  insertDependencySnapshot(scope: Build002TenantSnapshotScope, snapshot: DependencySnapshot): Promise<string>;
  findDependencySnapshot(scope: Build002TenantSnapshotScope, dependencySnapshotHash: string): Promise<DependencySnapshot | null>;
  insertQualification(scope: Build002TenantSnapshotScope, requirementDefinitionHash: string, dependencySnapshotId: string, qualification: SignalQualification): Promise<SignalQualification>;
  findQualification(scope: Build002TenantSnapshotScope, qualificationId: string): Promise<SignalQualification | null>;
  insertReadiness(scope: Build002TenantSnapshotScope, dependencySnapshotId: string, readiness: DelegationReadiness, qualificationLinks: Build002ReadinessQualificationLink[]): Promise<DelegationReadiness>;
  findReadiness(scope: Build002TenantSnapshotScope, readinessId: string): Promise<DelegationReadiness | null>;
  listReadiness(scope: Build002TenantSnapshotScope): Promise<DelegationReadiness[]>;
}
