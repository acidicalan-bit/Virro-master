import {
  type CreativeAssertion,
  type MachineVerificationResult,
  type PreservationEvidenceMetrics,
  type ResolvedPreservationZones,
} from "@/src/domain/outcome/media/preservation";
import type { PixelGrid } from "@/src/infrastructure/evidence/image-diff-calculator";
import { classifyPixel } from "@/src/infrastructure/preservation/compositing-image-preservation-engine";

export type CreativeAssertionInput = {
  sourceBeforeHash: string;
  sourceAfterHash: string;
  source: PixelGrid;
  rawCandidate: PixelGrid | null;
  preservedCandidate: PixelGrid | null;
  zones: ResolvedPreservationZones;
  rawCandidateId: string | null;
  preservedCandidateId: string | null;
  expectedTransactionId: string;
  rawTransactionId: string | null;
  preservedTransactionId: string | null;
  preservedRawCandidateId: string | null;
  editRegionChangeThreshold: number;
  preservedEvidence: PreservationEvidenceMetrics | null;
};

export function verifyCreativeAssertions(input: CreativeAssertionInput): MachineVerificationResult {
  const dimensionsMatch = Boolean(
    input.rawCandidate &&
      input.preservedCandidate &&
      input.source.width === input.rawCandidate.width &&
      input.source.height === input.rawCandidate.height &&
      input.source.width === input.preservedCandidate.width &&
      input.source.height === input.preservedCandidate.height,
  );
  const lockedOutsideExact = dimensionsMatch && input.preservedCandidate
    ? lockedOutsideEqualsSource(input.source, input.preservedCandidate, input.zones)
    : false;
  const provenanceValid = Boolean(
    input.rawCandidateId &&
      input.preservedCandidateId &&
      input.rawTransactionId === input.expectedTransactionId &&
      input.preservedTransactionId === input.expectedTransactionId &&
      input.preservedRawCandidateId === input.rawCandidateId,
  );

  const assertions: CreativeAssertion[] = [
    assertion("SOURCE_IMMUTABLE", input.sourceBeforeHash === input.sourceAfterHash, {
      before: input.sourceBeforeHash,
      after: input.sourceAfterHash,
    }),
    assertion("DIMENSIONS_MATCH", dimensionsMatch, {
      source: dimensions(input.source),
      raw: input.rawCandidate ? dimensions(input.rawCandidate) : null,
      preserved: input.preservedCandidate ? dimensions(input.preservedCandidate) : null,
    }),
    assertion("RAW_CANDIDATE_EXISTS", Boolean(input.rawCandidate && input.rawCandidateId), {
      rawCandidateId: input.rawCandidateId,
    }),
    assertion("PRESERVED_CANDIDATE_EXISTS", Boolean(input.preservedCandidate && input.preservedCandidateId), {
      preservedCandidateId: input.preservedCandidateId,
    }),
    assertion("PROVENANCE_VALID", provenanceValid, {
      expectedTransactionId: input.expectedTransactionId,
      rawTransactionId: input.rawTransactionId,
      preservedTransactionId: input.preservedTransactionId,
      preservedRawCandidateId: input.preservedRawCandidateId,
    }),
    assertion("LOCKED_OUTSIDE_EXACTLY_PRESERVED", lockedOutsideExact, {
      lockedOutsidePixelCount: input.zones.counts.lockedOutside,
      changedPixelRatioLockedOutside: input.preservedEvidence?.changedPixelRatioLockedOutside ?? null,
    }),
    assertion(
      "EDIT_REGION_HAS_CHANGE",
      (input.preservedEvidence?.changedPixelRatioCore ?? 0) > input.editRegionChangeThreshold,
      {
        changedPixelRatioCore: input.preservedEvidence?.changedPixelRatioCore ?? null,
        threshold: input.editRegionChangeThreshold,
        semantics: "technical-change-only",
      },
    ),
  ];

  return {
    methodologyVersion: "creative-assertions-v0.1",
    status: assertions.every((item) => !item.required || item.passed) ? "PASSED" : "FAILED",
    assertions,
  };
}

export function lockedOutsideEqualsSource(
  source: PixelGrid,
  preserved: PixelGrid,
  zones: ResolvedPreservationZones,
): boolean {
  if (source.width !== preserved.width || source.height !== preserved.height) return false;
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      if (classifyPixel(x, y, zones) !== "LOCKED_OUTSIDE") continue;
      const offset = (y * source.width + x) * 4;
      for (let channel = 0; channel < 4; channel++) {
        if (source.data[offset + channel] !== preserved.data[offset + channel]) return false;
      }
    }
  }
  return true;
}

function assertion(
  type: CreativeAssertion["type"],
  passed: boolean,
  evidence: Record<string, unknown>,
): CreativeAssertion {
  return { type, required: true, passed, evidence };
}

function dimensions(grid: PixelGrid): { width: number; height: number } {
  return { width: grid.width, height: grid.height };
}
