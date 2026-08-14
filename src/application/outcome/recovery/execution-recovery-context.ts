import { createHash } from "node:crypto";
import { z } from "zod";

import { FIELD_POLICY_VERSION, FIELD_TENANT_ID } from "@/src/domain/outcome/media/field-beta";
import { StudyTaskTypeSchema, StudyTopologySchema } from "@/src/domain/outcome/media/preservation-study";
import { OutcomeBlueprintSchema, verifyOutcomeBlueprintHash, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { TaskSpecSchema, verifyTaskSpecHash, type TaskSpec } from "@/src/domain/outcome/specification/task-spec";

const RecoveryMetadataSchema = z.object({
  schemaVersion: z.literal("field-recovery-context-v0.1"),
  tenantId: z.union([z.literal(FIELD_TENANT_ID), z.uuid()]),
  transactionId: z.uuid(),
  executionRunId: z.uuid(),
  sourceVersionId: z.uuid(),
  instruction: z.string().trim().min(1).max(8_000),
  roi: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).strict(),
  topology: StudyTopologySchema,
  taskType: StudyTaskTypeSchema,
  policyVersion: z.literal(FIELD_POLICY_VERSION),
  blueprint: z.unknown(),
  taskSpec: z.unknown(),
  rawCandidateId: z.uuid(),
  recoveryEligibility: z.literal("REDRIVABLE"),
  contextHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export type ExecutionRecoveryContext = Omit<z.infer<typeof RecoveryMetadataSchema>, "blueprint" | "taskSpec"> & {
  blueprint: OutcomeBlueprint;
  taskSpec: TaskSpec;
};

export type RecoveryLoadResult =
  | { status: "REDRIVABLE"; context: ExecutionRecoveryContext }
  | { status: "NOT_REDRIVABLE_LEGACY"; reason: string }
  | { status: "INCOMPLETE_OR_CORRUPT"; reason: string }
  | { status: "NOT_FOUND"; reason: string };

export function createRecoveryMetadata(input: Omit<ExecutionRecoveryContext, "contextHash">): Record<string, unknown> {
  const withoutHash = { ...input };
  return { ...withoutHash, contextHash: hashContext(withoutHash) };
}

export function parseRecoveryMetadata(metadata: Record<string, unknown>): RecoveryLoadResult {
  const raw = metadata.fieldRecoveryContext;
  if (!raw) return { status: "NOT_REDRIVABLE_LEGACY", reason: "Execution predates the durable recovery context." };
  const parsed = RecoveryMetadataSchema.safeParse(raw);
  if (!parsed.success) return { status: "INCOMPLETE_OR_CORRUPT", reason: "Recovery context schema is incomplete or corrupt." };
  const context = parsed.data;
  const blueprint = OutcomeBlueprintSchema.safeParse(context.blueprint);
  const taskSpec = TaskSpecSchema.safeParse(context.taskSpec);
  if (!blueprint.success || !taskSpec.success || !verifyOutcomeBlueprintHash(blueprint.data) || !verifyTaskSpecHash(taskSpec.data)) return { status: "INCOMPLETE_OR_CORRUPT", reason: "Recovery Blueprint or Task Spec failed schema/hash validation." };
  const { contextHash, ...withoutHash } = context;
  if (hashContext(withoutHash) !== contextHash) return { status: "INCOMPLETE_OR_CORRUPT", reason: "Recovery context hash mismatch." };
  if (taskSpec.data.transactionId !== context.transactionId || taskSpec.data.source.versionId !== context.sourceVersionId || taskSpec.data.blueprint.hash !== blueprint.data.hash) return { status: "INCOMPLETE_OR_CORRUPT", reason: "Recovery context lineage mismatch." };
  return { status: "REDRIVABLE", context: { ...context, blueprint: blueprint.data, taskSpec: taskSpec.data } };
}

function hashContext(value: unknown): string { return createHash("sha256").update(canonicalJson(value)).digest("hex"); }
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
