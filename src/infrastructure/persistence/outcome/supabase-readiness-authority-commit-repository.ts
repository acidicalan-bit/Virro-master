import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ReadinessAuthorityCommitInput,
  ReadinessAuthorityCommitRecord,
  ReadinessAuthorityCommitRepository,
} from "@/src/application/ports/outcome/readiness-authority-commit-repository";
import {
  currentDefaultEvaluator,
  evaluateReadinessValidity,
  sameEvaluatorIdentity,
  verifyDependencySnapshotHash,
  verifyQualificationHash,
  verifyReadinessHash,
  verifySignalRequirementHash,
} from "@/src/domain/outcome/signal-readiness";

type Row = Record<string, unknown>;

const SCHEMA_VERSION = "build002-readiness-authority-commit-v0.1" as const;

export class SupabaseReadinessAuthorityCommitRepository implements ReadinessAuthorityCommitRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId: string) {
    if (!ownerTenantId.trim()) throw new Error("READINESS_AUTHORITY_SCOPE_INVALID");
  }

  async commit(input: ReadinessAuthorityCommitInput): Promise<ReadinessAuthorityCommitRecord> {
    this.validateInput(input);
    const payload = commitPayload(input);
    const { data, error } = await this.client.rpc("build002_commit_readiness_authority", {
      p_principal_id: input.principalId,
      p_commit: payload,
    });
    if (error || !data || typeof data !== "object") throw new Error("READINESS_AUTHORITY_COMMIT_FAILED");
    const markerId = String((data as Row).authority_commit_id ?? "");
    if (!markerId) throw new Error("READINESS_AUTHORITY_READBACK_FAILED");
    const persisted = await this.findById(markerId);
    if (!persisted
      || persisted.ownerTenantId !== input.ownerTenantId
      || persisted.outcomeTransactionId !== input.outcomeTransactionId
      || persisted.dependencySnapshotId !== (data as Row).dependency_snapshot_id
      || persisted.dependencySnapshotHash !== input.dependencySnapshot.dependencySnapshotHash
      || persisted.readinessId !== input.readiness.id
      || persisted.readinessContentHash !== input.readiness.readinessContentHash) {
      throw new Error("READINESS_AUTHORITY_READBACK_FAILED");
    }
    const readiness = await this.readExact("build002_delegation_readiness", input.readiness.id);
    const dependency = await this.readExact("build002_dependency_snapshots", input.dependencySnapshot.dependencySnapshotHash);
    if (!readiness || !dependency) throw new Error("READINESS_AUTHORITY_READBACK_FAILED");
    return persisted;
  }

  async findById(id: string): Promise<ReadinessAuthorityCommitRecord | null> {
    const { data, error } = await this.client
      .from("build002_readiness_authority_commits")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("READINESS_AUTHORITY_READBACK_FAILED");
    return data ? markerFromRow(data as Row) : null;
  }

  async findByReadinessId(readinessId: string): Promise<ReadinessAuthorityCommitRecord | null> {
    const { data, error } = await this.client
      .from("build002_readiness_authority_commits")
      .select("*")
      .eq("owner_tenant_id", this.ownerTenantId)
      .eq("readiness_id", readinessId)
      .maybeSingle();
    if (error) throw new Error("READINESS_AUTHORITY_READBACK_FAILED");
    return data ? markerFromRow(data as Row) : null;
  }

  private validateInput(input: ReadinessAuthorityCommitInput): void {
    if (input.ownerTenantId !== this.ownerTenantId
      || input.outcomeTransactionId !== input.transaction.transactionId
      || input.transaction.ownerTenantId !== input.ownerTenantId
      || input.asset.ownerTenantId !== input.ownerTenantId
      || input.sourceVersion.ownerTenantId !== input.ownerTenantId) {
      throw new Error("READINESS_AUTHORITY_SCOPE_INVALID");
    }
    if (input.requirements.length === 0 || input.qualifications.length !== input.requirements.length) {
      throw new Error("READINESS_AUTHORITY_GRAPH_INVALID");
    }
    if (!input.requirements.every(verifySignalRequirementHash)
      || !verifyDependencySnapshotHash(input.dependencySnapshot)
      || !input.qualifications.every(verifyQualificationHash)
      || !verifyReadinessHash(input.readiness)) {
      throw new Error("READINESS_AUTHORITY_GRAPH_INVALID");
    }
    const evaluator = currentDefaultEvaluator();
    if (!sameEvaluatorIdentity(input.readiness.evaluator, evaluator)
      || input.qualifications.some((qualification) => !sameEvaluatorIdentity(qualification.evaluator, evaluator))) {
      throw new Error("READINESS_AUTHORITY_EVALUATOR_STALE");
    }
    if (input.readiness.state === "READY_WITH_CONDITIONS" || input.readiness.state === "BLOCKED_BY_POLICY") {
      throw new Error("READINESS_AUTHORITY_GRAPH_INVALID");
    }
    const requirementHashes = input.requirements.map((requirement) => requirement.requirementDefinitionHash).sort();
    const snapshotHashes = [...input.dependencySnapshot.requirementDefinitionHashes].sort();
    if (requirementHashes.length !== snapshotHashes.length
      || requirementHashes.some((hash, index) => hash !== snapshotHashes[index])
      || new Set(requirementHashes).size !== requirementHashes.length) {
      throw new Error("READINESS_AUTHORITY_GRAPH_INVALID");
    }
    if (input.readiness.ownerTenantId !== input.ownerTenantId
      || input.readiness.transactionId !== input.outcomeTransactionId
      || input.readiness.dependencySnapshotHash !== input.dependencySnapshot.dependencySnapshotHash
      || input.readiness.policyHash !== null
      || input.readiness.conditionCodes.length !== 0
      || input.qualifications.some((qualification) => qualification.qualifiedAt !== input.readiness.createdAt)) {
      throw new Error("READINESS_AUTHORITY_GRAPH_INVALID");
    }
    const validity = evaluateReadinessValidity(
      input.readiness,
      input.dependencySnapshot,
      new Date().toISOString(),
      evaluator,
    );
    if (validity !== "CURRENT") throw new Error("READINESS_AUTHORITY_EXPIRED_BEFORE_COMMIT");
  }

  private async readExact(table: string, key: string): Promise<Row | null> {
    const column = table === "build002_delegation_readiness" ? "id" : "dependency_snapshot_hash";
    const { data, error } = await this.client.from(table).select("*").eq(column, key).maybeSingle();
    if (error) throw new Error("READINESS_AUTHORITY_READBACK_FAILED");
    return data as Row | null;
  }
}

export function createSupabaseReadinessAuthorityCommitRepository(
  client: SupabaseClient,
  ownerTenantId: string,
): ReadinessAuthorityCommitRepository {
  return new SupabaseReadinessAuthorityCommitRepository(client, ownerTenantId);
}

function commitPayload(input: ReadinessAuthorityCommitInput): Row {
  return {
    owner_tenant_id: input.ownerTenantId,
    outcome_transaction_id: input.outcomeTransactionId,
    transaction: {
      ownerTenantId: input.transaction.ownerTenantId,
      transactionId: input.transaction.transactionId,
      projectId: input.transaction.projectId,
      assetId: input.transaction.assetId,
      baseVersionId: input.transaction.baseVersionId,
      rawRequest: input.transaction.rawRequest,
    },
    asset: input.asset,
    sourceVersion: input.sourceVersion,
    binding: input.binding,
    requirements: input.requirements,
    dependency_snapshot: input.dependencySnapshot,
    qualifications: input.qualifications.map((qualification) => ({
      ...qualification,
      signalReferences: qualification.signalIds.map((signalId, index) => ({
        signalId,
        contentHash: qualification.signalContentHashes[index],
      })),
    })),
    readiness: input.readiness,
    schema_version: SCHEMA_VERSION,
  };
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
    schemaVersion: String(row.schema_version) as typeof SCHEMA_VERSION,
  };
}

function normalizeDbInstant(value: unknown): string {
  const parsed = new Date(value instanceof Date ? value.toISOString() : String(value));
  if (!Number.isFinite(parsed.getTime())) throw new Error("READINESS_AUTHORITY_READBACK_FAILED");
  return parsed.toISOString();
}
