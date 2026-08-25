import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Build002MutationLeaseGrantRequest, Build002MutationLeaseRepository } from "@/src/application/ports/outcome/build002-mutation-lease-repository";
import { Build002MutationLeaseSchema, verifyBuild002MutationLeaseHash, type Build002MutationLease } from "@/src/domain/outcome/build002-mutation-lease";

type Row = Record<string, unknown>;

export class SupabaseBuild002MutationLeaseRepository implements Build002MutationLeaseRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId: string) {
    if (!ownerTenantId.trim()) throw new Error("MUTATION_LEASE_SCOPE_INVALID");
  }

  async grant(request: Build002MutationLeaseGrantRequest): Promise<Build002MutationLease> {
    const { data, error } = await this.client.rpc("build002_grant_mutation_lease", {
      p_principal_id: request.principalId,
      p_membership_id: request.membershipId,
      p_execution_authority_id: request.executionAuthorityId,
      p_target_path: request.targetPath,
      p_category: request.category,
    });
    if (error || !data || typeof data !== "object") throw new Error(error?.message || "MUTATION_LEASE_GRANT_FAILED");
    const id = String((data as Row).mutation_lease_id ?? "");
    const result = await this.findById(id);
    if (!result || result.ownerTenantId !== this.ownerTenantId) throw new Error("MUTATION_LEASE_READBACK_FAILED");
    return result;
  }

  async findById(id: string): Promise<Build002MutationLease | null> {
    const { data, error } = await this.client.from("build002_mutation_leases").select("*").eq("mutation_lease_id", id).eq("owner_tenant_id", this.ownerTenantId).maybeSingle();
    if (error) throw new Error("MUTATION_LEASE_READBACK_FAILED");
    if (!data) return null;
    try {
      const lease = rowToMutationLease(data as Row);
      if (lease.ownerTenantId !== this.ownerTenantId || !verifyBuild002MutationLeaseHash(lease)) throw new Error("hash");
      if (Date.parse(lease.validUntil) <= Date.now()) throw new Error("expired");
      return lease;
    } catch {
      if (data.valid_until && Date.parse(String(data.valid_until)) <= Date.now()) throw new Error("MUTATION_LEASE_EXPIRED");
      throw new Error("MUTATION_LEASE_READBACK_FAILED");
    }
  }
}

function rowToMutationLease(row: Row): Build002MutationLease {
  return Build002MutationLeaseSchema.parse({
    schemaVersion: row.schema_version,
    mutationLeaseId: row.mutation_lease_id,
    ownerTenantId: row.owner_tenant_id,
    principalId: row.principal_id,
    membershipId: row.membership_id,
    executionAuthorityId: row.execution_authority_id,
    executionAuthorityContentHash: row.execution_authority_content_hash,
    delegabilityAdmissionId: row.delegability_admission_id,
    authorityCommitId: row.authority_commit_id,
    outcomeTransactionId: row.outcome_transaction_id,
    assetId: row.asset_id,
    sourceAssetVersionId: row.source_asset_version_id,
    sourceAssetVersionHash: row.source_asset_version_hash,
    taskSpecId: row.task_spec_id,
    taskSpecVersion: row.task_spec_version,
    taskSpecHash: row.task_spec_hash,
    blueprintId: row.blueprint_id,
    blueprintVersion: row.blueprint_version,
    blueprintHash: row.blueprint_hash,
    currentDependencySnapshotHash: row.current_dependency_snapshot_hash,
    capabilityGrantHash: row.capability_grant_hash,
    targetPath: row.target_path,
    category: row.category,
    scope: row.scope,
    executionStarted: row.execution_started,
    executionAuthorityRevalidatedAt: isoTimestamp(row.execution_authority_revalidated_at),
    mutationLeaseRevalidatedAt: isoTimestamp(row.mutation_lease_revalidated_at),
    grantedAt: isoTimestamp(row.granted_at),
    validUntil: isoTimestamp(row.valid_until),
    consequenceBoundary: row.consequence_boundary,
    mutationLeaseContentHash: row.mutation_lease_content_hash,
  });
}

function isoTimestamp(value: unknown): string { return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString(); }

export function createSupabaseBuild002MutationLeaseRepository(client: SupabaseClient, ownerTenantId: string): Build002MutationLeaseRepository {
  return new SupabaseBuild002MutationLeaseRepository(client, ownerTenantId);
}
