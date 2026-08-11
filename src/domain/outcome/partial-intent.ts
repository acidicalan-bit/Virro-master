import { z } from "zod";

export const PartialIntentOperationSchema = z.enum([
  "SET_ATTRIBUTE",
  "DELETE_ENTITY",
  "TRANSFORM_ENTITY",
  "ADJUST_ATTRIBUTE",
]);

export const PartialIntentSchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  rawInput: z.string().trim().min(1).max(8000),
  targetPath: z.string().trim().min(1).max(500),
  operation: PartialIntentOperationSchema,
  desiredValue: z.unknown().nullable().default(null),
  createdAt: z.string(),
});

export type PartialIntent = z.infer<typeof PartialIntentSchema>;

export const CreatePartialIntentSchema = z.object({
  transactionId: z.uuid(),
  rawInput: z.string().trim().min(1).max(8000),
  targetPath: z.string().trim().min(1).max(500),
  operation: PartialIntentOperationSchema,
  desiredValue: z.unknown().nullable().optional().default(null),
});

export type CreatePartialIntent = z.infer<typeof CreatePartialIntentSchema>;

export type PartialIntentOperation = z.infer<typeof PartialIntentOperationSchema>;