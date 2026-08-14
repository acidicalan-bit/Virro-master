import { z } from "zod";

export const AssetVersionSchema = z.object({
  id: z.uuid(),
  ownerTenantId: z.uuid().nullable().optional(),
  assetId: z.uuid(),
  versionNumber: z.number().int().positive(),
  state: z.record(z.string(), z.unknown()),
  parentVersionId: z.uuid().nullable().default(null),
  createdAt: z.string(),
});

export type AssetVersion = z.infer<typeof AssetVersionSchema>;

export const CreateAssetVersionSchema = z.object({
  assetId: z.uuid(),
  versionNumber: z.number().int().positive(),
  state: z.record(z.string(), z.unknown()),
  parentVersionId: z.uuid().nullable().default(null),
});

export type CreateAssetVersion = z.infer<typeof CreateAssetVersionSchema>;
