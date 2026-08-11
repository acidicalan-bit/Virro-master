import { z } from "zod";

export const ROISchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export type ROI = z.infer<typeof ROISchema>;

export const MediaAssetVersionSchema = z.object({
  id: z.uuid(),
  assetId: z.uuid(),
  versionNumber: z.number().int().positive(),
  state: z.record(z.string(), z.unknown()),
  parentVersionId: z.uuid().nullable().default(null),
  createdAt: z.string(),
  media: z.object({
    storageKey: z.string().min(1),
    mimeType: z.string().min(1).max(100),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    byteSize: z.number().int().nonnegative(),
    sha256: z.string().length(64),
  }),
});

export type MediaAssetVersion = z.infer<typeof MediaAssetVersionSchema>;

export const CreateMediaAssetVersionSchema = z.object({
  assetId: z.uuid(),
  versionNumber: z.number().int().positive(),
  state: z.record(z.string(), z.unknown()),
  parentVersionId: z.uuid().nullable().default(null),
  media: z.object({
    storageKey: z.string().min(1),
    mimeType: z.string().min(1).max(100),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    byteSize: z.number().int().nonnegative(),
    sha256: z.string().length(64),
  }),
});

export type CreateMediaAssetVersion = z.infer<typeof CreateMediaAssetVersionSchema>;

export const SemanticSnapshotSchema = z.object({
  transactionSchemaVersion: z.string(),
  patchSchemaVersion: z.string(),
  executorAdapterVersion: z.string(),
  provider: z.string(),
  imageModelIdentifier: z.string(),
  verificationMethodologyVersion: z.string(),
});

export type SemanticSnapshot = z.infer<typeof SemanticSnapshotSchema>;

export const ImageEvidenceSchema = z.object({
  sourceHash: z.string().length(64),
  candidateHash: z.string().length(64),
  sourceWidth: z.number().int().positive(),
  sourceHeight: z.number().int().positive(),
  candidateWidth: z.number().int().positive(),
  candidateHeight: z.number().int().positive(),
  normalizedTotalDiff: z.number().min(0).max(1),
  normalizedRoiDiff: z.number().min(0).max(1),
  normalizedOutsideRoiDiff: z.number().min(0).max(1),
  changedPixelRatioTotal: z.number().min(0).max(1),
  changedPixelRatioInside: z.number().min(0).max(1),
  changedPixelRatioOutside: z.number().min(0).max(1),
  methodology: z.string(),
});

export type ImageEvidence = z.infer<typeof ImageEvidenceSchema>;

export function validateROI(roi: ROI): ROI {
  return ROISchema.parse(roi);
}

export function isROIValid(roi: unknown): roi is ROI {
  return ROISchema.safeParse(roi).success;
}
