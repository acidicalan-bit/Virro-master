import { z } from "zod";

export const MutationLeaseCategorySchema = z.enum([
  "MUTABLE",
  "COUPLED",
  "PRESERVE",
  "HARD_LOCK",
]);

export const MutationLeaseSchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  targetPath: z.string().trim().min(1).max(500),
  category: MutationLeaseCategorySchema,
  reason: z.string().trim().max(2000).nullable().default(null),
  createdAt: z.string(),
});

export type MutationLease = z.infer<typeof MutationLeaseSchema>;

export const CreateMutationLeaseSchema = z.object({
  transactionId: z.uuid(),
  targetPath: z.string().trim().min(1).max(500),
  category: MutationLeaseCategorySchema,
  reason: z.string().trim().max(2000).nullable().optional().default(null),
});

export type CreateMutationLease = z.infer<typeof CreateMutationLeaseSchema>;

export type MutationLeaseCategory = z.infer<typeof MutationLeaseCategorySchema>;