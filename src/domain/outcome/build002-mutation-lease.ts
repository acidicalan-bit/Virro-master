import { z } from "zod";
import { canonicalSha256, immutableCopy, SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";

export const BUILD002_MUTATION_LEASE_SCHEMA_VERSION = "build002-mutation-lease-v0.1" as const;
export const BUILD002_MUTATION_LEASE_SCOPE = "MUTATION_LEASE_ONLY" as const;
export const BUILD002_MUTATION_LEASE_CONSEQUENCE_BOUNDARY = "FRESH_PREEXECUTION_RECHECK_AND_EXECUTION_START_REQUIRED" as const;
export const BUILD002_MUTATION_LEASE_CATEGORY = "MUTABLE" as const;
export const BUILD002_MUTATION_LEASE_TTL_SECONDS = 300 as const;

const ExactPath = z.string().trim().min(1).max(500).refine((value) => {
  if (value === "." || value === ".." || value.includes("*") || value.includes("[") || value.includes("]")) return false;
  return !value.split(".").some((segment) => segment === "" || segment === "." || segment === "..");
}, "Mutation lease paths must be exact, non-wildcard paths.");

export const Build002MutationLeaseSchema = z.object({
  schemaVersion: z.literal(BUILD002_MUTATION_LEASE_SCHEMA_VERSION),
  mutationLeaseId: z.uuid(),
  ownerTenantId: z.uuid(),
  principalId: z.uuid(),
  membershipId: z.uuid(),
  executionAuthorityId: z.uuid(),
  executionAuthorityContentHash: z.string().regex(SHA256_PATTERN),
  delegabilityAdmissionId: z.uuid(),
  authorityCommitId: z.uuid(),
  outcomeTransactionId: z.uuid(),
  assetId: z.uuid(),
  sourceAssetVersionId: z.uuid(),
  sourceAssetVersionHash: z.string().regex(SHA256_PATTERN),
  taskSpecId: z.uuid(),
  taskSpecVersion: z.number().int().positive(),
  taskSpecHash: z.string().regex(SHA256_PATTERN),
  blueprintId: z.uuid(),
  blueprintVersion: z.number().int().positive(),
  blueprintHash: z.string().regex(SHA256_PATTERN),
  currentDependencySnapshotHash: z.string().regex(SHA256_PATTERN),
  capabilityGrantHash: z.string().regex(SHA256_PATTERN),
  targetPath: ExactPath,
  category: z.literal(BUILD002_MUTATION_LEASE_CATEGORY),
  scope: z.literal(BUILD002_MUTATION_LEASE_SCOPE),
  executionStarted: z.literal(false),
  executionAuthorityRevalidatedAt: z.string().datetime(),
  mutationLeaseRevalidatedAt: z.string().datetime(),
  grantedAt: z.string().datetime(),
  validUntil: z.string().datetime(),
  consequenceBoundary: z.literal(BUILD002_MUTATION_LEASE_CONSEQUENCE_BOUNDARY),
  mutationLeaseContentHash: z.string().regex(SHA256_PATTERN),
}).strict();

export type Build002MutationLease = z.infer<typeof Build002MutationLeaseSchema>;

export function mutationLeaseHashMaterial(value: Omit<Build002MutationLease, "mutationLeaseContentHash"> | Build002MutationLease): Record<string, unknown> {
  const { mutationLeaseId: _id, grantedAt: _grantedAt, mutationLeaseContentHash: _hash, ...material } = value as Build002MutationLease;
  void _id; void _grantedAt; void _hash;
  return material;
}

export function attachBuild002MutationLeaseHash(value: Omit<Build002MutationLease, "mutationLeaseContentHash">): Build002MutationLease {
  const parsed = Build002MutationLeaseSchema.omit({ mutationLeaseContentHash: true }).parse(value);
  return immutableCopy(Build002MutationLeaseSchema.parse({ ...parsed, mutationLeaseContentHash: canonicalSha256(mutationLeaseHashMaterial(parsed)) }));
}

export function verifyBuild002MutationLeaseHash(value: Build002MutationLease): boolean {
  try {
    const parsed = Build002MutationLeaseSchema.parse(value);
    return canonicalSha256(mutationLeaseHashMaterial(parsed)) === parsed.mutationLeaseContentHash;
  } catch {
    return false;
  }
}
