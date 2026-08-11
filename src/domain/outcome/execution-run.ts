import { z } from "zod";

export const ExecutionRunStatusSchema = z.enum([
  "SUCCESS",
  "FAILURE",
]);

export const ExecutionRunSchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  status: ExecutionRunStatusSchema,
  executor: z.string().trim().min(1).max(200),
  startedAt: z.string(),
  completedAt: z.string(),
  latencyMs: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
  errorMessage: z.string().trim().max(2000).nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type ExecutionRun = z.infer<typeof ExecutionRunSchema>;

export const CreateExecutionRunSchema = z.object({
  transactionId: z.uuid(),
  status: ExecutionRunStatusSchema,
  executor: z.string().trim().min(1).max(200),
  startedAt: z.string(),
  completedAt: z.string(),
  latencyMs: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
  errorMessage: z.string().trim().max(2000).nullable().optional().default(null),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CreateExecutionRun = z.infer<typeof CreateExecutionRunSchema>;

export type ExecutionRunStatus = z.infer<typeof ExecutionRunStatusSchema>;