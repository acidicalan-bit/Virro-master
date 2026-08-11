import { z } from "zod";

export const SemanticPatchOperationSchema = z.enum([
  "SET_ATTRIBUTE",
  "DELETE_ENTITY",
  "TRANSFORM_ENTITY",
  "ADJUST_ATTRIBUTE",
]);

export const SemanticPatchSchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  partialIntentId: z.uuid(),
  operation: SemanticPatchOperationSchema,
  targetPath: z.string().trim().min(1).max(500),
  parameters: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export type SemanticPatch = z.infer<typeof SemanticPatchSchema>;

export const CreateSemanticPatchSchema = z.object({
  transactionId: z.uuid(),
  partialIntentId: z.uuid(),
  operation: SemanticPatchOperationSchema,
  targetPath: z.string().trim().min(1).max(500),
  parameters: z.record(z.string(), z.unknown()),
});

export type CreateSemanticPatch = z.infer<typeof CreateSemanticPatchSchema>;

export type SemanticPatchOperation = z.infer<typeof SemanticPatchOperationSchema>;