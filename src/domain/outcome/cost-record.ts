import { z } from "zod";

export const CostRecordSchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  executionRunId: z.uuid().nullable().default(null),
  amountUsd: z.number().nonnegative(),
  description: z.string().trim().min(1).max(500),
  recordedAt: z.string(),
});

export type CostRecord = z.infer<typeof CostRecordSchema>;

export const CreateCostRecordSchema = z.object({
  transactionId: z.uuid(),
  executionRunId: z.uuid().nullable().optional().default(null),
  amountUsd: z.number().nonnegative(),
  description: z.string().trim().min(1).max(500),
});

export type CreateCostRecord = z.infer<typeof CreateCostRecordSchema>;