import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExecutionAuthorityGrantRequest, ExecutionAuthorityRepository } from "@/src/application/ports/outcome/execution-authority-repository";
import { Build002ExecutionAuthoritySchema, verifyExecutionAuthorityHash, type Build002ExecutionAuthority } from "@/src/domain/outcome/build002-execution-authority";

type Row = Record<string, unknown>;

export class SupabaseExecutionAuthorityRepository implements ExecutionAuthorityRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId: string) {
    if (!ownerTenantId.trim()) throw new Error("EXECUTION_AUTHORITY_SCOPE_INVALID");
  }

  async grant(request: ExecutionAuthorityGrantRequest): Promise<Build002ExecutionAuthority> {
    const { data, error } = await this.client.rpc("build002_grant_execution_authority", {
      p_principal_id: request.principalId,
      p_membership_id: request.membershipId,
      p_admission_id: request.admissionId,
      p_task_spec_id: request.taskSpecId,
      p_task_spec_hash: request.taskSpecHash,
    });
    if (error || !data || typeof data !== "object") throw new Error(error?.message || "EXECUTION_AUTHORITY_GRANT_FAILED");
    const id = String((data as Row).execution_authority_id ?? "");
    const result = await this.findById(id);
    if (!result || result.ownerTenantId !== this.ownerTenantId) throw new Error("EXECUTION_AUTHORITY_READBACK_FAILED");
    return result;
  }

  async findById(id: string): Promise<Build002ExecutionAuthority | null> {
    const { data, error } = await this.client.from("build002_execution_authorities").select("*").eq("execution_authority_id", id).maybeSingle();
    if (error) throw new Error("EXECUTION_AUTHORITY_READBACK_FAILED");
    if (!data) return null;
    try {
      const authority = rowToAuthority(data as Row);
      if (!verifyExecutionAuthorityHash(authority)) throw new Error("hash");
      return authority;
    } catch {
      throw new Error("EXECUTION_AUTHORITY_READBACK_FAILED");
    }
  }
}

function rowToAuthority(row: Row): Build002ExecutionAuthority {
  return Build002ExecutionAuthoritySchema.parse({
    schemaVersion: row.schema_version,
    executionAuthorityId: row.execution_authority_id,
    ownerTenantId: row.owner_tenant_id,
    principalId: row.principal_id,
    membershipId: row.membership_id,
    delegabilityAdmissionId: row.delegability_admission_id,
    outcomeTransactionId: row.outcome_transaction_id,
    taskSpecId: row.task_spec_id,
    taskSpecVersion: row.task_spec_version,
    taskSpecHash: row.task_spec_hash,
    blueprintId: row.blueprint_id,
    blueprintVersion: row.blueprint_version,
    blueprintHash: row.blueprint_hash,
    currentDependencySnapshotHash: row.current_dependency_snapshot_hash,
    capabilityGrant: row.capability_grant,
    scope: row.scope,
    mutationLeaseGranted: row.mutation_lease_granted,
    executionStarted: row.execution_started,
    consequenceBoundary: row.consequence_boundary,
    executionAuthorityRevalidatedAt: new Date(String(row.execution_authority_revalidated_at)).toISOString(),
    grantedAt: new Date(String(row.granted_at)).toISOString(),
    delegabilityAdmissionContentHash: row.delegability_admission_content_hash,
    authorityCommitId: row.authority_commit_id,
    assetId: row.asset_id,
    sourceAssetVersionId: row.source_asset_version_id,
    sourceAssetVersionHash: row.source_asset_version_hash,
    capabilityGrantHash: row.capability_grant_hash,
    historicalDependencySnapshotHash: row.historical_dependency_snapshot_hash,
    evaluatorSchemaVersion: row.evaluator_schema_version,
    evaluatorVersion: row.evaluator_version,
    evaluatorDefinitionHash: row.evaluator_definition_hash,
    delegabilityRevalidatedAt: new Date(String(row.delegability_revalidated_at)).toISOString(),
    validUntil: row.valid_until === null ? null : new Date(String(row.valid_until)).toISOString(),
    executionAuthorityContentHash: row.execution_authority_content_hash,
  });
}

export function createSupabaseExecutionAuthorityRepository(client: SupabaseClient, ownerTenantId: string): ExecutionAuthorityRepository {
  return new SupabaseExecutionAuthorityRepository(client, ownerTenantId);
}
