import {
  PRESERVATION_EVIDENCE_VERSION,
  type PreservationEvidenceMetrics,
  type ResolvedPreservationZones,
} from "@/src/domain/outcome/media/preservation";
import { CHANGED_PIXEL_THRESHOLD, luma, type PixelGrid } from "@/src/infrastructure/evidence/image-diff-calculator";
import { classifyPixel } from "@/src/infrastructure/preservation/compositing-image-preservation-engine";

export function calculatePreservationEvidence(
  source: PixelGrid,
  candidate: PixelGrid,
  zones: ResolvedPreservationZones,
): PreservationEvidenceMetrics {
  if (source.width !== candidate.width || source.height !== candidate.height) {
    throw new Error("Cannot calculate preservation evidence for different dimensions.");
  }
  if (source.width !== zones.imageWidth || source.height !== zones.imageHeight) {
    throw new Error("Preservation zones do not match image dimensions.");
  }

  const aggregates = {
    total: createAggregate(),
    core: createAggregate(),
    coupled: createAggregate(),
    locked: createAggregate(),
  };

  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const offset = (y * source.width + x) * 4;
      const sourceLuma = luma(source.data[offset], source.data[offset + 1], source.data[offset + 2]);
      const candidateLuma = luma(candidate.data[offset], candidate.data[offset + 1], candidate.data[offset + 2]);
      const difference = Math.abs(sourceLuma - candidateLuma) / 255;
      add(aggregates.total, difference);
      const zone = classifyPixel(x, y, zones);
      add(zone === "CORE" ? aggregates.core : zone === "COUPLED" ? aggregates.coupled : aggregates.locked, difference);
    }
  }

  return {
    methodologyVersion: PRESERVATION_EVIDENCE_VERSION,
    meanTotalPixelDiff: mean(aggregates.total),
    changedPixelRatioTotal: ratio(aggregates.total),
    meanCorePixelDiff: mean(aggregates.core),
    changedPixelRatioCore: ratio(aggregates.core),
    meanCoupledPixelDiff: mean(aggregates.coupled),
    changedPixelRatioCoupled: ratio(aggregates.coupled),
    meanLockedOutsidePixelDiff: mean(aggregates.locked),
    changedPixelRatioLockedOutside: ratio(aggregates.locked),
  };
}

function createAggregate() {
  return { difference: 0, changed: 0, count: 0 };
}

function add(aggregate: ReturnType<typeof createAggregate>, difference: number): void {
  aggregate.difference += difference;
  aggregate.count += 1;
  if (difference > CHANGED_PIXEL_THRESHOLD) aggregate.changed += 1;
}

function mean(aggregate: ReturnType<typeof createAggregate>): number {
  return aggregate.count === 0 ? 0 : aggregate.difference / aggregate.count;
}

function ratio(aggregate: ReturnType<typeof createAggregate>): number {
  return aggregate.count === 0 ? 0 : aggregate.changed / aggregate.count;
}
