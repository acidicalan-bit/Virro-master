import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthorityContext } from "@/src/domain/auth/authority";
import { CanonicalCommitError, type CanonicalCommitRepository } from "@/src/application/ports/outcome/canonical-commit-repository";

export class SupabaseCanonicalCommitRepository implements CanonicalCommitRepository {
  constructor(private readonly client: SupabaseClient) {}

  async commitAcceptedFieldOutcome(authority: AuthorityContext, fieldOutcomeId: string) {
    const { data, error } = await this.client.rpc("commit_accepted_field_outcome", { p_field_outcome_id: fieldOutcomeId });
    if (error) throw canonicalCommitError(error.message);
    if (!data || typeof data !== "object") throw new CanonicalCommitError("TRUST_COMMIT_RESULT_INVALID");

    const result = data as { stateCommit?: Record<string, unknown>; newVersion?: Record<string, unknown>; idempotent?: unknown };
    if (!result.stateCommit || !result.newVersion || typeof result.idempotent !== "boolean") {
      throw new CanonicalCommitError("TRUST_COMMIT_RESULT_INVALID");
    }
    const ownerTenantId = nullableString(result.stateCommit.owner_tenant_id);
    const versionOwnerTenantId = nullableString(result.newVersion.owner_tenant_id);
    if (ownerTenantId !== authority.tenantId || versionOwnerTenantId !== authority.tenantId) {
      throw new CanonicalCommitError("TRUST_COMMIT_RESULT_TENANT_MISMATCH");
    }
    return {
      stateCommit: {
        id: String(result.stateCommit.id),
        ownerTenantId,
        transactionId: String(result.stateCommit.transaction_id),
        assetId: String(result.stateCommit.asset_id),
        newVersionId: String(result.stateCommit.new_version_id),
        previousVersionId: String(result.stateCommit.previous_version_id),
        committedAt: String(result.stateCommit.committed_at),
      },
      newVersion: {
        id: String(result.newVersion.id),
        ownerTenantId: versionOwnerTenantId,
        assetId: String(result.newVersion.asset_id),
        versionNumber: Number(result.newVersion.version_number),
        state: result.newVersion.state as Record<string, unknown>,
        parentVersionId: nullableString(result.newVersion.parent_version_id),
        createdAt: String(result.newVersion.created_at),
      },
      idempotent: result.idempotent,
    };
  }
}

function canonicalCommitError(message: string): CanonicalCommitError {
  const code = message.match(/TRUST_[A-Z_]+/)?.[0] ?? "TRUST_COMMIT_FAILED";
  return new CanonicalCommitError(code);
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}
