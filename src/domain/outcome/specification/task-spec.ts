import { z } from "zod";

import { OutcomeCapabilitySchema, VerificationCriterionSchema } from "@/src/domain/outcome/specification/outcome-blueprint";
import { canonicalSha256, immutableCopy, SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";

export const TASK_SPEC_SCHEMA_VERSION = "task-spec-v0.1" as const;

export const ProvenanceStateSchema = z.enum([
  "OBSERVED",
  "CUSTOMER_STATED",
  "INFERRED",
  "APPROVED",
  "UNKNOWN",
]);

export const ProvenancedValueSchema = z.object({
  id: z.string().trim().min(1).max(120),
  provenance: ProvenanceStateSchema,
  critical: z.boolean(),
  visibility: z.array(z.enum(["IMAGE_EXECUTOR", "PRESERVATION_ENGINE", "VERIFIER", "PRIVATE"])).min(1),
  value: z.unknown().optional(),
}).strict().superRefine((value, context) => {
  if (value.provenance === "UNKNOWN" && value.value !== undefined) {
    context.addIssue({ code: "custom", path: ["value"], message: "UNKNOWN cannot silently carry a factual value." });
  }
});

export const TaskConstraintSchema = z.object({
  id: z.string().trim().min(1).max(120),
  effect: z.enum(["MUST", "MUST_NOT"]),
  target: z.string().trim().min(1).max(240),
  value: z.unknown(),
  source: z.enum(["BLUEPRINT_FIXED", "BLUEPRINT_POLICY", "CUSTOMER"]),
}).strict();

export const TaskSpecSchema = z.object({
  schemaVersion: z.literal(TASK_SPEC_SCHEMA_VERSION),
  id: z.uuid(),
  version: z.number().int().positive(),
  previousVersionHash: z.string().regex(SHA256_PATTERN).nullable(),
  hash: z.string().regex(SHA256_PATTERN),
  status: z.enum(["READY", "INPUT_REQUIRED", "REJECTED"]),
  transactionId: z.uuid(),
  blueprint: z.object({ id: z.uuid(), version: z.number().int().positive(), hash: z.string().regex(SHA256_PATTERN) }).strict(),
  source: z.object({
    assetId: z.uuid(),
    versionId: z.uuid(),
    sha256: z.string().regex(SHA256_PATTERN),
    mimeType: z.literal("image/png"),
    byteSize: z.number().int().positive(),
  }).strict(),
  values: z.array(ProvenancedValueSchema).min(1),
  constraints: z.array(TaskConstraintSchema),
  capabilityGrant: z.array(OutcomeCapabilitySchema),
  criteria: z.array(VerificationCriterionSchema).min(1),
  verificationPolicy: z.object({
    requireSameSpecHash: z.literal(true),
    criticalUnknownBlocksCommit: z.literal(true),
    executorDoneIsEvidence: z.literal(false),
  }).strict(),
  securityProfile: z.object({
    promptInjectionPolicy: z.literal("TREAT_AS_DATA"),
    embeddedSecretPolicy: z.literal("FORBID"),
    unknownInputPolicy: z.enum(["REQUIRE_INPUT", "REJECT"]),
  }).strict(),
  compiler: z.object({ name: z.string().min(1), version: z.string().min(1) }).strict(),
  inputRequirements: z.array(z.string().min(1)),
  rejectionReasons: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
}).strict().superRefine((value, context) => {
  if (value.status === "READY") {
    for (const [index, item] of value.values.entries()) {
      if (item.critical && item.provenance === "UNKNOWN") {
        context.addIssue({ code: "custom", path: ["values", index], message: "Critical UNKNOWN blocks READY." });
      }
    }
  }
});

export type ProvenanceState = z.infer<typeof ProvenanceStateSchema>;
export type ProvenancedValue = z.infer<typeof ProvenancedValueSchema>;
export type TaskConstraint = z.infer<typeof TaskConstraintSchema>;
export type TaskSpec = z.infer<typeof TaskSpecSchema>;

export function taskSpecHashMaterial(spec: Omit<TaskSpec, "hash"> | TaskSpec): Record<string, unknown> {
  const { id: _id, hash: _hash, createdAt: _createdAt, ...material } = spec as TaskSpec;
  void _id;
  void _hash;
  void _createdAt;
  return material;
}

export function attachTaskSpecHash(spec: Omit<TaskSpec, "hash">): TaskSpec {
  const hash = canonicalSha256(taskSpecHashMaterial(spec));
  return immutableCopy(TaskSpecSchema.parse({ ...spec, hash }));
}

export function verifyTaskSpecHash(spec: TaskSpec): boolean {
  return canonicalSha256(taskSpecHashMaterial(TaskSpecSchema.parse(spec))) === spec.hash;
}

export class InMemoryTaskSpecRegistry {
  private readonly versions = new Map<string, TaskSpec>();

  save(input: TaskSpec): TaskSpec {
    const spec = TaskSpecSchema.parse(input);
    if (!verifyTaskSpecHash(spec)) throw new Error("Task Spec hash is invalid.");
    const key = `${spec.id}:${spec.version}`;
    if (this.versions.has(key)) throw new Error("Historical Task Spec versions are immutable.");
    this.versions.set(key, immutableCopy(spec));
    return immutableCopy(spec);
  }

  get(id: string, version: number): TaskSpec | null {
    const value = this.versions.get(`${id}:${version}`);
    return value ? immutableCopy(value) : null;
  }
}
