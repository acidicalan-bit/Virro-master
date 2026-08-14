import { createHash } from "node:crypto";

import type { ImageEditExecutor } from "@/src/application/ports/outcome/image-edit-executor-port";
import type { ImagePreservationEngine } from "@/src/application/ports/outcome/image-preservation-engine-port";
import type { MediaObjectStore } from "@/src/application/ports/outcome/media-object-store-port";
import type {
  CandidateAssetRecord,
  PreservationEvidenceRecord,
  PreservationRunRecord,
  RepositoryBundle,
} from "@/src/application/ports/repositories";
import {
  CandidatePreferenceSchema,
  HumanEvaluationTagSchema,
  PRESERVATION_EVIDENCE_VERSION,
  PreservationPolicySchema,
  type CandidatePreference,
  type HumanEvaluationTag,
  type MachineVerificationResult,
  type PreservationPolicy,
} from "@/src/domain/outcome/media/preservation";
import { calculateDiffMetrics } from "@/src/infrastructure/evidence/image-diff-calculator";
import { decodePngToPixels } from "@/src/infrastructure/evidence/png-decoder";
import { encodePixelsToPng } from "@/src/infrastructure/evidence/png-encoder";
import { calculatePreservationEvidence } from "@/src/infrastructure/evidence/preservation-evidence-calculator";
import { verifyCreativeAssertions } from "@/src/application/outcome/media/creative-assertions";
import type { TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import { TaskSpecSchema, verifyTaskSpecHash } from "@/src/domain/outcome/specification/task-spec";
import { createRecoveryMetadata } from "@/src/application/outcome/recovery/execution-recovery-context";
import type { FieldBetaFaultInjector } from "@/src/application/outcome/media/field-beta-fault-injection";

const SOURCE_MAX_BYTES = 10 * 1024 * 1024;

type RuntimeRepositories = Pick<
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
>;

export type RunPreservationExperimentInput = {
  projectName: string;
  assetName: string;
  sourceBytes: Uint8Array;
  sourceMimeType: "image/png";
  instruction: string;
  policy: PreservationPolicy;
  taskSpecFactory?: (context: {
    transactionId: string;
    assetId: string;
    sourceVersionId: string;
    sourceSha256: string;
    sourceByteSize: number;
  }) => Promise<TaskSpec>;
  recoveryContext?: {
    tenantId: "internal-lab";
    topology: "LOCAL_INDEPENDENT" | "LOCAL_COUPLED" | "STRUCTURAL" | "GLOBAL";
    taskType: "COLOR_CHANGE" | "OBJECT_REMOVAL" | "TEXT_EDIT" | "IDENTITY_EDIT" | "PRODUCT_EDIT" | "GEOMETRY_EDIT" | "OTHER";
    blueprint: import("@/src/domain/outcome/specification/outcome-blueprint").OutcomeBlueprint;
  };
  faultInjector?: FieldBetaFaultInjector;
};

export type PreservationExperimentView = {
  transactionId: string;
  executionRunId: string;
  verificationRunId: string;
  preservationRunId: string;
  assetId: string;
  sourceVersionId: string;
  rawCandidateId: string;
  preservedCandidateId: string;
  instruction: string;
  source: MediaView;
  raw: CandidateView;
  preserved: CandidateView;
  policy: PreservationPolicy;
  zones: PreservationRunRecord["zones"];
  rawEvidence: PreservationEvidenceRecord["metrics"];
  preservedEvidence: PreservationEvidenceRecord["metrics"];
  outsideChangeReduction: number;
  totalChangeReduction: number;
  machineVerification: MachineVerificationResult;
  provider: string;
  model: string;
  providerLatencyMs: number;
  preservationLatencyMs: number;
  verificationLatencyMs: number;
  costUsd: number | null;
  taskSpecBinding?: {
    id: string;
    version: number;
    hash: string;
    blueprintId: string;
    blueprintVersion: number;
    blueprintHash: string;
    compilerName: string;
    compilerVersion: string;
  };
};

type MediaView = {
  storageKey: string;
  url: string;
  sha256: string;
  width: number;
  height: number;
};

type CandidateView = MediaView & {
  id: string;
  candidateType: "RAW_PROVIDER" | "PRESERVED";
};

export class PreservationRuntimeError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PreservationRuntimeError";
  }
}

export class PreservationVerificationService {
  constructor(
    private readonly repositories: RuntimeRepositories,
    private readonly executor: ImageEditExecutor,
    private readonly preservationEngine: ImagePreservationEngine,
    private readonly storage: MediaObjectStore,
    private readonly faultInjector?: FieldBetaFaultInjector,
  ) {}

  async runExperiment(input: RunPreservationExperimentInput): Promise<PreservationExperimentView> {
    const policy = PreservationPolicySchema.parse(input.policy);
    validateSourceInput(input);
    const sourceBytes = new Uint8Array(input.sourceBytes);
    const sourceBuffer = Buffer.from(sourceBytes);
    const sourcePixels = decodePngToPixels(sourceBuffer);
    const sourceHash = sha256(sourceBytes);
    const sourcePreflight = this.executor.preflight({ sourceWidth: sourcePixels.width, sourceHeight: sourcePixels.height });
    if (sourcePreflight.status !== "SUPPORTED") {
      throw new PreservationRuntimeError(sourcePreflight.code, sourcePreflight.reason);
    }

    const project = await this.repositories.projects.create({
      name: input.projectName.trim(),
      description: "BUILD 004 preservation experiment",
    });
    const asset = await this.repositories.assets.create({
      projectId: project.id,
      name: input.assetName.trim(),
      description: "Precision Edit image asset",
    });
    const sourceStorageKey = `sources/${project.id}/${crypto.randomUUID()}.png`;
    await this.storage.put(sourceStorageKey, sourceBytes, input.sourceMimeType);
    const sourceVersion = await this.repositories.assetVersions.create({
      assetId: asset.id,
      versionNumber: 1,
      state: {
        media: {
          storageKey: sourceStorageKey,
          mimeType: input.sourceMimeType,
          width: sourcePixels.width,
          height: sourcePixels.height,
          byteSize: sourceBytes.byteLength,
          sha256: sourceHash,
        },
      },
      parentVersionId: null,
    });
    await this.repositories.mediaStorage.create({
      storageKey: sourceStorageKey,
      mimeType: input.sourceMimeType,
      width: sourcePixels.width,
      height: sourcePixels.height,
      byteSize: sourceBytes.byteLength,
      sha256: sourceHash,
      assetId: asset.id,
    });
    await this.repositories.assets.update(asset.id, { currentVersionId: sourceVersion.id });

    input.faultInjector?.("BEFORE_TRANSACTION_CREATION");
    const transaction = await this.repositories.outcomeTransactions.create({
      projectId: project.id,
      assetId: asset.id,
      baseVersionId: sourceVersion.id,
      rawRequest: input.instruction.trim(),
    });
    input.faultInjector?.("AFTER_TRANSACTION_CREATION");
    const partialIntent = await this.repositories.partialIntents.create({
      transactionId: transaction.id,
      rawInput: input.instruction.trim(),
      targetPath: "media.pixels",
      operation: "EDIT_REGION",
      desiredValue: { instruction: input.instruction.trim(), roi: policy.coreRoi },
    });
    await this.repositories.semanticPatches.create({
      transactionId: transaction.id,
      partialIntentId: partialIntent.id,
      operation: "EDIT_REGION",
      targetPath: "media.pixels",
      parameters: { instruction: input.instruction.trim(), roi: policy.coreRoi },
    });
    await this.repositories.mutationLeases.create({
      transactionId: transaction.id,
      targetPath: "media.pixels",
      category: "COUPLED",
      reason: "CORE plus deterministic coupled band; all other pixels are HARD_PRESERVE.",
    });
    await this.repositories.outcomeTransactions.updateStatus(transaction.id, "PREPARED");
    await this.repositories.outcomeTransactions.updateStatus(transaction.id, "READY");
    await this.repositories.outcomeTransactions.updateStatus(transaction.id, "EXECUTING");

    let taskSpec: TaskSpec | null = null;
    if (input.taskSpecFactory) {
      taskSpec = TaskSpecSchema.parse(await input.taskSpecFactory({
        transactionId: transaction.id,
        assetId: asset.id,
        sourceVersionId: sourceVersion.id,
        sourceSha256: sourceHash,
        sourceByteSize: sourceBytes.byteLength,
      }));
      if (!verifyTaskSpecHash(taskSpec) || taskSpec.status !== "READY" || taskSpec.transactionId !== transaction.id || taskSpec.source.versionId !== sourceVersion.id || taskSpec.source.sha256 !== sourceHash) {
        throw new PreservationRuntimeError("INVALID_TASK_SPEC_BINDING", "Task Spec must be READY, immutable, and bound to this transaction and source version.");
      }
    }

    const providerStartedAt = new Date().toISOString();
    let providerResult: Awaited<ReturnType<ImageEditExecutor["execute"]>>;
    try {
      providerResult = await this.executor.execute({
        transactionId: transaction.id,
        sourceStorageKey,
        sourceMimeType: input.sourceMimeType,
        sourceWidth: sourcePixels.width,
        sourceHeight: sourcePixels.height,
        sourceBytes,
        roi: policy.coreRoi,
        instruction: input.instruction.trim(),
      });
    } catch (error) {
      await this.recordProviderFailure(transaction.id, providerStartedAt, error);
      if (isImageEditExecutionError(error)) {
        throw new PreservationRuntimeError(error.code, error.code === "PROVIDER_REQUEST_FAILED" ? "The image provider request failed." : error.message);
      }
      throw new PreservationRuntimeError(
        "PROVIDER_FAILURE",
        error instanceof Error ? error.message : "Image provider failed.",
      );
    }

    const rawBytes = new Uint8Array(providerResult.candidateBytes);
    const rawHash = sha256(rawBytes);
    let rawPixels;
    try {
      rawPixels = decodePngToPixels(Buffer.from(rawBytes));
      if (providerResult.candidateSha256 !== rawHash || providerResult.candidateByteSize !== rawBytes.byteLength) {
        throw new Error("Provider candidate metadata does not match returned bytes.");
      }
      if (rawPixels.width !== sourcePixels.width || rawPixels.height !== sourcePixels.height) {
        throw new PreservationRuntimeError("PROVIDER_OUTPUT_CONTRACT_VIOLATION", "Provider output geometry did not match the requested same-geometry execution.");
      }
    } catch (error) {
      await this.recordProviderFailure(transaction.id, providerStartedAt, error);
      if (error instanceof PreservationRuntimeError) throw error;
      throw new PreservationRuntimeError(
        "INVALID_PROVIDER_CANDIDATE",
        error instanceof Error ? error.message : "Provider candidate is invalid.",
      );
    }

    const providerCompletedAt = new Date().toISOString();
    const executionRun = await this.repositories.executionRuns.create({
      transactionId: transaction.id,
      status: "SUCCESS",
      executor: this.executor.name,
      startedAt: providerStartedAt,
      completedAt: providerCompletedAt,
      latencyMs: Math.max(0, Math.round(providerResult.latencyMs)),
      costUsd: providerResult.costUsd,
      errorMessage: null,
      metadata: {
        provider: providerResult.provider,
        model: providerResult.model,
        usage: providerResult.usage,
        costReported: providerResult.costUsd !== null,
        providerMetadata: providerResult.providerMetadata,
        ...(taskSpec ? {
          outcomeSku: "precision-edit-v0",
          blueprintId: taskSpec.blueprint.id,
          blueprintVersion: taskSpec.blueprint.version,
          blueprintHash: taskSpec.blueprint.hash,
          taskSpecId: taskSpec.id,
          taskSpecVersion: taskSpec.version,
          taskSpecHash: taskSpec.hash,
          specCompilerName: taskSpec.compiler.name,
          specCompilerVersion: taskSpec.compiler.version,
        } : {}),
      },
    });

    input.faultInjector?.("AFTER_EXECUTOR_SUCCESS_BEFORE_RAW");
    const rawStorageKey = `candidates/${transaction.id}/raw/${crypto.randomUUID()}.png`;
    try {
      await this.storage.put(rawStorageKey, rawBytes, providerResult.candidateMimeType);
    } catch (error) {
      await this.repositories.outcomeTransactions.updateStatus(transaction.id, "FAILED");
      throw new PreservationRuntimeError("STORAGE_FAILURE", error instanceof Error ? error.message : "Raw upload failed.");
    }
    const rawCandidate = await this.repositories.candidateAssets.create({
      transactionId: transaction.id,
      executionRunId: executionRun.id,
      storageKey: rawStorageKey,
      mimeType: providerResult.candidateMimeType,
      width: rawPixels.width,
      height: rawPixels.height,
      byteSize: rawBytes.byteLength,
      sha256: rawHash,
      roi: policy.coreRoi,
      instruction: input.instruction.trim(),
      provider: providerResult.provider,
      model: providerResult.model,
      costUsd: providerResult.costUsd,
      candidateType: "RAW_PROVIDER",
      sourceVersionId: sourceVersion.id,
      rawCandidateId: null,
      preservationRunId: null,
      committed: false,
    });
    if (taskSpec && input.recoveryContext) {
      await this.repositories.executionRuns.updateMetadata(executionRun.id, {
        ...executionRun.metadata,
        fieldRecoveryContext: createRecoveryMetadata({
          schemaVersion: "field-recovery-context-v0.1",
          tenantId: input.recoveryContext.tenantId,
          transactionId: transaction.id,
          executionRunId: executionRun.id,
          sourceVersionId: sourceVersion.id,
          instruction: input.instruction.trim(),
          roi: policy.coreRoi,
          topology: input.recoveryContext.topology,
          taskType: input.recoveryContext.taskType,
          policyVersion: policy.policyVersion,
          blueprint: input.recoveryContext.blueprint,
          taskSpec,
          rawCandidateId: rawCandidate.id,
          recoveryEligibility: "REDRIVABLE",
        }),
      });
    }
    input.faultInjector?.("AFTER_RAW_PERSISTENCE");

    const receipt = await this.repositories.evidenceReceipts.create({
      transactionId: transaction.id,
      executionRunId: executionRun.id,
      baseVersionId: sourceVersion.id,
      operation: "EDIT_REGION",
      target: "media.pixels",
      requestedEffect: { instruction: input.instruction.trim(), roi: policy.coreRoi },
      observedEffect: { rawCandidateId: rawCandidate.id, rawHash },
      executor: this.executor.name,
      startedAt: providerStartedAt,
      completedAt: providerCompletedAt,
      costUsd: providerResult.costUsd,
      success: true,
    });
    await this.repositories.semanticSnapshots.create({
      transactionId: transaction.id,
      transactionSchemaVersion: "outcome-transaction-v0.1",
      patchSchemaVersion: "semantic-patch-v0.1",
      executorAdapterVersion: "image-edit-executor-v0.2",
      provider: providerResult.provider,
      imageModelIdentifier: providerResult.model,
      verificationMethodologyVersion: PRESERVATION_EVIDENCE_VERSION,
    });
    if (providerResult.costUsd !== null) {
      await this.repositories.costRecords.create({
        transactionId: transaction.id,
        executionRunId: executionRun.id,
        amountUsd: providerResult.costUsd,
        description: `${providerResult.provider}/${providerResult.model} image edit`,
      });
    }

    const preservationStartedAt = new Date().toISOString();
    let preservationRun = await this.repositories.preservationRuns.create({
      transactionId: transaction.id,
      executionRunId: executionRun.id,
      sourceVersionId: sourceVersion.id,
      rawCandidateId: rawCandidate.id,
      preservedCandidateId: null,
      policyVersion: policy.policyVersion,
      methodologyVersion: this.preservationEngine.methodologyVersion,
      coreRoi: policy.coreRoi,
      coupledBand: policy.coupledBand,
      zones: null,
      status: "RUNNING",
      errorCode: null,
      errorMessage: null,
      processingTimeMs: null,
      startedAt: preservationStartedAt,
      completedAt: null,
    });
    const preservationResult = this.preservationEngine.preserve({ source: sourcePixels, rawCandidate: rawPixels, policy });
    if (!preservationResult.ok) {
      await this.repositories.preservationRuns.update(preservationRun.id, {
        status: "FAILURE",
        errorCode: preservationResult.code,
        errorMessage: preservationResult.message,
        processingTimeMs: preservationResult.processingTimeMs,
        completedAt: new Date().toISOString(),
      });
      await this.repositories.outcomeTransactions.updateStatus(transaction.id, "FAILED");
      throw new PreservationRuntimeError(preservationResult.code, preservationResult.message);
    }

    const preservedBuffer = encodePixelsToPng(preservationResult.preserved);
    const preservedBytes = new Uint8Array(preservedBuffer);
    const preservedHash = sha256(preservedBytes);
    const preservedStorageKey = `candidates/${transaction.id}/preserved/${crypto.randomUUID()}.png`;
    try {
      await this.storage.put(preservedStorageKey, preservedBytes, "image/png");
    } catch (error) {
      await this.repositories.preservationRuns.update(preservationRun.id, {
        status: "FAILURE",
        errorCode: "STORAGE_FAILURE",
        errorMessage: error instanceof Error ? error.message : "Preserved upload failed.",
        processingTimeMs: preservationResult.processingTimeMs,
        completedAt: new Date().toISOString(),
      });
      await this.repositories.outcomeTransactions.updateStatus(transaction.id, "FAILED");
      throw new PreservationRuntimeError("STORAGE_FAILURE", error instanceof Error ? error.message : "Preserved upload failed.");
    }

    const preservedCandidate = await this.repositories.candidateAssets.create({
      transactionId: transaction.id,
      executionRunId: executionRun.id,
      storageKey: preservedStorageKey,
      mimeType: "image/png",
      width: preservationResult.preserved.width,
      height: preservationResult.preserved.height,
      byteSize: preservedBytes.byteLength,
      sha256: preservedHash,
      roi: policy.coreRoi,
      instruction: input.instruction.trim(),
      provider: "intent-lab",
      model: this.preservationEngine.methodologyVersion,
      costUsd: null,
      candidateType: "PRESERVED",
      sourceVersionId: sourceVersion.id,
      rawCandidateId: rawCandidate.id,
      preservationRunId: preservationRun.id,
      committed: false,
    });
    preservationRun = await this.repositories.preservationRuns.update(preservationRun.id, {
      preservedCandidateId: preservedCandidate.id,
      zones: preservationResult.zones,
      status: "SUCCESS",
      processingTimeMs: preservationResult.processingTimeMs,
      completedAt: new Date().toISOString(),
    });

    const rawEvidence = calculatePreservationEvidence(sourcePixels, rawPixels, preservationResult.zones);
    const preservedEvidence = calculatePreservationEvidence(sourcePixels, preservationResult.preserved, preservationResult.zones);
    await Promise.all([
      this.repositories.preservationEvidence.create({ preservationRunId: preservationRun.id, candidateId: rawCandidate.id, candidateType: "RAW_PROVIDER", metrics: rawEvidence }),
      this.repositories.preservationEvidence.create({ preservationRunId: preservationRun.id, candidateId: preservedCandidate.id, candidateType: "PRESERVED", metrics: preservedEvidence }),
    ]);
    const legacyRawMetrics = calculateDiffMetrics(sourcePixels, rawPixels, policy.coreRoi, sourceHash, rawHash);
    await this.repositories.imageEvidence.create({
      evidenceReceiptId: receipt.id,
      sourceHash,
      candidateHash: rawHash,
      sourceWidth: legacyRawMetrics.sourceWidth,
      sourceHeight: legacyRawMetrics.sourceHeight,
      candidateWidth: legacyRawMetrics.candidateWidth,
      candidateHeight: legacyRawMetrics.candidateHeight,
      normalizedTotalDiff: legacyRawMetrics.normalizedTotalDiff,
      normalizedRoiDiff: legacyRawMetrics.normalizedRoiDiff,
      normalizedOutsideRoiDiff: legacyRawMetrics.normalizedOutsideRoiDiff,
      changedPixelRatioTotal: legacyRawMetrics.changedPixelRatioTotal,
      changedPixelRatioInside: legacyRawMetrics.changedPixelRatioInside,
      changedPixelRatioOutside: legacyRawMetrics.changedPixelRatioOutside,
      methodology: legacyRawMetrics.methodology,
    });

    await this.repositories.outcomeTransactions.updateStatus(transaction.id, "VERIFYING");
    const verificationStartedAt = performance.now();
    const sourceReadBack = await this.storage.get(sourceStorageKey);
    const rawReadBack = await this.storage.get(rawStorageKey);
    const machineVerification = verifyCreativeAssertions({
      sourceBeforeHash: sourceHash,
      sourceAfterHash: sha256(sourceReadBack),
      source: sourcePixels,
      rawCandidate: rawPixels,
      preservedCandidate: preservationResult.preserved,
      zones: preservationResult.zones,
      rawCandidateId: rawCandidate.id,
      preservedCandidateId: preservedCandidate.id,
      expectedTransactionId: transaction.id,
      rawTransactionId: rawCandidate.transactionId,
      preservedTransactionId: preservedCandidate.transactionId,
      preservedRawCandidateId: preservedCandidate.rawCandidateId,
      editRegionChangeThreshold: policy.editRegionChangeThreshold,
      preservedEvidence,
    });
    const verificationLatencyMs = Math.max(0, Math.round((performance.now() - verificationStartedAt) * 1000) / 1000);
    const verificationRun = await this.repositories.verificationRuns.create({
      transactionId: transaction.id,
      executionRunId: executionRun.id,
      status: machineVerification.status,
      checks: Object.fromEntries(machineVerification.assertions.map((item) => [item.type, item.passed])),
      details: {
        methodologyVersion: machineVerification.methodologyVersion,
        assertions: machineVerification.assertions,
        rawEvidence,
        preservedEvidence,
        rawReadBackHash: sha256(rawReadBack),
        rawImmutable: sha256(rawReadBack) === rawHash,
        verificationLatencyMs,
        taskSpecBinding: taskSpec ? {
          id: taskSpec.id,
          version: taskSpec.version,
          hash: taskSpec.hash,
          blueprintId: taskSpec.blueprint.id,
          blueprintVersion: taskSpec.blueprint.version,
          blueprintHash: taskSpec.blueprint.hash,
          compilerName: taskSpec.compiler.name,
          compilerVersion: taskSpec.compiler.version,
        } : null,
      },
    });
    await this.repositories.outcomeTransactions.updateStatus(
      transaction.id,
      machineVerification.status === "PASSED" ? "VERIFIED" : "FAILED",
    );
    if (machineVerification.status === "PASSED") input.faultInjector?.("AFTER_VERIFICATION_PASSED");

    return this.toView({
      transactionId: transaction.id,
      executionRunId: executionRun.id,
      verificationRunId: verificationRun.id,
      preservationRun,
      assetId: asset.id,
      sourceVersionId: sourceVersion.id,
      sourceStorageKey,
      sourceHash,
      sourceWidth: sourcePixels.width,
      sourceHeight: sourcePixels.height,
      rawCandidate,
      preservedCandidate,
      policy,
      rawEvidence,
      preservedEvidence,
      machineVerification,
      providerLatencyMs: providerResult.latencyMs,
      preservationLatencyMs: preservationResult.processingTimeMs,
      verificationLatencyMs,
      costUsd: providerResult.costUsd,
      taskSpecBinding: taskSpec ? {
        id: taskSpec.id,
        version: taskSpec.version,
        hash: taskSpec.hash,
        blueprintId: taskSpec.blueprint.id,
        blueprintVersion: taskSpec.blueprint.version,
        blueprintHash: taskSpec.blueprint.hash,
        compilerName: taskSpec.compiler.name,
        compilerVersion: taskSpec.compiler.version,
      } : undefined,
    });
  }

  async recordPreference(input: {
    transactionId: string;
    rawCandidateId: string;
    preservedCandidateId: string;
    preference: CandidatePreference;
    evaluationTags?: HumanEvaluationTag[];
    notes?: string | null;
  }) {
    const preference = CandidatePreferenceSchema.parse(input.preference);
    const evaluationTags = HumanEvaluationTagSchema.array().max(20).parse(input.evaluationTags ?? []);
    const notes = input.notes?.trim() || null;
    if (notes && notes.length > 2000) throw new PreservationRuntimeError("INVALID_EVALUATION_NOTES", "Evaluation notes must not exceed 2000 characters.");
    const { raw, preserved } = await this.validateCandidatePair(input.transactionId, input.rawCandidateId, input.preservedCandidateId);
    const existing = await this.repositories.candidatePreferences.findByTransactionId(input.transactionId);
    if (existing) throw new PreservationRuntimeError("PREFERENCE_ALREADY_RECORDED", "Preference is immutable once recorded.");
    return this.repositories.candidatePreferences.create({
      transactionId: input.transactionId,
      rawCandidateId: raw.id,
      preservedCandidateId: preserved.id,
      preference,
      evaluationTags,
      notes,
    });
  }

  async getExperiment(transactionId: string): Promise<PreservationExperimentView> {
    const transaction = await this.repositories.outcomeTransactions.findById(transactionId);
    if (!transaction) throw new PreservationRuntimeError("EXPERIMENT_NOT_FOUND", "Preservation experiment not found.");
    const [executionRuns, preservationRuns, candidates, verificationRuns] = await Promise.all([
      this.repositories.executionRuns.findByTransactionId(transactionId),
      this.repositories.preservationRuns.findByTransactionId(transactionId),
      this.repositories.candidateAssets.findByTransactionId(transactionId),
      this.repositories.verificationRuns.findByTransactionId(transactionId),
    ]);
    const executionRun = executionRuns.find((run) => run.status === "SUCCESS");
    const preservationRun = preservationRuns.find((run) => run.status === "SUCCESS");
    const rawCandidate = candidates.find((candidate) => candidate.candidateType === "RAW_PROVIDER");
    const preservedCandidate = candidates.find((candidate) => candidate.candidateType === "PRESERVED");
    const verification = verificationRuns.at(-1);
    if (!executionRun || !preservationRun || !rawCandidate || !preservedCandidate || !verification) {
      throw new PreservationRuntimeError("EXPERIMENT_INCOMPLETE", "The experiment does not have a complete preservation chain.");
    }
    const [sourceVersion, rawEvidenceRecord, preservedEvidenceRecord] = await Promise.all([
      this.repositories.assetVersions.findById(transaction.baseVersionId),
      this.repositories.preservationEvidence.findByCandidateId(rawCandidate.id),
      this.repositories.preservationEvidence.findByCandidateId(preservedCandidate.id),
    ]);
    const media = sourceVersion?.state.media as Record<string, unknown> | undefined;
    if (!sourceVersion || !media || !rawEvidenceRecord || !preservedEvidenceRecord) {
      throw new PreservationRuntimeError("EXPERIMENT_INCOMPLETE", "Source or evidence is missing.");
    }
    const machineVerification = {
      methodologyVersion: "creative-assertions-v0.1" as const,
      status: verification.status,
      assertions: verification.details.assertions as MachineVerificationResult["assertions"],
    };
    const policy = PreservationPolicySchema.parse({
      policyVersion: preservationRun.policyVersion,
      coreRoi: preservationRun.coreRoi,
      coupledBand: preservationRun.coupledBand,
      outsideMode: "HARD_PRESERVE",
      blendMode: "FEATHERED",
      editRegionChangeThreshold: 0.001,
    });
    return this.toView({
      transactionId,
      executionRunId: executionRun.id,
      verificationRunId: verification.id,
      preservationRun,
      assetId: transaction.assetId,
      sourceVersionId: sourceVersion.id,
      sourceStorageKey: String(media.storageKey),
      sourceHash: String(media.sha256),
      sourceWidth: Number(media.width),
      sourceHeight: Number(media.height),
      rawCandidate,
      preservedCandidate,
      policy,
      rawEvidence: rawEvidenceRecord.metrics,
      preservedEvidence: preservedEvidenceRecord.metrics,
      machineVerification,
      providerLatencyMs: executionRun.latencyMs,
      preservationLatencyMs: preservationRun.processingTimeMs ?? 0,
      verificationLatencyMs: Number(verification.details.verificationLatencyMs ?? 0),
      costUsd: rawCandidate.costUsd,
      taskSpecBinding: taskSpecBindingFromMetadata(executionRun.metadata),
    });
  }

  async approvePreserved(transactionId: string) {
    const preference = await this.repositories.candidatePreferences.findByTransactionId(transactionId);
    if (!preference) throw new PreservationRuntimeError("PREFERENCE_REQUIRED", "Record the experimental preference first.");
    const { preserved } = await this.validateCandidatePair(transactionId, preference.rawCandidateId, preference.preservedCandidateId);
    const transaction = await this.repositories.outcomeTransactions.findById(transactionId);
    if (!transaction || transaction.status !== "VERIFIED") {
      throw new PreservationRuntimeError("MACHINE_VERIFICATION_REQUIRED", "Machine verification must pass before approval.");
    }
    const verificationRuns = await this.repositories.verificationRuns.findByTransactionId(transactionId);
    if (!verificationRuns.some((run) => run.status === "PASSED")) {
      throw new PreservationRuntimeError("MACHINE_VERIFICATION_REQUIRED", "No passed machine verification exists.");
    }
    const preservationRuns = await this.repositories.preservationRuns.findByTransactionId(transactionId);
    const preservationRun = preservationRuns.at(-1);
    if (!preservationRun || preservationRun.status !== "SUCCESS" || preservationRun.preservedCandidateId !== preserved.id) {
      throw new PreservationRuntimeError("INVALID_PROVENANCE", "Preserved candidate is not linked to a successful preservation run.");
    }
    const asset = await this.repositories.assets.findById(transaction.assetId);
    if (!asset || asset.currentVersionId !== transaction.baseVersionId) {
      throw new PreservationRuntimeError("STALE_BASE_VERSION", "The canonical head moved; approval cannot commit this candidate.");
    }
    const existingCommit = await this.repositories.stateCommits.findByTransactionId(transactionId);
    if (existingCommit) throw new PreservationRuntimeError("ALREADY_COMMITTED", "Transaction already committed.");

    await this.repositories.candidatePreferences.recordAcceptance(transactionId, true, preserved.id);
    const latest = await this.repositories.assetVersions.findLatestByAssetId(asset.id);
    const newVersion = await this.repositories.assetVersions.create({
      assetId: asset.id,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      state: {
        media: {
          storageKey: preserved.storageKey,
          mimeType: preserved.mimeType,
          width: preserved.width,
          height: preserved.height,
          byteSize: preserved.byteSize,
          sha256: preserved.sha256,
          candidateId: preserved.id,
          candidateType: preserved.candidateType,
          preservationRunId: preserved.preservationRunId,
        },
      },
      parentVersionId: asset.currentVersionId,
    });
    await this.repositories.assets.update(asset.id, { currentVersionId: newVersion.id });
    const stateCommit = await this.repositories.stateCommits.create({
      transactionId,
      assetId: asset.id,
      newVersionId: newVersion.id,
      previousVersionId: transaction.baseVersionId,
    });
    await this.repositories.candidateAssets.markCommitted(preserved.id);
    await this.repositories.outcomeTransactions.updateStatus(transactionId, "COMMITTED", { completedAt: new Date().toISOString() });
    return { stateCommit, newVersion };
  }

  async reject(transactionId: string) {
    const preference = await this.repositories.candidatePreferences.findByTransactionId(transactionId);
    if (!preference) throw new PreservationRuntimeError("PREFERENCE_REQUIRED", "Record the experimental preference first.");
    await this.repositories.candidatePreferences.recordAcceptance(transactionId, false, null);
    await this.repositories.outcomeTransactions.updateStatus(transactionId, "ABORTED", {
      abortReason: "Human rejected preserved candidate.",
      completedAt: new Date().toISOString(),
    });
    return { committed: false };
  }

  private async validateCandidatePair(transactionId: string, rawCandidateId: string, preservedCandidateId: string) {
    const [raw, preserved] = await Promise.all([
      this.repositories.candidateAssets.findById(rawCandidateId),
      this.repositories.candidateAssets.findById(preservedCandidateId),
    ]);
    if (!raw || !preserved || raw.transactionId !== transactionId || preserved.transactionId !== transactionId) {
      throw new PreservationRuntimeError("CANDIDATE_TRANSACTION_MISMATCH", "Candidates must belong to this transaction.");
    }
    if (raw.candidateType !== "RAW_PROVIDER" || preserved.candidateType !== "PRESERVED" || preserved.rawCandidateId !== raw.id) {
      throw new PreservationRuntimeError("INVALID_PROVENANCE", "Candidate types or lineage are invalid.");
    }
    return { raw, preserved };
  }

  private async recordProviderFailure(transactionId: string, startedAt: string, error: unknown): Promise<void> {
    const completedAt = new Date().toISOString();
    await this.repositories.executionRuns.create({
      transactionId,
      status: "FAILURE",
      executor: this.executor.name,
      startedAt,
      completedAt,
      latencyMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
      costUsd: null,
      errorMessage: error instanceof Error ? error.message.slice(0, 2000) : "Unknown provider failure.",
      metadata: { provider: this.executor.provider, costReported: false },
    });
    await this.repositories.outcomeTransactions.updateStatus(transactionId, "FAILED");
  }

  private async toView(input: {
    transactionId: string;
    executionRunId: string;
    verificationRunId: string;
    preservationRun: PreservationRunRecord;
    assetId: string;
    sourceVersionId: string;
    sourceStorageKey: string;
    sourceHash: string;
    sourceWidth: number;
    sourceHeight: number;
    rawCandidate: CandidateAssetRecord;
    preservedCandidate: CandidateAssetRecord;
    policy: PreservationPolicy;
    rawEvidence: PreservationEvidenceRecord["metrics"];
    preservedEvidence: PreservationEvidenceRecord["metrics"];
    machineVerification: MachineVerificationResult;
    providerLatencyMs: number;
    preservationLatencyMs: number;
    verificationLatencyMs: number;
    costUsd: number | null;
    taskSpecBinding?: PreservationExperimentView["taskSpecBinding"];
  }): Promise<PreservationExperimentView> {
    const [sourceUrl, rawUrl, preservedUrl] = await Promise.all([
      this.storage.createReadUrl(input.sourceStorageKey),
      this.storage.createReadUrl(input.rawCandidate.storageKey),
      this.storage.createReadUrl(input.preservedCandidate.storageKey),
    ]);
    return {
      transactionId: input.transactionId,
      executionRunId: input.executionRunId,
      verificationRunId: input.verificationRunId,
      preservationRunId: input.preservationRun.id,
      assetId: input.assetId,
      sourceVersionId: input.sourceVersionId,
      rawCandidateId: input.rawCandidate.id,
      preservedCandidateId: input.preservedCandidate.id,
      instruction: input.rawCandidate.instruction,
      source: { storageKey: input.sourceStorageKey, url: sourceUrl, sha256: input.sourceHash, width: input.sourceWidth, height: input.sourceHeight },
      raw: candidateView(input.rawCandidate, rawUrl),
      preserved: candidateView(input.preservedCandidate, preservedUrl),
      policy: input.policy,
      zones: input.preservationRun.zones,
      rawEvidence: input.rawEvidence,
      preservedEvidence: input.preservedEvidence,
      outsideChangeReduction: input.rawEvidence.changedPixelRatioLockedOutside - input.preservedEvidence.changedPixelRatioLockedOutside,
      totalChangeReduction: input.rawEvidence.changedPixelRatioTotal - input.preservedEvidence.changedPixelRatioTotal,
      machineVerification: input.machineVerification,
      provider: input.rawCandidate.provider,
      model: input.rawCandidate.model,
      providerLatencyMs: input.providerLatencyMs,
      preservationLatencyMs: input.preservationLatencyMs,
      verificationLatencyMs: input.verificationLatencyMs,
      costUsd: input.costUsd,
      taskSpecBinding: input.taskSpecBinding,
    };
  }
}

function validateSourceInput(input: RunPreservationExperimentInput): void {
  if (!input.projectName.trim() || !input.assetName.trim() || !input.instruction.trim()) {
    throw new PreservationRuntimeError("INVALID_INPUT", "Project, asset, and instruction are required.");
  }
  if (input.sourceMimeType !== "image/png") {
    throw new PreservationRuntimeError("UNSUPPORTED_MIME", "BUILD 004 v0.1 accepts PNG sources only.");
  }
  if (input.sourceBytes.byteLength === 0 || input.sourceBytes.byteLength > SOURCE_MAX_BYTES) {
    throw new PreservationRuntimeError("INVALID_FILE_SIZE", "PNG source must be between 1 byte and 10 MB.");
  }
}

function candidateView(candidate: CandidateAssetRecord, url: string): CandidateView {
  return {
    id: candidate.id,
    candidateType: candidate.candidateType,
    storageKey: candidate.storageKey,
    url,
    sha256: candidate.sha256,
    width: candidate.width,
    height: candidate.height,
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isImageEditExecutionError(error: unknown): error is { code: string; message: string } {
  return error instanceof Error && [
    "UNSUPPORTED_OUTPUT_GEOMETRY",
    "SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER",
    "PROVIDER_OUTPUT_CONTRACT_VIOLATION",
    "PROVIDER_REQUEST_FAILED",
  ].includes((error as { code?: unknown }).code as string);
}

function taskSpecBindingFromMetadata(metadata: Record<string, unknown>): PreservationExperimentView["taskSpecBinding"] {
  if (typeof metadata.taskSpecId !== "string" || typeof metadata.taskSpecHash !== "string" || typeof metadata.blueprintId !== "string" || typeof metadata.blueprintHash !== "string" || typeof metadata.specCompilerName !== "string" || typeof metadata.specCompilerVersion !== "string") return undefined;
  return {
    id: metadata.taskSpecId,
    version: Number(metadata.taskSpecVersion ?? 0),
    hash: metadata.taskSpecHash,
    blueprintId: metadata.blueprintId,
    blueprintVersion: Number(metadata.blueprintVersion ?? 0),
    blueprintHash: metadata.blueprintHash,
    compilerName: metadata.specCompilerName,
    compilerVersion: metadata.specCompilerVersion,
  };
}
