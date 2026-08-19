import type { BenchmarkCase, BenchmarkEvaluation } from "@/src/domain/benchmark";
import type { IntentContract } from "@/src/domain/intent-contract";
import type { ModelUsage } from "@/src/application/ports/intent-model";
import type {
  BlindEvaluationErrorTag,
  BlindEvaluationSetImport,
  BlindPreference,
  BlindRatings,
} from "@/src/domain/blind-evaluation";
import type {
  Project,
  Asset,
  AssetVersion,
  OutcomeTransaction,
  PartialIntent,
  SemanticPatch,
  MutationLease,
  ExecutionRun,
  EvidenceReceipt,
  VerificationRun,
  StateCommit,
  CostRecord,
} from "@/src/domain/outcome";
import type {
  CriterionEvidenceRecord,
  CreateCriterionEvidenceRecord,
} from "@/src/domain/outcome/criterion-evidence";

export type { CriterionEvidenceRecord, CreateCriterionEvidenceRecord } from "@/src/domain/outcome/criterion-evidence";
import type {
  CandidatePreference,
  CandidateType,
  HumanEvaluationTag,
  PreservationEvidenceMetrics,
  PreservationFailureCode,
  PreservationRunStatus,
  ResolvedPreservationZones,
} from "@/src/domain/outcome/media/preservation";
import type { Build002PersistenceRepository } from "@/src/application/ports/outcome/build002-persistence-repository";

export type IntentRunRecord = {
  id: string;
  rawInput: string;
  context: string | null;
  compiledContract: IntentContract;
  compilerVersion: string;
  modelProvider: string;
  modelName: string;
  modelVersion: string | null;
  systemInstructionVersion: string;
  latencyMs: number;
  providerLatencyMs: number | null;
  usage: ModelUsage | null;
  estimatedCostUsd: number | null;
  pricingVersion: string | null;
  createdAt: string;
};

export type CreateIntentRun = Omit<IntentRunRecord, "id" | "createdAt">;

export type IntentFeedbackRecord = {
  id: string;
  intentRunId: string;
  accepted: boolean;
  correctedInterpretation: string | null;
  feedbackTags: string[];
  notes: string | null;
  createdAt: string;
};

export type CreateIntentFeedback = Omit<IntentFeedbackRecord, "id" | "createdAt">;

export type IntentModelFailureRecord = {
  id: string;
  rawInput: string;
  context: string | null;
  compilerVersion: string;
  modelProvider: string;
  modelName: string;
  modelVersion: string | null;
  systemInstructionVersion: string;
  latencyMs: number;
  failureType: string;
  failureMessage: string;
  createdAt: string;
};

export type CreateIntentModelFailure = Omit<IntentModelFailureRecord, "id" | "createdAt">;

export type CreateBenchmarkRun = {
  benchmarkCaseId: string | null;
  compilerVersion: string;
  modelProvider: string;
  modelName: string;
  compiledContract: IntentContract;
  evaluation: BenchmarkEvaluation;
  passed: boolean;
};

export interface IntentRunRepository {
  create(input: CreateIntentRun): Promise<IntentRunRecord>;
  findById(id: string): Promise<IntentRunRecord | null>;
}

export interface IntentModelFailureRepository {
  create(input: CreateIntentModelFailure): Promise<IntentModelFailureRecord>;
  findById(id: string): Promise<IntentModelFailureRecord | null>;
}

export interface IntentFeedbackRepository {
  create(input: CreateIntentFeedback): Promise<IntentFeedbackRecord>;
}

export interface BenchmarkRepository {
  listActive(): Promise<BenchmarkCase[]>;
  saveRun(input: CreateBenchmarkRun): Promise<void>;
}

export type BlindEvaluationSetRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sourceLabel: string;
  isDemo: boolean;
  contentHash: string;
  caseCount: number;
  importedAt: string;
  frozenAt: string;
};

export type BlindEvaluationCaseRecord = {
  id: string;
  evaluationSetId: string;
  externalId: string;
  rawInput: string;
  context: string | null;
  domain: string | null;
  privateEvaluatorNotes: string | null;
  expectedHighLevelBehavior: string | null;
  position: number;
};

export type BlindEvaluationSessionRecord = {
  id: string;
  evaluationSetId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  compilerVersion: string;
  baselineProvider: string;
  baselineModel: string;
  baselineModelVersion: string | null;
  baselineRevision: string;
  baselineSystemInstructionVersion: string;
  candidateProvider: string;
  candidateModel: string;
  candidateModelVersion: string | null;
  candidateSystemInstructionVersion: string;
  createdAt: string;
  completedAt: string | null;
};

export type CreateBlindEvaluationSession = Omit<
  BlindEvaluationSessionRecord,
  "id" | "status" | "createdAt" | "completedAt"
>;

export type BlindEvaluationComparisonRecord = {
  id: string;
  sessionId: string;
  evaluationCaseId: string;
  responseARunId: string | null;
  responseAFailureId: string | null;
  responseASource: "BASELINE" | "CANDIDATE";
  responseBRunId: string | null;
  responseBFailureId: string | null;
  responseBSource: "BASELINE" | "CANDIDATE";
  createdAt: string;
};

export type CreateBlindEvaluationComparison = Omit<
  BlindEvaluationComparisonRecord,
  "id" | "createdAt"
>;

export type BlindEvaluationJudgmentRecord = {
  id: string;
  comparisonId: string;
  preference: BlindPreference | null;
  ratingsA: BlindRatings;
  ratingsB: BlindRatings;
  evaluatorNotes: string | null;
  errorTags: BlindEvaluationErrorTag[];
  correctedIntent: string | null;
  createdAt: string;
};

export type CreateBlindEvaluationJudgment = Omit<
  BlindEvaluationJudgmentRecord,
  "id" | "createdAt"
>;

export type BlindEvaluationHumanIntentRecord = {
  id: string;
  sessionId: string;
  evaluationCaseId: string;
  comparisonId: string | null;
  intendedMeaning: string;
  expectedNextAction: string;
  preservationNotes: string | null;
  recordedAt: string;
  lockedAt: string;
};

export type CreateBlindEvaluationHumanIntent = Omit<
  BlindEvaluationHumanIntentRecord,
  "id" | "recordedAt" | "lockedAt" | "comparisonId"
>;

export type BlindEvaluationStepRatingRecord = {
  id: string;
  comparisonId: string;
  outputPosition: number;
  ratings: BlindRatings;
  errorTags: BlindEvaluationErrorTag[];
  evaluatorNotes: string | null;
  createdAt: string;
};

export type CreateBlindEvaluationStepRating = Omit<
  BlindEvaluationStepRatingRecord,
  "id" | "createdAt"
>;

export interface BlindEvaluationRepository {
  importSet(input: BlindEvaluationSetImport, contentHash: string): Promise<BlindEvaluationSetRecord>;
  listSets(): Promise<BlindEvaluationSetRecord[]>;
  findSetById(id: string): Promise<BlindEvaluationSetRecord | null>;
  listCases(setId: string): Promise<BlindEvaluationCaseRecord[]>;
  findCaseById(id: string): Promise<BlindEvaluationCaseRecord | null>;
  createSession(input: CreateBlindEvaluationSession): Promise<BlindEvaluationSessionRecord>;
  findSessionById(id: string): Promise<BlindEvaluationSessionRecord | null>;
  completeSession(id: string): Promise<BlindEvaluationSessionRecord>;
  listComparisons(sessionId: string): Promise<BlindEvaluationComparisonRecord[]>;
  findComparisonById(id: string): Promise<BlindEvaluationComparisonRecord | null>;
  createComparison(input: CreateBlindEvaluationComparison): Promise<BlindEvaluationComparisonRecord>;
  createHumanIntent(input: CreateBlindEvaluationHumanIntent): Promise<BlindEvaluationHumanIntentRecord>;
  findHumanIntentBySessionAndCaseId(
    sessionId: string,
    evaluationCaseId: string,
  ): Promise<BlindEvaluationHumanIntentRecord | null>;
  linkHumanIntentToComparison(humanIntentId: string, comparisonId: string): Promise<void>;
  findHumanIntentByComparisonId(comparisonId: string): Promise<BlindEvaluationHumanIntentRecord | null>;
  createStepRating(input: CreateBlindEvaluationStepRating): Promise<BlindEvaluationStepRatingRecord>;
  findStepRatingsByComparisonId(comparisonId: string): Promise<BlindEvaluationStepRatingRecord[]>;
  findJudgmentByComparisonId(comparisonId: string): Promise<BlindEvaluationJudgmentRecord | null>;
  createJudgment(input: CreateBlindEvaluationJudgment): Promise<BlindEvaluationJudgmentRecord>;
}

export type ProjectRecord = Project;

export type CreateProjectRecord = Omit<ProjectRecord, "id" | "createdAt" | "updatedAt">;

export interface ProjectRepository {
  create(input: CreateProjectRecord): Promise<ProjectRecord>;
  findById(id: string): Promise<ProjectRecord | null>;
  list(): Promise<ProjectRecord[]>;
  update(id: string, input: Partial<CreateProjectRecord>): Promise<ProjectRecord>;
}

export type AssetRecord = Asset;

export type CreateAssetRecord = Omit<AssetRecord, "id" | "createdAt" | "updatedAt" | "currentVersionId">;

export interface AssetRepository {
  create(input: CreateAssetRecord): Promise<AssetRecord>;
  findById(id: string): Promise<AssetRecord | null>;
  findByProjectId(projectId: string): Promise<AssetRecord[]>;
  update(id: string, input: Partial<CreateAssetRecord> & { currentVersionId?: string | null }): Promise<AssetRecord>;
}

export type AssetVersionRecord = AssetVersion;

export type CreateAssetVersionRecord = Omit<AssetVersionRecord, "id" | "createdAt">;

export interface AssetVersionRepository {
  create(input: CreateAssetVersionRecord): Promise<AssetVersionRecord>;
  findById(id: string): Promise<AssetVersionRecord | null>;
  findByAssetId(assetId: string): Promise<AssetVersionRecord[]>;
  findLatestByAssetId(assetId: string): Promise<AssetVersionRecord | null>;
}

export type OutcomeTransactionRecord = OutcomeTransaction;

export type CreateOutcomeTransactionRecord = Omit<
  OutcomeTransactionRecord,
  "id" | "createdAt" | "updatedAt" | "status" | "completedAt" | "abortReason"
>;

export interface OutcomeTransactionRepository {
  create(input: CreateOutcomeTransactionRecord): Promise<OutcomeTransactionRecord>;
  findById(id: string): Promise<OutcomeTransactionRecord | null>;
  findByAssetId(assetId: string): Promise<OutcomeTransactionRecord[]>;
  updateStatus(
    id: string,
    status: OutcomeTransactionRecord["status"],
    extra?: { abortReason?: string | null; completedAt?: string | null },
  ): Promise<OutcomeTransactionRecord>;
}

export type PartialIntentRecord = PartialIntent;

export type CreatePartialIntentRecord = Omit<PartialIntentRecord, "id" | "createdAt">;

export interface PartialIntentRepository {
  create(input: CreatePartialIntentRecord): Promise<PartialIntentRecord>;
  findByTransactionId(transactionId: string): Promise<PartialIntentRecord[]>;
}

export type SemanticPatchRecord = SemanticPatch;

export type CreateSemanticPatchRecord = Omit<SemanticPatchRecord, "id" | "createdAt">;

export interface SemanticPatchRepository {
  create(input: CreateSemanticPatchRecord): Promise<SemanticPatchRecord>;
  findByTransactionId(transactionId: string): Promise<SemanticPatchRecord[]>;
}

export type MutationLeaseRecord = MutationLease;

export type CreateMutationLeaseRecord = Omit<MutationLeaseRecord, "id" | "createdAt">;

export interface MutationLeaseRepository {
  create(input: CreateMutationLeaseRecord): Promise<MutationLeaseRecord>;
  findByTransactionId(transactionId: string): Promise<MutationLeaseRecord[]>;
}

export type ExecutionRunRecord = ExecutionRun;

export type CreateExecutionRunRecord = Omit<ExecutionRunRecord, "id"> & { id?: string };

export interface ExecutionRunRepository {
  create(input: CreateExecutionRunRecord): Promise<ExecutionRunRecord>;
  updateMetadata(id: string, metadata: Record<string, unknown>): Promise<ExecutionRunRecord>;
  findById(id: string): Promise<ExecutionRunRecord | null>;
  findByTransactionId(transactionId: string): Promise<ExecutionRunRecord[]>;
}

export type EvidenceReceiptRecord = EvidenceReceipt;

export type CreateEvidenceReceiptRecord = Omit<EvidenceReceiptRecord, "id">;

export interface EvidenceReceiptRepository {
  create(input: CreateEvidenceReceiptRecord): Promise<EvidenceReceiptRecord>;
  findByTransactionId(transactionId: string): Promise<EvidenceReceiptRecord[]>;
}

export type VerificationRunRecord = VerificationRun;

export type CreateVerificationRunRecord = Omit<VerificationRunRecord, "id" | "verifiedAt">;

export interface VerificationRunRepository {
  create(input: CreateVerificationRunRecord): Promise<VerificationRunRecord>;
  findByTransactionId(transactionId: string): Promise<VerificationRunRecord[]>;
}

export interface CriterionEvidenceRepository {
  create(input: CreateCriterionEvidenceRecord): Promise<CriterionEvidenceRecord>;
  findByTransactionId(transactionId: string): Promise<CriterionEvidenceRecord[]>;
  findByVerificationRunId(verificationRunId: string): Promise<CriterionEvidenceRecord[]>;
}

export type StateCommitRecord = StateCommit;

export type CreateStateCommitRecord = Omit<StateCommitRecord, "id" | "committedAt">;

export interface StateCommitRepository {
  create(input: CreateStateCommitRecord): Promise<StateCommitRecord>;
  findByTransactionId(transactionId: string): Promise<StateCommitRecord | null>;
}

export type CostRecordRecord = CostRecord;

export type CreateCostRecordRecord = Omit<CostRecordRecord, "id" | "recordedAt">;

export interface CostRecordRepository {
  create(input: CreateCostRecordRecord): Promise<CostRecordRecord>;
  findByTransactionId(transactionId: string): Promise<CostRecordRecord[]>;
}

export type MediaStorageRecord = {
  id: string;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
  assetId: string;
  createdAt: string;
};

export type CreateMediaStorageRecord = Omit<MediaStorageRecord, "id" | "createdAt">;

export interface MediaStorageRepository {
  create(input: CreateMediaStorageRecord): Promise<MediaStorageRecord>;
  findByAssetId(assetId: string): Promise<MediaStorageRecord[]>;
  findByStorageKey(storageKey: string): Promise<MediaStorageRecord | null>;
}

export type SemanticSnapshotRecord = {
  id: string;
  transactionId: string;
  transactionSchemaVersion: string;
  patchSchemaVersion: string;
  executorAdapterVersion: string;
  provider: string;
  imageModelIdentifier: string;
  verificationMethodologyVersion: string;
  createdAt: string;
};

export type CreateSemanticSnapshotRecord = Omit<SemanticSnapshotRecord, "id" | "createdAt">;

export interface SemanticSnapshotRepository {
  create(input: CreateSemanticSnapshotRecord): Promise<SemanticSnapshotRecord>;
  findByTransactionId(transactionId: string): Promise<SemanticSnapshotRecord | null>;
}

export type ImageEvidenceRecord = {
  id: string;
  evidenceReceiptId: string;
  sourceHash: string;
  candidateHash: string;
  sourceWidth: number;
  sourceHeight: number;
  candidateWidth: number;
  candidateHeight: number;
  normalizedTotalDiff: number;
  normalizedRoiDiff: number;
  normalizedOutsideRoiDiff: number;
  changedPixelRatioTotal: number;
  changedPixelRatioInside: number;
  changedPixelRatioOutside: number;
  methodology: string;
  createdAt: string;
};

export type CreateImageEvidenceRecord = Omit<ImageEvidenceRecord, "id" | "createdAt">;

export interface ImageEvidenceRepository {
  create(input: CreateImageEvidenceRecord): Promise<ImageEvidenceRecord>;
  findByEvidenceReceiptId(evidenceReceiptId: string): Promise<ImageEvidenceRecord | null>;
}

export type CandidateAssetRecord = {
  id: string;
  transactionId: string;
  executionRunId: string;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
  roi: Record<string, number>;
  instruction: string;
  provider: string;
  model: string;
  costUsd: number | null;
  candidateType: CandidateType;
  sourceVersionId: string;
  rawCandidateId: string | null;
  preservationRunId: string | null;
  committed: boolean;
  createdAt: string;
};

export type CreateCandidateAssetRecord = Omit<CandidateAssetRecord, "id" | "createdAt">;

export interface CandidateAssetRepository {
  create(input: CreateCandidateAssetRecord): Promise<CandidateAssetRecord>;
  findById(id: string): Promise<CandidateAssetRecord | null>;
  findByTransactionId(transactionId: string): Promise<CandidateAssetRecord[]>;
  findByExecutionRunId(executionRunId: string): Promise<CandidateAssetRecord | null>;
  findByExecutionRunIdAndType(executionRunId: string, candidateType: CandidateType): Promise<CandidateAssetRecord | null>;
  markCommitted(id: string): Promise<CandidateAssetRecord>;
}

export type PreservationRunRecord = {
  id: string;
  transactionId: string;
  executionRunId: string;
  sourceVersionId: string;
  rawCandidateId: string;
  preservedCandidateId: string | null;
  policyVersion: string;
  methodologyVersion: string;
  coreRoi: Record<string, number>;
  coupledBand: { unit: "NORMALIZED_MIN_DIMENSION"; size: number };
  zones: ResolvedPreservationZones | null;
  status: PreservationRunStatus;
  errorCode: PreservationFailureCode | null;
  errorMessage: string | null;
  processingTimeMs: number | null;
  startedAt: string;
  completedAt: string | null;
};

export type CreatePreservationRunRecord = Omit<PreservationRunRecord, "id">;

export interface PreservationRunRepository {
  create(input: CreatePreservationRunRecord): Promise<PreservationRunRecord>;
  findById(id: string): Promise<PreservationRunRecord | null>;
  findByTransactionId(transactionId: string): Promise<PreservationRunRecord[]>;
  update(id: string, input: Partial<Omit<PreservationRunRecord, "id" | "transactionId" | "executionRunId" | "sourceVersionId" | "rawCandidateId" | "startedAt">>): Promise<PreservationRunRecord>;
}

export type PreservationEvidenceRecord = {
  id: string;
  preservationRunId: string;
  candidateId: string;
  candidateType: CandidateType;
  metrics: PreservationEvidenceMetrics;
  createdAt: string;
};

export type CreatePreservationEvidenceRecord = Omit<PreservationEvidenceRecord, "id" | "createdAt">;

export interface PreservationEvidenceRepository {
  create(input: CreatePreservationEvidenceRecord): Promise<PreservationEvidenceRecord>;
  findByPreservationRunId(preservationRunId: string): Promise<PreservationEvidenceRecord[]>;
  findByCandidateId(candidateId: string): Promise<PreservationEvidenceRecord | null>;
}

export type CandidatePreferenceRecord = {
  id: string;
  transactionId: string;
  rawCandidateId: string;
  preservedCandidateId: string;
  preference: CandidatePreference;
  evaluationTags: HumanEvaluationTag[];
  notes: string | null;
  humanAccepted: boolean | null;
  acceptedCandidateId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCandidatePreferenceRecord = Omit<CandidatePreferenceRecord, "id" | "humanAccepted" | "acceptedCandidateId" | "createdAt" | "updatedAt" | "evaluationTags" | "notes"> & {
  evaluationTags?: HumanEvaluationTag[];
  notes?: string | null;
};

export interface CandidatePreferenceRepository {
  create(input: CreateCandidatePreferenceRecord): Promise<CandidatePreferenceRecord>;
  findByTransactionId(transactionId: string): Promise<CandidatePreferenceRecord | null>;
  recordAcceptance(transactionId: string, humanAccepted: boolean, acceptedCandidateId: string | null): Promise<CandidatePreferenceRecord>;
}

export type RepositoryBundle = {
  intentRuns: IntentRunRepository;
  modelFailures: IntentModelFailureRepository;
  feedback: IntentFeedbackRepository;
  benchmarks: BenchmarkRepository;
  blindEvaluations: BlindEvaluationRepository;
  projects: ProjectRepository;
  assets: AssetRepository;
  assetVersions: AssetVersionRepository;
  outcomeTransactions: OutcomeTransactionRepository;
  partialIntents: PartialIntentRepository;
  semanticPatches: SemanticPatchRepository;
  mutationLeases: MutationLeaseRepository;
  executionRuns: ExecutionRunRepository;
  evidenceReceipts: EvidenceReceiptRepository;
  verificationRuns: VerificationRunRepository;
  criterionEvidence: CriterionEvidenceRepository;
  stateCommits: StateCommitRepository;
  costRecords: CostRecordRepository;
  mediaStorage: MediaStorageRepository;
  semanticSnapshots: SemanticSnapshotRepository;
  imageEvidence: ImageEvidenceRepository;
  candidateAssets: CandidateAssetRepository;
  preservationRuns: PreservationRunRepository;
  preservationEvidence: PreservationEvidenceRepository;
  candidatePreferences: CandidatePreferenceRepository;
  build002Readiness?: Build002PersistenceRepository;
  storageMode: "supabase" | "memory";
};

export type GlobalRepositoryBundle = Pick<
  RepositoryBundle,
  "intentRuns" | "modelFailures" | "feedback" | "benchmarks" | "blindEvaluations" | "storageMode"
>;
