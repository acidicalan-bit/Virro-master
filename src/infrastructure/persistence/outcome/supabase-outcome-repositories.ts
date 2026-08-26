import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProjectRepository,
  ProjectRecord,
  CreateProjectRecord,
  AssetRepository,
  AssetRecord,
  CreateAssetRecord,
  AssetVersionRepository,
  AssetVersionRecord,
  CreateAssetVersionRecord,
  OutcomeTransactionRepository,
  OutcomeTransactionRecord,
  CreateOutcomeTransactionRecord,
  PartialIntentRepository,
  PartialIntentRecord,
  CreatePartialIntentRecord,
  SemanticPatchRepository,
  SemanticPatchRecord,
  CreateSemanticPatchRecord,
  MutationLeaseRepository,
  MutationLeaseRecord,
  CreateMutationLeaseRecord,
  ExecutionRunRepository,
  ExecutionRunRecord,
  CreateExecutionRunRecord,
  EvidenceReceiptRepository,
  EvidenceReceiptRecord,
  CreateEvidenceReceiptRecord,
  VerificationRunRepository,
  VerificationRunRecord,
  CreateVerificationRunRecord,
  CriterionEvidenceRepository,
  CriterionEvidenceRecord,
  CreateCriterionEvidenceRecord,
  StateCommitRepository,
  StateCommitRecord,
  CreateStateCommitRecord,
  CostRecordRepository,
  CostRecordRecord,
  CreateCostRecordRecord,
  MediaStorageRepository,
  MediaStorageRecord,
  CreateMediaStorageRecord,
  SemanticSnapshotRepository,
  SemanticSnapshotRecord,
  CreateSemanticSnapshotRecord,
  ImageEvidenceRepository,
  ImageEvidenceRecord,
  CreateImageEvidenceRecord,
  CandidateAssetRepository,
  CandidateAssetRecord,
  CreateCandidateAssetRecord,
  PreservationRunRepository,
  PreservationRunRecord,
  CreatePreservationRunRecord,
  PreservationEvidenceRepository,
  PreservationEvidenceRecord,
  CreatePreservationEvidenceRecord,
  CandidatePreferenceRepository,
  CandidatePreferenceRecord,
  CreateCandidatePreferenceRecord,
} from "@/src/application/ports/repositories";
import type { TransactionStatus } from "@/src/domain/outcome";
import type { CandidateType } from "@/src/domain/outcome/media/preservation";
import { CriterionEvidenceRecordSchema } from "@/src/domain/outcome/criterion-evidence";

type FilterableQuery = { eq(column: string, value: unknown): FilterableQuery };

function ownedQuery<T>(query: T, ownerTenantId?: string): T {
  const scope = requireTenantScope(ownerTenantId);
  return (query as unknown as FilterableQuery).eq("owner_tenant_id", scope) as unknown as T;
}

function requireTenantScope(ownerTenantId: string | undefined): string {
  const scope = ownerTenantId?.trim();
  if (!scope) throw new Error("TRUST_TENANT_SCOPE_REQUIRED");
  return scope;
}

export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateProjectRecord): Promise<ProjectRecord> {
    const { data, error } = await this.client
      .from("projects")
      .insert({ owner_tenant_id: resolveOwner(input.ownerTenantId, this.ownerTenantId), name: input.name, description: input.description })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el proyecto.");
    return { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, name: String(data.name), description: data.description ? String(data.description) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) };
  }

  async findById(id: string): Promise<ProjectRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("projects").select("*"), this.ownerTenantId).eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer el proyecto.");
    return data ? { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, name: String(data.name), description: data.description ? String(data.description) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) } : null;
  }

  async list(): Promise<ProjectRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("projects").select("*"), this.ownerTenantId).order("created_at", { ascending: false });
    if (error || !data) throw new Error("No se pudieron leer los proyectos.");
    return data.map((row) => ({ id: String(row.id), ownerTenantId: row.owner_tenant_id ? String(row.owner_tenant_id) : null, name: String(row.name), description: row.description ? String(row.description) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) }));
  }

  async update(id: string, input: Partial<CreateProjectRecord>): Promise<ProjectRecord> {
    const { data, error } = await ownedQuery(this.client.from("projects").update({ name: input.name, description: input.description }), this.ownerTenantId).eq("id", id).select("*").single();
    if (error || !data) throw new Error("No se pudo actualizar el proyecto.");
    return { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, name: String(data.name), description: data.description ? String(data.description) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) };
  }
}

export class SupabaseAssetRepository implements AssetRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateAssetRecord): Promise<AssetRecord> {
    const { data, error } = await this.client
      .from("assets")
      .insert({ owner_tenant_id: resolveOwner(input.ownerTenantId, this.ownerTenantId), project_id: input.projectId, name: input.name, description: input.description })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el activo.");
    return { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, projectId: String(data.project_id), name: String(data.name), description: data.description ? String(data.description) : null, currentVersionId: data.current_version_id ? String(data.current_version_id) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) };
  }

  async findById(id: string): Promise<AssetRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("assets").select("*"), this.ownerTenantId).eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer el activo.");
    return data ? { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, projectId: String(data.project_id), name: String(data.name), description: data.description ? String(data.description) : null, currentVersionId: data.current_version_id ? String(data.current_version_id) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) } : null;
  }

  async findByProjectId(projectId: string): Promise<AssetRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("assets").select("*"), this.ownerTenantId).eq("project_id", projectId);
    if (error || !data) throw new Error("No se pudieron leer los activos.");
    return data.map((row) => ({ id: String(row.id), ownerTenantId: row.owner_tenant_id ? String(row.owner_tenant_id) : null, projectId: String(row.project_id), name: String(row.name), description: row.description ? String(row.description) : null, currentVersionId: row.current_version_id ? String(row.current_version_id) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) }));
  }

  async update(id: string, input: Partial<CreateAssetRecord> & { currentVersionId?: string | null }): Promise<AssetRecord> {
    const { data, error } = await this.client.rpc("build002_002e_update_asset", {
      p_asset_id: id,
      p_owner_tenant_id: requireTenantScope(this.ownerTenantId),
      p_patch: {
        ...(input.projectId !== undefined ? { project_id: input.projectId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.currentVersionId !== undefined ? { current_version_id: input.currentVersionId } : {}),
      },
    });
    if (error || !data) throw new Error("No se pudo actualizar el activo.");
    return { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, projectId: String(data.project_id), name: String(data.name), description: data.description ? String(data.description) : null, currentVersionId: data.current_version_id ? String(data.current_version_id) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) };
  }
}

export class SupabaseAssetVersionRepository implements AssetVersionRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateAssetVersionRecord): Promise<AssetVersionRecord> {
    const { data, error } = await this.client
      .from("asset_versions")
      .insert({ owner_tenant_id: resolveOwner(input.ownerTenantId, this.ownerTenantId), asset_id: input.assetId, version_number: input.versionNumber, state: input.state, parent_version_id: input.parentVersionId })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear la versión.");
    return { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, assetId: String(data.asset_id), versionNumber: Number(data.version_number), state: data.state as Record<string, unknown>, parentVersionId: data.parent_version_id ? String(data.parent_version_id) : null, createdAt: String(data.created_at) };
  }

  async findById(id: string): Promise<AssetVersionRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("asset_versions").select("*"), this.ownerTenantId).eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer la versión.");
    return data ? { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, assetId: String(data.asset_id), versionNumber: Number(data.version_number), state: data.state as Record<string, unknown>, parentVersionId: data.parent_version_id ? String(data.parent_version_id) : null, createdAt: String(data.created_at) } : null;
  }

  async findByAssetId(assetId: string): Promise<AssetVersionRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("asset_versions").select("*"), this.ownerTenantId).eq("asset_id", assetId).order("version_number");
    if (error || !data) throw new Error("No se pudieron leer las versiones.");
    return data.map((row) => ({ id: String(row.id), ownerTenantId: row.owner_tenant_id ? String(row.owner_tenant_id) : null, assetId: String(row.asset_id), versionNumber: Number(row.version_number), state: row.state as Record<string, unknown>, parentVersionId: row.parent_version_id ? String(row.parent_version_id) : null, createdAt: String(row.created_at) }));
  }

  async findLatestByAssetId(assetId: string): Promise<AssetVersionRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("asset_versions").select("*"), this.ownerTenantId).eq("asset_id", assetId).order("version_number", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error("No se pudo leer la última versión.");
    return data ? { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, assetId: String(data.asset_id), versionNumber: Number(data.version_number), state: data.state as Record<string, unknown>, parentVersionId: data.parent_version_id ? String(data.parent_version_id) : null, createdAt: String(data.created_at) } : null;
  }
}

export class SupabaseOutcomeTransactionRepository implements OutcomeTransactionRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateOutcomeTransactionRecord): Promise<OutcomeTransactionRecord> {
    const { data, error } = await this.client
      .from("outcome_transactions")
      .insert({ owner_tenant_id: resolveOwner(input.ownerTenantId, this.ownerTenantId), project_id: input.projectId, asset_id: input.assetId, base_version_id: input.baseVersionId, raw_request: input.rawRequest, status: "DRAFT" })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear la transacción.");
    return { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, projectId: String(data.project_id), assetId: String(data.asset_id), baseVersionId: String(data.base_version_id), status: data.status as TransactionStatus, rawRequest: String(data.raw_request), createdAt: String(data.created_at), updatedAt: String(data.updated_at), completedAt: data.completed_at ? String(data.completed_at) : null, abortReason: data.abort_reason ? String(data.abort_reason) : null };
  }

  async findById(id: string): Promise<OutcomeTransactionRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("outcome_transactions").select("*"), this.ownerTenantId).eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer la transacción.");
    return data ? { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, projectId: String(data.project_id), assetId: String(data.asset_id), baseVersionId: String(data.base_version_id), status: data.status as TransactionStatus, rawRequest: String(data.raw_request), createdAt: String(data.created_at), updatedAt: String(data.updated_at), completedAt: data.completed_at ? String(data.completed_at) : null, abortReason: data.abort_reason ? String(data.abort_reason) : null } : null;
  }

  async findByAssetId(assetId: string): Promise<OutcomeTransactionRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("outcome_transactions").select("*"), this.ownerTenantId).eq("asset_id", assetId);
    if (error || !data) throw new Error("No se pudieron leer las transacciones.");
    return data.map((row) => ({ id: String(row.id), ownerTenantId: row.owner_tenant_id ? String(row.owner_tenant_id) : null, projectId: String(row.project_id), assetId: String(row.asset_id), baseVersionId: String(row.base_version_id), status: row.status as TransactionStatus, rawRequest: String(row.raw_request), createdAt: String(row.created_at), updatedAt: String(row.updated_at), completedAt: row.completed_at ? String(row.completed_at) : null, abortReason: row.abort_reason ? String(row.abort_reason) : null }));
  }

  async updateStatus(id: string, status: TransactionStatus, extra?: { abortReason?: string | null; completedAt?: string | null }): Promise<OutcomeTransactionRecord> {
    const { data, error } = await this.client.rpc("build002_002e_update_outcome_transaction", {
      p_transaction_id: id,
      p_owner_tenant_id: requireTenantScope(this.ownerTenantId),
      p_patch: {
        status,
        ...(extra?.abortReason !== undefined ? { abort_reason: extra.abortReason } : {}),
        ...(extra?.completedAt !== undefined ? { completed_at: extra.completedAt } : {}),
      },
    });
    if (error || !data) throw new Error("No se pudo actualizar la transacción.");
    return { id: String(data.id), ownerTenantId: data.owner_tenant_id ? String(data.owner_tenant_id) : null, projectId: String(data.project_id), assetId: String(data.asset_id), baseVersionId: String(data.base_version_id), status: data.status as TransactionStatus, rawRequest: String(data.raw_request), createdAt: String(data.created_at), updatedAt: String(data.updated_at), completedAt: data.completed_at ? String(data.completed_at) : null, abortReason: data.abort_reason ? String(data.abort_reason) : null };
  }
}

export class SupabasePartialIntentRepository implements PartialIntentRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreatePartialIntentRecord): Promise<PartialIntentRecord> {
    const { data, error } = await this.client
      .from("partial_intents")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), transaction_id: input.transactionId, raw_input: input.rawInput, target_path: input.targetPath, operation: input.operation, desired_value: input.desiredValue })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el intent parcial.", { cause: error ?? undefined });
    return { id: String(data.id), transactionId: String(data.transaction_id), rawInput: String(data.raw_input), targetPath: String(data.target_path), operation: data.operation as PartialIntentRecord["operation"], desiredValue: data.desired_value, createdAt: String(data.created_at) };
  }

  async findByTransactionId(transactionId: string): Promise<PartialIntentRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("partial_intents").select("*"), this.ownerTenantId).eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los intents parciales.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), rawInput: String(row.raw_input), targetPath: String(row.target_path), operation: row.operation as PartialIntentRecord["operation"], desiredValue: row.desired_value, createdAt: String(row.created_at) }));
  }
}

export class SupabaseSemanticPatchRepository implements SemanticPatchRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateSemanticPatchRecord): Promise<SemanticPatchRecord> {
    const { data, error } = await this.client
      .from("transaction_patches")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), transaction_id: input.transactionId, partial_intent_id: input.partialIntentId, operation: input.operation, target_path: input.targetPath, parameters: input.parameters })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el parche semántico.", { cause: error ?? undefined });
    return { id: String(data.id), transactionId: String(data.transaction_id), partialIntentId: String(data.partial_intent_id), operation: data.operation as SemanticPatchRecord["operation"], targetPath: String(data.target_path), parameters: data.parameters as Record<string, unknown>, createdAt: String(data.created_at) };
  }

  async findByTransactionId(transactionId: string): Promise<SemanticPatchRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("transaction_patches").select("*"), this.ownerTenantId).eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los parches.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), partialIntentId: String(row.partial_intent_id), operation: row.operation as SemanticPatchRecord["operation"], targetPath: String(row.target_path), parameters: row.parameters as Record<string, unknown>, createdAt: String(row.created_at) }));
  }
}

export class SupabaseMutationLeaseRepository implements MutationLeaseRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateMutationLeaseRecord): Promise<MutationLeaseRecord> {
    const { data, error } = await this.client
      .from("mutation_leases")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), transaction_id: input.transactionId, target_path: input.targetPath, category: input.category, reason: input.reason })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el lease de mutación.");
    return { id: String(data.id), transactionId: String(data.transaction_id), targetPath: String(data.target_path), category: data.category as MutationLeaseRecord["category"], reason: data.reason ? String(data.reason) : null, createdAt: String(data.created_at) };
  }

  async findByTransactionId(transactionId: string): Promise<MutationLeaseRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("mutation_leases").select("*"), this.ownerTenantId).eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los leases.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), targetPath: String(row.target_path), category: row.category as MutationLeaseRecord["category"], reason: row.reason ? String(row.reason) : null, createdAt: String(row.created_at) }));
  }
}

export class SupabaseExecutionRunRepository implements ExecutionRunRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateExecutionRunRecord): Promise<ExecutionRunRecord> {
    const { data, error } = await this.client
      .from("execution_runs")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), transaction_id: input.transactionId, status: input.status, executor: input.executor, started_at: input.startedAt, completed_at: input.completedAt, latency_ms: input.latencyMs, cost_usd: input.costUsd, error_message: input.errorMessage, metadata: input.metadata })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear la ejecución.");
    return { id: String(data.id), transactionId: String(data.transaction_id), status: data.status as ExecutionRunRecord["status"], executor: String(data.executor), startedAt: String(data.started_at), completedAt: String(data.completed_at), latencyMs: Number(data.latency_ms), costUsd: data.cost_usd === null ? null : Number(data.cost_usd), errorMessage: data.error_message ? String(data.error_message) : null, metadata: data.metadata as Record<string, unknown> };
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<ExecutionRunRecord> {
    const { data, error } = await ownedQuery(this.client.from("execution_runs").update({ metadata }), this.ownerTenantId).eq("id", id).select("*").single();
    if (error || !data) throw new Error("No se pudo actualizar el checkpoint de ejecución.");
    return executionRow(data);
  }

  async findById(id: string): Promise<ExecutionRunRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("execution_runs").select("*"), this.ownerTenantId).eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer la ejecución.");
    return data ? executionRow(data) : null;
  }

  async findByTransactionId(transactionId: string): Promise<ExecutionRunRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("execution_runs").select("*"), this.ownerTenantId).eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer las ejecuciones.");
    return data.map(executionRow);
  }
}

function executionRow(row: Record<string, unknown>): ExecutionRunRecord { return { id: String(row.id), transactionId: String(row.transaction_id), status: row.status as ExecutionRunRecord["status"], executor: String(row.executor), startedAt: String(row.started_at), completedAt: String(row.completed_at), latencyMs: Number(row.latency_ms), costUsd: row.cost_usd === null ? null : Number(row.cost_usd), errorMessage: row.error_message ? String(row.error_message) : null, metadata: row.metadata as Record<string, unknown> }; }

export class SupabaseEvidenceReceiptRepository implements EvidenceReceiptRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateEvidenceReceiptRecord): Promise<EvidenceReceiptRecord> {
    const { data, error } = await this.client
      .from("evidence_receipts")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), transaction_id: input.transactionId, execution_run_id: input.executionRunId, base_version_id: input.baseVersionId, operation: input.operation, target: input.target, requested_effect: input.requestedEffect, observed_effect: input.observedEffect, executor: input.executor, started_at: input.startedAt, completed_at: input.completedAt, cost_usd: input.costUsd, success: input.success })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el recibo de evidencia.");
    return { id: String(data.id), transactionId: String(data.transaction_id), executionRunId: String(data.execution_run_id), baseVersionId: String(data.base_version_id), operation: String(data.operation), target: String(data.target), requestedEffect: data.requested_effect, observedEffect: data.observed_effect, executor: String(data.executor), startedAt: String(data.started_at), completedAt: String(data.completed_at), costUsd: data.cost_usd === null ? null : Number(data.cost_usd), success: Boolean(data.success) };
  }

  async findByTransactionId(transactionId: string): Promise<EvidenceReceiptRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("evidence_receipts").select("*"), this.ownerTenantId).eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los recibos de evidencia.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), executionRunId: String(row.execution_run_id), baseVersionId: String(row.base_version_id), operation: String(row.operation), target: String(row.target), requestedEffect: row.requested_effect, observedEffect: row.observed_effect, executor: String(row.executor), startedAt: String(row.started_at), completedAt: String(row.completed_at), costUsd: row.cost_usd === null ? null : Number(row.cost_usd), success: Boolean(row.success) }));
  }
}

export class SupabaseVerificationRunRepository implements VerificationRunRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateVerificationRunRecord): Promise<VerificationRunRecord> {
    const { data, error } = await this.client
      .from("verification_runs")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), transaction_id: input.transactionId, execution_run_id: input.executionRunId, status: input.status, checks: input.checks, details: input.details })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear la verificación.");
    return { id: String(data.id), transactionId: String(data.transaction_id), executionRunId: String(data.execution_run_id), status: data.status as VerificationRunRecord["status"], checks: data.checks as Record<string, boolean>, details: data.details as Record<string, unknown>, verifiedAt: String(data.verified_at) };
  }

  async findByTransactionId(transactionId: string): Promise<VerificationRunRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("verification_runs").select("*"), this.ownerTenantId).eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer las verificaciones.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), executionRunId: String(row.execution_run_id), status: row.status as VerificationRunRecord["status"], checks: row.checks as Record<string, boolean>, details: row.details as Record<string, unknown>, verifiedAt: String(row.verified_at) }));
  }
}

export class SupabaseCriterionEvidenceRepository implements CriterionEvidenceRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateCriterionEvidenceRecord): Promise<CriterionEvidenceRecord> {
    const { data, error } = await this.client.from("verification_criterion_evidence").insert({
      tenant_id: requireTenantScope(this.ownerTenantId),
      owner_tenant_id: requireTenantScope(this.ownerTenantId),
      transaction_id: input.transactionId,
      verification_run_id: input.verificationRunId,
      execution_run_id: input.executionRunId,
      criterion_id: input.criterionId,
      status: input.status,
      evidence_type: input.evidenceType,
      issuer_role: input.issuerRole,
      task_spec_id: input.taskSpecId,
      task_spec_version: input.taskSpecVersion,
      task_spec_hash: input.taskSpecHash,
      artifact_bindings: input.artifactBindings,
      verifier: input.verifier,
      evidence_ref: input.evidenceRef,
      details: input.details,
    }).select("*").single();
    if (error || !data) throw new Error(`No se pudo persistir evidencia de criterio: ${error?.message ?? "sin respuesta"}`);
    return criterionEvidenceRow(data);
  }

  async findByTransactionId(transactionId: string): Promise<CriterionEvidenceRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("verification_criterion_evidence").select("*"), this.ownerTenantId).eq("transaction_id", transactionId).order("created_at");
    if (error || !data) throw new Error("No se pudo leer la evidencia de criterios.");
    return data.map(criterionEvidenceRow);
  }

  async findByVerificationRunId(verificationRunId: string): Promise<CriterionEvidenceRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("verification_criterion_evidence").select("*"), this.ownerTenantId).eq("verification_run_id", verificationRunId).order("created_at");
    if (error || !data) throw new Error("No se pudo leer la evidencia de criterios.");
    return data.map(criterionEvidenceRow);
  }
}

export class SupabaseStateCommitRepository implements StateCommitRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateStateCommitRecord): Promise<StateCommitRecord> {
    const { data, error } = await this.client
      .from("state_commits")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), transaction_id: input.transactionId, asset_id: input.assetId, new_version_id: input.newVersionId, previous_version_id: input.previousVersionId })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el commit de estado.");
    return stateCommitRow(data);
  }

  async findByTransactionId(transactionId: string): Promise<StateCommitRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("state_commits").select("*"), this.ownerTenantId).eq("transaction_id", transactionId).maybeSingle();
    if (error) throw new Error("No se pudo leer el commit.");
    return data ? stateCommitRow(data) : null;
  }
}

function stateCommitRow(row: Record<string, unknown>): StateCommitRecord {
  return { id: String(row.id), ownerTenantId: row.owner_tenant_id ? String(row.owner_tenant_id) : null, transactionId: String(row.transaction_id), assetId: String(row.asset_id), newVersionId: String(row.new_version_id), previousVersionId: String(row.previous_version_id), committedAt: String(row.committed_at) };
}

export class SupabaseCostRecordRepository implements CostRecordRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateCostRecordRecord): Promise<CostRecordRecord> {
    const { data, error } = await this.client
      .from("cost_records")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), transaction_id: input.transactionId, execution_run_id: input.executionRunId, amount_usd: input.amountUsd, description: input.description })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el registro de costo.");
    return { id: String(data.id), transactionId: String(data.transaction_id), executionRunId: data.execution_run_id ? String(data.execution_run_id) : null, amountUsd: Number(data.amount_usd), description: String(data.description), recordedAt: String(data.recorded_at) };
  }

  async findByTransactionId(transactionId: string): Promise<CostRecordRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("cost_records").select("*"), this.ownerTenantId).eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los registros de costo.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), executionRunId: row.execution_run_id ? String(row.execution_run_id) : null, amountUsd: Number(row.amount_usd), description: String(row.description), recordedAt: String(row.recorded_at) }));
  }
}

export class SupabaseMediaStorageRepository implements MediaStorageRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateMediaStorageRecord): Promise<MediaStorageRecord> {
    const { data, error } = await this.client
      .from("media_storage")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), storage_key: input.storageKey, mime_type: input.mimeType, width: input.width, height: input.height, byte_size: input.byteSize, sha256: input.sha256, asset_id: input.assetId })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el registro de almacenamiento.");
    return { id: String(data.id), storageKey: String(data.storage_key), mimeType: String(data.mime_type), width: Number(data.width), height: Number(data.height), byteSize: Number(data.byte_size), sha256: String(data.sha256), assetId: String(data.asset_id), createdAt: String(data.created_at) };
  }

  async findByAssetId(assetId: string): Promise<MediaStorageRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("media_storage").select("*"), this.ownerTenantId).eq("asset_id", assetId);
    if (error || !data) throw new Error("No se pudieron leer los registros de almacenamiento.");
    return data.map((row) => ({ id: String(row.id), storageKey: String(row.storage_key), mimeType: String(row.mime_type), width: Number(row.width), height: Number(row.height), byteSize: Number(row.byte_size), sha256: String(row.sha256), assetId: String(row.asset_id), createdAt: String(row.created_at) }));
  }

  async findByStorageKey(storageKey: string): Promise<MediaStorageRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("media_storage").select("*"), this.ownerTenantId).eq("storage_key", storageKey).maybeSingle();
    if (error) throw new Error("No se pudo leer el registro de almacenamiento.");
    return data ? { id: String(data.id), storageKey: String(data.storage_key), mimeType: String(data.mime_type), width: Number(data.width), height: Number(data.height), byteSize: Number(data.byte_size), sha256: String(data.sha256), assetId: String(data.asset_id), createdAt: String(data.created_at) } : null;
  }
}

export class SupabaseSemanticSnapshotRepository implements SemanticSnapshotRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateSemanticSnapshotRecord): Promise<SemanticSnapshotRecord> {
    const { data, error } = await this.client
      .from("semantic_snapshots")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), transaction_id: input.transactionId, transaction_schema_version: input.transactionSchemaVersion, patch_schema_version: input.patchSchemaVersion, executor_adapter_version: input.executorAdapterVersion, provider: input.provider, image_model_identifier: input.imageModelIdentifier, verification_methodology_version: input.verificationMethodologyVersion })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el snapshot semantico.");
    return { id: String(data.id), transactionId: String(data.transaction_id), transactionSchemaVersion: String(data.transaction_schema_version), patchSchemaVersion: String(data.patch_schema_version), executorAdapterVersion: String(data.executor_adapter_version), provider: String(data.provider), imageModelIdentifier: String(data.image_model_identifier), verificationMethodologyVersion: String(data.verification_methodology_version), createdAt: String(data.created_at) };
  }

  async findByTransactionId(transactionId: string): Promise<SemanticSnapshotRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("semantic_snapshots").select("*"), this.ownerTenantId).eq("transaction_id", transactionId).maybeSingle();
    if (error) throw new Error("No se pudo leer el snapshot semantico.");
    return data ? { id: String(data.id), transactionId: String(data.transaction_id), transactionSchemaVersion: String(data.transaction_schema_version), patchSchemaVersion: String(data.patch_schema_version), executorAdapterVersion: String(data.executor_adapter_version), provider: String(data.provider), imageModelIdentifier: String(data.image_model_identifier), verificationMethodologyVersion: String(data.verification_methodology_version), createdAt: String(data.created_at) } : null;
  }
}

export class SupabaseImageEvidenceRepository implements ImageEvidenceRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateImageEvidenceRecord): Promise<ImageEvidenceRecord> {
    const { data, error } = await this.client
      .from("image_evidence")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), evidence_receipt_id: input.evidenceReceiptId, source_hash: input.sourceHash, candidate_hash: input.candidateHash, source_width: input.sourceWidth, source_height: input.sourceHeight, candidate_width: input.candidateWidth, candidate_height: input.candidateHeight, normalized_total_diff: input.normalizedTotalDiff, normalized_roi_diff: input.normalizedRoiDiff, normalized_outside_roi_diff: input.normalizedOutsideRoiDiff, changed_pixel_ratio_total: input.changedPixelRatioTotal, changed_pixel_ratio_inside: input.changedPixelRatioInside, changed_pixel_ratio_outside: input.changedPixelRatioOutside, methodology: input.methodology })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear la evidencia de imagen.");
    return { id: String(data.id), evidenceReceiptId: String(data.evidence_receipt_id), sourceHash: String(data.source_hash), candidateHash: String(data.candidate_hash), sourceWidth: Number(data.source_width), sourceHeight: Number(data.source_height), candidateWidth: Number(data.candidate_width), candidateHeight: Number(data.candidate_height), normalizedTotalDiff: Number(data.normalized_total_diff), normalizedRoiDiff: Number(data.normalized_roi_diff), normalizedOutsideRoiDiff: Number(data.normalized_outside_roi_diff), changedPixelRatioTotal: Number(data.changed_pixel_ratio_total), changedPixelRatioInside: Number(data.changed_pixel_ratio_inside), changedPixelRatioOutside: Number(data.changed_pixel_ratio_outside), methodology: String(data.methodology), createdAt: String(data.created_at) };
  }

  async findByEvidenceReceiptId(evidenceReceiptId: string): Promise<ImageEvidenceRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("image_evidence").select("*"), this.ownerTenantId).eq("evidence_receipt_id", evidenceReceiptId).maybeSingle();
    if (error) throw new Error("No se pudo leer la evidencia de imagen.");
    return data ? { id: String(data.id), evidenceReceiptId: String(data.evidence_receipt_id), sourceHash: String(data.source_hash), candidateHash: String(data.candidate_hash), sourceWidth: Number(data.source_width), sourceHeight: Number(data.source_height), candidateWidth: Number(data.candidate_width), candidateHeight: Number(data.candidate_height), normalizedTotalDiff: Number(data.normalized_total_diff), normalizedRoiDiff: Number(data.normalized_roi_diff), normalizedOutsideRoiDiff: Number(data.normalized_outside_roi_diff), changedPixelRatioTotal: Number(data.changed_pixel_ratio_total), changedPixelRatioInside: Number(data.changed_pixel_ratio_inside), changedPixelRatioOutside: Number(data.changed_pixel_ratio_outside), methodology: String(data.methodology), createdAt: String(data.created_at) } : null;
  }
}

export class SupabaseCandidateAssetRepository implements CandidateAssetRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateCandidateAssetRecord): Promise<CandidateAssetRecord> {
    const { data, error } = await this.client
      .from("candidate_assets")
      .insert({ owner_tenant_id: requireTenantScope(this.ownerTenantId), transaction_id: input.transactionId, execution_run_id: input.executionRunId, storage_key: input.storageKey, mime_type: input.mimeType, width: input.width, height: input.height, byte_size: input.byteSize, sha256: input.sha256, roi: input.roi, instruction: input.instruction, provider: input.provider, model: input.model, cost_usd: input.costUsd, candidate_type: input.candidateType, source_version_id: input.sourceVersionId, raw_candidate_id: input.rawCandidateId, preservation_run_id: input.preservationRunId, committed: input.committed })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el asset candidato.");
    return fromCandidateAssetRow(data);
  }

  async findById(id: string): Promise<CandidateAssetRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("candidate_assets").select("*"), this.ownerTenantId).eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer el asset candidato.");
    return data ? fromCandidateAssetRow(data) : null;
  }

  async findByTransactionId(transactionId: string): Promise<CandidateAssetRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("candidate_assets").select("*"), this.ownerTenantId).eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los assets candidatos.");
    return data.map(fromCandidateAssetRow);
  }

  async findByExecutionRunId(executionRunId: string): Promise<CandidateAssetRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("candidate_assets").select("*"), this.ownerTenantId).eq("execution_run_id", executionRunId).eq("candidate_type", "RAW_PROVIDER").maybeSingle();
    if (error) throw new Error("No se pudo leer el asset candidato.");
    return data ? fromCandidateAssetRow(data) : null;
  }

  async findByExecutionRunIdAndType(executionRunId: string, candidateType: CandidateType): Promise<CandidateAssetRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("candidate_assets").select("*"), this.ownerTenantId).eq("execution_run_id", executionRunId).eq("candidate_type", candidateType).maybeSingle();
    if (error) throw new Error("No se pudo leer el asset candidato por tipo.");
    return data ? fromCandidateAssetRow(data) : null;
  }

  async markCommitted(id: string): Promise<CandidateAssetRecord> {
    const { data, error } = await ownedQuery(this.client.from("candidate_assets").update({ committed: true }), this.ownerTenantId).eq("id", id).select("*").single();
    if (error || !data) throw new Error("No se pudo marcar el asset candidato como commitido.");
    return fromCandidateAssetRow(data);
  }
}

export class SupabasePreservationRunRepository implements PreservationRunRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreatePreservationRunRecord): Promise<PreservationRunRecord> {
    const { data, error } = await this.client.from("preservation_runs").insert({ ...toPreservationRunRow(input), owner_tenant_id: requireTenantScope(this.ownerTenantId) }).select("*").single();
    if (error || !data) throw new Error("No se pudo crear la ejecución de preservación.");
    return fromPreservationRunRow(data);
  }

  async findById(id: string): Promise<PreservationRunRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("preservation_runs").select("*"), this.ownerTenantId).eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer la ejecución de preservación.");
    return data ? fromPreservationRunRow(data) : null;
  }

  async findByTransactionId(transactionId: string): Promise<PreservationRunRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("preservation_runs").select("*"), this.ownerTenantId).eq("transaction_id", transactionId).order("started_at");
    if (error || !data) throw new Error("No se pudieron leer las ejecuciones de preservación.");
    return data.map(fromPreservationRunRow);
  }

  async update(id: string, input: Partial<Omit<PreservationRunRecord, "id" | "transactionId" | "executionRunId" | "sourceVersionId" | "rawCandidateId" | "startedAt">>): Promise<PreservationRunRecord> {
    const payload: Record<string, unknown> = {};
    if (input.preservedCandidateId !== undefined) payload.preserved_candidate_id = input.preservedCandidateId;
    if (input.zones !== undefined) payload.zones = input.zones;
    if (input.status !== undefined) payload.status = input.status;
    if (input.errorCode !== undefined) payload.error_code = input.errorCode;
    if (input.errorMessage !== undefined) payload.error_message = input.errorMessage;
    if (input.processingTimeMs !== undefined) payload.processing_time_ms = input.processingTimeMs;
    if (input.completedAt !== undefined) payload.completed_at = input.completedAt;
    const { data, error } = await ownedQuery(this.client.from("preservation_runs").update(payload), this.ownerTenantId).eq("id", id).select("*").single();
    if (error || !data) throw new Error("No se pudo actualizar la ejecución de preservación.");
    return fromPreservationRunRow(data);
  }
}

export class SupabasePreservationEvidenceRepository implements PreservationEvidenceRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreatePreservationEvidenceRecord): Promise<PreservationEvidenceRecord> {
    const metrics = input.metrics;
    const { data, error } = await this.client.from("preservation_evidence").insert({
      owner_tenant_id: requireTenantScope(this.ownerTenantId),
      preservation_run_id: input.preservationRunId,
      candidate_id: input.candidateId,
      candidate_type: input.candidateType,
      methodology_version: metrics.methodologyVersion,
      mean_total_pixel_diff: metrics.meanTotalPixelDiff,
      changed_pixel_ratio_total: metrics.changedPixelRatioTotal,
      mean_core_pixel_diff: metrics.meanCorePixelDiff,
      changed_pixel_ratio_core: metrics.changedPixelRatioCore,
      mean_coupled_pixel_diff: metrics.meanCoupledPixelDiff,
      changed_pixel_ratio_coupled: metrics.changedPixelRatioCoupled,
      mean_locked_outside_pixel_diff: metrics.meanLockedOutsidePixelDiff,
      changed_pixel_ratio_locked_outside: metrics.changedPixelRatioLockedOutside,
    }).select("*").single();
    if (error || !data) throw new Error("No se pudo crear la evidencia de preservación.");
    return fromPreservationEvidenceRow(data);
  }

  async findByPreservationRunId(preservationRunId: string): Promise<PreservationEvidenceRecord[]> {
    const { data, error } = await ownedQuery(this.client.from("preservation_evidence").select("*"), this.ownerTenantId).eq("preservation_run_id", preservationRunId).order("created_at");
    if (error || !data) throw new Error("No se pudo leer la evidencia de preservación.");
    return data.map(fromPreservationEvidenceRow);
  }

  async findByCandidateId(candidateId: string): Promise<PreservationEvidenceRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("preservation_evidence").select("*"), this.ownerTenantId).eq("candidate_id", candidateId).maybeSingle();
    if (error) throw new Error("No se pudo leer la evidencia del candidato.");
    return data ? fromPreservationEvidenceRow(data) : null;
  }
}

export class SupabaseCandidatePreferenceRepository implements CandidatePreferenceRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId?: string) {}

  async create(input: CreateCandidatePreferenceRecord): Promise<CandidatePreferenceRecord> {
    const { data, error } = await this.client.from("candidate_preferences").insert({
      owner_tenant_id: requireTenantScope(this.ownerTenantId),
      transaction_id: input.transactionId,
      raw_candidate_id: input.rawCandidateId,
      preserved_candidate_id: input.preservedCandidateId,
      preference: input.preference,
      evaluation_tags: input.evaluationTags ?? [],
      notes: input.notes ?? null,
    }).select("*").single();
    if (error || !data) throw new Error("No se pudo registrar la preferencia.");
    return fromCandidatePreferenceRow(data);
  }

  async findByTransactionId(transactionId: string): Promise<CandidatePreferenceRecord | null> {
    const { data, error } = await ownedQuery(this.client.from("candidate_preferences").select("*"), this.ownerTenantId).eq("transaction_id", transactionId).maybeSingle();
    if (error) throw new Error("No se pudo leer la preferencia.");
    return data ? fromCandidatePreferenceRow(data) : null;
  }

  async recordAcceptance(transactionId: string, humanAccepted: boolean, acceptedCandidateId: string | null): Promise<CandidatePreferenceRecord> {
    const { data, error } = await ownedQuery(this.client.from("candidate_preferences").update({ human_accepted: humanAccepted, accepted_candidate_id: acceptedCandidateId, updated_at: new Date().toISOString() }), this.ownerTenantId).eq("transaction_id", transactionId).select("*").single();
    if (error || !data) throw new Error("No se pudo registrar la decisión humana.");
    return fromCandidatePreferenceRow(data);
  }
}

function fromCandidateAssetRow(row: Record<string, unknown>): CandidateAssetRecord {
  return {
    id: String(row.id), transactionId: String(row.transaction_id), executionRunId: String(row.execution_run_id),
    storageKey: String(row.storage_key), mimeType: String(row.mime_type), width: Number(row.width), height: Number(row.height),
    byteSize: Number(row.byte_size), sha256: String(row.sha256), roi: row.roi as Record<string, number>, instruction: String(row.instruction),
    provider: String(row.provider), model: String(row.model), costUsd: row.cost_usd === null ? null : Number(row.cost_usd),
    candidateType: row.candidate_type as CandidateType, sourceVersionId: String(row.source_version_id),
    rawCandidateId: row.raw_candidate_id === null ? null : String(row.raw_candidate_id),
    preservationRunId: row.preservation_run_id === null ? null : String(row.preservation_run_id),
    committed: Boolean(row.committed), createdAt: String(row.created_at),
  };
}

function toPreservationRunRow(input: CreatePreservationRunRecord): Record<string, unknown> {
  return {
    transaction_id: input.transactionId, execution_run_id: input.executionRunId, source_version_id: input.sourceVersionId,
    raw_candidate_id: input.rawCandidateId, preserved_candidate_id: input.preservedCandidateId, policy_version: input.policyVersion,
    methodology_version: input.methodologyVersion, core_roi: input.coreRoi, coupled_band: input.coupledBand, zones: input.zones,
    status: input.status, error_code: input.errorCode, error_message: input.errorMessage, processing_time_ms: input.processingTimeMs,
    started_at: input.startedAt, completed_at: input.completedAt,
  };
}

function fromPreservationRunRow(row: Record<string, unknown>): PreservationRunRecord {
  return {
    id: String(row.id), transactionId: String(row.transaction_id), executionRunId: String(row.execution_run_id),
    sourceVersionId: String(row.source_version_id), rawCandidateId: String(row.raw_candidate_id),
    preservedCandidateId: row.preserved_candidate_id === null ? null : String(row.preserved_candidate_id),
    policyVersion: String(row.policy_version), methodologyVersion: String(row.methodology_version),
    coreRoi: row.core_roi as Record<string, number>, coupledBand: row.coupled_band as PreservationRunRecord["coupledBand"],
    zones: row.zones as PreservationRunRecord["zones"], status: row.status as PreservationRunRecord["status"],
    errorCode: row.error_code === null ? null : row.error_code as PreservationRunRecord["errorCode"],
    errorMessage: row.error_message === null ? null : String(row.error_message),
    processingTimeMs: row.processing_time_ms === null ? null : Number(row.processing_time_ms),
    startedAt: String(row.started_at), completedAt: row.completed_at === null ? null : String(row.completed_at),
  };
}

function fromPreservationEvidenceRow(row: Record<string, unknown>): PreservationEvidenceRecord {
  return {
    id: String(row.id), preservationRunId: String(row.preservation_run_id), candidateId: String(row.candidate_id),
    candidateType: row.candidate_type as CandidateType, createdAt: String(row.created_at), metrics: {
      methodologyVersion: "pixel-diff-zones-v0.1", meanTotalPixelDiff: Number(row.mean_total_pixel_diff),
      changedPixelRatioTotal: Number(row.changed_pixel_ratio_total), meanCorePixelDiff: Number(row.mean_core_pixel_diff),
      changedPixelRatioCore: Number(row.changed_pixel_ratio_core), meanCoupledPixelDiff: Number(row.mean_coupled_pixel_diff),
      changedPixelRatioCoupled: Number(row.changed_pixel_ratio_coupled), meanLockedOutsidePixelDiff: Number(row.mean_locked_outside_pixel_diff),
      changedPixelRatioLockedOutside: Number(row.changed_pixel_ratio_locked_outside),
    },
  };
}

function fromCandidatePreferenceRow(row: Record<string, unknown>): CandidatePreferenceRecord {
  return {
    id: String(row.id), transactionId: String(row.transaction_id), rawCandidateId: String(row.raw_candidate_id),
    preservedCandidateId: String(row.preserved_candidate_id), preference: row.preference as CandidatePreferenceRecord["preference"],
    evaluationTags: Array.isArray(row.evaluation_tags) ? row.evaluation_tags as CandidatePreferenceRecord["evaluationTags"] : [],
    notes: row.notes === null || row.notes === undefined ? null : String(row.notes),
    humanAccepted: row.human_accepted === null ? null : Boolean(row.human_accepted),
    acceptedCandidateId: row.accepted_candidate_id === null ? null : String(row.accepted_candidate_id),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function resolveOwner(inputOwner: string | null | undefined, scopedOwner: string | undefined): string | null {
  const scope = requireTenantScope(scopedOwner);
  if (inputOwner && inputOwner !== scope) {
    throw new Error("Canonical tenant ownership does not match the authorized repository scope.");
  }
  return scope;
}

function criterionEvidenceRow(row: Record<string, unknown>): CriterionEvidenceRecord {
  return CriterionEvidenceRecordSchema.parse({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    transactionId: String(row.transaction_id),
    verificationRunId: String(row.verification_run_id),
    executionRunId: String(row.execution_run_id),
    criterionId: String(row.criterion_id),
    status: row.status as CriterionEvidenceRecord["status"],
    evidenceType: row.evidence_type as CriterionEvidenceRecord["evidenceType"],
    issuerRole: row.issuer_role as CriterionEvidenceRecord["issuerRole"],
    taskSpecId: String(row.task_spec_id),
    taskSpecVersion: Number(row.task_spec_version),
    taskSpecHash: String(row.task_spec_hash),
    artifactBindings: row.artifact_bindings as CriterionEvidenceRecord["artifactBindings"],
    verifier: row.verifier as CriterionEvidenceRecord["verifier"],
    evidenceRef: String(row.evidence_ref),
    details: row.details as Record<string, unknown>,
    createdAt: String(row.created_at),
  });
}
