import { z } from "zod";

export const PRESERVATION_POLICY_VERSION = "preservation-policy-v0.1";
export const PRESERVATION_METHODOLOGY_VERSION = "preservation-composite-v0.1";
export const PRESERVATION_EVIDENCE_VERSION = "pixel-diff-zones-v0.1";

export const StrictNormalizedROISchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .superRefine((roi, context) => {
    if (roi.x + roi.width > 1) {
      context.addIssue({ code: "custom", path: ["width"], message: "ROI exceeds image width." });
    }
    if (roi.y + roi.height > 1) {
      context.addIssue({ code: "custom", path: ["height"], message: "ROI exceeds image height." });
    }
  });

export const PreservationPolicySchema = z.object({
  policyVersion: z.literal(PRESERVATION_POLICY_VERSION),
  coreRoi: StrictNormalizedROISchema,
  coupledBand: z.object({
    unit: z.literal("NORMALIZED_MIN_DIMENSION"),
    size: z.number().min(0).max(0.25),
  }),
  outsideMode: z.literal("HARD_PRESERVE"),
  blendMode: z.literal("FEATHERED"),
  editRegionChangeThreshold: z.number().min(0).max(1).default(0.001),
});

export type PreservationPolicy = z.infer<typeof PreservationPolicySchema>;

export const CandidateTypeSchema = z.enum(["RAW_PROVIDER", "PRESERVED"]);
export type CandidateType = z.infer<typeof CandidateTypeSchema>;

export const PreservationRunStatusSchema = z.enum(["RUNNING", "SUCCESS", "FAILURE"]);
export type PreservationRunStatus = z.infer<typeof PreservationRunStatusSchema>;

export const PreservationFailureCodeSchema = z.enum([
  "INVALID_POLICY",
  "INVALID_PIXEL_DATA",
  "DIMENSION_MISMATCH",
  "COMPOSITING_FAILURE",
  "STORAGE_FAILURE",
]);
export type PreservationFailureCode = z.infer<typeof PreservationFailureCodeSchema>;

export const PixelBoundsSchema = z.object({
  x0: z.number().int().nonnegative(),
  y0: z.number().int().nonnegative(),
  x1: z.number().int().nonnegative(),
  y1: z.number().int().nonnegative(),
});
export type PixelBounds = z.infer<typeof PixelBoundsSchema>;

export const ResolvedPreservationZonesSchema = z.object({
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  core: PixelBoundsSchema,
  expanded: PixelBoundsSchema,
  coupledBandPixels: z.number().int().nonnegative(),
  counts: z.object({
    core: z.number().int().nonnegative(),
    coupled: z.number().int().nonnegative(),
    lockedOutside: z.number().int().nonnegative(),
  }),
});
export type ResolvedPreservationZones = z.infer<typeof ResolvedPreservationZonesSchema>;

export const PreservationEvidenceMetricsSchema = z.object({
  methodologyVersion: z.literal(PRESERVATION_EVIDENCE_VERSION),
  meanTotalPixelDiff: z.number().min(0).max(1),
  changedPixelRatioTotal: z.number().min(0).max(1),
  meanCorePixelDiff: z.number().min(0).max(1),
  changedPixelRatioCore: z.number().min(0).max(1),
  meanCoupledPixelDiff: z.number().min(0).max(1),
  changedPixelRatioCoupled: z.number().min(0).max(1),
  meanLockedOutsidePixelDiff: z.number().min(0).max(1),
  changedPixelRatioLockedOutside: z.number().min(0).max(1),
});
export type PreservationEvidenceMetrics = z.infer<typeof PreservationEvidenceMetricsSchema>;

export const CreativeAssertionTypeSchema = z.enum([
  "SOURCE_IMMUTABLE",
  "DIMENSIONS_MATCH",
  "RAW_CANDIDATE_EXISTS",
  "PRESERVED_CANDIDATE_EXISTS",
  "PROVENANCE_VALID",
  "LOCKED_OUTSIDE_EXACTLY_PRESERVED",
  "EDIT_REGION_HAS_CHANGE",
]);
export type CreativeAssertionType = z.infer<typeof CreativeAssertionTypeSchema>;

export const CreativeAssertionSchema = z.object({
  type: CreativeAssertionTypeSchema,
  required: z.boolean(),
  passed: z.boolean(),
  evidence: z.record(z.string(), z.unknown()),
});
export type CreativeAssertion = z.infer<typeof CreativeAssertionSchema>;

export const MachineVerificationResultSchema = z.object({
  methodologyVersion: z.literal("creative-assertions-v0.1"),
  status: z.enum(["PASSED", "FAILED"]),
  assertions: z.array(CreativeAssertionSchema).length(7),
});
export type MachineVerificationResult = z.infer<typeof MachineVerificationResultSchema>;

export const CandidatePreferenceSchema = z.enum(["RAW", "PRESERVED", "TIE", "BOTH_BAD"]);
export type CandidatePreference = z.infer<typeof CandidatePreferenceSchema>;

export const HumanEvaluationTagSchema = z.enum(["PIXEL_HUMAN_PERCEPTION_DIVERGENCE"]);
export type HumanEvaluationTag = z.infer<typeof HumanEvaluationTagSchema>;

export function createDefaultPreservationPolicy(
  coreRoi: PreservationPolicy["coreRoi"],
  coupledBandSize = 0.04,
): PreservationPolicy {
  return PreservationPolicySchema.parse({
    policyVersion: PRESERVATION_POLICY_VERSION,
    coreRoi,
    coupledBand: { unit: "NORMALIZED_MIN_DIMENSION", size: coupledBandSize },
    outsideMode: "HARD_PRESERVE",
    blendMode: "FEATHERED",
    editRegionChangeThreshold: 0.001,
  });
}
