import { z } from "zod";

export const EvidenceReceiptSchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  executionRunId: z.uuid(),
  baseVersionId: z.uuid(),
  operation: z.string().trim().min(1).max(100),
  target: z.string().trim().min(1).max(500),
  requestedEffect: z.unknown(),
  observedEffect: z.unknown(),
  executor: z.string().trim().min(1).max(200),
  startedAt: z.string(),
  completedAt: z.string(),
  costUsd: z.number().nonnegative().nullable(),
  success: z.boolean(),
});

export type EvidenceReceipt = z.infer<typeof EvidenceReceiptSchema>;

export const CreateEvidenceReceiptSchema = z.object({
  transactionId: z.uuid(),
  executionRunId: z.uuid(),
  baseVersionId: z.uuid(),
  operation: z.string().trim().min(1).max(100),
  target: z.string().trim().min(1).max(500),
  requestedEffect: z.unknown(),
  observedEffect: z.unknown(),
  executor: z.string().trim().min(1).max(200),
  startedAt: z.string(),
  completedAt: z.string(),
  costUsd: z.number().nonnegative().nullable(),
  success: z.boolean(),
});

export type CreateEvidenceReceipt = z.infer<typeof CreateEvidenceReceiptSchema>;
