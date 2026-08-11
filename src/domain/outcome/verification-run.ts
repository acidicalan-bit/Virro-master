import { z } from "zod";

export const VerificationStatusSchema = z.enum([
  "PASSED",
  "FAILED",
]);

export const VerificationRunSchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  executionRunId: z.uuid(),
  status: VerificationStatusSchema,
  checks: z.record(z.string(), z.boolean()),
  details: z.record(z.string(), z.unknown()).default({}),
  verifiedAt: z.string(),
});

export type VerificationRun = z.infer<typeof VerificationRunSchema>;

export const CreateVerificationRunSchema = z.object({
  transactionId: z.uuid(),
  executionRunId: z.uuid(),
  status: VerificationStatusSchema,
  checks: z.record(z.string(), z.boolean()),
  details: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CreateVerificationRun = z.infer<typeof CreateVerificationRunSchema>;

export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;