import { z } from "zod";

import { PreservationEvidenceMetricsSchema } from "@/src/domain/outcome/media/preservation";

export const PRESERVATION_STUDY_VERSION = "preservation-value-study-v0.1" as const;

export const StudyTopologySchema = z.enum([
  "LOCAL_INDEPENDENT",
  "LOCAL_COUPLED",
  "STRUCTURAL",
  "GLOBAL",
]);

export const StudyTaskTypeSchema = z.enum([
  "COLOR_CHANGE",
  "OBJECT_REMOVAL",
  "TEXT_EDIT",
  "IDENTITY_EDIT",
  "PRODUCT_EDIT",
  "GEOMETRY_EDIT",
  "OTHER",
]);

export const StudyCandidateLabelSchema = z.enum(["A", "B"]);
export const StudyCandidateIdentitySchema = z.enum(["RAW", "PRESERVED"]);

export const StudyRatingsSchema = z.object({
  requestedEditSuccess: z.number().int().min(0).max(2),
  preservationSuccess: z.number().int().min(0).max(2),
  naturalness: z.number().int().min(0).max(2),
  artifactFreedom: z.number().int().min(0).max(2),
  overallUsefulness: z.number().int().min(0).max(2),
}).strict();

export const StudyPairwisePreferenceSchema = z.enum([
  "A_BETTER",
  "B_BETTER",
  "TIE",
  "BOTH_BAD",
]);

export const StudyDerivedPreferenceSchema = z.enum([
  "RAW_BETTER",
  "PRESERVED_BETTER",
  "TIE",
  "BOTH_BAD",
]);

export const StudyFailureTagSchema = z.enum([
  "boundary_artifact",
  "shadow_cutoff",
  "geometry_cutoff",
  "texture_discontinuity",
  "identity_drift",
  "background_drift",
  "text_drift",
  "requested_edit_failed",
  "over_preservation",
  "under_preservation",
  "other",
]);

export const PixelHumanDivergenceTagSchema = z.enum([
  "LARGE_PIXEL_GAIN_NO_HUMAN_PREFERENCE",
  "LARGE_PIXEL_GAIN_PRESERVED_PREFERENCE",
  "LARGE_PIXEL_GAIN_RAW_PREFERENCE",
  "SMALL_PIXEL_DIFFERENCE_HUMAN_PRESERVATION_FAILURE",
]);

export const StudyIntentInputSchema = z.object({
  expectedChange: z.string().trim().min(1).max(8_000),
  expectedPreservation: z.string().trim().min(1).max(8_000),
  unacceptableNotes: z.string().trim().max(8_000).nullable().optional().default(null),
}).strict();

export const StudyCaseSnapshotSchema = z.object({
  transactionId: z.uuid(),
  executionRunId: z.uuid(),
  preservationRunId: z.uuid(),
  sourceVersionId: z.uuid(),
  rawCandidateId: z.uuid(),
  preservedCandidateId: z.uuid(),
  sourceStorageKey: z.string().min(1),
  sourceSha256: z.string().length(64),
  sourceWidth: z.number().int().positive(),
  sourceHeight: z.number().int().positive(),
  rawStorageKey: z.string().min(1),
  rawSha256: z.string().length(64),
  rawWidth: z.number().int().positive(),
  rawHeight: z.number().int().positive(),
  preservedStorageKey: z.string().min(1),
  preservedSha256: z.string().length(64),
  preservedWidth: z.number().int().positive(),
  preservedHeight: z.number().int().positive(),
  instruction: z.string().min(1).max(8_000),
  roi: z.record(z.string(), z.number()),
  coupledBand: z.object({
    unit: z.literal("NORMALIZED_MIN_DIMENSION"),
    size: z.number().min(0).max(0.25),
  }),
  provider: z.string().min(1),
  model: z.string().min(1),
  rawMetrics: PreservationEvidenceMetricsSchema,
  preservedMetrics: PreservationEvidenceMetricsSchema,
});

export type StudyTopology = z.infer<typeof StudyTopologySchema>;
export type StudyTaskType = z.infer<typeof StudyTaskTypeSchema>;
export type StudyCandidateLabel = z.infer<typeof StudyCandidateLabelSchema>;
export type StudyCandidateIdentity = z.infer<typeof StudyCandidateIdentitySchema>;
export type StudyRatings = z.infer<typeof StudyRatingsSchema>;
export type StudyPairwisePreference = z.infer<typeof StudyPairwisePreferenceSchema>;
export type StudyDerivedPreference = z.infer<typeof StudyDerivedPreferenceSchema>;
export type StudyFailureTag = z.infer<typeof StudyFailureTagSchema>;
export type PixelHumanDivergenceTag = z.infer<typeof PixelHumanDivergenceTagSchema>;
export type StudyIntentInput = z.infer<typeof StudyIntentInputSchema>;
export type StudyCaseSnapshot = z.infer<typeof StudyCaseSnapshotSchema>;

export function deriveStudyPreference(
  preference: StudyPairwisePreference,
  candidateA: StudyCandidateIdentity,
): StudyDerivedPreference {
  if (preference === "TIE" || preference === "BOTH_BAD") return preference;
  const selected = preference === "A_BETTER"
    ? candidateA
    : candidateA === "RAW" ? "PRESERVED" : "RAW";
  return selected === "RAW" ? "RAW_BETTER" : "PRESERVED_BETTER";
}

export function deriveDivergenceTags(input: {
  rawMetrics: z.infer<typeof PreservationEvidenceMetricsSchema>;
  preservedMetrics: z.infer<typeof PreservationEvidenceMetricsSchema>;
  rawPreservationScore: number;
  preservedPreservationScore: number;
  preference: StudyDerivedPreference;
}): PixelHumanDivergenceTag[] {
  const pixelGain = input.rawMetrics.changedPixelRatioLockedOutside
    - input.preservedMetrics.changedPixelRatioLockedOutside;
  if (pixelGain >= 0.25) {
    if (input.preference === "TIE") return ["LARGE_PIXEL_GAIN_NO_HUMAN_PREFERENCE"];
    if (input.preference === "PRESERVED_BETTER") return ["LARGE_PIXEL_GAIN_PRESERVED_PREFERENCE"];
    if (input.preference === "RAW_BETTER") return ["LARGE_PIXEL_GAIN_RAW_PREFERENCE"];
  }
  if (Math.abs(pixelGain) <= 0.05 && Math.min(input.rawPreservationScore, input.preservedPreservationScore) === 0) {
    return ["SMALL_PIXEL_DIFFERENCE_HUMAN_PRESERVATION_FAILURE"];
  }
  return [];
}
