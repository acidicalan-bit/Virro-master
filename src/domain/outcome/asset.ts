import { z } from "zod";

export const AssetSchema = z.object({
  id: z.uuid(),
  ownerTenantId: z.uuid().nullable().optional(),
  projectId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional().default(null),
  currentVersionId: z.uuid().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Asset = z.infer<typeof AssetSchema>;

export const CreateAssetSchema = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional().default(null),
});

export type CreateAsset = z.infer<typeof CreateAssetSchema>;
