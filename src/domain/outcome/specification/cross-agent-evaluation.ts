import { z } from "zod";

import { OutcomeCapabilitySchema } from "@/src/domain/outcome/specification/outcome-blueprint";
import { SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";

export const CrossAgentEvaluationRecordSchema = z.object({
  id: z.uuid(),
  taskSpecId: z.uuid(),
  taskSpecHash: z.string().regex(SHA256_PATTERN),
  executor: z.object({ name: z.string().min(1), version: z.string().min(1), provider: z.string().min(1) }).strict(),
  capabilityProfile: z.array(OutcomeCapabilitySchema),
  resultRef: z.string().min(1).nullable(),
  evidenceRefs: z.array(z.string().min(1)),
  violations: z.array(z.string().min(1)),
  accepted: z.boolean().nullable(),
  latencyMs: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative().nullable(),
  createdAt: z.string().datetime(),
}).strict();

export type CrossAgentEvaluationRecord = z.infer<typeof CrossAgentEvaluationRecordSchema>;

export const CROSS_AGENT_SECURITY_FIXTURES = [
  "MISSING_CRITICAL_INPUT",
  "FIXED_RULE_CONFLICT",
  "PROMPT_INJECTION_IN_CUSTOMER_DATA",
  "FAKE_DONE_WITHOUT_EVIDENCE",
  "STALE_SPEC",
  "FORBIDDEN_CAPABILITY_REQUEST",
] as const;
