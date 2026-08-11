import { createHash } from "node:crypto";
import { z } from "zod";

import type { PreservationExperimentView, RunPreservationExperimentInput } from "@/src/application/outcome/media/preservation-verification-service";
import type { FieldBetaRepository } from "@/src/application/ports/outcome/field-beta-repository";
import type { MediaObjectStore } from "@/src/application/ports/outcome/media-object-store-port";
import type { AssetVersionRepository, CandidateAssetRepository } from "@/src/application/ports/repositories";
import {
  FIELD_POLICY_DEFINITION,
  FIELD_POLICY_VERSION,
  FieldFeedbackInputSchema,
  PreservationStrategyIdSchema,
  RunFieldEditSchema,
  calculateFieldMetrics,
  recommendedStrategyFor,
  type FieldEvaluationSample,
  type FieldOutcome,
  type PreservationStrategyId,
} from "@/src/domain/outcome/media/field-beta";
import { createDefaultPreservationPolicy } from "@/src/domain/outcome/media/preservation";
import { decodePngToPixels } from "@/src/infrastructure/evidence/png-decoder";
import { encodePixelsToPng } from "@/src/infrastructure/evidence/png-encoder";
import { PreservationLadderEngine } from "@/src/infrastructure/preservation/preservation-ladder-engine";
import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { publishOutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { DeterministicPrecisionEditSpecCompiler } from "@/src/application/outcome/specification/deterministic-spec-compiler";
import { verifyTaskSpecHash, type TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import { verifySameSpecExecution } from "@/src/application/outcome/specification/same-spec-gate";
import type { CriterionEvidence } from "@/src/application/outcome/specification/types";
import { PRECISION_EDIT_OUTCOME_SKU } from "@/src/domain/outcome/media/field-beta";

export interface FieldBaseExperimentRunner {
  runExperiment(input: RunPreservationExperimentInput): Promise<PreservationExperimentView>;
}

type CandidateView = {
  candidateId: string;
  strategyId: PreservationStrategyId;
  role: "DELIVERED" | "SHADOW";
  url: string;
  width: number;
  height: number;
  sha256: string;
  machineMetrics: PreservationExperimentView["rawEvidence"];
  preservationLatencyMs: number;
};

export type FieldEditView = {
  fieldOutcome: FieldOutcome;
  source: PreservationExperimentView["source"];
  delivered: Omit<CandidateView, "strategyId" | "role" | "machineMetrics" | "preservationLatencyMs">;
  humanFeedback: Awaited<ReturnType<FieldBetaRepository["findFeedbackByOutcomeId"]>>;
  evaluationSample: { sampleId: string; candidates: Array<{ label: "A" | "B"; url: string; width: number; height: number }> } | null;
  debug: {
    policyStatus: typeof FIELD_POLICY_DEFINITION.status;
    provider: string;
    model: string;
    rawCandidateId: string;
    candidates: CandidateView[];
  };
};

export class FieldBetaError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = "FieldBetaError"; }
}

export class FieldBetaService {
  constructor(
    private readonly baseRunner: FieldBaseExperimentRunner,
    private readonly candidates: CandidateAssetRepository,
    private readonly assetVersions: AssetVersionRepository,
    private readonly repository: FieldBetaRepository,
    private readonly storage: MediaObjectStore,
    private readonly ladder = new PreservationLadderEngine(),
    private readonly samplingRate = 0,
    private readonly random = Math.random,
  ) {}

  private readonly compiler = new DeterministicPrecisionEditSpecCompiler();

  async run(untrustedInput: unknown): Promise<FieldEditView> {
    const input = RunFieldEditSchema.parse(untrustedInput);
    await this.ensurePolicy();
    const recommendedStrategy = recommendedStrategyFor(input.topology);
    const strategyId = input.chosenStrategy ?? recommendedStrategy;
    const totalStartedAt = performance.now();
    let compiledTaskSpec: TaskSpec | null = null;
    const blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), new Date().toISOString());
    const base = await this.baseRunner.runExperiment({
      projectName: input.projectName,
      assetName: input.assetName,
      sourceBytes: input.sourceBytes,
      sourceMimeType: input.sourceMimeType,
      instruction: input.instruction,
      policy: createDefaultPreservationPolicy(input.roi, FIELD_POLICY_DEFINITION.strategies.P3_HARD.coupledBandSize),
      taskSpecFactory: async (context) => {
        compiledTaskSpec = await this.compiler.compile({
          blueprint,
          transactionId: context.transactionId,
          source: { assetId: context.assetId, versionId: context.sourceVersionId, sha256: context.sourceSha256, mimeType: "image/png", byteSize: context.sourceByteSize },
          customerInstruction: input.instruction,
          roi: input.roi,
          customerParameters: { topology: input.topology, coupledBand: FIELD_POLICY_DEFINITION.strategies[strategyId].coupledBandSize },
          runtimeCapabilities: ["READ_SOURCE", "CALL_IMAGE_PROVIDER", "WRITE_CANDIDATE", "APPLY_PRESERVATION"],
          requestedCapabilities: ["APPLY_PRESERVATION"],
        });
        return compiledTaskSpec;
      },
    });
    const taskSpec = compiledTaskSpec as TaskSpec | null;
    if (!taskSpec || !verifyTaskSpecHash(taskSpec) || !base.taskSpecBinding || base.taskSpecBinding.hash !== taskSpec.hash) {
      throw new FieldBetaError("SAME_SPEC_BINDING_REQUIRED", "La ejecución de campo requiere un Task Spec inmutable y compartido con la verificación.");
    }
    const sameSpecVerification = verifySameSpecExecution(taskSpec, {
      id: crypto.randomUUID(), taskSpecId: taskSpec.id, taskSpecHash: taskSpec.hash, producerRole: "VERIFIER",
      executor: { name: "field-beta-verifier", version: "0.1.0", provider: "system" }, capabilityProfile: ["READ_SOURCE"], resultRef: `transaction://${base.transactionId}`,
      evidence: fieldEvidence(taskSpec, base), violations: [], latencyMs: Math.max(0, Math.round(base.verificationLatencyMs)), costUsd: null,
    });
    const [sourceBytes, rawBytes] = await Promise.all([this.storage.get(base.source.storageKey), this.storage.get(base.raw.storageKey)]);
    const sourcePixels = decodePngToPixels(Buffer.from(sourceBytes));
    const rawPixels = decodePngToPixels(Buffer.from(rawBytes));

    const views = new Map<PreservationStrategyId, CandidateView>();
    views.set("P0_RAW", {
      candidateId: base.rawCandidateId, strategyId: "P0_RAW", role: strategyId === "P0_RAW" ? "DELIVERED" : "SHADOW",
      url: base.raw.url, width: base.raw.width, height: base.raw.height, sha256: base.raw.sha256,
      machineMetrics: base.rawEvidence, preservationLatencyMs: 0,
    });
    views.set("P3_HARD", {
      candidateId: base.preservedCandidateId, strategyId: "P3_HARD", role: strategyId === "P3_HARD" ? "DELIVERED" : "SHADOW",
      url: base.preserved.url, width: base.preserved.width, height: base.preserved.height, sha256: base.preserved.sha256,
      machineMetrics: base.preservedEvidence, preservationLatencyMs: base.preservationLatencyMs,
    });

    for (const derivedStrategy of ["P1_SOFT", "P2_MODERATE"] as const) {
      const parameters = FIELD_POLICY_DEFINITION.strategies[derivedStrategy];
      const result = this.ladder.derive({ strategyId: derivedStrategy, parameters, source: sourcePixels, rawCandidate: rawPixels, roi: input.roi });
      const buffer = encodePixelsToPng(result.pixels);
      const bytes = new Uint8Array(buffer);
      const storageKey = `candidates/${base.transactionId}/strategies/${derivedStrategy.toLowerCase()}/${crypto.randomUUID()}.png`;
      await this.storage.put(storageKey, bytes, "image/png");
      const candidate = await this.candidates.create({
        transactionId: base.transactionId, executionRunId: base.executionRunId, storageKey, mimeType: "image/png",
        width: result.pixels.width, height: result.pixels.height, byteSize: bytes.byteLength, sha256: sha256(bytes), roi: input.roi,
        instruction: input.instruction, provider: "intent-lab", model: this.ladder.methodologyVersion, costUsd: null,
        candidateType: "PRESERVED", sourceVersionId: base.sourceVersionId, rawCandidateId: base.rawCandidateId,
        preservationRunId: null, committed: false,
      });
      views.set(derivedStrategy, {
        candidateId: candidate.id, strategyId: derivedStrategy, role: strategyId === derivedStrategy ? "DELIVERED" : "SHADOW",
        url: await this.storage.createReadUrl(storageKey), width: candidate.width, height: candidate.height, sha256: candidate.sha256,
        machineMetrics: result.metrics, preservationLatencyMs: result.processingTimeMs,
      });
    }

    for (const currentStrategy of PreservationStrategyIdSchema.options) {
      const candidate = views.get(currentStrategy)!;
      await this.repository.createStrategyRun({
        transactionId: base.transactionId, executionRunId: base.executionRunId, rawCandidateId: base.rawCandidateId,
        candidateId: candidate.candidateId, policyVersion: FIELD_POLICY_VERSION, strategyId: currentStrategy,
        parameters: FIELD_POLICY_DEFINITION.strategies[currentStrategy], role: candidate.role,
        machineMetrics: candidate.machineMetrics, preservationLatencyMs: candidate.preservationLatencyMs,
        tenantId: input.tenantId, outcomeSku: PRECISION_EDIT_OUTCOME_SKU,
        blueprintId: taskSpec.blueprint.id, blueprintVersion: taskSpec.blueprint.version, blueprintHash: taskSpec.blueprint.hash,
        taskSpecId: taskSpec.id, taskSpecVersion: taskSpec.version, taskSpecHash: taskSpec.hash,
        specCompilerVersion: taskSpec.compiler.version,
      });
    }
    const delivered = views.get(strategyId)!;
    const fieldOutcome = await this.repository.createOutcome({
      transactionId: base.transactionId, sourceVersionId: base.sourceVersionId, instruction: input.instruction, roi: input.roi,
      topology: input.topology, taskType: input.taskType, provider: base.provider, model: base.model,
      rawCandidateId: base.rawCandidateId, deliveredCandidateId: delivered.candidateId, recommendedStrategy,
      strategyId, policyVersion: FIELD_POLICY_VERSION,
      overrideReason: strategyId === recommendedStrategy ? null : input.overrideReason,
      providerLatencyMs: base.providerLatencyMs, preservationLatencyMs: delivered.preservationLatencyMs,
      totalLatencyMs: Math.max(0, Math.round((performance.now() - totalStartedAt) * 1_000) / 1_000),
      providerCostUsd: base.costUsd,
      tenantId: input.tenantId,
      outcomeSku: PRECISION_EDIT_OUTCOME_SKU,
      blueprintId: taskSpec.blueprint.id,
      blueprintVersion: taskSpec.blueprint.version,
      blueprintHash: taskSpec.blueprint.hash,
      taskSpecId: taskSpec.id,
      taskSpecVersion: taskSpec.version,
      taskSpecHash: taskSpec.hash,
      specCompilerName: taskSpec.compiler.name,
      specCompilerVersion: taskSpec.compiler.version,
      sourceSha256: base.source.sha256,
      machineVerificationStatus: base.machineVerification.status,
      sameSpecStatus: sameSpecVerification.status,
      blueprintSnapshot: blueprint,
      taskSpecSnapshot: taskSpec,
    });
    const sample = await this.maybeCreateSample(fieldOutcome.id, views, strategyId);
    return this.buildView(fieldOutcome, base.source, [...views.values()], sample, null);
  }

  async getByTransactionId(transactionId: string): Promise<FieldEditView> {
    const outcome = await this.repository.findOutcomeByTransactionId(z.uuid().parse(transactionId));
    if (!outcome) throw new FieldBetaError("FIELD_OUTCOME_NOT_FOUND", "No existe ese resultado de campo.");
    const strategyRuns = await this.repository.listStrategyRuns(transactionId);
    const candidateRecords = await Promise.all(strategyRuns.map((item) => this.candidates.findById(item.candidateId)));
    const candidates: CandidateView[] = await Promise.all(strategyRuns.map(async (run, index) => {
      const candidate = candidateRecords[index];
      if (!candidate) throw new FieldBetaError("CANDIDATE_MISSING", "Falta un candidato inmutable de la ladder.");
      return { candidateId: candidate.id, strategyId: run.strategyId, role: run.role, url: await this.storage.createReadUrl(candidate.storageKey), width: candidate.width, height: candidate.height, sha256: candidate.sha256, machineMetrics: run.machineMetrics, preservationLatencyMs: run.preservationLatencyMs };
    }));
    const transactionCandidate = candidateRecords.find((item) => item?.id === outcome.rawCandidateId);
    if (!transactionCandidate) throw new FieldBetaError("SOURCE_PROVENANCE_MISSING", "No se pudo reconstruir la procedencia del resultado.");
    const feedback = await this.repository.findFeedbackByOutcomeId(outcome.id);
    const sample = await this.repository.findEvaluationSampleByOutcomeId(outcome.id);
    const source = await this.sourceViewFromOutcome(outcome);
    return this.buildView(outcome, source, candidates, sample, feedback);
  }

  async recordFeedback(untrustedInput: unknown) {
    const input = FieldFeedbackInputSchema.parse(untrustedInput);
    const outcome = await this.requireOutcome(input.fieldOutcomeId);
    if (input.tenantId !== outcome.tenantId) throw new FieldBetaError("TENANT_MISMATCH", "La aceptación debe pertenecer al mismo tenant del resultado.");
    if (await this.repository.findFeedbackByOutcomeId(outcome.id)) throw new FieldBetaError("FEEDBACK_ALREADY_RECORDED", "La respuesta humana ya quedó bloqueada.");
    return this.repository.createFeedback({ ...input, recordedBy: "internal-evaluator" });
  }

  async recordEvaluationJudgment(input: { sampleId: string; preference: "A_BETTER" | "B_BETTER" | "TIE" | "BOTH_BAD" }) {
    const sampleId = z.uuid().parse(input.sampleId);
    if (await this.repository.findEvaluationJudgment(sampleId)) throw new FieldBetaError("JUDGMENT_ALREADY_RECORDED", "La comparación ciega ya está bloqueada.");
    const sample = await this.repository.findEvaluationSample(sampleId);
    if (!sample) throw new FieldBetaError("EVALUATION_SAMPLE_NOT_FOUND", "La muestra de evaluación no existe.");
    return this.repository.createEvaluationJudgment({ tenantId: sample.tenantId, sampleId, preference: z.enum(["A_BETTER", "B_BETTER", "TIE", "BOTH_BAD"]).parse(input.preference) });
  }

  async flagRegression(input: { fieldOutcomeId: string; reason: string }) {
    const outcome = await this.requireOutcome(z.uuid().parse(input.fieldOutcomeId));
    const feedback = await this.repository.findFeedbackByOutcomeId(outcome.id);
    if (!feedback || feedback.humanAccepted) throw new FieldBetaError("REJECTED_OUTCOME_REQUIRED", "Solo un resultado rechazado puede marcarse como candidato de regresión.");
    if (await this.repository.findRegressionByOutcomeId(outcome.id)) throw new FieldBetaError("REGRESSION_ALREADY_FLAGGED", "El caso ya fue marcado.");
    return this.repository.createRegressionCandidate({ tenantId: outcome.tenantId, fieldOutcomeId: outcome.id, reason: z.string().trim().min(1).max(4_000).parse(input.reason) });
  }

  async promoteGolden(input: { fieldOutcomeId: string; intentExpectation: string; criticalPreservationExpectation: string; promotionReason: string; usageAuthorizationStatus: "AUTHORIZED_INTERNAL" }) {
    const outcome = await this.requireOutcome(z.uuid().parse(input.fieldOutcomeId));
    if (await this.repository.findGoldenByOutcomeId(outcome.id)) throw new FieldBetaError("GOLDEN_ALREADY_EXISTS", "El Golden Case es inmutable y ya existe.");
    const feedback = await this.repository.findFeedbackByOutcomeId(outcome.id);
    const regression = await this.repository.findRegressionByOutcomeId(outcome.id);
    const strategyRuns = await this.repository.listStrategyRuns(outcome.transactionId);
    return this.repository.createGoldenCase({
      fieldOutcomeId: outcome.id, goldenVersion: "golden-regression-v0.1",
      intentExpectation: z.string().trim().min(1).max(8_000).parse(input.intentExpectation),
      criticalPreservationExpectation: z.string().trim().min(1).max(8_000).parse(input.criticalPreservationExpectation),
      promotionReason: z.string().trim().min(1).max(4_000).parse(input.promotionReason),
      usageAuthorizationStatus: input.usageAuthorizationStatus,
      tenantId: outcome.tenantId,
      provenance: { outcome, feedback, strategyRuns }, regressionCandidateId: regression?.id ?? null,
    });
  }

  async getDashboard(filters: { policyVersion?: string; provider?: string; model?: string; from?: string; to?: string } = {}) {
    const [outcomes, feedback, goldenCases] = await Promise.all([this.repository.listOutcomes(), this.repository.listFeedback(), this.repository.listGoldenCases()]);
    return { metrics: calculateFieldMetrics(outcomes, feedback, filters), filters, goldenCaseCount: goldenCases.length, policy: FIELD_POLICY_DEFINITION };
  }

  private async ensurePolicy() {
    const existing = await this.repository.findPolicy(FIELD_POLICY_VERSION);
    if (!existing) return this.repository.createPolicy({ policyVersion: FIELD_POLICY_VERSION, status: FIELD_POLICY_DEFINITION.status, definition: FIELD_POLICY_DEFINITION });
    if (stableJson(existing.definition) !== stableJson(FIELD_POLICY_DEFINITION)) throw new FieldBetaError("POLICY_VERSION_IMMUTABLE", "La definición almacenada de preservation-policy-v0.1 no coincide; crea una versión nueva.");
    return existing;
  }

  private async maybeCreateSample(fieldOutcomeId: string, candidates: Map<PreservationStrategyId, CandidateView>, deliveredStrategy: PreservationStrategyId): Promise<FieldEvaluationSample | null> {
    if (this.samplingRate <= 0 || this.random() >= this.samplingRate) return null;
    const shadow = [...candidates.values()].find((item) => item.strategyId !== deliveredStrategy)!;
    const delivered = candidates.get(deliveredStrategy)!;
    const rawFirst = this.random() < 0.5;
    const a = rawFirst ? delivered : shadow;
    const b = rawFirst ? shadow : delivered;
    const outcome = await this.repository.findOutcome(fieldOutcomeId);
    return this.repository.createEvaluationSample({ tenantId: outcome?.tenantId ?? "internal-lab", fieldOutcomeId, candidateAId: a.candidateId, candidateAStrategy: a.strategyId, candidateBId: b.candidateId, candidateBStrategy: b.strategyId });
  }

  private async buildView(fieldOutcome: FieldOutcome, source: PreservationExperimentView["source"], candidates: CandidateView[], sample: FieldEvaluationSample | null, humanFeedback: Awaited<ReturnType<FieldBetaRepository["findFeedbackByOutcomeId"]>>): Promise<FieldEditView> {
    const delivered = candidates.find((item) => item.candidateId === fieldOutcome.deliveredCandidateId)!;
    const byId = new Map(candidates.map((item) => [item.candidateId, item]));
    return {
      fieldOutcome, source,
      delivered: { candidateId: delivered.candidateId, url: delivered.url, width: delivered.width, height: delivered.height, sha256: delivered.sha256 },
      humanFeedback,
      evaluationSample: sample ? { sampleId: sample.id, candidates: [
        { label: "A", url: byId.get(sample.candidateAId)!.url, width: byId.get(sample.candidateAId)!.width, height: byId.get(sample.candidateAId)!.height },
        { label: "B", url: byId.get(sample.candidateBId)!.url, width: byId.get(sample.candidateBId)!.width, height: byId.get(sample.candidateBId)!.height },
      ] } : null,
      debug: { policyStatus: FIELD_POLICY_DEFINITION.status, provider: fieldOutcome.provider, model: fieldOutcome.model, rawCandidateId: fieldOutcome.rawCandidateId, candidates },
    };
  }

  private async sourceViewFromOutcome(outcome: FieldOutcome): Promise<PreservationExperimentView["source"]> {
    const version = await this.assetVersions.findById(outcome.sourceVersionId);
    const media = version?.state.media as Record<string, unknown> | undefined;
    if (!version || !media) throw new FieldBetaError("SOURCE_PROVENANCE_MISSING", "Falta la versión fuente inmutable.");
    const storageKey = String(media.storageKey);
    return { storageKey, url: await this.storage.createReadUrl(storageKey), sha256: String(media.sha256), width: Number(media.width), height: Number(media.height) };
  }

  private async requireOutcome(id: string) { const outcome = await this.repository.findOutcome(id); if (!outcome) throw new FieldBetaError("FIELD_OUTCOME_NOT_FOUND", "No existe ese resultado de campo."); return outcome; }
}

function sha256(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`; return JSON.stringify(value); }

function fieldEvidence(spec: TaskSpec, base: PreservationExperimentView): CriterionEvidence[] {
  const assertion = (type: string) => base.machineVerification.assertions.find((item) => item.type === type);
  const edit = assertion("EDIT_REGION_HAS_CHANGE");
  const source = assertion("SOURCE_IMMUTABLE");
  const evidence: CriterionEvidence[] = [];
  const add = (criterionId: string, passed: boolean, details: Record<string, unknown>) => evidence.push({ id: crypto.randomUUID(), taskSpecId: spec.id, taskSpecHash: spec.hash, criterionId, status: passed ? "PASS" : "FAIL", evidenceType: criterionId === "SOURCE_VERSION_MATCHES" ? "HASH" : "METRIC", issuerRole: "VERIFIER", evidenceRef: `verification://${base.transactionId}/${criterionId}`, details });
  if (edit) add("REQUESTED_EDIT_HAS_CHANGE", edit.passed, edit.evidence);
  if (source) add("SOURCE_VERSION_MATCHES", source.passed, source.evidence);
  return evidence;
}
