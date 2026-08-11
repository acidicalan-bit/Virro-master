import { z } from "zod";

export const TransactionStatusSchema = z.enum([
  "DRAFT",
  "PREPARED",
  "READY",
  "EXECUTING",
  "VERIFYING",
  "REPAIRING",
  "VERIFIED",
  "COMMITTED",
  "FAILED",
  "ABORTED",
]);

export const OutcomeTransactionSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  assetId: z.uuid(),
  baseVersionId: z.uuid(),
  status: TransactionStatusSchema,
  rawRequest: z.string().trim().min(1).max(8000),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable().default(null),
  abortReason: z.string().trim().max(2000).nullable().default(null),
});

export type OutcomeTransaction = z.infer<typeof OutcomeTransactionSchema>;

export const CreateOutcomeTransactionSchema = z.object({
  projectId: z.uuid(),
  assetId: z.uuid(),
  baseVersionId: z.uuid(),
  rawRequest: z.string().trim().min(1).max(8000),
});

export type CreateOutcomeTransaction = z.infer<typeof CreateOutcomeTransactionSchema>;

export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  DRAFT: ["PREPARED", "ABORTED"],
  PREPARED: ["READY", "ABORTED"],
  READY: ["EXECUTING", "ABORTED"],
  EXECUTING: ["VERIFYING", "FAILED", "ABORTED"],
  VERIFYING: ["VERIFIED", "REPAIRING", "FAILED", "ABORTED"],
  REPAIRING: ["EXECUTING", "FAILED", "ABORTED"],
  VERIFIED: ["COMMITTED", "ABORTED"],
  COMMITTED: [],
  FAILED: ["ABORTED"],
  ABORTED: [],
};

export function isValidTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}