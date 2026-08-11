export type DiffMetrics = {
  sourceHash: string;
  candidateHash: string;
  sourceWidth: number;
  sourceHeight: number;
  candidateWidth: number;
  candidateHeight: number;
  normalizedTotalDiff: number;
  normalizedRoiDiff: number;
  normalizedOutsideRoiDiff: number;
  methodology: string;
};

export type PixelGrid = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export function calculateDiffMetrics(
  source: PixelGrid,
  candidate: PixelGrid,
  roi: { x: number; y: number; width: number; height: number },
  sourceHash: string,
  candidateHash: string,
): DiffMetrics {
  const methodology = "normalized-luma-diff-v1";

  if (source.width !== candidate.width || source.height !== candidate.height) {
    return {
      sourceHash,
      candidateHash,
      sourceWidth: source.width,
      sourceHeight: source.height,
      candidateWidth: candidate.width,
      candidateHeight: candidate.height,
      normalizedTotalDiff: 1,
      normalizedRoiDiff: 1,
      normalizedOutsideRoiDiff: 1,
      methodology: methodology + "-dimension-mismatch",
    };
  }

  const { width, height } = source;
  const roiX = Math.floor(roi.x * width);
  const roiY = Math.floor(roi.y * height);
  const roiW = Math.floor(roi.width * width);
  const roiH = Math.floor(roi.height * height);

  let totalDiff = 0;
  let roiDiff = 0;
  let roiCount = 0;
  let outsideDiff = 0;
  let outsideCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const sourceLuma = luma(source.data[idx], source.data[idx + 1], source.data[idx + 2]);
      const candidateLuma = luma(candidate.data[idx], candidate.data[idx + 1], candidate.data[idx + 2]);
      const pixelDiff = Math.abs(sourceLuma - candidateLuma) / 255;

      totalDiff += pixelDiff;

      const inRoi = x >= roiX && x < roiX + roiW && y >= roiY && y < roiY + roiH;
      if (inRoi) {
        roiDiff += pixelDiff;
        roiCount++;
      } else {
        outsideDiff += pixelDiff;
        outsideCount++;
      }
    }
  }

  const totalPixels = width * height;

  return {
    sourceHash,
    candidateHash,
    sourceWidth: width,
    sourceHeight: height,
    candidateWidth: width,
    candidateHeight: height,
    normalizedTotalDiff: totalDiff / totalPixels,
    normalizedRoiDiff: roiCount > 0 ? roiDiff / roiCount : 0,
    normalizedOutsideRoiDiff: outsideCount > 0 ? outsideDiff / outsideCount : 0,
    methodology,
  };
}

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
