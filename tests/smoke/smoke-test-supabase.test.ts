import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { decodePngToPixels } from "@/src/infrastructure/evidence/png-decoder";
import { encodePixelsToPng } from "@/src/infrastructure/evidence/png-encoder";
import { calculateDiffMetrics, DIFF_METHODOLOGY_VERSION, CHANGED_PIXEL_THRESHOLD } from "@/src/infrastructure/evidence/image-diff-calculator";

describe("BUILD 003.2 pixel-level diff metrics", () => {
  it("decodes PNGs and computes all 6 diff metrics correctly", () => {
    // Keep the smoke fixture hermetic: clean checkouts must not need local provider outputs.
    const sourceGrid = createSmokeGrid();
    const candidateGrid = createSmokeGrid();
    candidateGrid.data[0] = 255;
    candidateGrid.data[1] = 0;
    const sourceBuffer = encodePixelsToPng(sourceGrid);
    const candidateBuffer = encodePixelsToPng(candidateGrid);

    const sourcePixels = decodePngToPixels(sourceBuffer);
    const candidatePixels = decodePngToPixels(candidateBuffer);

    expect(sourcePixels.width).toBeGreaterThan(0);
    expect(sourcePixels.height).toBeGreaterThan(0);
    expect(candidatePixels.width).toBeGreaterThan(0);
    expect(candidatePixels.height).toBeGreaterThan(0);

    const sourceHash = createHash("sha256").update(sourceBuffer).digest("hex");
    const candidateHash = createHash("sha256").update(candidateBuffer).digest("hex");

    const roi = { x: 0.2, y: 0.2, width: 0.3, height: 0.3 };
    const metrics = calculateDiffMetrics(sourcePixels, candidatePixels, roi, sourceHash, candidateHash);

    // Methodology
    expect(metrics.methodology).toBe(DIFF_METHODOLOGY_VERSION);

    // Hashes
    expect(metrics.sourceHash).toBe(sourceHash);
    expect(metrics.candidateHash).toBe(candidateHash);

    // Dimensions
    expect(metrics.sourceWidth).toBe(sourcePixels.width);
    expect(metrics.sourceHeight).toBe(sourcePixels.height);
    expect(metrics.candidateWidth).toBe(candidatePixels.width);
    expect(metrics.candidateHeight).toBe(candidatePixels.height);

    // All ratios in [0, 1]
    expect(metrics.normalizedTotalDiff).toBeGreaterThanOrEqual(0);
    expect(metrics.normalizedTotalDiff).toBeLessThanOrEqual(1);
    expect(metrics.normalizedRoiDiff).toBeGreaterThanOrEqual(0);
    expect(metrics.normalizedRoiDiff).toBeLessThanOrEqual(1);
    expect(metrics.normalizedOutsideRoiDiff).toBeGreaterThanOrEqual(0);
    expect(metrics.normalizedOutsideRoiDiff).toBeLessThanOrEqual(1);
    expect(metrics.changedPixelRatioTotal).toBeGreaterThanOrEqual(0);
    expect(metrics.changedPixelRatioTotal).toBeLessThanOrEqual(1);
    expect(metrics.changedPixelRatioInside).toBeGreaterThanOrEqual(0);
    expect(metrics.changedPixelRatioInside).toBeLessThanOrEqual(1);
    expect(metrics.changedPixelRatioOutside).toBeGreaterThanOrEqual(0);
    expect(metrics.changedPixelRatioOutside).toBeLessThanOrEqual(1);

    // At least some pixels should differ (these are different images)
    expect(metrics.changedPixelRatioTotal).toBeGreaterThan(0);

    // Console output for manual verification
    console.log("\n=== BUILD 003.2 Diff Metrics ===");
    console.log("Methodology:", metrics.methodology);
    console.log("Threshold:", CHANGED_PIXEL_THRESHOLD);
    console.log("Source:", metrics.sourceWidth, "x", metrics.sourceHeight);
    console.log("Candidate:", metrics.candidateWidth, "x", metrics.candidateHeight);
    console.log("normalizedTotalDiff:", metrics.normalizedTotalDiff.toFixed(9));
    console.log("normalizedRoiDiff:", metrics.normalizedRoiDiff.toFixed(9));
    console.log("normalizedOutsideRoiDiff:", metrics.normalizedOutsideRoiDiff.toFixed(9));
    console.log("changedPixelRatioTotal:", metrics.changedPixelRatioTotal.toFixed(9));
    console.log("changedPixelRatioInside:", metrics.changedPixelRatioInside.toFixed(9));
    console.log("changedPixelRatioOutside:", metrics.changedPixelRatioOutside.toFixed(9));
  });

  it("dimension mismatch returns all 1s", () => {
    const source = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
    const candidate = { width: 3, height: 3, data: new Uint8ClampedArray(36) };
    const roi = { x: 0, y: 0, width: 1, height: 1 };

    const metrics = calculateDiffMetrics(source, candidate, roi, "aaa", "bbb");

    expect(metrics.normalizedTotalDiff).toBe(1);
    expect(metrics.normalizedRoiDiff).toBe(1);
    expect(metrics.normalizedOutsideRoiDiff).toBe(1);
    expect(metrics.changedPixelRatioTotal).toBe(1);
    expect(metrics.changedPixelRatioInside).toBe(1);
    expect(metrics.changedPixelRatioOutside).toBe(1);
    expect(metrics.methodology).toContain("dimension-mismatch");
  });

  it("identical images return 0 for all metrics", () => {
    const data = new Uint8ClampedArray([100, 150, 200, 255, 50, 100, 150, 255, 200, 50, 100, 255, 150, 200, 50, 255]);
    const source = { width: 2, height: 2, data };
    const candidate = { width: 2, height: 2, data: new Uint8ClampedArray(data) };
    const roi = { x: 0, y: 0, width: 1, height: 1 };

    const metrics = calculateDiffMetrics(source, candidate, roi, "same", "same");

    expect(metrics.normalizedTotalDiff).toBe(0);
    expect(metrics.normalizedRoiDiff).toBe(0);
    expect(metrics.normalizedOutsideRoiDiff).toBe(0);
    expect(metrics.changedPixelRatioTotal).toBe(0);
    expect(metrics.changedPixelRatioInside).toBe(0);
    expect(metrics.changedPixelRatioOutside).toBe(0);
  });
});

function createSmokeGrid() {
  const data = new Uint8ClampedArray(4 * 4 * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = 40;
    data[offset + 1] = 80;
    data[offset + 2] = 120;
    data[offset + 3] = 255;
  }
  return { width: 4, height: 4, data };
}
