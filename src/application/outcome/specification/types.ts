import { z } from "zod";

import type { OutcomeBlueprint, OutcomeCapability } from "@/src/domain/outcome/specification/outcome-blueprint";
import { OutcomeCapabilitySchema } from "@/src/domain/outcome/specification/outcome-blueprint";
import { SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";
import type { TaskSpec } from "@/src/domain/outcome/specification/task-spec";

export type CompilePrecisionEditTaskSpecInput = {
  blueprint: OutcomeBlueprint;
  transactionId: string;
  source: {
    assetId: string;
    versionId: string;
    sha256: string;
    mimeType: "image/png";
    byteSize: number;
  };
  customerInstruction: string;
  roi?: { x: number; y: number; width: number; height: number };
  customerParameters?: Record<string, unknown>;
  inferredValues?: Record<string, unknown>;
  approvedValues?: Record<string, unknown>;
  runtimeCapabilities: OutcomeCapability[];
  requestedCapabilities?: OutcomeCapability[];
  previousTaskSpec?: TaskSpec | null;
};

export type SpecLensRole = "IMAGE_EXECUTOR" | "PRESERVATION_ENGINE" | "VERIFIER";
export const EvidenceIssuerRoleSchema = z.enum(["IMAGE_EXECUTOR", "PRESERVATION_ENGINE", "VERIFIER", "HUMAN_EVALUATOR", "SYSTEM_GATE"]);

export type SpecLens = {
  schemaVersion: "spec-lens-v0.1";
  role: SpecLensRole;
  taskSpecId: string;
  taskSpecHash: string;
  transactionId: string;
  capabilities: OutcomeCapability[];
  context: Record<string, unknown>;
  criterionIds: string[];
};

export const CriterionEvidenceStatusSchema = z.enum(["PASS", "FAIL", "UNKNOWN", "NOT_APPLICABLE"]);
export type CriterionEvidenceStatus = z.infer<typeof CriterionEvidenceStatusSchema>;

export const CriterionEvidenceSchema = z.object({
  id: z.uuid(),
  taskSpecId: z.uuid(),
  taskSpecHash: z.string().regex(SHA256_PATTERN),
  criterionId: z.string().min(1),
  status: CriterionEvidenceStatusSchema,
  evidenceType: z.enum(["METRIC", "HASH", "HUMAN_JUDGMENT", "POLICY_CHECK", "EXECUTOR_ASSERTION"]),
  issuerRole: EvidenceIssuerRoleSchema,
  evidenceRef: z.string().min(1).nullable(),
  details: z.record(z.string(), z.unknown()),
}).strict();
export type CriterionEvidence = z.infer<typeof CriterionEvidenceSchema>;

export const TaskSpecExecutionResultSchema = z.object({
  id: z.uuid(),
  taskSpecId: z.uuid(),
  taskSpecHash: z.string().regex(SHA256_PATTERN),
  producerRole: z.enum(["IMAGE_EXECUTOR", "PRESERVATION_ENGINE", "VERIFIER"]),
  executor: z.object({ name: z.string().min(1), version: z.string().min(1), provider: z.string().min(1) }).strict(),
  capabilityProfile: z.array(OutcomeCapabilitySchema),
  resultRef: z.string().min(1).nullable(),
  evidence: z.array(CriterionEvidenceSchema),
  violations: z.array(z.string().min(1)),
  latencyMs: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative().nullable(),
}).strict();
export type TaskSpecExecutionResult = z.infer<typeof TaskSpecExecutionResultSchema>;

export type SameSpecVerificationRun = {
  id: string;
  taskSpecId: string;
  taskSpecHash: string;
  executionResultId: string;
  status: "PASSED" | "FAILED" | "BLOCKED";
  criteria: Array<{
    criterionId: string;
    critical: boolean;
    status: CriterionEvidenceStatus;
    evidenceId: string | null;
  }>;
  verifiedAt: string;
};
