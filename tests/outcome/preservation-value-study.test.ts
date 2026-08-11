import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PreservationStudyService, type PreservationExperimentReader } from "@/src/application/outcome/media/preservation-study-service";
import type { PreservationExperimentView } from "@/src/application/outcome/media/preservation-verification-service";
import { deriveDivergenceTags } from "@/src/domain/outcome/media/preservation-study";
import { preservationStudyPlan, preservationStudyPlanDistribution } from "@/src/fixtures/preservation-study-plan";
import { InMemoryPreservationStudyRepository } from "@/src/infrastructure/persistence/outcome/in-memory-preservation-study-repository";

const ids = {
  transaction: "10000000-0000-4000-8000-000000000001",
  execution: "10000000-0000-4000-8000-000000000002",
  preservation: "10000000-0000-4000-8000-000000000003",
  asset: "10000000-0000-4000-8000-000000000004",
  source: "10000000-0000-4000-8000-000000000005",
  raw: "10000000-0000-4000-8000-000000000006",
  preserved: "10000000-0000-4000-8000-000000000007",
};

const rawMetrics = {
  methodologyVersion: "pixel-diff-zones-v0.1" as const,
  meanTotalPixelDiff: 0.2, changedPixelRatioTotal: 0.8,
  meanCorePixelDiff: 0.4, changedPixelRatioCore: 0.9,
  meanCoupledPixelDiff: 0.2, changedPixelRatioCoupled: 0.5,
  meanLockedOutsidePixelDiff: 0.1, changedPixelRatioLockedOutside: 0.7,
};
const preservedMetrics = { ...rawMetrics, meanTotalPixelDiff: 0.1, changedPixelRatioTotal: 0.2, meanLockedOutsidePixelDiff: 0, changedPixelRatioLockedOutside: 0 };

const experiment: PreservationExperimentView = {
  transactionId: ids.transaction,
  executionRunId: ids.execution,
  preservationRunId: ids.preservation,
  assetId: ids.asset,
  sourceVersionId: ids.source,
  rawCandidateId: ids.raw,
  preservedCandidateId: ids.preserved,
  instruction: "Haz la camiseta negra y conserva todo lo demás.",
  source: { storageKey: "source.png", url: "https://example.test/source.png", sha256: "a".repeat(64), width: 100, height: 100 },
  raw: { id: ids.raw, candidateType: "RAW_PROVIDER", storageKey: "raw.png", url: "https://example.test/raw.png", sha256: "b".repeat(64), width: 100, height: 100 },
  preserved: { id: ids.preserved, candidateType: "PRESERVED", storageKey: "preserved.png", url: "https://example.test/preserved.png", sha256: "c".repeat(64), width: 100, height: 100 },
  policy: { policyVersion: "preservation-policy-v0.1", coreRoi: { x: .2, y: .2, width: .3, height: .3 }, coupledBand: { unit: "NORMALIZED_MIN_DIMENSION", size: .04 }, outsideMode: "HARD_PRESERVE", blendMode: "FEATHERED", editRegionChangeThreshold: .001 },
  zones: { imageWidth: 100, imageHeight: 100, core: { x0: 20, y0: 20, x1: 50, y1: 50 }, expanded: { x0: 16, y0: 16, x1: 54, y1: 54 }, coupledBandPixels: 4, counts: { core: 900, coupled: 544, lockedOutside: 8556 } },
  rawEvidence: rawMetrics,
  preservedEvidence: preservedMetrics,
  outsideChangeReduction: .7,
  totalChangeReduction: .6,
  machineVerification: { methodologyVersion: "creative-assertions-v0.1", status: "PASSED", assertions: ["SOURCE_IMMUTABLE", "DIMENSIONS_MATCH", "RAW_CANDIDATE_EXISTS", "PRESERVED_CANDIDATE_EXISTS", "PROVENANCE_VALID", "LOCKED_OUTSIDE_EXACTLY_PRESERVED", "EDIT_REGION_HAS_CHANGE"].map((type) => ({ type: type as never, required: true, passed: true, evidence: {} })) },
  provider: "openai", model: "gpt-image-2", providerLatencyMs: 100, preservationLatencyMs: 5, verificationLatencyMs: 2, costUsd: null,
};

class Reader implements PreservationExperimentReader {
  calls = 0;
  async getExperiment(transactionId: string) {
    this.calls += 1;
    expect(transactionId).toBe(ids.transaction);
    return structuredClone(experiment);
  }
}

function setup(rawFirst = true) {
  const repository = new InMemoryPreservationStudyRepository();
  const reader = new Reader();
  const service = new PreservationStudyService(repository, reader, () => rawFirst);
  return { repository, reader, service };
}

async function enroll(service: PreservationStudyService) {
  return service.addCase({ transactionId: ids.transaction, planCaseId: "li-01-shirt-color", topology: "LOCAL_INDEPENDENT", taskType: "COLOR_CHANGE" });
}

const strongRatings = { requestedEditSuccess: 2, preservationSuccess: 2, naturalness: 2, artifactFreedom: 2, overallUsefulness: 2 };
const partialRatings = { requestedEditSuccess: 2, preservationSuccess: 1, naturalness: 1, artifactFreedom: 1, overallUsefulness: 1 };

describe("PRODUCT GATE 004 preservation value study", () => {
  it("freezes a 30-case plan with the requested topology distribution and varied content", () => {
    expect(preservationStudyPlan).toHaveLength(30);
    expect(preservationStudyPlanDistribution).toEqual({ LOCAL_INDEPENDENT: 8, LOCAL_COUPLED: 10, STRUCTURAL: 8, GLOBAL: 4 });
    expect(new Set(preservationStudyPlan.map((item) => item.instruction)).size).toBe(30);
    expect(preservationStudyPlan.some((item) => item.sourceBrief.toLowerCase().includes("cuadrado"))).toBe(false);
  });

  it("requires and locks human intent before any candidate output is returned", async () => {
    const { service } = setup();
    const initial = await enroll(service);
    expect(initial.step).toBe("HUMAN_INTENT");
    expect(initial.candidate).toBeNull();
    expect(initial.pair).toBeNull();
    await expect(service.rateCandidate({ caseId: initial.caseId, candidateLabel: "A", ratings: strongRatings })).rejects.toThrow("candidato activo");
    const locked = await service.lockIntent(initial.caseId, { expectedChange: "Solo cambia la camiseta.", expectedPreservation: "Rostro y fondo intactos.", unacceptableNotes: "No cambiar identidad." });
    expect(locked.step).toBe("RATING_A");
    await expect(service.lockIntent(initial.caseId, { expectedChange: "Editar", expectedPreservation: "Conservar" })).rejects.toThrow("bloqueada");
  });

  it("hides candidate identity during isolated scoring and never exposes the other score", async () => {
    const { service } = setup(false);
    const initial = await enroll(service);
    const aView = await service.lockIntent(initial.caseId, { expectedChange: "Cambio local", expectedPreservation: "Exterior" });
    expect(aView.candidate).toEqual({ label: "A", url: `/api/preservation-study/media?caseId=${initial.caseId}&label=A`, width: 100, height: 100 });
    expect(aView.reveal).toBeNull();
    expect(JSON.stringify(aView.candidate)).not.toMatch(/RAW|PRESERVED/);
    await expect(service.getBlindCandidateSource(initial.caseId, "B")).rejects.toThrow("disponible");
    expect(await service.getBlindCandidateSource(initial.caseId, "A")).toBe(experiment.preserved.url);
    const bView = await service.rateCandidate({ caseId: initial.caseId, candidateLabel: "A", ratings: strongRatings, failureTags: [] });
    expect(bView.step).toBe("RATING_B");
    expect(bView.candidate?.label).toBe("B");
    expect("ratings" in (bView.candidate ?? {})).toBe(false);
    await expect(service.rateCandidate({ caseId: initial.caseId, candidateLabel: "A", ratings: partialRatings })).rejects.toThrow("candidato activo");
  });

  it("persists randomized order so resume cannot reorder or relabel candidates", async () => {
    const { service, repository } = setup(false);
    const initial = await enroll(service);
    await service.lockIntent(initial.caseId, { expectedChange: "Cambio", expectedPreservation: "Resto" });
    const first = await service.getCaseView(initial.caseId);
    const resumed = await service.getCaseView(initial.caseId);
    expect(first.candidate).toEqual(resumed.candidate);
    const presentation = repository.presentations[0];
    expect(presentation).toMatchObject({ candidateA: "PRESERVED", candidateAId: ids.preserved, candidateB: "RAW", candidateBId: ids.raw });
  });

  it("locks pairwise preference, reveals the correct mapping, and derives pixel-human divergence", async () => {
    const { service, repository } = setup(false);
    const initial = await enroll(service);
    await service.lockIntent(initial.caseId, { expectedChange: "Cambio", expectedPreservation: "Resto" });
    await service.rateCandidate({ caseId: initial.caseId, candidateLabel: "A", ratings: strongRatings });
    const pairView = await service.rateCandidate({ caseId: initial.caseId, candidateLabel: "B", ratings: partialRatings });
    expect(pairView.step).toBe("PAIRWISE");
    expect(pairView.reveal).toBeNull();
    const revealed = await service.recordPairwise({ caseId: initial.caseId, preference: "A_BETTER" });
    expect(revealed.step).toBe("ACCEPTANCE");
    expect(revealed.reveal).toMatchObject({ candidateA: "PRESERVED", candidateB: "RAW", derivedPreference: "PRESERVED_BETTER", divergenceTags: ["LARGE_PIXEL_GAIN_PRESERVED_PREFERENCE"] });
    await expect(service.recordPairwise({ caseId: initial.caseId, preference: "B_BETTER" })).rejects.toThrow("Primero");
    expect(repository.pairwise).toHaveLength(1);
  });

  it("stores RAW and PRESERVED acceptance independently without invoking a canonical commit", async () => {
    const { service, repository, reader } = setup();
    const initial = await enroll(service);
    await service.lockIntent(initial.caseId, { expectedChange: "Cambio", expectedPreservation: "Resto" });
    await service.rateCandidate({ caseId: initial.caseId, candidateLabel: "A", ratings: partialRatings });
    await service.rateCandidate({ caseId: initial.caseId, candidateLabel: "B", ratings: strongRatings });
    await service.recordPairwise({ caseId: initial.caseId, preference: "B_BETTER" });
    const completed = await service.recordAcceptance({ caseId: initial.caseId, rawAccepted: false, preservedAccepted: true });
    expect(completed.step).toBe("COMPLETE");
    expect(completed.completedEvaluation).toMatchObject({ rawAccepted: false, preservedAccepted: true });
    expect(repository.acceptances[0]).toMatchObject({ rawAccepted: false, preservedAccepted: true });
    expect(reader.calls).toBeGreaterThan(0);
    const dashboard = await service.getDashboard();
    expect(dashboard.report.overall).toMatchObject({
      preservedPreferenceRate: 1,
      rawPreferenceRate: 0,
      rawAcceptanceRate: 0,
      preservedAcceptanceRate: 1,
      acceptanceLift: 1,
    });
    expect(dashboard.report.byTopology.LOCAL_INDEPENDENT.caseCount).toBe(1);
    expect(dashboard.report.byTaskType.COLOR_CHANGE.caseCount).toBe(1);
    expect(dashboard.report.byCoupledBand.MEDIUM.caseCount).toBe(1);
    await expect(service.recordAcceptance({ caseId: initial.caseId, rawAccepted: true, preservedAccepted: true })).rejects.toThrow("preferencia pairwise");
  });

  it("maps the study snapshot to the exact transaction and candidate hashes", async () => {
    const { service, repository } = setup();
    await enroll(service);
    expect(repository.cases[0]).toMatchObject({
      transactionId: ids.transaction, executionRunId: ids.execution, preservationRunId: ids.preservation,
      rawCandidateId: ids.raw, preservedCandidateId: ids.preserved,
      sourceSha256: "a".repeat(64), rawSha256: "b".repeat(64), preservedSha256: "c".repeat(64),
      provider: "openai", model: "gpt-image-2",
    });
  });

  it("keeps historical records append-only in memory and in the SQL migration", async () => {
    const { service, repository } = setup();
    const initial = await enroll(service);
    await service.lockIntent(initial.caseId, { expectedChange: "Cambio", expectedPreservation: "Resto" });
    await expect(repository.lockIntentAndPresentation({ caseId: initial.caseId, intent: { expectedChange: "Otro", expectedPreservation: "Otro", unacceptableNotes: null }, candidateA: "RAW", candidateAId: ids.raw, candidateB: "PRESERVED", candidateBId: ids.preserved })).rejects.toThrow("immutable");
    const sql = readFileSync("supabase/migrations/20260811180000_product_gate_004_preservation_value_study.sql", "utf8");
    expect(sql).toContain("reject_preservation_study_mutation");
    expect(sql).toContain("lock_preservation_study_intent");
    expect(sql).toContain("before update or delete");
  });

  it("classifies all four requested pixel-human divergence patterns without semantic inference", () => {
    expect(deriveDivergenceTags({ rawMetrics, preservedMetrics, rawPreservationScore: 2, preservedPreservationScore: 2, preference: "TIE" })).toEqual(["LARGE_PIXEL_GAIN_NO_HUMAN_PREFERENCE"]);
    expect(deriveDivergenceTags({ rawMetrics, preservedMetrics, rawPreservationScore: 1, preservedPreservationScore: 2, preference: "PRESERVED_BETTER" })).toEqual(["LARGE_PIXEL_GAIN_PRESERVED_PREFERENCE"]);
    expect(deriveDivergenceTags({ rawMetrics, preservedMetrics, rawPreservationScore: 2, preservedPreservationScore: 1, preference: "RAW_BETTER" })).toEqual(["LARGE_PIXEL_GAIN_RAW_PREFERENCE"]);
    expect(deriveDivergenceTags({ rawMetrics: { ...rawMetrics, changedPixelRatioLockedOutside: .04 }, preservedMetrics: { ...preservedMetrics, changedPixelRatioLockedOutside: .01 }, rawPreservationScore: 0, preservedPreservationScore: 1, preference: "BOTH_BAD" })).toEqual(["SMALL_PIXEL_DIFFERENCE_HUMAN_PRESERVATION_FAILURE"]);
  });
});
