import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DelegabilityAdmissionInput, DelegabilityAdmissionRepository } from "@/src/application/ports/outcome/delegability-admission-repository";
import { createDelegabilityAdmission, DelegabilityAdmissionSchema, verifyDelegabilityAdmissionHash, type DelegabilityAdmission } from "@/src/domain/outcome/delegability-admission";

type Row = Record<string, unknown>;

export class SupabaseDelegabilityAdmissionRepository implements DelegabilityAdmissionRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId: string) {
    if (!ownerTenantId.trim()) throw new Error("DELEGABILITY_SCOPE_INVALID");
  }

  async admit(material: DelegabilityAdmissionInput): Promise<DelegabilityAdmission> {
    if (material.ownerTenantId !== this.ownerTenantId) throw new Error("DELEGABILITY_SCOPE_INVALID");
    const admission = createDelegabilityAdmission(material);
    const { data, error } = await this.client.rpc("build002_admit_delegability", {
      p_principal_id: material.principalId,
      p_membership_id: material.membershipId,
      p_authority_commit_id: material.authorityCommitId,
      p_admission: admission,
      p_current_material: material.currentMaterial,
    });
    if (error || !data || typeof data !== "object") throw new Error(error?.message || "DELEGABILITY_ADMISSION_FAILED");
    const id = String((data as Row).admission_id ?? "");
    if (!id) throw new Error("DELEGABILITY_ADMISSION_READBACK_FAILED");
    const persisted = await this.findById(id);
    if (!persisted || !verifyDelegabilityAdmissionHash(persisted) || persisted.ownerTenantId !== this.ownerTenantId || persisted.authorityCommitId !== material.authorityCommitId || persisted.principalId !== material.principalId || persisted.currentDependencySnapshotHash !== material.currentDependencySnapshotHash) throw new Error("DELEGABILITY_ADMISSION_READBACK_FAILED");
    return persisted;
  }

  async findById(admissionId: string): Promise<DelegabilityAdmission | null> {
    const { data, error } = await this.client.from("build002_delegability_admissions").select("*").eq("admission_id", admissionId).maybeSingle();
    if (error) throw new Error("DELEGABILITY_ADMISSION_READBACK_FAILED");
    if (!data) return null;
    try {
      const admission = rowToAdmission(data as Row);
      if (!verifyDelegabilityAdmissionHash(admission)) throw new Error("tampered hash");
      return admission;
    } catch {
      throw new Error("DELEGABILITY_ADMISSION_READBACK_FAILED");
    }
  }
}

function rowToAdmission(row: Row): DelegabilityAdmission {
  return DelegabilityAdmissionSchema.parse({
    schemaVersion: row.schema_version,
    admissionId: row.admission_id,
    ownerTenantId: row.owner_tenant_id,
    principalId: row.principal_id,
    membershipId: row.membership_id,
    authorityCommitId: row.authority_commit_id,
    outcomeTransactionId: row.outcome_transaction_id,
    readinessId: row.readiness_id,
    readinessContentHash: row.readiness_content_hash,
    readinessState: row.readiness_state,
    historicalDependencySnapshotHash: row.historical_dependency_snapshot_hash,
    currentDependencySnapshotHash: row.current_dependency_snapshot_hash,
    evaluatorSchemaVersion: row.evaluator_schema_version,
    evaluatorVersion: row.evaluator_version,
    evaluatorDefinitionHash: row.evaluator_definition_hash,
    currentness: row.currentness,
    revalidatedAt: row.revalidated_at,
    admittedAt: row.admitted_at,
    scope: row.scope,
    executionAuthorityGranted: row.execution_authority_granted,
    executionStarted: row.execution_started,
    consequenceBoundary: row.consequence_boundary,
    admissionContentHash: row.admission_content_hash,
  });
}

export function createSupabaseDelegabilityAdmissionRepository(client: SupabaseClient, ownerTenantId: string): DelegabilityAdmissionRepository {
  return new SupabaseDelegabilityAdmissionRepository(client, ownerTenantId);
}
