import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ReadinessAuthorityCommitScopedLookup,
  ReadinessAuthorityCommitScopedReader,
} from "@/src/application/ports/outcome/readiness-authority-commit-scoped-reader";
import type { ReadinessAuthorityCommitRecord } from "@/src/application/ports/outcome/readiness-authority-commit-repository";

type Row = Record<string, unknown>;

export class SupabaseReadinessAuthorityCommitScopedReader implements ReadinessAuthorityCommitScopedReader {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId: string) {
    if (!ownerTenantId.trim()) throw new Error("READINESS_AUTHORITY_SCOPE_INVALID");
  }

  async findByScopedId(input: ReadinessAuthorityCommitScopedLookup): Promise<ReadinessAuthorityCommitRecord | null> {
    if (input.ownerTenantId !== this.ownerTenantId || !input.authorityCommitId.trim()) {
      throw new Error("READINESS_AUTHORITY_SCOPE_INVALID");
    }
    const { data, error } = await this.client
      .from("build002_readiness_authority_commits")
      .select("*")
      .eq("id", input.authorityCommitId)
      .eq("owner_tenant_id", this.ownerTenantId)
      .maybeSingle();
    if (error) throw new Error("READINESS_AUTHORITY_SCOPED_READ_FAILED");
    return data ? markerFromRow(data as Row) : null;
  }
}

export function createSupabaseReadinessAuthorityCommitScopedReader(
  client: SupabaseClient,
  ownerTenantId: string,
): ReadinessAuthorityCommitScopedReader {
  return new SupabaseReadinessAuthorityCommitScopedReader(client, ownerTenantId);
}

function markerFromRow(row: Row): ReadinessAuthorityCommitRecord {
  return {
    authorityCommitId: String(row.id),
    ownerTenantId: String(row.owner_tenant_id),
    outcomeTransactionId: String(row.outcome_transaction_id),
    principalId: String(row.principal_id),
    dependencySnapshotId: String(row.dependency_snapshot_id),
    dependencySnapshotHash: String(row.dependency_snapshot_hash),
    readinessId: String(row.readiness_id),
    readinessContentHash: String(row.readiness_content_hash),
    evaluationTime: normalizeDbInstant(row.evaluation_time),
    committedAt: normalizeDbInstant(row.committed_at),
    schemaVersion: String(row.schema_version) as "build002-readiness-authority-commit-v0.1",
  };
}

function normalizeDbInstant(value: unknown): string {
  const candidate = value instanceof Date ? value.toISOString() : String(value);
  const parsed = new Date(candidate);
  if (!Number.isFinite(parsed.getTime())) throw new Error("READINESS_AUTHORITY_SCOPED_READ_FAILED");
  return parsed.toISOString();
}
