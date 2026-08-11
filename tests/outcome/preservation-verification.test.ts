import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { verifyCreativeAssertions } from "@/src/application/outcome/media/creative-assertions";
import { PreservationVerificationService } from "@/src/application/outcome/media/preservation-verification-service";
import type { ImageEditContext, ImageEditExecutor, ImageEditResult } from "@/src/application/ports/outcome/image-edit-executor-port";
import type { ImagePreservationEngine } from "@/src/application/ports/outcome/image-preservation-engine-port";
import {
  PRESERVATION_METHODOLOGY_VERSION,
  PRESERVATION_POLICY_VERSION,
  PreservationPolicySchema,
  createDefaultPreservationPolicy,
  type PreservationPolicy,
} from "@/src/domain/outcome/media/preservation";
import type { PixelGrid } from "@/src/infrastructure/evidence/image-diff-calculator";
import { calculatePreservationEvidence } from "@/src/infrastructure/evidence/preservation-evidence-calculator";
import { decodePngToPixels } from "@/src/infrastructure/evidence/png-decoder";
import { encodePixelsToPng } from "@/src/infrastructure/evidence/png-encoder";
import { getInMemoryOutcomeRepositories } from "@/src/infrastructure/persistence/outcome/in-memory-outcome-repositories";
import {
  CompositingImagePreservationEngine,
  classifyPixel,
  coupledCandidateWeight,
  derivePreservationZones,
} from "@/src/infrastructure/preservation/compositing-image-preservation-engine";
import { InMemoryMediaObjectStore } from "@/src/infrastructure/storage/in-memory-media-object-store";

const coreRoi = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };

function policy(overrides: Partial<PreservationPolicy> = {}): PreservationPolicy {
  return PreservationPolicySchema.parse({
    ...createDefaultPreservationPolicy(coreRoi, 0.1),
    ...overrides,
  });
}

function solid(width: number, height: number, value: number): PixelGrid {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
  return { width, height, data };
}

function setPixel(grid: PixelGrid, x: number, y: number, value: number): void {
  const offset = (y * grid.width + x) * 4;
  grid.data[offset] = value;
  grid.data[offset + 1] = value;
  grid.data[offset + 2] = value;
}

function expectPixel(grid: PixelGrid, x: number, y: number, value: number): void {
  const offset = (y * grid.width + x) * 4;
  expect(Array.from(grid.data.slice(offset, offset + 4))).toEqual([value, value, value, 255]);
}

type EditMode = "IDENTICAL" | "CORE" | "FULL" | "OUTSIDE" | "MISMATCH" | "FAILURE";

class SyntheticImageExecutor implements ImageEditExecutor {
  readonly name = "synthetic-image-edit";
  readonly provider = "synthetic";
  calls = 0;

  constructor(private readonly mode: EditMode) {}

  async execute(context: ImageEditContext): Promise<ImageEditResult> {
    this.calls += 1;
    if (this.mode === "FAILURE") throw new Error("Synthetic provider failure");
    if (!context.sourceBytes) throw new Error("Source bytes are required by synthetic executor.");
    const source = decodePngToPixels(Buffer.from(context.sourceBytes));
    const candidate = solid(
      this.mode === "MISMATCH" ? source.width + 1 : source.width,
      source.height,
      40,
    );
    if (this.mode !== "MISMATCH") candidate.data.set(source.data);
    const zones = derivePreservationZones(createDefaultPreservationPolicy(context.roi, 0.1), source.width, source.height);
    for (let y = 0; y < candidate.height; y++) {
      for (let x = 0; x < candidate.width; x++) {
        if (this.mode === "FULL") setPixel(candidate, x, y, 220);
        if (this.mode === "CORE" && classifyPixel(x, y, zones) === "CORE") setPixel(candidate, x, y, 220);
        if (this.mode === "OUTSIDE" && classifyPixel(x, y, zones) === "LOCKED_OUTSIDE") setPixel(candidate, x, y, 220);
      }
    }
    const bytes = encodePixelsToPng(candidate);
    return {
      candidateBytes: new Uint8Array(bytes),
      candidateStorageKey: `provider/${context.transactionId}/raw.png`,
      candidateMimeType: "image/png",
      candidateWidth: candidate.width,
      candidateHeight: candidate.height,
      candidateByteSize: bytes.byteLength,
      candidateSha256: hash(bytes),
      provider: this.provider,
      model: "synthetic-v1",
      latencyMs: 12,
      usage: null,
      costUsd: null,
      providerMetadata: { mode: this.mode },
    };
  }
}

function harness(mode: EditMode = "FULL", engine: ImagePreservationEngine = new CompositingImagePreservationEngine(), store = new InMemoryMediaObjectStore()) {
  const repositories = getInMemoryOutcomeRepositories();
  const executor = new SyntheticImageExecutor(mode);
  const service = new PreservationVerificationService(repositories, executor, engine, store);
  return { repositories, executor, service, store };
}

async function run(service: PreservationVerificationService, customPolicy = policy()) {
  return service.runExperiment({
    projectName: "Build 004 test",
    assetName: "Synthetic image",
    sourceBytes: new Uint8Array(encodePixelsToPng(solid(12, 10, 40))),
    sourceMimeType: "image/png",
    instruction: "Cambia únicamente el centro.",
    policy: customPolicy,
  });
}

describe("BUILD 004 — Preservation & Verification v0.1", () => {
  it("keeps the database operation constraints aligned with EDIT_REGION", () => {
    const migration = readFileSync(
      "supabase/migrations/20260811120000_build_004_preservation_verification.sql",
      "utf8",
    );

    expect(migration).toMatch(/partial_intents_operation_check[\s\S]*EDIT_REGION/);
    expect(migration).toMatch(/transaction_patches_operation_check[\s\S]*EDIT_REGION/);
  });

  describe("PreservationPolicy and deterministic zones", () => {
    it("validates the versioned HARD_PRESERVE / FEATHERED policy", () => {
      const parsed = policy();
      expect(parsed.policyVersion).toBe(PRESERVATION_POLICY_VERSION);
      expect(parsed.outsideMode).toBe("HARD_PRESERVE");
      expect(parsed.blendMode).toBe("FEATHERED");
    });

    it("rejects zero-width and out-of-bounds ROIs", () => {
      expect(() => PreservationPolicySchema.parse({ ...policy(), coreRoi: { x: 0, y: 0, width: 0, height: 1 } })).toThrow();
      expect(() => PreservationPolicySchema.parse({ ...policy(), coreRoi: { x: 0.8, y: 0, width: 0.3, height: 1 } })).toThrow();
    });

    it("rejects coupled bands outside the documented safe range", () => {
      expect(() => PreservationPolicySchema.parse({ ...policy(), coupledBand: { unit: "NORMALIZED_MIN_DIMENSION", size: 0.26 } })).toThrow();
      expect(() => PreservationPolicySchema.parse({ ...policy(), coupledBand: { unit: "PIXELS", size: 2 } })).toThrow();
    });

    it("derives CORE, COUPLED, and LOCKED_OUTSIDE deterministically", () => {
      const first = derivePreservationZones(policy(), 100, 80);
      const second = derivePreservationZones(policy(), 100, 80);
      expect(first).toEqual(second);
      expect(first.counts.core + first.counts.coupled + first.counts.lockedOutside).toBe(8000);
    });

    it("clamps the coupled band when CORE touches an image edge", () => {
      const edgePolicy = createDefaultPreservationPolicy({ x: 0, y: 0, width: 0.3, height: 0.4 }, 0.2);
      const zones = derivePreservationZones(edgePolicy, 20, 10);
      expect(zones.expanded.x0).toBe(0);
      expect(zones.expanded.y0).toBe(0);
      expect(zones.expanded.x1).toBeLessThanOrEqual(20);
      expect(zones.expanded.y1).toBeLessThanOrEqual(10);
    });

    it("defines full-image CORE as having no COUPLED or LOCKED_OUTSIDE pixels", () => {
      const zones = derivePreservationZones(createDefaultPreservationPolicy({ x: 0, y: 0, width: 1, height: 1 }, 0.2), 8, 6);
      expect(zones.counts.core).toBe(48);
      expect(zones.counts.coupled).toBe(0);
      expect(zones.counts.lockedOutside).toBe(0);
    });
  });

  describe("CompositingImagePreservationEngine", () => {
    const engine = new CompositingImagePreservationEngine();

    it("keeps an identical raw candidate identical", () => {
      const source = solid(10, 10, 90);
      const result = engine.preserve({ source, rawCandidate: solid(10, 10, 90), policy: policy() });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.preserved.data).toEqual(source.data);
    });

    it("copies RAW exactly in CORE", () => {
      const source = solid(10, 10, 20);
      const raw = solid(10, 10, 220);
      const result = engine.preserve({ source, rawCandidate: raw, policy: policy() });
      expect(result.ok).toBe(true);
      if (result.ok) expectPixel(result.preserved, 5, 5, 220);
    });

    it("copies SOURCE byte-exactly in LOCKED_OUTSIDE", () => {
      const source = solid(10, 10, 20);
      const raw = solid(10, 10, 220);
      const result = engine.preserve({ source, rawCandidate: raw, policy: policy() });
      expect(result.ok).toBe(true);
      if (result.ok) expectPixel(result.preserved, 0, 0, 20);
    });

    it("removes raw changes that occur only in LOCKED_OUTSIDE", () => {
      const source = solid(10, 10, 30);
      const raw = solid(10, 10, 30);
      setPixel(raw, 0, 0, 240);
      const result = engine.preserve({ source, rawCandidate: raw, policy: policy() });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.preserved.data).toEqual(source.data);
    });

    it("uses the documented smoothstep blend in COUPLED", () => {
      const custom = createDefaultPreservationPolicy({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, 0.2);
      const source = solid(10, 10, 0);
      const raw = solid(10, 10, 200);
      const result = engine.preserve({ source, rawCandidate: raw, policy: custom });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const weight = coupledCandidateWeight(3, 4, result.zones.core, result.zones.coupledBandPixels);
      const expected = Math.round(200 * weight);
      expectPixel(result.preserved, 3, 4, expected);
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThan(1);
    });

    it("does not mutate source or raw candidate arrays", () => {
      const source = solid(10, 10, 10);
      const raw = solid(10, 10, 200);
      const sourceBefore = new Uint8ClampedArray(source.data);
      const rawBefore = new Uint8ClampedArray(raw.data);
      engine.preserve({ source, rawCandidate: raw, policy: policy() });
      expect(source.data).toEqual(sourceBefore);
      expect(raw.data).toEqual(rawBefore);
    });

    it("returns a structured dimension mismatch and no output", () => {
      const result = engine.preserve({ source: solid(10, 10, 10), rawCandidate: solid(11, 10, 20), policy: policy() });
      expect(result).toMatchObject({ ok: false, code: "DIMENSION_MISMATCH", methodologyVersion: PRESERVATION_METHODOLOGY_VERSION });
      expect(result).not.toHaveProperty("preserved");
    });

    it("returns a structured invalid-pixel failure", () => {
      const bad = { width: 2, height: 2, data: new Uint8ClampedArray(3) };
      expect(engine.preserve({ source: bad, rawCandidate: solid(2, 2, 20), policy: policy() })).toMatchObject({ ok: false, code: "INVALID_PIXEL_DATA" });
    });
  });

  describe("Evidence and Creative Assertions", () => {
    it("retains non-zero raw locked-outside change and proves preserved equals zero", () => {
      const source = solid(10, 10, 30);
      const raw = solid(10, 10, 220);
      const result = new CompositingImagePreservationEngine().preserve({ source, rawCandidate: raw, policy: policy() });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const rawMetrics = calculatePreservationEvidence(source, raw, result.zones);
      const preservedMetrics = calculatePreservationEvidence(source, result.preserved, result.zones);
      expect(rawMetrics.changedPixelRatioLockedOutside).toBeGreaterThan(0);
      expect(preservedMetrics.changedPixelRatioLockedOutside).toBe(0);
    });

    it("labels no-region means and ratios as zero", () => {
      const source = solid(4, 4, 0);
      const candidate = solid(4, 4, 200);
      const zones = derivePreservationZones(createDefaultPreservationPolicy({ x: 0, y: 0, width: 1, height: 1 }, 0), 4, 4);
      const metrics = calculatePreservationEvidence(source, candidate, zones);
      expect(metrics.meanCoupledPixelDiff).toBe(0);
      expect(metrics.changedPixelRatioLockedOutside).toBe(0);
    });

    it("fails machine verification when hard-preservation is violated", () => {
      const source = solid(8, 8, 10);
      const preserved = solid(8, 8, 200);
      const zones = derivePreservationZones(policy(), 8, 8);
      const metrics = calculatePreservationEvidence(source, preserved, zones);
      const verification = verifyCreativeAssertions({
        sourceBeforeHash: "same", sourceAfterHash: "same", source, rawCandidate: preserved,
        preservedCandidate: preserved, zones, rawCandidateId: "raw", preservedCandidateId: "preserved",
        expectedTransactionId: "tx", rawTransactionId: "tx", preservedTransactionId: "tx",
        preservedRawCandidateId: "raw", editRegionChangeThreshold: 0.001, preservedEvidence: metrics,
      });
      expect(verification.status).toBe("FAILED");
      expect(verification.assertions.find((item) => item.type === "LOCKED_OUTSIDE_EXACTLY_PRESERVED")?.passed).toBe(false);
    });

    it("round-trips deterministic RGBA PNG bytes without channel corruption", () => {
      const grid = solid(3, 2, 0);
      for (let x = 0; x < 3; x++) setPixel(grid, x, 1, 50 + x * 70);
      const decoded = decodePngToPixels(encodePixelsToPng(grid));
      expect(decoded).toEqual(grid);
    });
  });

  describe("Runtime, persistence, verification, and commit invariants", () => {
    it("uses one provider execution for both independently addressable candidates", async () => {
      const { service, executor, repositories } = harness("FULL");
      const result = await run(service);
      expect(executor.calls).toBe(1);
      expect(result.rawCandidateId).not.toBe(result.preservedCandidateId);
      expect(result.raw.storageKey).not.toBe(result.preserved.storageKey);
      const candidates = await repositories.candidateAssets.findByTransactionId(result.transactionId);
      expect(candidates.map((item) => item.candidateType).sort()).toEqual(["PRESERVED", "RAW_PROVIDER"]);
      expect(new Set(candidates.map((item) => item.executionRunId))).toEqual(new Set([result.executionRunId]));
    });

    it("persists PreservationRun and both raw/preserved evidence records", async () => {
      const { service, repositories } = harness("FULL");
      const result = await run(service);
      const runs = await repositories.preservationRuns.findByTransactionId(result.transactionId);
      const evidence = await repositories.preservationEvidence.findByPreservationRunId(result.preservationRunId);
      expect(runs).toHaveLength(1);
      expect(runs[0]).toMatchObject({ status: "SUCCESS", rawCandidateId: result.rawCandidateId, preservedCandidateId: result.preservedCandidateId });
      expect(evidence.map((item) => item.candidateType).sort()).toEqual(["PRESERVED", "RAW_PROVIDER"]);
    });

    it("links preserved provenance to source, raw, run, and transaction", async () => {
      const { service, repositories } = harness("FULL");
      const result = await run(service);
      const preserved = await repositories.candidateAssets.findById(result.preservedCandidateId);
      expect(preserved).toMatchObject({ transactionId: result.transactionId, sourceVersionId: result.sourceVersionId, rawCandidateId: result.rawCandidateId, preservationRunId: result.preservationRunId });
    });

    it("persists raw metrics even when preservation suppresses outside change", async () => {
      const { service } = harness("FULL");
      const result = await run(service);
      expect(result.rawEvidence.changedPixelRatioLockedOutside).toBeGreaterThan(0);
      expect(result.preservedEvidence.changedPixelRatioLockedOutside).toBe(0);
      expect(result.outsideChangeReduction).toBe(result.rawEvidence.changedPixelRatioLockedOutside);
    });

    it("machine verification passes all seven assertions for a valid changed candidate", async () => {
      const { service } = harness("FULL");
      const result = await run(service);
      expect(result.machineVerification.status).toBe("PASSED");
      expect(result.machineVerification.assertions).toHaveLength(7);
      expect(result.machineVerification.assertions.every((item) => item.passed)).toBe(true);
    });

    it("provider failure leaves canonical v1 unchanged", async () => {
      const { service, repositories } = harness("FAILURE");
      await expect(run(service)).rejects.toMatchObject({ code: "PROVIDER_FAILURE" });
      const assets = await repositories.projects.list();
      expect(assets).toHaveLength(1);
      const projectAssets = await repositories.assets.findByProjectId(assets[0].id);
      const versions = await repositories.assetVersions.findByAssetId(projectAssets[0].id);
      expect(versions).toHaveLength(1);
      expect(projectAssets[0].currentVersionId).toBe(versions[0].id);
    });

    it("dimension mismatch records preservation failure and leaves v1 current", async () => {
      const { service, repositories } = harness("MISMATCH");
      await expect(run(service)).rejects.toMatchObject({ code: "DIMENSION_MISMATCH" });
      const projects = await repositories.projects.list();
      const asset = (await repositories.assets.findByProjectId(projects[0].id))[0];
      const transactions = await repositories.outcomeTransactions.findByAssetId(asset.id);
      expect(transactions[0].status).toBe("FAILED");
      expect((await repositories.preservationRuns.findByTransactionId(transactions[0].id))[0].status).toBe("FAILURE");
      expect((await repositories.assetVersions.findByAssetId(asset.id))).toHaveLength(1);
    });

    it("preservation engine failure is safe and never creates PRESERVED", async () => {
      const failingEngine: ImagePreservationEngine = {
        methodologyVersion: PRESERVATION_METHODOLOGY_VERSION,
        preserve: () => ({ ok: false, code: "COMPOSITING_FAILURE", message: "Synthetic preservation failure", methodologyVersion: PRESERVATION_METHODOLOGY_VERSION, processingTimeMs: 1 }),
      };
      const { service, repositories } = harness("FULL", failingEngine);
      await expect(run(service)).rejects.toMatchObject({ code: "COMPOSITING_FAILURE" });
      const projects = await repositories.projects.list();
      const asset = (await repositories.assets.findByProjectId(projects[0].id))[0];
      const transaction = (await repositories.outcomeTransactions.findByAssetId(asset.id))[0];
      const candidates = await repositories.candidateAssets.findByTransactionId(transaction.id);
      expect(candidates.map((item) => item.candidateType)).toEqual(["RAW_PROVIDER"]);
      expect(asset.currentVersionId).toBe((await repositories.assetVersions.findByAssetId(asset.id))[0].id);
    });

    it("storage failure for PRESERVED leaves canonical v1 unchanged and never falls back to RAW", async () => {
      class FailingPreservedStore extends InMemoryMediaObjectStore {
        override async put(key: string, bytes: Uint8Array, mimeType: string) {
          if (key.includes("/preserved/")) throw new Error("Synthetic storage failure");
          return super.put(key, bytes, mimeType);
        }
      }
      const { service, repositories } = harness("FULL", new CompositingImagePreservationEngine(), new FailingPreservedStore());
      await expect(run(service)).rejects.toMatchObject({ code: "STORAGE_FAILURE" });
      const projects = await repositories.projects.list();
      const asset = (await repositories.assets.findByProjectId(projects[0].id))[0];
      expect((await repositories.assetVersions.findByAssetId(asset.id))).toHaveLength(1);
      expect((await repositories.candidateAssets.findByTransactionId((await repositories.outcomeTransactions.findByAssetId(asset.id))[0].id))[0].committed).toBe(false);
    });

    it("a failed hard-preserve assertion blocks approval", async () => {
      const corruptEngine: ImagePreservationEngine = {
        methodologyVersion: PRESERVATION_METHODOLOGY_VERSION,
        preserve: ({ source, rawCandidate, policy: inputPolicy }) => ({
          ok: true,
          preserved: { ...rawCandidate, data: new Uint8ClampedArray(rawCandidate.data) },
          zones: derivePreservationZones(inputPolicy, source.width, source.height),
          methodologyVersion: PRESERVATION_METHODOLOGY_VERSION,
          processingTimeMs: 1,
        }),
      };
      const { service } = harness("FULL", corruptEngine);
      const result = await run(service);
      expect(result.machineVerification.status).toBe("FAILED");
      await service.recordPreference({ transactionId: result.transactionId, rawCandidateId: result.rawCandidateId, preservedCandidateId: result.preservedCandidateId, preference: "PRESERVED" });
      await expect(service.approvePreserved(result.transactionId)).rejects.toMatchObject({ code: "MACHINE_VERIFICATION_REQUIRED" });
    });

    it("human rejection records rejection and creates no commit", async () => {
      const { service, repositories } = harness("FULL");
      const result = await run(service);
      await service.recordPreference({ transactionId: result.transactionId, rawCandidateId: result.rawCandidateId, preservedCandidateId: result.preservedCandidateId, preference: "RAW" });
      await service.reject(result.transactionId);
      expect(await repositories.stateCommits.findByTransactionId(result.transactionId)).toBeNull();
      expect((await repositories.outcomeTransactions.findById(result.transactionId))?.status).toBe("ABORTED");
    });

    it("RAW preference does not commit RAW", async () => {
      const { service, repositories } = harness("FULL");
      const result = await run(service);
      await service.recordPreference({ transactionId: result.transactionId, rawCandidateId: result.rawCandidateId, preservedCandidateId: result.preservedCandidateId, preference: "RAW" });
      expect(await repositories.stateCommits.findByTransactionId(result.transactionId)).toBeNull();
      expect((await repositories.candidateAssets.findById(result.rawCandidateId))?.committed).toBe(false);
    });

    it("PRESERVED preference does not automatically commit", async () => {
      const { service, repositories } = harness("FULL");
      const result = await run(service);
      await service.recordPreference({ transactionId: result.transactionId, rawCandidateId: result.rawCandidateId, preservedCandidateId: result.preservedCandidateId, preference: "PRESERVED" });
      expect(await repositories.stateCommits.findByTransactionId(result.transactionId)).toBeNull();
      expect((await repositories.candidateAssets.findById(result.preservedCandidateId))?.committed).toBe(false);
    });

    it("persists explicit pixel-to-human perception divergence evidence", async () => {
      const { service, repositories } = harness("FULL");
      const result = await run(service);
      const preference = await service.recordPreference({
        transactionId: result.transactionId,
        rawCandidateId: result.rawCandidateId,
        preservedCandidateId: result.preservedCandidateId,
        preference: "TIE",
        evaluationTags: ["PIXEL_HUMAN_PERCEPTION_DIVERGENCE"],
        notes: "Pixel metrics diverged from the human tie judgment.",
      });
      expect(preference.evaluationTags).toEqual(["PIXEL_HUMAN_PERCEPTION_DIVERGENCE"]);
      expect(preference.notes).toBe("Pixel metrics diverged from the human tie judgment.");
      expect(preference.humanAccepted).toBeNull();
      expect(await repositories.stateCommits.findByTransactionId(result.transactionId)).toBeNull();
    });

    it("human approval commits only PRESERVED as immutable v2", async () => {
      const { service, repositories } = harness("FULL");
      const result = await run(service);
      await service.recordPreference({ transactionId: result.transactionId, rawCandidateId: result.rawCandidateId, preservedCandidateId: result.preservedCandidateId, preference: "PRESERVED" });
      const commit = await service.approvePreserved(result.transactionId);
      expect(commit.newVersion.versionNumber).toBe(2);
      expect((commit.newVersion.state.media as Record<string, unknown>).candidateId).toBe(result.preservedCandidateId);
      expect((await repositories.candidateAssets.findById(result.preservedCandidateId))?.committed).toBe(true);
      expect((await repositories.candidateAssets.findById(result.rawCandidateId))?.committed).toBe(false);
    });

    it("cannot substitute a candidate from another transaction", async () => {
      const { service } = harness("FULL");
      const first = await run(service);
      const second = await run(service);
      await expect(service.recordPreference({ transactionId: first.transactionId, rawCandidateId: first.rawCandidateId, preservedCandidateId: second.preservedCandidateId, preference: "PRESERVED" })).rejects.toMatchObject({ code: "CANDIDATE_TRANSACTION_MISMATCH" });
    });

    it("stale base protection remains in force", async () => {
      const { service, repositories } = harness("FULL");
      const result = await run(service);
      await service.recordPreference({ transactionId: result.transactionId, rawCandidateId: result.rawCandidateId, preservedCandidateId: result.preservedCandidateId, preference: "PRESERVED" });
      const asset = await repositories.assets.findById(result.assetId);
      const staleMover = await repositories.assetVersions.create({ assetId: result.assetId, versionNumber: 2, state: { external: true }, parentVersionId: asset!.currentVersionId });
      await repositories.assets.update(result.assetId, { currentVersionId: staleMover.id });
      await expect(service.approvePreserved(result.transactionId)).rejects.toMatchObject({ code: "STALE_BASE_VERSION" });
      expect(await repositories.stateCommits.findByTransactionId(result.transactionId)).toBeNull();
    });

    it("source and raw object bytes remain immutable after preservation and commit", async () => {
      const { service, store } = harness("FULL");
      const result = await run(service);
      const sourceBefore = await store.get(result.source.storageKey);
      const rawBefore = await store.get(result.raw.storageKey);
      await service.recordPreference({ transactionId: result.transactionId, rawCandidateId: result.rawCandidateId, preservedCandidateId: result.preservedCandidateId, preference: "PRESERVED" });
      await service.approvePreserved(result.transactionId);
      expect(await store.get(result.source.storageKey)).toEqual(sourceBefore);
      expect(await store.get(result.raw.storageKey)).toEqual(rawBefore);
      expect(hash(sourceBefore)).toBe(result.source.sha256);
      expect(hash(rawBefore)).toBe(result.raw.sha256);
    });

    it("preserves immutable v1 in version history after v2 commit", async () => {
      const { service, repositories } = harness("FULL");
      const result = await run(service);
      const v1Before = await repositories.assetVersions.findById(result.sourceVersionId);
      await service.recordPreference({ transactionId: result.transactionId, rawCandidateId: result.rawCandidateId, preservedCandidateId: result.preservedCandidateId, preference: "PRESERVED" });
      await service.approvePreserved(result.transactionId);
      expect(await repositories.assetVersions.findById(result.sourceVersionId)).toEqual(v1Before);
      expect(await repositories.assetVersions.findByAssetId(result.assetId)).toHaveLength(2);
    });
  });
});

function hash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
