import { createDefaultPreservationPolicy, type PreservationEvidenceMetrics, type ResolvedPreservationZones } from "@/src/domain/outcome/media/preservation";
import type { PreservationStrategyId, PreservationStrategyParameters } from "@/src/domain/outcome/media/field-beta";
import type { PixelGrid } from "@/src/infrastructure/evidence/image-diff-calculator";
import { calculatePreservationEvidence } from "@/src/infrastructure/evidence/preservation-evidence-calculator";
import { coupledCandidateWeight, derivePreservationZones } from "@/src/infrastructure/preservation/compositing-image-preservation-engine";

export type LadderDerivedCandidate = {
  strategyId: PreservationStrategyId;
  pixels: PixelGrid;
  zones: ResolvedPreservationZones;
  metrics: PreservationEvidenceMetrics;
  processingTimeMs: number;
};

export class PreservationLadderEngine {
  readonly methodologyVersion = "preservation-ladder-composite-v0.1";

  derive(input: {
    strategyId: Exclude<PreservationStrategyId, "P0_RAW">;
    parameters: PreservationStrategyParameters;
    source: PixelGrid;
    rawCandidate: PixelGrid;
    roi: { x: number; y: number; width: number; height: number };
  }): LadderDerivedCandidate {
    const startedAt = performance.now();
    if (input.source.width !== input.rawCandidate.width || input.source.height !== input.rawCandidate.height) {
      throw new Error("Source and RAW dimensions must match for ladder derivation.");
    }
    const zones = derivePreservationZones(createDefaultPreservationPolicy(input.roi, input.parameters.coupledBandSize), input.source.width, input.source.height);
    const data = new Uint8ClampedArray(input.source.data.length);

    for (let y = 0; y < input.source.height; y += 1) {
      for (let x = 0; x < input.source.width; x += 1) {
        const offset = (y * input.source.width + x) * 4;
        const inCore = x >= zones.core.x0 && x < zones.core.x1 && y >= zones.core.y0 && y < zones.core.y1;
        const inExpanded = x >= zones.expanded.x0 && x < zones.expanded.x1 && y >= zones.expanded.y0 && y < zones.expanded.y1;
        const candidateWeight = inCore
          ? 1
          : inExpanded
            ? coupledCandidateWeight(x, y, zones.core, zones.coupledBandPixels)
            : 1 - input.parameters.outsideSourceWeight;
        for (let channel = 0; channel < 4; channel += 1) {
          data[offset + channel] = Math.round(input.source.data[offset + channel] * (1 - candidateWeight) + input.rawCandidate.data[offset + channel] * candidateWeight);
        }
      }
    }
    const pixels = { width: input.source.width, height: input.source.height, data };
    return {
      strategyId: input.strategyId,
      pixels,
      zones,
      metrics: calculatePreservationEvidence(input.source, pixels, zones),
      processingTimeMs: Math.max(0, Math.round((performance.now() - startedAt) * 1_000) / 1_000),
    };
  }
}
