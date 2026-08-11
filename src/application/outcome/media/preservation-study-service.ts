import { randomInt } from "node:crypto";
import { z } from "zod";

import type { PreservationExperimentView } from "@/src/application/outcome/media/preservation-verification-service";
import type {
  PreservationStudyCaseBundle,
  PreservationStudyCaseRecord,
  PreservationStudyRepository,
} from "@/src/application/ports/outcome/preservation-study-repository";
import {
  PRESERVATION_STUDY_VERSION,
  StudyCandidateLabelSchema,
  StudyFailureTagSchema,
  StudyIntentInputSchema,
  StudyPairwisePreferenceSchema,
  StudyRatingsSchema,
  StudyTaskTypeSchema,
  StudyTopologySchema,
  deriveDivergenceTags,
  deriveStudyPreference,
  type StudyCandidateIdentity,
  type StudyCandidateLabel,
  type StudyRatings,
  type StudyTaskType,
  type StudyTopology,
} from "@/src/domain/outcome/media/preservation-study";
import { preservationStudyPlan, preservationStudyPlanDistribution } from "@/src/fixtures/preservation-study-plan";

const STUDY_SLUG = "preservation-value-study-v0-1";
const STUDY_NAME = "PRODUCT GATE 004 — Preservation Value Study v0.1";
const TARGET_CASE_COUNT = 30;

const AddCaseSchema = z.object({
  transactionId: z.uuid(),
  planCaseId: z.string().trim().min(1).max(120).nullable().optional().default(null),
  topology: StudyTopologySchema,
  taskType: StudyTaskTypeSchema,
}).strict();

const RatingInputSchema = z.object({
  caseId: z.uuid(),
  candidateLabel: StudyCandidateLabelSchema,
  ratings: StudyRatingsSchema,
  failureTags: z.array(StudyFailureTagSchema).max(11).default([]),
  notes: z.string().trim().max(8_000).nullable().optional().default(null),
}).strict();

const PairwiseInputSchema = z.object({
  caseId: z.uuid(),
  preference: StudyPairwisePreferenceSchema,
  notes: z.string().trim().max(8_000).nullable().optional().default(null),
}).strict();

const AcceptanceInputSchema = z.object({
  caseId: z.uuid(),
  rawAccepted: z.boolean(),
  preservedAccepted: z.boolean(),
}).strict();

export interface PreservationExperimentReader {
  getExperiment(transactionId: string): Promise<PreservationExperimentView>;
}

export type PreservationStudyStep = "HUMAN_INTENT" | "RATING_A" | "RATING_B" | "PAIRWISE" | "ACCEPTANCE" | "COMPLETE";

type BlindCandidateView = {
  label: StudyCandidateLabel;
  url: string;
  width: number;
  height: number;
};

export type PreservationStudyCaseView = {
  caseId: string;
  transactionId: string;
  topology: StudyTopology;
  taskType: StudyTaskType;
  planCaseId: string | null;
  step: PreservationStudyStep;
  source: { url: string; width: number; height: number; sha256: string };
  instruction: string;
  roi: Record<string, number>;
  coupledBand: { unit: "NORMALIZED_MIN_DIMENSION"; size: number };
  provider: string;
  model: string;
  intent: { expectedChange: string; expectedPreservation: string; unacceptableNotes: string | null; lockedAt: string } | null;
  candidate: BlindCandidateView | null;
  pair: BlindCandidateView[] | null;
  reveal: {
    candidateA: StudyCandidateIdentity;
    candidateB: StudyCandidateIdentity;
    derivedPreference: string;
    divergenceTags: string[];
    rawMetrics: PreservationExperimentView["rawEvidence"];
    preservedMetrics: PreservationExperimentView["preservedEvidence"];
  } | null;
  completedEvaluation: {
    rawRatings: StudyRatings;
    preservedRatings: StudyRatings;
    rawAccepted: boolean;
    preservedAccepted: boolean;
  } | null;
};

export type StudyAggregate = ReturnType<typeof calculateAggregate>;

export class PreservationStudyError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "PreservationStudyError";
  }
}

export class PreservationStudyService {
  constructor(
    private readonly repository: PreservationStudyRepository,
    private readonly experiments: PreservationExperimentReader,
    private readonly randomizeRawFirst = () => randomInt(0, 2) === 0,
  ) {}

  async getDashboard() {
    const study = await this.ensureStudy();
    const cases = await this.repository.listCases(study.id);
    const bundles = await Promise.all(cases.map((item) => this.requireBundle(item.id)));
    return {
      study,
      progress: {
        enrolled: cases.length,
        completed: bundles.filter((bundle) => bundle.acceptance !== null).length,
        target: study.targetCaseCount,
      },
      cases: bundles.map((bundle) => ({
        caseId: bundle.studyCase.id,
        transactionId: bundle.studyCase.transactionId,
        planCaseId: bundle.studyCase.planCaseId,
        topology: bundle.studyCase.topology,
        taskType: bundle.studyCase.taskType,
        step: determineStep(bundle),
      })),
      plan: preservationStudyPlan,
      planDistribution: preservationStudyPlanDistribution,
      report: buildReport(bundles, study.targetCaseCount),
    };
  }

  async addCase(untrustedInput: unknown): Promise<PreservationStudyCaseView> {
    const input = AddCaseSchema.parse(untrustedInput);
    const study = await this.ensureStudy();
    if (await this.repository.findCaseByTransactionId(study.id, input.transactionId)) {
      throw new PreservationStudyError("CASE_ALREADY_ENROLLED", "La transacción ya pertenece a este estudio.");
    }
    if (input.planCaseId && !preservationStudyPlan.some((item) => item.id === input.planCaseId)) {
      throw new PreservationStudyError("UNKNOWN_PLAN_CASE", "El caso no pertenece al plan congelado de 30 casos.");
    }
    const experiment = await this.experiments.getExperiment(input.transactionId);
    if (experiment.machineVerification.status !== "PASSED") {
      throw new PreservationStudyError("UNVERIFIED_EXPERIMENT", "El caso necesita machine verification PASSED.");
    }
    const studyCase = await this.repository.createCase({
      studyId: study.id,
      planCaseId: input.planCaseId,
      topology: input.topology,
      taskType: input.taskType,
      transactionId: experiment.transactionId,
      executionRunId: experiment.executionRunId,
      preservationRunId: experiment.preservationRunId,
      sourceVersionId: experiment.sourceVersionId,
      rawCandidateId: experiment.rawCandidateId,
      preservedCandidateId: experiment.preservedCandidateId,
      sourceStorageKey: experiment.source.storageKey,
      sourceSha256: experiment.source.sha256,
      sourceWidth: experiment.source.width,
      sourceHeight: experiment.source.height,
      rawStorageKey: experiment.raw.storageKey,
      rawSha256: experiment.raw.sha256,
      rawWidth: experiment.raw.width,
      rawHeight: experiment.raw.height,
      preservedStorageKey: experiment.preserved.storageKey,
      preservedSha256: experiment.preserved.sha256,
      preservedWidth: experiment.preserved.width,
      preservedHeight: experiment.preserved.height,
      instruction: experiment.instruction,
      roi: experiment.policy.coreRoi,
      coupledBand: experiment.policy.coupledBand,
      provider: experiment.provider,
      model: experiment.model,
      rawMetrics: experiment.rawEvidence,
      preservedMetrics: experiment.preservedEvidence,
    });
    return this.getCaseView(studyCase.id);
  }

  async getCaseView(caseId: string): Promise<PreservationStudyCaseView> {
    const bundle = await this.requireBundle(z.uuid().parse(caseId));
    const experiment = await this.experiments.getExperiment(bundle.studyCase.transactionId);
    assertSnapshotMatches(bundle.studyCase, experiment);
    const step = determineStep(bundle);
    const presentation = bundle.presentation;
    const candidate = presentation && (step === "RATING_A" || step === "RATING_B")
      ? blindCandidate(bundle.studyCase.id, step === "RATING_A" ? "A" : "B", experiment)
      : null;
    const pair = presentation && step === "PAIRWISE"
      ? [blindCandidate(bundle.studyCase.id, "A", experiment), blindCandidate(bundle.studyCase.id, "B", experiment)]
      : null;
    const reveal = presentation && bundle.pairwise ? {
      candidateA: presentation.candidateA,
      candidateB: presentation.candidateB,
      derivedPreference: bundle.pairwise.derivedPreference,
      divergenceTags: bundle.pairwise.divergenceTags,
      rawMetrics: bundle.studyCase.rawMetrics,
      preservedMetrics: bundle.studyCase.preservedMetrics,
    } : null;
    const completedEvaluation = presentation && bundle.acceptance
      ? completedEvaluationFor(bundle)
      : null;
    return {
      caseId: bundle.studyCase.id,
      transactionId: bundle.studyCase.transactionId,
      topology: bundle.studyCase.topology,
      taskType: bundle.studyCase.taskType,
      planCaseId: bundle.studyCase.planCaseId,
      step,
      source: { url: experiment.source.url, width: experiment.source.width, height: experiment.source.height, sha256: experiment.source.sha256 },
      instruction: bundle.studyCase.instruction,
      roi: bundle.studyCase.roi,
      coupledBand: bundle.studyCase.coupledBand,
      provider: bundle.studyCase.provider,
      model: bundle.studyCase.model,
      intent: bundle.intent ? {
        expectedChange: bundle.intent.expectedChange,
        expectedPreservation: bundle.intent.expectedPreservation,
        unacceptableNotes: bundle.intent.unacceptableNotes,
        lockedAt: bundle.intent.lockedAt,
      } : null,
      candidate,
      pair,
      reveal,
      completedEvaluation,
    };
  }

  async lockIntent(caseId: string, untrustedIntent: unknown): Promise<PreservationStudyCaseView> {
    const parsedCaseId = z.uuid().parse(caseId);
    const intent = StudyIntentInputSchema.parse(untrustedIntent);
    const bundle = await this.requireBundle(parsedCaseId);
    if (bundle.intent || bundle.presentation) throw new PreservationStudyError("INTENT_ALREADY_LOCKED", "La expectativa humana ya está bloqueada.");
    const rawFirst = this.randomizeRawFirst();
    await this.repository.lockIntentAndPresentation({
      caseId: parsedCaseId,
      intent,
      candidateA: rawFirst ? "RAW" : "PRESERVED",
      candidateAId: rawFirst ? bundle.studyCase.rawCandidateId : bundle.studyCase.preservedCandidateId,
      candidateB: rawFirst ? "PRESERVED" : "RAW",
      candidateBId: rawFirst ? bundle.studyCase.preservedCandidateId : bundle.studyCase.rawCandidateId,
    });
    return this.getCaseView(parsedCaseId);
  }

  async getBlindCandidateSource(caseId: string, label: StudyCandidateLabel): Promise<string> {
    const bundle = await this.requireBundle(z.uuid().parse(caseId));
    const parsedLabel = StudyCandidateLabelSchema.parse(label);
    const step = determineStep(bundle);
    const allowed = step === "RATING_A" ? ["A"] : step === "RATING_B" ? ["B"] : ["PAIRWISE", "ACCEPTANCE", "COMPLETE"].includes(step) ? ["A", "B"] : [];
    if (!allowed.includes(parsedLabel) || !bundle.presentation) {
      throw new PreservationStudyError("CANDIDATE_NOT_VISIBLE", "El candidato no está disponible en este paso.");
    }
    const experiment = await this.experiments.getExperiment(bundle.studyCase.transactionId);
    assertSnapshotMatches(bundle.studyCase, experiment);
    const identity = parsedLabel === "A" ? bundle.presentation.candidateA : bundle.presentation.candidateB;
    return identity === "RAW" ? experiment.raw.url : experiment.preserved.url;
  }

  async rateCandidate(untrustedInput: unknown): Promise<PreservationStudyCaseView> {
    const input = RatingInputSchema.parse(untrustedInput);
    const bundle = await this.requireBundle(input.caseId);
    const step = determineStep(bundle);
    const expected = step === "RATING_A" ? "A" : step === "RATING_B" ? "B" : null;
    if (!expected || input.candidateLabel !== expected) {
      throw new PreservationStudyError("RATING_OUT_OF_SEQUENCE", "La calificación no corresponde al candidato activo.");
    }
    await this.repository.createRating({
      caseId: input.caseId,
      candidateLabel: input.candidateLabel,
      ratings: input.ratings,
      failureTags: input.failureTags,
      notes: input.notes,
    });
    return this.getCaseView(input.caseId);
  }

  async recordPairwise(untrustedInput: unknown): Promise<PreservationStudyCaseView> {
    const input = PairwiseInputSchema.parse(untrustedInput);
    const bundle = await this.requireBundle(input.caseId);
    if (determineStep(bundle) !== "PAIRWISE" || !bundle.presentation) {
      throw new PreservationStudyError("PAIRWISE_NOT_READY", "Primero deben bloquearse ambas calificaciones independientes.");
    }
    const ratings = ratingsByIdentity(bundle);
    const derivedPreference = deriveStudyPreference(input.preference, bundle.presentation.candidateA);
    const divergenceTags = deriveDivergenceTags({
      rawMetrics: bundle.studyCase.rawMetrics,
      preservedMetrics: bundle.studyCase.preservedMetrics,
      rawPreservationScore: ratings.RAW.preservationSuccess,
      preservedPreservationScore: ratings.PRESERVED.preservationSuccess,
      preference: derivedPreference,
    });
    await this.repository.createPairwise({
      caseId: input.caseId,
      preference: input.preference,
      derivedPreference,
      divergenceTags,
      notes: input.notes,
    });
    return this.getCaseView(input.caseId);
  }

  async recordAcceptance(untrustedInput: unknown): Promise<PreservationStudyCaseView> {
    const input = AcceptanceInputSchema.parse(untrustedInput);
    const bundle = await this.requireBundle(input.caseId);
    if (determineStep(bundle) !== "ACCEPTANCE") {
      throw new PreservationStudyError("ACCEPTANCE_NOT_READY", "La preferencia pairwise debe bloquearse antes de aceptar candidatos.");
    }
    await this.repository.createAcceptance(input);
    return this.getCaseView(input.caseId);
  }

  private async ensureStudy() {
    return this.repository.ensureStudy({
      slug: STUDY_SLUG,
      name: STUDY_NAME,
      protocolVersion: PRESERVATION_STUDY_VERSION,
      targetCaseCount: TARGET_CASE_COUNT,
    });
  }

  private async requireBundle(caseId: string): Promise<PreservationStudyCaseBundle> {
    const bundle = await this.repository.getCaseBundle(caseId);
    if (!bundle) throw new PreservationStudyError("CASE_NOT_FOUND", "El caso de estudio no existe.");
    return bundle;
  }
}

function determineStep(bundle: PreservationStudyCaseBundle): PreservationStudyStep {
  if (!bundle.intent || !bundle.presentation) return "HUMAN_INTENT";
  if (!bundle.ratings.some((item) => item.candidateLabel === "A")) return "RATING_A";
  if (!bundle.ratings.some((item) => item.candidateLabel === "B")) return "RATING_B";
  if (!bundle.pairwise) return "PAIRWISE";
  if (!bundle.acceptance) return "ACCEPTANCE";
  return "COMPLETE";
}

function blindCandidate(
  caseId: string,
  label: StudyCandidateLabel,
  experiment: PreservationExperimentView,
): BlindCandidateView {
  return {
    label,
    url: `/api/preservation-study/media?caseId=${encodeURIComponent(caseId)}&label=${label}`,
    width: experiment.raw.width,
    height: experiment.raw.height,
  };
}

function assertSnapshotMatches(studyCase: PreservationStudyCaseRecord, experiment: PreservationExperimentView): void {
  const matches = studyCase.rawCandidateId === experiment.rawCandidateId
    && studyCase.preservedCandidateId === experiment.preservedCandidateId
    && studyCase.sourceVersionId === experiment.sourceVersionId
    && studyCase.executionRunId === experiment.executionRunId
    && studyCase.preservationRunId === experiment.preservationRunId
    && studyCase.rawSha256 === experiment.raw.sha256
    && studyCase.preservedSha256 === experiment.preserved.sha256
    && studyCase.sourceSha256 === experiment.source.sha256;
  if (!matches) throw new PreservationStudyError("SNAPSHOT_MISMATCH", "La evidencia actual no coincide con el snapshot inmutable del estudio.");
}

function ratingsByIdentity(bundle: PreservationStudyCaseBundle): Record<StudyCandidateIdentity, StudyRatings> {
  if (!bundle.presentation) throw new PreservationStudyError("PRESENTATION_MISSING", "Falta el orden ciego persistido.");
  const a = bundle.ratings.find((item) => item.candidateLabel === "A");
  const b = bundle.ratings.find((item) => item.candidateLabel === "B");
  if (!a || !b) throw new PreservationStudyError("RATINGS_INCOMPLETE", "Faltan calificaciones independientes.");
  return bundle.presentation.candidateA === "RAW"
    ? { RAW: a.ratings, PRESERVED: b.ratings }
    : { RAW: b.ratings, PRESERVED: a.ratings };
}

function completedEvaluationFor(bundle: PreservationStudyCaseBundle) {
  const ratings = ratingsByIdentity(bundle);
  return {
    rawRatings: ratings.RAW,
    preservedRatings: ratings.PRESERVED,
    rawAccepted: bundle.acceptance!.rawAccepted,
    preservedAccepted: bundle.acceptance!.preservedAccepted,
  };
}

function buildReport(bundles: PreservationStudyCaseBundle[], target: number) {
  const completed = bundles.filter((bundle) => bundle.acceptance && bundle.pairwise && bundle.ratings.length === 2);
  const overall = calculateAggregate(completed);
  const byTopology = Object.fromEntries(StudyTopologySchema.options.map((value) => [value, calculateAggregate(completed.filter((item) => item.studyCase.topology === value))]));
  const byTaskType = Object.fromEntries(StudyTaskTypeSchema.options.map((value) => [value, calculateAggregate(completed.filter((item) => item.studyCase.taskType === value))]));
  const byCoupledBand = Object.fromEntries(["ZERO", "SMALL", "MEDIUM", "LARGE"].map((value) => [value, calculateAggregate(completed.filter((item) => bandBucket(item.studyCase.coupledBand.size) === value))]));
  return {
    protocolVersion: PRESERVATION_STUDY_VERSION,
    targetCaseCount: target,
    completedCaseCount: completed.length,
    readyForGateDecision: completed.length >= target,
    overall,
    byTopology,
    byTaskType,
    byCoupledBand,
    suggestedDecision: completed.length >= target ? suggestDecision(overall, byTopology) : null,
    manualReviewRequired: true,
    note: "Pixel metrics are descriptive preservation evidence, not semantic or perceptual correctness.",
  };
}

function calculateAggregate(bundles: PreservationStudyCaseBundle[]) {
  const count = bundles.length;
  const preferences = { RAW_BETTER: 0, PRESERVED_BETTER: 0, TIE: 0, BOTH_BAD: 0 };
  const rawTotals = emptyRatings();
  const preservedTotals = emptyRatings();
  let rawAccepted = 0;
  let preservedAccepted = 0;
  const failureTagCounts: Record<string, number> = {};
  const divergenceTagCounts: Record<string, number> = {};
  for (const bundle of bundles) {
    preferences[bundle.pairwise!.derivedPreference] += 1;
    const ratings = ratingsByIdentity(bundle);
    addRatings(rawTotals, ratings.RAW);
    addRatings(preservedTotals, ratings.PRESERVED);
    if (bundle.acceptance!.rawAccepted) rawAccepted += 1;
    if (bundle.acceptance!.preservedAccepted) preservedAccepted += 1;
    for (const rating of bundle.ratings) {
      for (const tag of rating.failureTags) failureTagCounts[tag] = (failureTagCounts[tag] ?? 0) + 1;
    }
    for (const tag of bundle.pairwise!.divergenceTags) divergenceTagCounts[tag] = (divergenceTagCounts[tag] ?? 0) + 1;
  }
  const rawAcceptanceRate = rate(rawAccepted, count);
  const preservedAcceptanceRate = rate(preservedAccepted, count);
  return {
    caseCount: count,
    preservedPreferenceRate: rate(preferences.PRESERVED_BETTER, count),
    rawPreferenceRate: rate(preferences.RAW_BETTER, count),
    tieRate: rate(preferences.TIE, count),
    bothBadRate: rate(preferences.BOTH_BAD, count),
    rawAcceptanceRate,
    preservedAcceptanceRate,
    acceptanceLift: rawAcceptanceRate === null || preservedAcceptanceRate === null ? null : preservedAcceptanceRate - rawAcceptanceRate,
    averageRatings: {
      RAW: averageRatings(rawTotals, count),
      PRESERVED: averageRatings(preservedTotals, count),
    },
    failureTagCounts,
    divergenceTagCounts,
  };
}

function emptyRatings(): StudyRatings {
  return { requestedEditSuccess: 0, preservationSuccess: 0, naturalness: 0, artifactFreedom: 0, overallUsefulness: 0 };
}

function addRatings(target: StudyRatings, value: StudyRatings): void {
  for (const key of Object.keys(target) as Array<keyof StudyRatings>) target[key] += value[key];
}

function averageRatings(total: StudyRatings, count: number): Record<keyof StudyRatings, number | null> {
  return Object.fromEntries((Object.keys(total) as Array<keyof StudyRatings>).map((key) => [key, count ? total[key] / count : null])) as Record<keyof StudyRatings, number | null>;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator ? numerator / denominator : null;
}

function bandBucket(size: number): "ZERO" | "SMALL" | "MEDIUM" | "LARGE" {
  if (size === 0) return "ZERO";
  if (size <= 0.03) return "SMALL";
  if (size <= 0.08) return "MEDIUM";
  return "LARGE";
}

function suggestDecision(overall: StudyAggregate, byTopology: Record<string, StudyAggregate>) {
  const lift = overall.acceptanceLift ?? 0;
  const rawUsefulness = overall.averageRatings.RAW.overallUsefulness ?? 0;
  const preservedUsefulness = overall.averageRatings.PRESERVED.overallUsefulness ?? 0;
  const usefulnessDelta = preservedUsefulness - rawUsefulness;
  if (lift <= -0.05 || usefulnessDelta <= -0.1) return "NEGATIVE_SIGNAL" as const;
  if (lift >= 0.1 && usefulnessDelta >= 0.1) return "STRONG_SIGNAL" as const;
  const positiveStrata = Object.values(byTopology).filter((item) => item.caseCount > 0 && (item.acceptanceLift ?? 0) >= 0.1).length;
  if (positiveStrata > 0 || lift > 0 || usefulnessDelta > 0) return "CONDITIONAL_SIGNAL" as const;
  return "NO_SIGNAL" as const;
}
