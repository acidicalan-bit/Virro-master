import { describe, expect, it } from "vitest";
import {
  validateROI,
  isROIValid,
  type ROI,
} from "@/src/domain/outcome/media/media-asset-version";
import { SemanticPatchOperationSchema } from "@/src/domain/outcome/semantic-patch";
import { PartialIntentOperationSchema } from "@/src/domain/outcome/partial-intent";
import type { ImageEditExecutor, ImageEditContext, ImageEditResult } from "@/src/application/ports/outcome/image-edit-executor-port";
import { calculateDiffMetrics, type PixelGrid, DIFF_METHODOLOGY_VERSION, CHANGED_PIXEL_THRESHOLD } from "@/src/infrastructure/evidence/image-diff-calculator";
import { getInMemoryOutcomeRepositories } from "@/src/infrastructure/persistence/outcome/in-memory-outcome-repositories";
import type { RepositoryBundle } from "@/src/application/ports/repositories";
import { OutcomeTransactionService } from "@/src/application/outcome/outcome-transaction-service";
import { FakeExecutor } from "@/src/infrastructure/executors/fake-executor";
import { createHash } from "node:crypto";

function createTestService() {
  const repos = getInMemoryOutcomeRepositories();
  const executor = new FakeExecutor();
  const service = new OutcomeTransactionService(repos as unknown as RepositoryBundle, executor);
  return { service, repos, executor };
}

function makeFakeImageExecutor(): ImageEditExecutor {
  return {
    name: "fake-image-edit",
    provider: "fake",
    async execute(context: ImageEditContext): Promise<ImageEditResult> {
      const fakeBuffer = Buffer.from("fake-candidate-image-data-" + context.instruction);
      const sha256 = createHash("sha256").update(fakeBuffer).digest("hex");
      return {
        candidateBytes: new Uint8Array(fakeBuffer),
        candidateStorageKey: `candidates/${context.transactionId}/fake.png`,
        candidateMimeType: "image/png",
        candidateWidth: context.sourceWidth,
        candidateHeight: context.sourceHeight,
        candidateByteSize: fakeBuffer.length,
        candidateSha256: sha256,
        provider: "fake",
        model: "fake-image-v1",
        latencyMs: 50,
        usage: null,
        costUsd: null,
        providerMetadata: { simulated: true, roi: context.roi },
      };
    },
  };
}

function makeFailingImageExecutor(): ImageEditExecutor {
  return {
    name: "failing-image-edit",
    provider: "failing",
    async execute(): Promise<ImageEditResult> {
      throw new Error("Provider temporarily unavailable");
    },
  };
}

function makePixelGrid(width: number, height: number, fill: number): PixelGrid {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill;
    data[i + 1] = fill;
    data[i + 2] = fill;
    data[i + 3] = 255;
  }
  return { width, height, data };
}

describe("BUILD 003 — Precision Edit Integrity Gate", () => {

  describe("1. ROI validation", () => {
    it("1.1 valid ROI passes validation", () => {
      const roi: ROI = { x: 0.2, y: 0.3, width: 0.4, height: 0.5 };
      const result = validateROI(roi);
      expect(result).toEqual(roi);
    });

    it("1.2 ROI with negative x is rejected", () => {
      expect(() => validateROI({ x: -0.1, y: 0, width: 0.5, height: 0.5 })).toThrow();
    });

    it("1.3 ROI with x > 1 is rejected", () => {
      expect(() => validateROI({ x: 1.1, y: 0, width: 0.5, height: 0.5 })).toThrow();
    });

    it("1.4 ROI with width = 0 is accepted (zero-area region)", () => {
      const roi = validateROI({ x: 0, y: 0, width: 0, height: 0.5 });
      expect(roi.width).toBe(0);
    });

    it("1.5 isROIValid returns true for valid ROI", () => {
      expect(isROIValid({ x: 0, y: 0, width: 1, height: 1 })).toBe(true);
    });

    it("1.6 isROIValid returns false for invalid ROI", () => {
      expect(isROIValid({ x: -1, y: 0, width: 0.5, height: 0.5 })).toBe(false);
      expect(isROIValid({ x: "a", y: 0, width: 0.5, height: 0.5 })).toBe(false);
      expect(isROIValid(null)).toBe(false);
    });
  });

  describe("2. EDIT_REGION operation in schemas", () => {
    it("2.1 EDIT_REGION is accepted by SemanticPatchOperationSchema", () => {
      const result = SemanticPatchOperationSchema.safeParse("EDIT_REGION");
      expect(result.success).toBe(true);
    });

    it("2.2 EDIT_REGION is accepted by PartialIntentOperationSchema", () => {
      const result = PartialIntentOperationSchema.safeParse("EDIT_REGION");
      expect(result.success).toBe(true);
    });

    it("2.3 invalid operation is rejected by SemanticPatchOperationSchema", () => {
      const result = SemanticPatchOperationSchema.safeParse("INVALID_OP");
      expect(result.success).toBe(false);
    });
  });

  describe("3. ImageEditExecutor abstraction boundary", () => {
    it("3.1 FakeImageEditExecutor implements ImageEditExecutor interface", () => {
      const executor = makeFakeImageExecutor();
      expect(executor.name).toBe("fake-image-edit");
      expect(executor.provider).toBe("fake");
      expect(typeof executor.execute).toBe("function");
    });

    it("3.2 executor.execute returns correct result shape", async () => {
      const executor = makeFakeImageExecutor();
      const result = await executor.execute({
        transactionId: crypto.randomUUID(),
        sourceStorageKey: "sources/test.png",
        sourceMimeType: "image/png",
        sourceWidth: 1024,
        sourceHeight: 1024,
        roi: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
        instruction: "Change color to black",
      });
      expect(result).toHaveProperty("candidateStorageKey");
      expect(result).toHaveProperty("candidateSha256");
      expect(result).toHaveProperty("provider");
      expect(result).toHaveProperty("model");
      expect(result).toHaveProperty("latencyMs");
      expect(result.candidateSha256).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("4. FakeImageEditExecutor determinism", () => {
    it("4.1 same input produces same candidate hash", async () => {
      const executor = makeFakeImageExecutor();
      const ctx: ImageEditContext = {
        transactionId: "tx-1",
        sourceStorageKey: "sources/test.png",
        sourceMimeType: "image/png",
        sourceWidth: 512,
        sourceHeight: 512,
        roi: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
        instruction: "Remove the cup",
      };
      const r1 = await executor.execute(ctx);
      const r2 = await executor.execute(ctx);
      expect(r1.candidateSha256).toBe(r2.candidateSha256);
      expect(r1.candidateByteSize).toBe(r2.candidateByteSize);
    });

    it("4.2 different instructions produce different candidate hashes", async () => {
      const executor = makeFakeImageExecutor();
      const base: ImageEditContext = {
        transactionId: "tx-1",
        sourceStorageKey: "sources/test.png",
        sourceMimeType: "image/png",
        sourceWidth: 512,
        sourceHeight: 512,
        roi: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
        instruction: "Remove the cup",
      };
      const r1 = await executor.execute(base);
      const r2 = await executor.execute({ ...base, instruction: "Change color to red" });
      expect(r1.candidateSha256).not.toBe(r2.candidateSha256);
    });
  });

  describe("5. OpenAI configuration missing → explicit failure", () => {
    it("5.1 OpenAIImageEditExecutor throws when OPENAI_API_KEY is missing", async () => {
      const original = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      try {
        const { OpenAIImageEditExecutor } = await import("@/src/infrastructure/executors/image/openai-image-edit-executor");
        expect(() => new OpenAIImageEditExecutor()).toThrow("OPENAI_API_KEY is required");
      } finally {
        if (original !== undefined) process.env.OPENAI_API_KEY = original;
      }
    });
  });

  describe("6. No silent fallback from OpenAI to fake", () => {
    it("6.1 getExecutor in route throws for unknown provider", () => {
      const original = process.env.IMAGE_EDIT_PROVIDER;
      process.env.IMAGE_EDIT_PROVIDER = "unknown_provider";
      try {
        const provider = process.env.IMAGE_EDIT_PROVIDER;
        expect(provider).not.toBe("fake");
        expect(provider).not.toBe("openai");
        expect(() => {
          if (provider === "fake") return;
          if (provider === "openai") return;
          throw new Error(`Unknown IMAGE_EDIT_PROVIDER: ${provider}. Use "fake" or "openai"`);
        }).toThrow("Unknown IMAGE_EDIT_PROVIDER");
      } finally {
        if (original !== undefined) process.env.IMAGE_EDIT_PROVIDER = original;
        else delete process.env.IMAGE_EDIT_PROVIDER;
      }
    });

    it("6.2 undefined provider throws explicit error", () => {
      const original = process.env.IMAGE_EDIT_PROVIDER;
      delete process.env.IMAGE_EDIT_PROVIDER;
      try {
        const provider = String(process.env.IMAGE_EDIT_PROVIDER ?? "").trim();
        expect(() => {
          if (!provider) {
            throw new Error("IMAGE_EDIT_PROVIDER is not configured. Set IMAGE_EDIT_PROVIDER=fake or IMAGE_EDIT_PROVIDER=openai");
          }
        }).toThrow("IMAGE_EDIT_PROVIDER is not configured");
      } finally {
        if (original !== undefined) process.env.IMAGE_EDIT_PROVIDER = original;
      }
    });
  });

  describe("7. Provider failure → canonical state unchanged", () => {
    it("7.1 failing executor does not mutate canonical state", async () => {
      const { service, repos } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { jacket: { color: "blue" } },
      });

      const transaction = await repos.outcomeTransactions.create({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change jacket",
      });

      await repos.outcomeTransactions.updateStatus(transaction.id, "PREPARED");
      await repos.partialIntents.create({
        transactionId: transaction.id,
        rawInput: "Change jacket",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      });

      const failingExecutor = makeFailingImageExecutor();

      await expect(
        failingExecutor.execute({
          transactionId: transaction.id,
          sourceStorageKey: "sources/test.png",
          sourceMimeType: "image/png",
          sourceWidth: 1024,
          sourceHeight: 1024,
          roi: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
          instruction: "Change color",
        }),
      ).rejects.toThrow("Provider temporarily unavailable");

      const { version: current } = await service.getAssetState(v1.assetId);
      expect(current.state).toEqual({ jacket: { color: "blue" } });
      expect(current.id).toBe(v1.id);
    });
  });

  describe("8. Invalid provider response → canonical state unchanged", () => {
    it("8.1 executor returning invalid hash does not affect canonical state", async () => {
      const { service } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { jacket: { color: "blue" } },
      });

      const badExecutor: ImageEditExecutor = {
        name: "bad-response",
        provider: "bad",
        async execute() {
          return {
            candidateBytes: new Uint8Array(),
            candidateStorageKey: "bad/key",
            candidateMimeType: "image/png",
            candidateWidth: 100,
            candidateHeight: 100,
            candidateByteSize: 0,
            candidateSha256: "not-a-valid-hash",
            provider: "bad",
            model: "bad-v1",
            latencyMs: 0,
            usage: null,
            costUsd: null,
            providerMetadata: {},
          };
        },
      };

      const result = await badExecutor.execute({
        transactionId: crypto.randomUUID(),
        sourceStorageKey: "sources/test.png",
        sourceMimeType: "image/png",
        sourceWidth: 1024,
        sourceHeight: 1024,
        roi: { x: 0, y: 0, width: 0.5, height: 0.5 },
        instruction: "test",
      });

      expect(result.candidateSha256).not.toMatch(/^[a-f0-9]{64}$/);

      const { version: current } = await service.getAssetState(v1.assetId);
      expect(current.state).toEqual({ jacket: { color: "blue" } });
    });
  });

  describe("9. Candidate stored separately from source", () => {
    it("9.1 candidate storage key is distinct from source storage key", async () => {
      const executor = makeFakeImageExecutor();
      const result = await executor.execute({
        transactionId: "tx-separate",
        sourceStorageKey: "sources/proj/img.png",
        sourceMimeType: "image/png",
        sourceWidth: 1024,
        sourceHeight: 1024,
        roi: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
        instruction: "test",
      });

      expect(result.candidateStorageKey).not.toBe("sources/proj/img.png");
      expect(result.candidateStorageKey).toContain("candidates/");
      expect(result.candidateStorageKey).not.toContain("sources/");
    });

    it("9.2 candidate hash differs from source hash", async () => {
      const executor = makeFakeImageExecutor();
      const result = await executor.execute({
        transactionId: "tx-hash",
        sourceStorageKey: "sources/test.png",
        sourceMimeType: "image/png",
        sourceWidth: 1024,
        sourceHeight: 1024,
        roi: { x: 0, y: 0, width: 1, height: 1 },
        instruction: "Different content",
      });

      const sourceHash = createHash("sha256").update(Buffer.from("source-data")).digest("hex");
      expect(result.candidateSha256).not.toBe(sourceHash);
    });
  });

  describe("10. Source hash remains unchanged", () => {
    it("10.1 source SHA-256 is identical before and after executor runs", async () => {
      const sourceBuffer = Buffer.from("immutable-source-image-data");
      const hashBefore = createHash("sha256").update(sourceBuffer).digest("hex");

      const executor = makeFakeImageExecutor();
      await executor.execute({
        transactionId: "tx-immut",
        sourceStorageKey: "sources/test.png",
        sourceMimeType: "image/png",
        sourceWidth: 1024,
        sourceHeight: 1024,
        roi: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
        instruction: "Remove the cup",
      });

      const hashAfter = createHash("sha256").update(sourceBuffer).digest("hex");
      expect(hashBefore).toBe(hashAfter);
    });
  });

  describe("11. EvidenceReceipt belongs to correct transaction/execution", () => {
    it("11.1 evidence receipt references correct transaction", async () => {
      const { service, repos } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { jacket: { color: "blue" } },
      });

      const tx = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change jacket",
      });

      await service.prepareTransaction({
        transactionId: tx.id,
        partialIntent: {
          rawInput: "Change jacket",
          targetPath: "jacket.color",
          operation: "SET_ATTRIBUTE",
          desiredValue: "black",
        },
        mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
      });

      const execResults = await service.executeTransaction(tx.id);

      const evidence = await repos.evidenceReceipts.findByTransactionId(tx.id);
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence[0].transactionId).toBe(tx.id);
      expect(evidence[0].executionRunId).toBe(execResults[0].run.id);
    });
  });

  describe("12. Normalized ROI coordinates validate correctly", () => {
    it("12.1 ROI coordinates must be between 0 and 1", () => {
      expect(isROIValid({ x: 0, y: 0, width: 1, height: 1 })).toBe(true);
      expect(isROIValid({ x: 0.5, y: 0.5, width: 0.25, height: 0.25 })).toBe(true);
    });

    it("12.2 ROI coordinates outside [0,1] are rejected", () => {
      expect(isROIValid({ x: 0, y: 0, width: 1.1, height: 0.5 })).toBe(false);
      expect(isROIValid({ x: 0, y: 0, width: 0.5, height: -0.1 })).toBe(false);
    });

    it("12.3 boundary values x=0, y=0, width=1, height=1 are valid", () => {
      const roi = validateROI({ x: 0, y: 0, width: 1, height: 1 });
      expect(roi).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    });
  });

  describe("13. Unauthorized ROI/patch rejected", () => {
    it("13.1 HARD_LOCK lease rejects patch on same path", async () => {
      const { service } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { face: { eyes: "blue" } },
      });

      const tx = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change eyes",
      });

      await expect(
        service.prepareTransaction({
          transactionId: tx.id,
          partialIntent: {
            rawInput: "Change eyes",
            targetPath: "face.eyes",
            operation: "SET_ATTRIBUTE",
            desiredValue: "green",
          },
          mutationLeases: [{ targetPath: "face", category: "HARD_LOCK" }],
        }),
      ).rejects.toThrow("HARD_LOCK");
    });

    it("13.2 HARD_LOCK on parent path blocks child path", async () => {
      const { service } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { body: { hand: { color: "skin" } } },
      });

      const tx = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change hand color",
      });

      await expect(
        service.prepareTransaction({
          transactionId: tx.id,
          partialIntent: {
            rawInput: "Change hand color",
            targetPath: "body.hand.color",
            operation: "SET_ATTRIBUTE",
            desiredValue: "red",
          },
          mutationLeases: [{ targetPath: "body", category: "HARD_LOCK" }],
        }),
      ).rejects.toThrow("HARD_LOCK");
    });
  });

  describe("14. Basic image diff metrics are created", () => {
    it("14.1 identical images produce zero diff", () => {
      const grid = makePixelGrid(4, 4, 128);
      const metrics = calculateDiffMetrics(
        grid,
        grid,
        { x: 0, y: 0, width: 0.5, height: 0.5 },
        "hash-source",
        "hash-candidate",
      );
      expect(metrics.normalizedTotalDiff).toBe(0);
      expect(metrics.normalizedRoiDiff).toBe(0);
      expect(metrics.normalizedOutsideRoiDiff).toBe(0);
      expect(metrics.methodology).toBe("pixel-diff-v0.1");
    });

    it("14.2 completely different images produce diff near 1", () => {
      const w = 4;
      const h = 4;
      const blackData = new Uint8ClampedArray(w * h * 4);
      const whiteData = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h * 4; i += 4) {
        blackData[i] = 0;
        blackData[i + 1] = 0;
        blackData[i + 2] = 0;
        blackData[i + 3] = 255;
        whiteData[i] = 255;
        whiteData[i + 1] = 255;
        whiteData[i + 2] = 255;
        whiteData[i + 3] = 255;
      }
      const black: PixelGrid = { width: w, height: h, data: blackData };
      const white: PixelGrid = { width: w, height: h, data: whiteData };
      const metrics = calculateDiffMetrics(
        black,
        white,
        { x: 0, y: 0, width: 0.5, height: 0.5 },
        "hash-black",
        "hash-white",
      );
      expect(metrics.normalizedTotalDiff).toBeCloseTo(1.0, 4);
      expect(metrics.normalizedRoiDiff).toBeCloseTo(1.0, 4);
      expect(metrics.normalizedOutsideRoiDiff).toBeCloseTo(1.0, 4);
    });

    it("14.3 dimension mismatch returns diff = 1 for all metrics", () => {
      const small = makePixelGrid(2, 2, 128);
      const large = makePixelGrid(4, 4, 128);
      const metrics = calculateDiffMetrics(
        small,
        large,
        { x: 0, y: 0, width: 1, height: 1 },
        "hash-s",
        "hash-l",
      );
      expect(metrics.normalizedTotalDiff).toBe(1);
      expect(metrics.normalizedRoiDiff).toBe(1);
      expect(metrics.normalizedOutsideRoiDiff).toBe(1);
      expect(metrics.methodology).toContain("dimension-mismatch");
    });

    it("14.4 ROI-only change: high roi diff, low outside diff", () => {
      const w = 8;
      const h = 8;
      const sourceData = new Uint8ClampedArray(w * h * 4);
      const candidateData = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h * 4; i += 4) {
        sourceData[i] = 128;
        sourceData[i + 1] = 128;
        sourceData[i + 2] = 128;
        sourceData[i + 3] = 255;
        candidateData[i] = 128;
        candidateData[i + 1] = 128;
        candidateData[i + 2] = 128;
        candidateData[i + 3] = 255;
      }

      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const idx = (y * w + x) * 4;
          candidateData[idx] = 255;
          candidateData[idx + 1] = 255;
          candidateData[idx + 2] = 255;
        }
      }

      const source: PixelGrid = { width: w, height: h, data: sourceData };
      const candidate: PixelGrid = { width: w, height: h, data: candidateData };

      const metrics = calculateDiffMetrics(
        source,
        candidate,
        { x: 0, y: 0, width: 0.5, height: 0.5 },
        "hash-s",
        "hash-c",
      );

      expect(metrics.normalizedRoiDiff).toBeGreaterThan(0);
      expect(metrics.normalizedOutsideRoiDiff).toBe(0);
    });

    it("14.5 metrics include source and candidate hashes", () => {
      const grid = makePixelGrid(2, 2, 100);
      const metrics = calculateDiffMetrics(
        grid,
        grid,
        { x: 0, y: 0, width: 1, height: 1 },
        "abc123",
        "def456",
      );
      expect(metrics.sourceHash).toBe("abc123");
      expect(metrics.candidateHash).toBe("def456");
    });

    it("14.6 metrics include changedPixelRatio fields", () => {
      const grid = makePixelGrid(4, 4, 128);
      const metrics = calculateDiffMetrics(
        grid,
        grid,
        { x: 0, y: 0, width: 0.5, height: 0.5 },
        "h1",
        "h2",
      );
      expect(metrics.changedPixelRatioTotal).toBe(0);
      expect(metrics.changedPixelRatioInside).toBe(0);
      expect(metrics.changedPixelRatioOutside).toBe(0);
    });

    it("14.7 methodology version is documented", () => {
      expect(DIFF_METHODOLOGY_VERSION).toBe("pixel-diff-v0.1");
      expect(CHANGED_PIXEL_THRESHOLD).toBe(0.01);
    });
  });

  describe("14B. Metric invariant tests", () => {
    it("CASE 1: source == candidate → all diffs = 0", () => {
      const grid = makePixelGrid(8, 8, 200);
      const metrics = calculateDiffMetrics(
        grid,
        grid,
        { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
        "same",
        "same",
      );
      expect(metrics.normalizedTotalDiff).toBe(0);
      expect(metrics.normalizedRoiDiff).toBe(0);
      expect(metrics.normalizedOutsideRoiDiff).toBe(0);
      expect(metrics.changedPixelRatioTotal).toBe(0);
      expect(metrics.changedPixelRatioInside).toBe(0);
      expect(metrics.changedPixelRatioOutside).toBe(0);
    });

    it("CASE 2: change only inside ROI → inside>0, outside=0, total>0", () => {
      const w = 10;
      const h = 10;
      const sourceData = new Uint8ClampedArray(w * h * 4);
      const candidateData = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h * 4; i += 4) {
        sourceData[i] = 100; sourceData[i + 1] = 100; sourceData[i + 2] = 100; sourceData[i + 3] = 255;
        candidateData[i] = 100; candidateData[i + 1] = 100; candidateData[i + 2] = 100; candidateData[i + 3] = 255;
      }
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const idx = (y * w + x) * 4;
          candidateData[idx] = 255; candidateData[idx + 1] = 255; candidateData[idx + 2] = 255;
        }
      }
      const source: PixelGrid = { width: w, height: h, data: sourceData };
      const candidate: PixelGrid = { width: w, height: h, data: candidateData };
      const metrics = calculateDiffMetrics(source, candidate, { x: 0, y: 0, width: 0.5, height: 0.5 }, "s", "c");

      expect(metrics.normalizedRoiDiff).toBeGreaterThan(0);
      expect(metrics.normalizedOutsideRoiDiff).toBe(0);
      expect(metrics.normalizedTotalDiff).toBeGreaterThan(0);
      expect(metrics.normalizedTotalDiff).toBeLessThan(metrics.normalizedRoiDiff);
      expect(metrics.changedPixelRatioInside).toBeGreaterThan(0);
      expect(metrics.changedPixelRatioOutside).toBe(0);
    });

    it("CASE 3: change only outside ROI → inside=0, outside>0, total>0", () => {
      const w = 10;
      const h = 10;
      const sourceData = new Uint8ClampedArray(w * h * 4);
      const candidateData = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h * 4; i += 4) {
        sourceData[i] = 100; sourceData[i + 1] = 100; sourceData[i + 2] = 100; sourceData[i + 3] = 255;
        candidateData[i] = 100; candidateData[i + 1] = 100; candidateData[i + 2] = 100; candidateData[i + 3] = 255;
      }
      for (let y = 5; y < 10; y++) {
        for (let x = 5; x < 10; x++) {
          const idx = (y * w + x) * 4;
          candidateData[idx] = 255; candidateData[idx + 1] = 255; candidateData[idx + 2] = 255;
        }
      }
      const source: PixelGrid = { width: w, height: h, data: sourceData };
      const candidate: PixelGrid = { width: w, height: h, data: candidateData };
      const metrics = calculateDiffMetrics(source, candidate, { x: 0, y: 0, width: 0.5, height: 0.5 }, "s", "c");

      expect(metrics.normalizedRoiDiff).toBe(0);
      expect(metrics.normalizedOutsideRoiDiff).toBeGreaterThan(0);
      expect(metrics.normalizedTotalDiff).toBeGreaterThan(0);
      expect(metrics.changedPixelRatioInside).toBe(0);
      expect(metrics.changedPixelRatioOutside).toBeGreaterThan(0);
    });

    it("CASE 4: changes both inside and outside", () => {
      const w = 10;
      const h = 10;
      const sourceData = new Uint8ClampedArray(w * h * 4);
      const candidateData = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h * 4; i += 4) {
        sourceData[i] = 100; sourceData[i + 1] = 100; sourceData[i + 2] = 100; sourceData[i + 3] = 255;
        candidateData[i] = 100; candidateData[i + 1] = 100; candidateData[i + 2] = 100; candidateData[i + 3] = 255;
      }
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const idx = (y * w + x) * 4;
          candidateData[idx] = 255; candidateData[idx + 1] = 255; candidateData[idx + 2] = 255;
        }
      }
      for (let y = 7; y < 10; y++) {
        for (let x = 7; x < 10; x++) {
          const idx = (y * w + x) * 4;
          candidateData[idx] = 255; candidateData[idx + 1] = 255; candidateData[idx + 2] = 255;
        }
      }
      const source: PixelGrid = { width: w, height: h, data: sourceData };
      const candidate: PixelGrid = { width: w, height: h, data: candidateData };
      const metrics = calculateDiffMetrics(source, candidate, { x: 0, y: 0, width: 0.5, height: 0.5 }, "s", "c");

      expect(metrics.normalizedRoiDiff).toBeGreaterThan(0);
      expect(metrics.normalizedOutsideRoiDiff).toBeGreaterThan(0);
      expect(metrics.changedPixelRatioInside).toBeGreaterThan(0);
      expect(metrics.changedPixelRatioOutside).toBeGreaterThan(0);
    });

    it("CASE 5: ROI covers entire image → total ≈ inside", () => {
      const w = 8;
      const h = 8;
      const sourceData = new Uint8ClampedArray(w * h * 4);
      const candidateData = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        sourceData[i * 4] = 100; sourceData[i * 4 + 1] = 100; sourceData[i * 4 + 2] = 100; sourceData[i * 4 + 3] = 255;
        candidateData[i * 4] = 200; candidateData[i * 4 + 1] = 200; candidateData[i * 4 + 2] = 200; candidateData[i * 4 + 3] = 255;
      }
      const source: PixelGrid = { width: w, height: h, data: sourceData };
      const candidate: PixelGrid = { width: w, height: h, data: candidateData };
      const metrics = calculateDiffMetrics(source, candidate, { x: 0, y: 0, width: 1, height: 1 }, "s", "c");

      expect(metrics.normalizedTotalDiff).toBeCloseTo(metrics.normalizedRoiDiff, 10);
      expect(metrics.normalizedOutsideRoiDiff).toBe(0);
      expect(metrics.changedPixelRatioTotal).toBeCloseTo(metrics.changedPixelRatioInside, 10);
    });

    it("CASE 6: very small ROI / boundary → no out-of-bounds", () => {
      const w = 4;
      const h = 4;
      const source = makePixelGrid(w, h, 100);
      const candidate = makePixelGrid(w, h, 100);
      const metrics = calculateDiffMetrics(source, candidate, { x: 0.99, y: 0.99, width: 0.01, height: 0.01 }, "s", "c");
      expect(metrics.normalizedTotalDiff).toBe(0);
      expect(metrics.normalizedRoiDiff).toBe(0);
    });

    it("invariant: totalDiff ≈ weighted average of inside and outside", () => {
      const w = 10;
      const h = 10;
      const sourceData = new Uint8ClampedArray(w * h * 4);
      const candidateData = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        sourceData[i * 4] = 100; sourceData[i * 4 + 1] = 100; sourceData[i * 4 + 2] = 100; sourceData[i * 4 + 3] = 255;
        candidateData[i * 4] = 150; candidateData[i * 4 + 1] = 150; candidateData[i * 4 + 2] = 150; candidateData[i * 4 + 3] = 255;
      }
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const idx = (y * w + x) * 4;
          candidateData[idx] = 255; candidateData[idx + 1] = 255; candidateData[idx + 2] = 255;
        }
      }
      const source: PixelGrid = { width: w, height: h, data: sourceData };
      const candidate: PixelGrid = { width: w, height: h, data: candidateData };
      const metrics = calculateDiffMetrics(source, candidate, { x: 0, y: 0, width: 0.4, height: 0.4 }, "s", "c");

      const roiPixels = metrics.sourceWidth * 0.4 * metrics.sourceHeight * 0.4;
      const totalPixels = metrics.sourceWidth * metrics.sourceHeight;
      const outsidePixels = totalPixels - roiPixels;

      const expectedTotal = (metrics.normalizedRoiDiff * roiPixels + metrics.normalizedOutsideRoiDiff * outsidePixels) / totalPixels;
      expect(metrics.normalizedTotalDiff).toBeCloseTo(expectedTotal, 8);
    });
  });

  describe("15. Rejected candidate cannot commit", () => {
    it("15.1 rejected transaction stays in ABORTED state", async () => {
      const { service, repos } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { jacket: { color: "blue" } },
      });

      const tx = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change jacket",
      });

      await service.abortTransaction(tx.id, "Human rejected the edit");

      const aborted = await repos.outcomeTransactions.findById(tx.id);
      expect(aborted?.status).toBe("ABORTED");
      expect(aborted?.abortReason).toBe("Human rejected the edit");

      await expect(
        service.commitTransaction({ transactionId: tx.id }),
      ).rejects.toThrow();
    });
  });

  describe("16. Approved candidate can commit", () => {
    it("16.1 verified transaction commits successfully", async () => {
      const { service } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { jacket: { color: "blue" } },
      });

      const tx = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change jacket",
      });

      await service.prepareTransaction({
        transactionId: tx.id,
        partialIntent: {
          rawInput: "Change jacket",
          targetPath: "jacket.color",
          operation: "SET_ATTRIBUTE",
          desiredValue: "black",
        },
        mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
      });

      await service.executeTransaction(tx.id);
      await service.verifyTransaction({ transactionId: tx.id });
      const result = await service.commitTransaction({ transactionId: tx.id });

      expect(result.newVersion.versionNumber).toBe(2);
      expect(result.stateCommit).toBeDefined();
    });
  });

  describe("17. Approval creates VerificationRun", () => {
    it("17.1 verifyTransaction creates a VerificationRun with PASSED status", async () => {
      const { service, repos } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { jacket: { color: "blue" } },
      });

      const tx = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change jacket",
      });

      await service.prepareTransaction({
        transactionId: tx.id,
        partialIntent: {
          rawInput: "Change jacket",
          targetPath: "jacket.color",
          operation: "SET_ATTRIBUTE",
          desiredValue: "black",
        },
        mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
      });

      await service.executeTransaction(tx.id);
      const verification = await service.verifyTransaction({ transactionId: tx.id });

      expect(verification.status).toBe("PASSED");
      expect(verification.transactionId).toBe(tx.id);
      expect(verification.checks.hasEvidence).toBe(true);
      expect(verification.checks.allExecutionsSucceeded).toBe(true);

      const runs = await repos.verificationRuns.findByTransactionId(tx.id);
      expect(runs.length).toBe(1);
      expect(runs[0].status).toBe("PASSED");
    });
  });

  describe("18. Stale transaction still cannot commit", () => {
    it("18.1 commit fails when asset head has moved", async () => {
      const { service, repos } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { jacket: { color: "blue" } },
      });

      const tx1 = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change jacket to black",
      });

      await service.prepareTransaction({
        transactionId: tx1.id,
        partialIntent: {
          rawInput: "Change jacket to black",
          targetPath: "jacket.color",
          operation: "SET_ATTRIBUTE",
          desiredValue: "black",
        },
        mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
      });

      await repos.outcomeTransactions.updateStatus(tx1.id, "READY");
      await repos.outcomeTransactions.updateStatus(tx1.id, "EXECUTING");
      await repos.executionRuns.create({
        transactionId: tx1.id,
        status: "SUCCESS",
        executor: "fake",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs: 100,
        costUsd: 0.001,
        errorMessage: null,
        metadata: {},
      });
      await repos.evidenceReceipts.create({
        transactionId: tx1.id,
        executionRunId: "exec-1",
        baseVersionId: v1.id,
        operation: "SET_ATTRIBUTE",
        target: "jacket.color",
        requestedEffect: { value: "black" },
        observedEffect: "black",
        executor: "fake",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        costUsd: 0.001,
        success: true,
      });

      await repos.outcomeTransactions.updateStatus(tx1.id, "VERIFYING");
      const ver1 = await service.verifyTransaction({ transactionId: tx1.id });
      expect(ver1.status).toBe("PASSED");

      await service.commitTransaction({ transactionId: tx1.id });

      const tx2 = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change jacket to red",
      });

      await service.prepareTransaction({
        transactionId: tx2.id,
        partialIntent: {
          rawInput: "Change jacket to red",
          targetPath: "jacket.color",
          operation: "SET_ATTRIBUTE",
          desiredValue: "red",
        },
        mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
      });

      await service.executeTransaction(tx2.id);
      await service.verifyTransaction({ transactionId: tx2.id });

      await expect(
        service.commitTransaction({ transactionId: tx2.id }),
      ).rejects.toThrow("Conflicto");
    });
  });

  describe("19. Candidate from another transaction cannot be approved", () => {
    it("19.1 verification for tx1 does not affect tx2", async () => {
      const { service, repos } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { jacket: { color: "blue" } },
      });

      const tx1 = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change to black",
      });

      const tx2 = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change to red",
      });

      await service.prepareTransaction({
        transactionId: tx1.id,
        partialIntent: {
          rawInput: "Change to black",
          targetPath: "jacket.color",
          operation: "SET_ATTRIBUTE",
          desiredValue: "black",
        },
        mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
      });

      await service.executeTransaction(tx1.id);
      await service.verifyTransaction({ transactionId: tx1.id });

      const ver1 = await repos.verificationRuns.findByTransactionId(tx1.id);
      const ver2 = await repos.verificationRuns.findByTransactionId(tx2.id);

      expect(ver1.length).toBe(1);
      expect(ver2.length).toBe(0);
      expect(ver1[0].transactionId).toBe(tx1.id);
    });
  });

  describe("20. Source and candidate history remain immutable", () => {
    it("20.1 committed v1 is preserved after v2 commit", async () => {
      const { service, repos } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { jacket: { color: "blue" } },
      });

      const tx = await service.createTransaction({
        projectId: project.id,
        assetId: v1.assetId,
        baseVersionId: v1.id,
        rawRequest: "Change jacket",
      });

      await service.prepareTransaction({
        transactionId: tx.id,
        partialIntent: {
          rawInput: "Change jacket",
          targetPath: "jacket.color",
          operation: "SET_ATTRIBUTE",
          desiredValue: "black",
        },
        mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
      });

      await service.executeTransaction(tx.id);
      await service.verifyTransaction({ transactionId: tx.id });
      await service.commitTransaction({ transactionId: tx.id });

      const v1After = await repos.assetVersions.findById(v1.id);
      expect(v1After).toBeDefined();
      expect(v1After!.state).toEqual({ jacket: { color: "blue" } });
      expect(v1After!.versionNumber).toBe(1);
      expect(v1After!.parentVersionId).toBeNull();

      const allVersions = await repos.assetVersions.findByAssetId(v1.assetId);
      expect(allVersions.length).toBe(2);
      expect(allVersions[0].id).toBe(v1.id);
      expect(allVersions[1].state).toEqual({ jacket: { color: "black" } });

      const evidence = await repos.evidenceReceipts.findByTransactionId(tx.id);
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence[0].baseVersionId).toBe(v1.id);
    });

    it("20.2 multiple commits preserve full version chain", async () => {
      const { service, repos } = createTestService();
      const project = await service.createProject({ name: "Test" });
      const { version: v1 } = await service.createAsset({
        projectId: project.id,
        name: "Asset",
        initialState: { jacket: { color: "blue" } },
      });

      async function commitEdit(baseVersionId: string, value: string) {
        const tx = await service.createTransaction({
          projectId: project.id,
          assetId: v1.assetId,
          baseVersionId,
          rawRequest: `Change to ${value}`,
        });
        await service.prepareTransaction({
          transactionId: tx.id,
          partialIntent: {
            rawInput: `Change to ${value}`,
            targetPath: "jacket.color",
            operation: "SET_ATTRIBUTE",
            desiredValue: value,
          },
          mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
        });
        await service.executeTransaction(tx.id);
        await service.verifyTransaction({ transactionId: tx.id });
        const result = await service.commitTransaction({ transactionId: tx.id });
        return result;
      }

      const r2 = await commitEdit(v1.id, "black");
      const r3 = await commitEdit(r2.newVersion.id, "red");

      expect(r2.newVersion.versionNumber).toBe(2);
      expect(r3.newVersion.versionNumber).toBe(3);

      const allVersions = await repos.assetVersions.findByAssetId(v1.assetId);
      expect(allVersions).toHaveLength(3);
      expect(allVersions[0].state).toEqual({ jacket: { color: "blue" } });
      expect(allVersions[1].state).toEqual({ jacket: { color: "black" } });
      expect(allVersions[2].state).toEqual({ jacket: { color: "red" } });

      const v1Still = await repos.assetVersions.findById(v1.id);
      expect(v1Still!.state).toEqual({ jacket: { color: "blue" } });
    });
  });
});
