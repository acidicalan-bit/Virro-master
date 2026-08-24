import { z } from "zod";
import { canonicalSha256, immutableCopy, SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";
import { OutcomeCapabilitySchema, type OutcomeCapability } from "@/src/domain/outcome/specification/outcome-blueprint";

export const BUILD002_EXECUTION_AUTHORITY_SCHEMA_VERSION = "build002-execution-authority-v0.1" as const;
export const EXECUTION_AUTHORITY_SCOPE = "EXECUTION_AUTHORITY_ONLY" as const;
export const EXECUTION_AUTHORITY_CONSEQUENCE_BOUNDARY = "FRESH_MUTATION_LEASE_AND_PREEXECUTION_RECHECK_REQUIRED" as const;

const CapabilityGrantSchema = z.array(OutcomeCapabilitySchema).superRefine((values, ctx) => {
  if (new Set(values).size !== values.length) ctx.addIssue({ code: "custom", message: "Capability grant must be unique." });
  if (values.some((value, index) => index > 0 && values[index - 1] >= value)) ctx.addIssue({ code: "custom", message: "Capability grant must be sorted." });
});

export const Build002ExecutionAuthoritySchema = z.object({
  schemaVersion: z.literal(BUILD002_EXECUTION_AUTHORITY_SCHEMA_VERSION), executionAuthorityId: z.uuid(),
  ownerTenantId: z.uuid(), principalId: z.uuid(), membershipId: z.uuid(), delegabilityAdmissionId: z.uuid(),
  delegabilityAdmissionContentHash: z.string().regex(SHA256_PATTERN), authorityCommitId: z.uuid(), outcomeTransactionId: z.uuid(),
  assetId: z.uuid(), sourceAssetVersionId: z.uuid(), sourceAssetVersionHash: z.string().regex(SHA256_PATTERN),
  taskSpecId: z.uuid(), taskSpecVersion: z.number().int().positive(), taskSpecHash: z.string().regex(SHA256_PATTERN),
  blueprintId: z.uuid(), blueprintVersion: z.number().int().positive(), blueprintHash: z.string().regex(SHA256_PATTERN),
  capabilityGrant: CapabilityGrantSchema, capabilityGrantHash: z.string().regex(SHA256_PATTERN),
  historicalDependencySnapshotHash: z.string().regex(SHA256_PATTERN), currentDependencySnapshotHash: z.string().regex(SHA256_PATTERN),
  evaluatorSchemaVersion: z.string().min(1), evaluatorVersion: z.string().min(1), evaluatorDefinitionHash: z.string().regex(SHA256_PATTERN),
  scope: z.literal(EXECUTION_AUTHORITY_SCOPE), mutationLeaseGranted: z.literal(false),
  executionStarted: z.literal(false), consequenceBoundary: z.literal(EXECUTION_AUTHORITY_CONSEQUENCE_BOUNDARY),
  delegabilityRevalidatedAt: z.string().datetime(), executionAuthorityRevalidatedAt: z.string().datetime(), grantedAt: z.string().datetime(),
  validUntil: z.string().datetime().nullable(), executionAuthorityContentHash: z.string().regex(SHA256_PATTERN),
}).strict();

export type Build002ExecutionAuthority = z.infer<typeof Build002ExecutionAuthoritySchema>;
export type ExecutionAuthorityCapability = OutcomeCapability;

export function executionAuthorityHashMaterial(value: Omit<Build002ExecutionAuthority, "executionAuthorityContentHash"> | Build002ExecutionAuthority): Record<string, unknown> {
  const { executionAuthorityId: _id, grantedAt: _grantedAt, executionAuthorityContentHash: _hash, ...material } = value as Build002ExecutionAuthority;
  void _id; void _grantedAt; void _hash; return material;
}
export function normalizeExecutionCapabilities(values: readonly OutcomeCapability[]): OutcomeCapability[] { return [...new Set(values)].sort() as OutcomeCapability[]; }
export function capabilityGrantHash(values: readonly OutcomeCapability[]): string { return canonicalSha256(normalizeExecutionCapabilities(values)); }
export function attachExecutionAuthorityHash(value: Omit<Build002ExecutionAuthority, "executionAuthorityContentHash">): Build002ExecutionAuthority {
  const parsed = Build002ExecutionAuthoritySchema.omit({ executionAuthorityContentHash: true }).parse(value);
  if (capabilityGrantHash(parsed.capabilityGrant) !== parsed.capabilityGrantHash) throw new Error("Capability grant hash is invalid.");
  return immutableCopy(Build002ExecutionAuthoritySchema.parse({ ...parsed, executionAuthorityContentHash: canonicalSha256(executionAuthorityHashMaterial(parsed)) }));
}
export function verifyExecutionAuthorityHash(value: Build002ExecutionAuthority): boolean {
  try { const parsed = Build002ExecutionAuthoritySchema.parse(value); return capabilityGrantHash(parsed.capabilityGrant) === parsed.capabilityGrantHash && canonicalSha256(executionAuthorityHashMaterial(parsed)) === parsed.executionAuthorityContentHash; } catch { return false; }
}
