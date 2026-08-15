import { z } from "zod";

import { SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";

export const CriterionEvidenceStatusSchema = z.enum(["PASS", "FAIL", "UNKNOWN"]);
export type CriterionEvidenceStatus = z.infer<typeof CriterionEvidenceStatusSchema>;

export const CriterionEvidenceTypeSchema = z.enum(["METRIC", "HASH", "POLICY_CHECK", "EXECUTOR_ASSERTION"]);
export type CriterionEvidenceType = z.infer<typeof CriterionEvidenceTypeSchema>;

export const CriterionEvidenceArtifactBindingsSchema = z.record(z.string().trim().min(1).max(120), z.string().uuid().nullable());

export const CriterionEvidenceVerifierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  version: z.string().trim().min(1).max(100),
  policyVersion: z.string().trim().min(1).max(120),
}).strict();

export const CriterionEvidenceRecordSchema = z.object({
  id: z.uuid(),
  tenantId: z.string().trim().min(1).max(120),
  transactionId: z.uuid(),
  verificationRunId: z.uuid(),
  executionRunId: z.uuid(),
  criterionId: z.string().trim().min(1).max(120),
  status: CriterionEvidenceStatusSchema,
  evidenceType: CriterionEvidenceTypeSchema,
  issuerRole: z.enum(["VERIFIER", "SYSTEM_GATE"]),
  taskSpecId: z.uuid(),
  taskSpecVersion: z.number().int().positive(),
  taskSpecHash: z.string().regex(SHA256_PATTERN),
  artifactBindings: CriterionEvidenceArtifactBindingsSchema,
  verifier: CriterionEvidenceVerifierSchema,
  evidenceRef: z.string().trim().min(1).max(500),
  details: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime({ offset: true }),
}).strict();
export type CriterionEvidenceRecord = z.infer<typeof CriterionEvidenceRecordSchema>;
export type CreateCriterionEvidenceRecord = Omit<CriterionEvidenceRecord, "id" | "createdAt">;
