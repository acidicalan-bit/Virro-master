import type {
  ImagePreservationEngine,
  PreservationEngineResult,
} from "@/src/application/ports/outcome/image-preservation-engine-port";
import {
  PRESERVATION_METHODOLOGY_VERSION,
  PreservationPolicySchema,
  type PixelBounds,
  type PreservationPolicy,
  type ResolvedPreservationZones,
} from "@/src/domain/outcome/media/preservation";
import type { PixelGrid } from "@/src/infrastructure/evidence/image-diff-calculator";

export class CompositingImagePreservationEngine implements ImagePreservationEngine {
  readonly methodologyVersion = PRESERVATION_METHODOLOGY_VERSION;

  preserve(input: {
    source: PixelGrid;
    rawCandidate: PixelGrid;
    policy: PreservationPolicy;
  }): PreservationEngineResult {
    const startedAt = performance.now();
    const policyResult = PreservationPolicySchema.safeParse(input.policy);
    if (!policyResult.success) {
      return this.failure("INVALID_POLICY", policyResult.error.issues[0]?.message ?? "Invalid policy.", startedAt);
    }

    const { source, rawCandidate } = input;
    if (!validGrid(source) || !validGrid(rawCandidate)) {
      return this.failure("INVALID_PIXEL_DATA", "Pixel data does not match image dimensions.", startedAt);
    }
    if (source.width !== rawCandidate.width || source.height !== rawCandidate.height) {
      return this.failure(
        "DIMENSION_MISMATCH",
        `Source is ${source.width}x${source.height}; raw candidate is ${rawCandidate.width}x${rawCandidate.height}.`,
        startedAt,
      );
    }

    try {
      const zones = derivePreservationZones(policyResult.data, source.width, source.height);
      const output = new Uint8ClampedArray(source.data.length);

      for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
          const offset = (y * source.width + x) * 4;
          const zone = classifyPixel(x, y, zones);
          if (zone === "CORE") {
            copyPixel(rawCandidate.data, output, offset);
          } else if (zone === "LOCKED_OUTSIDE") {
            copyPixel(source.data, output, offset);
          } else {
            const candidateWeight = coupledCandidateWeight(x, y, zones.core, zones.coupledBandPixels);
            for (let channel = 0; channel < 4; channel++) {
              output[offset + channel] = Math.round(
                source.data[offset + channel] * (1 - candidateWeight) +
                  rawCandidate.data[offset + channel] * candidateWeight,
              );
            }
          }
        }
      }

      return {
        ok: true,
        preserved: { width: source.width, height: source.height, data: output },
        zones,
        methodologyVersion: this.methodologyVersion,
        processingTimeMs: elapsedMs(startedAt),
      };
    } catch (error) {
      return this.failure(
        "COMPOSITING_FAILURE",
        error instanceof Error ? error.message : "Unknown compositing failure.",
        startedAt,
      );
    }
  }

  private failure(
    code: "INVALID_POLICY" | "INVALID_PIXEL_DATA" | "DIMENSION_MISMATCH" | "COMPOSITING_FAILURE",
    message: string,
    startedAt: number,
  ): PreservationEngineResult {
    return {
      ok: false,
      code,
      message,
      methodologyVersion: this.methodologyVersion,
      processingTimeMs: elapsedMs(startedAt),
    };
  }
}

export type PreservationZone = "CORE" | "COUPLED" | "LOCKED_OUTSIDE";

export function derivePreservationZones(
  policy: PreservationPolicy,
  imageWidth: number,
  imageHeight: number,
): ResolvedPreservationZones {
  const parsed = PreservationPolicySchema.parse(policy);
  if (!Number.isInteger(imageWidth) || !Number.isInteger(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
    throw new Error("Image dimensions must be positive integers.");
  }

  const core: PixelBounds = {
    x0: clamp(Math.floor(parsed.coreRoi.x * imageWidth), 0, imageWidth),
    y0: clamp(Math.floor(parsed.coreRoi.y * imageHeight), 0, imageHeight),
    x1: clamp(Math.ceil((parsed.coreRoi.x + parsed.coreRoi.width) * imageWidth), 0, imageWidth),
    y1: clamp(Math.ceil((parsed.coreRoi.y + parsed.coreRoi.height) * imageHeight), 0, imageHeight),
  };
  if (core.x1 <= core.x0 || core.y1 <= core.y0) {
    throw new Error("ROI resolves to an empty pixel region.");
  }

  const coupledBandPixels = Math.ceil(parsed.coupledBand.size * Math.min(imageWidth, imageHeight));
  const expanded: PixelBounds = {
    x0: clamp(core.x0 - coupledBandPixels, 0, imageWidth),
    y0: clamp(core.y0 - coupledBandPixels, 0, imageHeight),
    x1: clamp(core.x1 + coupledBandPixels, 0, imageWidth),
    y1: clamp(core.y1 + coupledBandPixels, 0, imageHeight),
  };
  const coreCount = area(core);
  const expandedCount = area(expanded);
  const total = imageWidth * imageHeight;

  return {
    imageWidth,
    imageHeight,
    core,
    expanded,
    coupledBandPixels,
    counts: {
      core: coreCount,
      coupled: expandedCount - coreCount,
      lockedOutside: total - expandedCount,
    },
  };
}

export function classifyPixel(
  x: number,
  y: number,
  zones: ResolvedPreservationZones,
): PreservationZone {
  if (inBounds(x, y, zones.core)) return "CORE";
  if (inBounds(x, y, zones.expanded)) return "COUPLED";
  return "LOCKED_OUTSIDE";
}

export function coupledCandidateWeight(
  x: number,
  y: number,
  core: PixelBounds,
  bandPixels: number,
): number {
  if (bandPixels <= 0) return 0;
  const px = x + 0.5;
  const py = y + 0.5;
  const dx = px < core.x0 ? core.x0 - px : px > core.x1 ? px - core.x1 : 0;
  const dy = py < core.y0 ? core.y0 - py : py > core.y1 ? py - core.y1 : 0;
  const normalizedDistance = clamp(Math.hypot(dx, dy) / bandPixels, 0, 1);
  const smoothstep = normalizedDistance * normalizedDistance * (3 - 2 * normalizedDistance);
  return 1 - smoothstep;
}

function validGrid(grid: PixelGrid): boolean {
  return Number.isInteger(grid.width) &&
    Number.isInteger(grid.height) &&
    grid.width > 0 &&
    grid.height > 0 &&
    grid.data.length === grid.width * grid.height * 4;
}

function copyPixel(source: Uint8ClampedArray, target: Uint8ClampedArray, offset: number): void {
  target[offset] = source[offset];
  target[offset + 1] = source[offset + 1];
  target[offset + 2] = source[offset + 2];
  target[offset + 3] = source[offset + 3];
}

function inBounds(x: number, y: number, bounds: PixelBounds): boolean {
  return x >= bounds.x0 && x < bounds.x1 && y >= bounds.y0 && y < bounds.y1;
}

function area(bounds: PixelBounds): number {
  return (bounds.x1 - bounds.x0) * (bounds.y1 - bounds.y0);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Math.round((performance.now() - startedAt) * 1000) / 1000);
}
