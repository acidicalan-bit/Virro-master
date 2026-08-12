import type {
  ProjectRecord,
  CreateProjectRecord,
  ProjectRepository,
  AssetRecord,
  CreateAssetRecord,
  AssetRepository,
  AssetVersionRecord,
  CreateAssetVersionRecord,
  AssetVersionRepository,
  OutcomeTransactionRecord,
  CreateOutcomeTransactionRecord,
  OutcomeTransactionRepository,
  PartialIntentRecord,
  CreatePartialIntentRecord,
  PartialIntentRepository,
  SemanticPatchRecord,
  CreateSemanticPatchRecord,
  SemanticPatchRepository,
  MutationLeaseRecord,
  CreateMutationLeaseRecord,
  MutationLeaseRepository,
  ExecutionRunRecord,
  CreateExecutionRunRecord,
  ExecutionRunRepository,
  EvidenceReceiptRecord,
  CreateEvidenceReceiptRecord,
  EvidenceReceiptRepository,
  VerificationRunRecord,
  CreateVerificationRunRecord,
  VerificationRunRepository,
  StateCommitRecord,
  CreateStateCommitRecord,
  StateCommitRepository,
  CostRecordRecord,
  CreateCostRecordRecord,
  CostRecordRepository,
  MediaStorageRecord,
  CreateMediaStorageRecord,
  MediaStorageRepository,
  SemanticSnapshotRecord,
  CreateSemanticSnapshotRecord,
  SemanticSnapshotRepository,
  ImageEvidenceRecord,
  CreateImageEvidenceRecord,
  ImageEvidenceRepository,
  CandidateAssetRecord,
  CreateCandidateAssetRecord,
  CandidateAssetRepository,
  PreservationRunRecord,
  CreatePreservationRunRecord,
  PreservationRunRepository,
  PreservationEvidenceRecord,
  CreatePreservationEvidenceRecord,
  PreservationEvidenceRepository,
  CandidatePreferenceRecord,
  CreateCandidatePreferenceRecord,
  CandidatePreferenceRepository,
} from "@/src/application/ports/repositories";
import type { CandidateType } from "@/src/domain/outcome/media/preservation";
import type { TransactionStatus } from "@/src/domain/outcome";

export class InMemoryProjectRepository implements ProjectRepository {
  readonly records: ProjectRecord[] = [];

  async create(input: CreateProjectRecord): Promise<ProjectRecord> {
    const now = new Date().toISOString();
    const record: ProjectRecord = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<ProjectRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async list(): Promise<ProjectRecord[]> {
    return [...this.records];
  }

  async update(id: string, input: Partial<CreateProjectRecord>): Promise<ProjectRecord> {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error("Proyecto no encontrado.");
    Object.assign(record, input, { updatedAt: new Date().toISOString() });
    return record;
  }
}

export class InMemoryAssetRepository implements AssetRepository {
  readonly records: AssetRecord[] = [];

  async create(input: CreateAssetRecord): Promise<AssetRecord> {
    const now = new Date().toISOString();
    const record: AssetRecord = { ...input, id: crypto.randomUUID(), currentVersionId: null, createdAt: now, updatedAt: now };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<AssetRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async findByProjectId(projectId: string): Promise<AssetRecord[]> {
    return this.records.filter((r) => r.projectId === projectId);
  }

  async update(id: string, input: Partial<CreateAssetRecord> & { currentVersionId?: string | null }): Promise<AssetRecord> {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error("Activo no encontrado.");
    Object.assign(record, input, { updatedAt: new Date().toISOString() });
    return record;
  }
}

export class InMemoryAssetVersionRepository implements AssetVersionRepository {
  readonly records: AssetVersionRecord[] = [];

  async create(input: CreateAssetVersionRecord): Promise<AssetVersionRecord> {
    const record: AssetVersionRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<AssetVersionRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async findByAssetId(assetId: string): Promise<AssetVersionRecord[]> {
    return this.records
      .filter((r) => r.assetId === assetId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  async findLatestByAssetId(assetId: string): Promise<AssetVersionRecord | null> {
    const versions = await this.findByAssetId(assetId);
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }
}

export class InMemoryOutcomeTransactionRepository implements OutcomeTransactionRepository {
  readonly records: OutcomeTransactionRecord[] = [];

  async create(input: CreateOutcomeTransactionRecord): Promise<OutcomeTransactionRecord> {
    const now = new Date().toISOString();
    const record: OutcomeTransactionRecord = {
      ...input,
      id: crypto.randomUUID(),
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      abortReason: null,
    };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<OutcomeTransactionRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async findByAssetId(assetId: string): Promise<OutcomeTransactionRecord[]> {
    return this.records.filter((r) => r.assetId === assetId);
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
    extra?: { abortReason?: string | null; completedAt?: string | null },
  ): Promise<OutcomeTransactionRecord> {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error("Transacción no encontrada.");
    record.status = status;
    record.updatedAt = new Date().toISOString();
    if (extra?.abortReason !== undefined) record.abortReason = extra.abortReason;
    if (extra?.completedAt !== undefined) record.completedAt = extra.completedAt;
    return record;
  }
}

export class InMemoryPartialIntentRepository implements PartialIntentRepository {
  readonly records: PartialIntentRecord[] = [];

  async create(input: CreatePartialIntentRecord): Promise<PartialIntentRecord> {
    const record: PartialIntentRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<PartialIntentRecord[]> {
    return this.records.filter((r) => r.transactionId === transactionId);
  }
}

export class InMemorySemanticPatchRepository implements SemanticPatchRepository {
  readonly records: SemanticPatchRecord[] = [];

  async create(input: CreateSemanticPatchRecord): Promise<SemanticPatchRecord> {
    const record: SemanticPatchRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<SemanticPatchRecord[]> {
    return this.records.filter((r) => r.transactionId === transactionId);
  }
}

export class InMemoryMutationLeaseRepository implements MutationLeaseRepository {
  readonly records: MutationLeaseRecord[] = [];

  async create(input: CreateMutationLeaseRecord): Promise<MutationLeaseRecord> {
    const record: MutationLeaseRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<MutationLeaseRecord[]> {
    return this.records.filter((r) => r.transactionId === transactionId);
  }
}

export class InMemoryExecutionRunRepository implements ExecutionRunRepository {
  readonly records: ExecutionRunRecord[] = [];

  async create(input: CreateExecutionRunRecord): Promise<ExecutionRunRecord> {
    const record: ExecutionRunRecord = { ...input, id: input.id ?? crypto.randomUUID() };
    this.records.push(record);
    return record;
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<ExecutionRunRecord> {
    const record = this.records.find((item) => item.id === id);
    if (!record) throw new Error("Execution run not found.");
    record.metadata = metadata;
    return record;
  }

  async findById(id: string): Promise<ExecutionRunRecord | null> { return this.records.find((item) => item.id === id) ?? null; }

  async findByTransactionId(transactionId: string): Promise<ExecutionRunRecord[]> {
    return this.records.filter((r) => r.transactionId === transactionId);
  }
}

export class InMemoryEvidenceReceiptRepository implements EvidenceReceiptRepository {
  readonly records: EvidenceReceiptRecord[] = [];

  async create(input: CreateEvidenceReceiptRecord): Promise<EvidenceReceiptRecord> {
    const record: EvidenceReceiptRecord = { ...input, id: crypto.randomUUID() };
    this.records.push(record);
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<EvidenceReceiptRecord[]> {
    return this.records.filter((r) => r.transactionId === transactionId);
  }
}

export class InMemoryVerificationRunRepository implements VerificationRunRepository {
  readonly records: VerificationRunRecord[] = [];

  async create(input: CreateVerificationRunRecord): Promise<VerificationRunRecord> {
    const record: VerificationRunRecord = { ...input, id: crypto.randomUUID(), verifiedAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<VerificationRunRecord[]> {
    return this.records.filter((r) => r.transactionId === transactionId);
  }
}

export class InMemoryStateCommitRepository implements StateCommitRepository {
  readonly records: StateCommitRecord[] = [];

  async create(input: CreateStateCommitRecord): Promise<StateCommitRecord> {
    const record: StateCommitRecord = { ...input, id: crypto.randomUUID(), committedAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<StateCommitRecord | null> {
    return this.records.find((r) => r.transactionId === transactionId) ?? null;
  }
}

export class InMemoryCostRecordRepository implements CostRecordRepository {
  readonly records: CostRecordRecord[] = [];

  async create(input: CreateCostRecordRecord): Promise<CostRecordRecord> {
    const record: CostRecordRecord = { ...input, id: crypto.randomUUID(), recordedAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<CostRecordRecord[]> {
    return this.records.filter((r) => r.transactionId === transactionId);
  }
}

import type { RepositoryBundle } from "@/src/application/ports/repositories";

export function getInMemoryOutcomeRepositories(): Pick<
  RepositoryBundle,
  | "projects"
  | "assets"
  | "assetVersions"
  | "outcomeTransactions"
  | "partialIntents"
  | "semanticPatches"
  | "mutationLeases"
  | "executionRuns"
  | "evidenceReceipts"
  | "verificationRuns"
  | "stateCommits"
  | "costRecords"
  | "mediaStorage"
  | "semanticSnapshots"
  | "imageEvidence"
  | "candidateAssets"
  | "preservationRuns"
  | "preservationEvidence"
  | "candidatePreferences"
> {
  return {
    projects: new InMemoryProjectRepository(),
    assets: new InMemoryAssetRepository(),
    assetVersions: new InMemoryAssetVersionRepository(),
    outcomeTransactions: new InMemoryOutcomeTransactionRepository(),
    partialIntents: new InMemoryPartialIntentRepository(),
    semanticPatches: new InMemorySemanticPatchRepository(),
    mutationLeases: new InMemoryMutationLeaseRepository(),
    executionRuns: new InMemoryExecutionRunRepository(),
    evidenceReceipts: new InMemoryEvidenceReceiptRepository(),
    verificationRuns: new InMemoryVerificationRunRepository(),
    stateCommits: new InMemoryStateCommitRepository(),
    costRecords: new InMemoryCostRecordRepository(),
    mediaStorage: new InMemoryMediaStorageRepository(),
    semanticSnapshots: new InMemorySemanticSnapshotRepository(),
    imageEvidence: new InMemoryImageEvidenceRepository(),
    candidateAssets: new InMemoryCandidateAssetRepository(),
    preservationRuns: new InMemoryPreservationRunRepository(),
    preservationEvidence: new InMemoryPreservationEvidenceRepository(),
    candidatePreferences: new InMemoryCandidatePreferenceRepository(),
  };
}

export class InMemoryMediaStorageRepository implements MediaStorageRepository {
  readonly records: MediaStorageRecord[] = [];

  async create(input: CreateMediaStorageRecord): Promise<MediaStorageRecord> {
    const record: MediaStorageRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByAssetId(assetId: string): Promise<MediaStorageRecord[]> {
    return this.records.filter((r) => r.assetId === assetId);
  }

  async findByStorageKey(storageKey: string): Promise<MediaStorageRecord | null> {
    return this.records.find((r) => r.storageKey === storageKey) ?? null;
  }
}

export class InMemorySemanticSnapshotRepository implements SemanticSnapshotRepository {
  readonly records: SemanticSnapshotRecord[] = [];

  async create(input: CreateSemanticSnapshotRecord): Promise<SemanticSnapshotRecord> {
    const record: SemanticSnapshotRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<SemanticSnapshotRecord | null> {
    return this.records.find((r) => r.transactionId === transactionId) ?? null;
  }
}

export class InMemoryImageEvidenceRepository implements ImageEvidenceRepository {
  readonly records: ImageEvidenceRecord[] = [];

  async create(input: CreateImageEvidenceRecord): Promise<ImageEvidenceRecord> {
    const record: ImageEvidenceRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByEvidenceReceiptId(evidenceReceiptId: string): Promise<ImageEvidenceRecord | null> {
    return this.records.find((r) => r.evidenceReceiptId === evidenceReceiptId) ?? null;
  }
}

export class InMemoryCandidateAssetRepository implements CandidateAssetRepository {
  readonly records: CandidateAssetRecord[] = [];

  async create(input: CreateCandidateAssetRecord): Promise<CandidateAssetRecord> {
    const record: CandidateAssetRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<CandidateAssetRecord[]> {
    return this.records.filter((r) => r.transactionId === transactionId);
  }

  async findById(id: string): Promise<CandidateAssetRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async findByExecutionRunId(executionRunId: string): Promise<CandidateAssetRecord | null> {
    return this.records.find((r) => r.executionRunId === executionRunId && r.candidateType === "RAW_PROVIDER") ?? null;
  }

  async findByExecutionRunIdAndType(executionRunId: string, candidateType: CandidateType): Promise<CandidateAssetRecord | null> {
    return this.records.find((r) => r.executionRunId === executionRunId && r.candidateType === candidateType) ?? null;
  }

  async markCommitted(id: string): Promise<CandidateAssetRecord> {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error("Candidate asset not found.");
    record.committed = true;
    return record;
  }
}

export class InMemoryPreservationRunRepository implements PreservationRunRepository {
  readonly records: PreservationRunRecord[] = [];

  async create(input: CreatePreservationRunRecord): Promise<PreservationRunRecord> {
    const record = { ...structuredClone(input), id: crypto.randomUUID() };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<PreservationRunRecord | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByTransactionId(transactionId: string): Promise<PreservationRunRecord[]> {
    return this.records.filter((record) => record.transactionId === transactionId);
  }

  async update(id: string, input: Partial<Omit<PreservationRunRecord, "id" | "transactionId" | "executionRunId" | "sourceVersionId" | "rawCandidateId" | "startedAt">>): Promise<PreservationRunRecord> {
    const record = this.records.find((item) => item.id === id);
    if (!record) throw new Error("Preservation run not found.");
    Object.assign(record, structuredClone(input));
    return record;
  }
}

export class InMemoryPreservationEvidenceRepository implements PreservationEvidenceRepository {
  readonly records: PreservationEvidenceRecord[] = [];

  async create(input: CreatePreservationEvidenceRecord): Promise<PreservationEvidenceRecord> {
    const record = { ...structuredClone(input), id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findByPreservationRunId(preservationRunId: string): Promise<PreservationEvidenceRecord[]> {
    return this.records.filter((record) => record.preservationRunId === preservationRunId);
  }

  async findByCandidateId(candidateId: string): Promise<PreservationEvidenceRecord | null> {
    return this.records.find((record) => record.candidateId === candidateId) ?? null;
  }
}

export class InMemoryCandidatePreferenceRepository implements CandidatePreferenceRepository {
  readonly records: CandidatePreferenceRecord[] = [];

  async create(input: CreateCandidatePreferenceRecord): Promise<CandidatePreferenceRecord> {
    if (this.records.some((record) => record.transactionId === input.transactionId)) {
      throw new Error("Candidate preference already exists.");
    }
    const now = new Date().toISOString();
    const record: CandidatePreferenceRecord = {
      ...input,
      evaluationTags: [...(input.evaluationTags ?? [])],
      notes: input.notes ?? null,
      id: crypto.randomUUID(),
      humanAccepted: null,
      acceptedCandidateId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<CandidatePreferenceRecord | null> {
    return this.records.find((record) => record.transactionId === transactionId) ?? null;
  }

  async recordAcceptance(transactionId: string, humanAccepted: boolean, acceptedCandidateId: string | null): Promise<CandidatePreferenceRecord> {
    const record = this.records.find((item) => item.transactionId === transactionId);
    if (!record) throw new Error("Candidate preference not found.");
    record.humanAccepted = humanAccepted;
    record.acceptedCandidateId = acceptedCandidateId;
    record.updatedAt = new Date().toISOString();
    return record;
  }
}
