import type {
  PreservationFailureCode,
  PreservationPolicy,
  ResolvedPreservationZones,
} from "@/src/domain/outcome/media/preservation";
import type { PixelGrid } from "@/src/infrastructure/evidence/image-diff-calculator";

export type PreservationEngineSuccess = {
  ok: true;
  preserved: PixelGrid;
  zones: ResolvedPreservationZones;
  methodologyVersion: string;
  processingTimeMs: number;
};

export type PreservationEngineFailure = {
  ok: false;
  code: PreservationFailureCode;
  message: string;
  methodologyVersion: string;
  processingTimeMs: number;
};

export type PreservationEngineResult = PreservationEngineSuccess | PreservationEngineFailure;

export interface ImagePreservationEngine {
  readonly methodologyVersion: string;
  preserve(input: {
    source: PixelGrid;
    rawCandidate: PixelGrid;
    policy: PreservationPolicy;
  }): PreservationEngineResult;
}
