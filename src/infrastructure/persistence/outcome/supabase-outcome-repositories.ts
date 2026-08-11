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
  StateCommitRepository,
  StateCommitRecord,
  CreateStateCommitRecord,
  CostRecordRepository,
  CostRecordRecord,
  CreateCostRecordRecord,
} from "@/src/application/ports/repositories";
import type { TransactionStatus } from "@/src/domain/outcome";

export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateProjectRecord): Promise<ProjectRecord> {
    const { data, error } = await this.client
      .from("projects")
      .insert({ name: input.name, description: input.description })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el proyecto.");
    return { id: String(data.id), name: String(data.name), description: data.description ? String(data.description) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) };
  }

  async findById(id: string): Promise<ProjectRecord | null> {
    const { data, error } = await this.client.from("projects").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer el proyecto.");
    return data ? { id: String(data.id), name: String(data.name), description: data.description ? String(data.description) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) } : null;
  }

  async list(): Promise<ProjectRecord[]> {
    const { data, error } = await this.client.from("projects").select("*").order("created_at", { ascending: false });
    if (error || !data) throw new Error("No se pudieron leer los proyectos.");
    return data.map((row) => ({ id: String(row.id), name: String(row.name), description: row.description ? String(row.description) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) }));
  }

  async update(id: string, input: Partial<CreateProjectRecord>): Promise<ProjectRecord> {
    const { data, error } = await this.client.from("projects").update({ name: input.name, description: input.description }).eq("id", id).select("*").single();
    if (error || !data) throw new Error("No se pudo actualizar el proyecto.");
    return { id: String(data.id), name: String(data.name), description: data.description ? String(data.description) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) };
  }
}

export class SupabaseAssetRepository implements AssetRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateAssetRecord): Promise<AssetRecord> {
    const { data, error } = await this.client
      .from("assets")
      .insert({ project_id: input.projectId, name: input.name, description: input.description })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el activo.");
    return { id: String(data.id), projectId: String(data.project_id), name: String(data.name), description: data.description ? String(data.description) : null, currentVersionId: data.current_version_id ? String(data.current_version_id) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) };
  }

  async findById(id: string): Promise<AssetRecord | null> {
    const { data, error } = await this.client.from("assets").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer el activo.");
    return data ? { id: String(data.id), projectId: String(data.project_id), name: String(data.name), description: data.description ? String(data.description) : null, currentVersionId: data.current_version_id ? String(data.current_version_id) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) } : null;
  }

  async findByProjectId(projectId: string): Promise<AssetRecord[]> {
    const { data, error } = await this.client.from("assets").select("*").eq("project_id", projectId);
    if (error || !data) throw new Error("No se pudieron leer los activos.");
    return data.map((row) => ({ id: String(row.id), projectId: String(row.project_id), name: String(row.name), description: row.description ? String(row.description) : null, currentVersionId: row.current_version_id ? String(row.current_version_id) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) }));
  }

  async update(id: string, input: Partial<CreateAssetRecord> & { currentVersionId?: string | null }): Promise<AssetRecord> {
    const { data, error } = await this.client.from("assets").update({ project_id: input.projectId, name: input.name, description: input.description, current_version_id: input.currentVersionId }).eq("id", id).select("*").single();
    if (error || !data) throw new Error("No se pudo actualizar el activo.");
    return { id: String(data.id), projectId: String(data.project_id), name: String(data.name), description: data.description ? String(data.description) : null, currentVersionId: data.current_version_id ? String(data.current_version_id) : null, createdAt: String(data.created_at), updatedAt: String(data.updated_at) };
  }
}

export class SupabaseAssetVersionRepository implements AssetVersionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateAssetVersionRecord): Promise<AssetVersionRecord> {
    const { data, error } = await this.client
      .from("asset_versions")
      .insert({ asset_id: input.assetId, version_number: input.versionNumber, state: input.state, parent_version_id: input.parentVersionId })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear la versión.");
    return { id: String(data.id), assetId: String(data.asset_id), versionNumber: Number(data.version_number), state: data.state as Record<string, unknown>, parentVersionId: data.parent_version_id ? String(data.parent_version_id) : null, createdAt: String(data.created_at) };
  }

  async findById(id: string): Promise<AssetVersionRecord | null> {
    const { data, error } = await this.client.from("asset_versions").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer la versión.");
    return data ? { id: String(data.id), assetId: String(data.asset_id), versionNumber: Number(data.version_number), state: data.state as Record<string, unknown>, parentVersionId: data.parent_version_id ? String(data.parent_version_id) : null, createdAt: String(data.created_at) } : null;
  }

  async findByAssetId(assetId: string): Promise<AssetVersionRecord[]> {
    const { data, error } = await this.client.from("asset_versions").select("*").eq("asset_id", assetId).order("version_number");
    if (error || !data) throw new Error("No se pudieron leer las versiones.");
    return data.map((row) => ({ id: String(row.id), assetId: String(row.asset_id), versionNumber: Number(row.version_number), state: row.state as Record<string, unknown>, parentVersionId: row.parent_version_id ? String(row.parent_version_id) : null, createdAt: String(row.created_at) }));
  }

  async findLatestByAssetId(assetId: string): Promise<AssetVersionRecord | null> {
    const { data, error } = await this.client.from("asset_versions").select("*").eq("asset_id", assetId).order("version_number", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error("No se pudo leer la última versión.");
    return data ? { id: String(data.id), assetId: String(data.asset_id), versionNumber: Number(data.version_number), state: data.state as Record<string, unknown>, parentVersionId: data.parent_version_id ? String(data.parent_version_id) : null, createdAt: String(data.created_at) } : null;
  }
}

export class SupabaseOutcomeTransactionRepository implements OutcomeTransactionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateOutcomeTransactionRecord): Promise<OutcomeTransactionRecord> {
    const { data, error } = await this.client
      .from("outcome_transactions")
      .insert({ project_id: input.projectId, asset_id: input.assetId, base_version_id: input.baseVersionId, raw_request: input.rawRequest, status: "DRAFT" })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear la transacción.");
    return { id: String(data.id), projectId: String(data.project_id), assetId: String(data.asset_id), baseVersionId: String(data.base_version_id), status: data.status as TransactionStatus, rawRequest: String(data.raw_request), createdAt: String(data.created_at), updatedAt: String(data.updated_at), completedAt: data.completed_at ? String(data.completed_at) : null, abortReason: data.abort_reason ? String(data.abort_reason) : null };
  }

  async findById(id: string): Promise<OutcomeTransactionRecord | null> {
    const { data, error } = await this.client.from("outcome_transactions").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo leer la transacción.");
    return data ? { id: String(data.id), projectId: String(data.project_id), assetId: String(data.asset_id), baseVersionId: String(data.base_version_id), status: data.status as TransactionStatus, rawRequest: String(data.raw_request), createdAt: String(data.created_at), updatedAt: String(data.updated_at), completedAt: data.completed_at ? String(data.completed_at) : null, abortReason: data.abort_reason ? String(data.abort_reason) : null } : null;
  }

  async findByAssetId(assetId: string): Promise<OutcomeTransactionRecord[]> {
    const { data, error } = await this.client.from("outcome_transactions").select("*").eq("asset_id", assetId);
    if (error || !data) throw new Error("No se pudieron leer las transacciones.");
    return data.map((row) => ({ id: String(row.id), projectId: String(row.project_id), assetId: String(row.asset_id), baseVersionId: String(row.base_version_id), status: row.status as TransactionStatus, rawRequest: String(row.raw_request), createdAt: String(row.created_at), updatedAt: String(row.updated_at), completedAt: row.completed_at ? String(row.completed_at) : null, abortReason: row.abort_reason ? String(row.abort_reason) : null }));
  }

  async updateStatus(id: string, status: TransactionStatus, extra?: { abortReason?: string | null; completedAt?: string | null }): Promise<OutcomeTransactionRecord> {
    const { data, error } = await this.client.from("outcome_transactions").update({ status, abort_reason: extra?.abortReason, completed_at: extra?.completedAt }).eq("id", id).select("*").single();
    if (error || !data) throw new Error("No se pudo actualizar la transacción.");
    return { id: String(data.id), projectId: String(data.project_id), assetId: String(data.asset_id), baseVersionId: String(data.base_version_id), status: data.status as TransactionStatus, rawRequest: String(data.raw_request), createdAt: String(data.created_at), updatedAt: String(data.updated_at), completedAt: data.completed_at ? String(data.completed_at) : null, abortReason: data.abort_reason ? String(data.abort_reason) : null };
  }
}

export class SupabasePartialIntentRepository implements PartialIntentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreatePartialIntentRecord): Promise<PartialIntentRecord> {
    const { data, error } = await this.client
      .from("partial_intents")
      .insert({ transaction_id: input.transactionId, raw_input: input.rawInput, target_path: input.targetPath, operation: input.operation, desired_value: input.desiredValue })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el intent parcial.");
    return { id: String(data.id), transactionId: String(data.transaction_id), rawInput: String(data.raw_input), targetPath: String(data.target_path), operation: data.operation as PartialIntentRecord["operation"], desiredValue: data.desired_value, createdAt: String(data.created_at) };
  }

  async findByTransactionId(transactionId: string): Promise<PartialIntentRecord[]> {
    const { data, error } = await this.client.from("partial_intents").select("*").eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los intents parciales.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), rawInput: String(row.raw_input), targetPath: String(row.target_path), operation: row.operation as PartialIntentRecord["operation"], desiredValue: row.desired_value, createdAt: String(row.created_at) }));
  }
}

export class SupabaseSemanticPatchRepository implements SemanticPatchRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateSemanticPatchRecord): Promise<SemanticPatchRecord> {
    const { data, error } = await this.client
      .from("transaction_patches")
      .insert({ transaction_id: input.transactionId, partial_intent_id: input.partialIntentId, operation: input.operation, target_path: input.targetPath, parameters: input.parameters })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el parche semántico.");
    return { id: String(data.id), transactionId: String(data.transaction_id), partialIntentId: String(data.partial_intent_id), operation: data.operation as SemanticPatchRecord["operation"], targetPath: String(data.target_path), parameters: data.parameters as Record<string, unknown>, createdAt: String(data.created_at) };
  }

  async findByTransactionId(transactionId: string): Promise<SemanticPatchRecord[]> {
    const { data, error } = await this.client.from("transaction_patches").select("*").eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los parches.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), partialIntentId: String(row.partial_intent_id), operation: row.operation as SemanticPatchRecord["operation"], targetPath: String(row.target_path), parameters: row.parameters as Record<string, unknown>, createdAt: String(row.created_at) }));
  }
}

export class SupabaseMutationLeaseRepository implements MutationLeaseRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateMutationLeaseRecord): Promise<MutationLeaseRecord> {
    const { data, error } = await this.client
      .from("mutation_leases")
      .insert({ transaction_id: input.transactionId, target_path: input.targetPath, category: input.category, reason: input.reason })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el lease de mutación.");
    return { id: String(data.id), transactionId: String(data.transaction_id), targetPath: String(data.target_path), category: data.category as MutationLeaseRecord["category"], reason: data.reason ? String(data.reason) : null, createdAt: String(data.created_at) };
  }

  async findByTransactionId(transactionId: string): Promise<MutationLeaseRecord[]> {
    const { data, error } = await this.client.from("mutation_leases").select("*").eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los leases.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), targetPath: String(row.target_path), category: row.category as MutationLeaseRecord["category"], reason: row.reason ? String(row.reason) : null, createdAt: String(row.created_at) }));
  }
}

export class SupabaseExecutionRunRepository implements ExecutionRunRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateExecutionRunRecord): Promise<ExecutionRunRecord> {
    const { data, error } = await this.client
      .from("execution_runs")
      .insert({ transaction_id: input.transactionId, status: input.status, executor: input.executor, started_at: input.startedAt, completed_at: input.completedAt, latency_ms: input.latencyMs, cost_usd: input.costUsd, error_message: input.errorMessage, metadata: input.metadata })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear la ejecución.");
    return { id: String(data.id), transactionId: String(data.transaction_id), status: data.status as ExecutionRunRecord["status"], executor: String(data.executor), startedAt: String(data.started_at), completedAt: String(data.completed_at), latencyMs: Number(data.latency_ms), costUsd: Number(data.cost_usd), errorMessage: data.error_message ? String(data.error_message) : null, metadata: data.metadata as Record<string, unknown> };
  }

  async findByTransactionId(transactionId: string): Promise<ExecutionRunRecord[]> {
    const { data, error } = await this.client.from("execution_runs").select("*").eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer las ejecuciones.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), status: row.status as ExecutionRunRecord["status"], executor: String(row.executor), startedAt: String(row.started_at), completedAt: String(row.completed_at), latencyMs: Number(row.latency_ms), costUsd: Number(row.cost_usd), errorMessage: row.error_message ? String(row.error_message) : null, metadata: row.metadata as Record<string, unknown> }));
  }
}

export class SupabaseEvidenceReceiptRepository implements EvidenceReceiptRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateEvidenceReceiptRecord): Promise<EvidenceReceiptRecord> {
    const { data, error } = await this.client
      .from("evidence_receipts")
      .insert({ transaction_id: input.transactionId, execution_run_id: input.executionRunId, base_version_id: input.baseVersionId, operation: input.operation, target: input.target, requested_effect: input.requestedEffect, observed_effect: input.observedEffect, executor: input.executor, started_at: input.startedAt, completed_at: input.completedAt, cost_usd: input.costUsd, success: input.success })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el recibo de evidencia.");
    return { id: String(data.id), transactionId: String(data.transaction_id), executionRunId: String(data.execution_run_id), baseVersionId: String(data.base_version_id), operation: String(data.operation), target: String(data.target), requestedEffect: data.requested_effect, observedEffect: data.observed_effect, executor: String(data.executor), startedAt: String(data.started_at), completedAt: String(data.completed_at), costUsd: Number(data.cost_usd), success: Boolean(data.success) };
  }

  async findByTransactionId(transactionId: string): Promise<EvidenceReceiptRecord[]> {
    const { data, error } = await this.client.from("evidence_receipts").select("*").eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los recibos de evidencia.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), executionRunId: String(row.execution_run_id), baseVersionId: String(row.base_version_id), operation: String(row.operation), target: String(row.target), requestedEffect: row.requested_effect, observedEffect: row.observed_effect, executor: String(row.executor), startedAt: String(row.started_at), completedAt: String(row.completed_at), costUsd: Number(row.cost_usd), success: Boolean(row.success) }));
  }
}

export class SupabaseVerificationRunRepository implements VerificationRunRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateVerificationRunRecord): Promise<VerificationRunRecord> {
    const { data, error } = await this.client
      .from("verification_runs")
      .insert({ transaction_id: input.transactionId, execution_run_id: input.executionRunId, status: input.status, checks: input.checks, details: input.details })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear la verificación.");
    return { id: String(data.id), transactionId: String(data.transaction_id), executionRunId: String(data.execution_run_id), status: data.status as VerificationRunRecord["status"], checks: data.checks as Record<string, boolean>, details: data.details as Record<string, unknown>, verifiedAt: String(data.verified_at) };
  }

  async findByTransactionId(transactionId: string): Promise<VerificationRunRecord[]> {
    const { data, error } = await this.client.from("verification_runs").select("*").eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer las verificaciones.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), executionRunId: String(row.execution_run_id), status: row.status as VerificationRunRecord["status"], checks: row.checks as Record<string, boolean>, details: row.details as Record<string, unknown>, verifiedAt: String(row.verified_at) }));
  }
}

export class SupabaseStateCommitRepository implements StateCommitRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateStateCommitRecord): Promise<StateCommitRecord> {
    const { data, error } = await this.client
      .from("state_commits")
      .insert({ transaction_id: input.transactionId, asset_id: input.assetId, new_version_id: input.newVersionId, previous_version_id: input.previousVersionId })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el commit de estado.");
    return { id: String(data.id), transactionId: String(data.transaction_id), assetId: String(data.asset_id), newVersionId: String(data.new_version_id), previousVersionId: String(data.previous_version_id), committedAt: String(data.committed_at) };
  }

  async findByTransactionId(transactionId: string): Promise<StateCommitRecord | null> {
    const { data, error } = await this.client.from("state_commits").select("*").eq("transaction_id", transactionId).maybeSingle();
    if (error) throw new Error("No se pudo leer el commit.");
    return data ? { id: String(data.id), transactionId: String(data.transaction_id), assetId: String(data.asset_id), newVersionId: String(data.new_version_id), previousVersionId: String(data.previous_version_id), committedAt: String(data.committed_at) } : null;
  }
}

export class SupabaseCostRecordRepository implements CostRecordRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateCostRecordRecord): Promise<CostRecordRecord> {
    const { data, error } = await this.client
      .from("cost_records")
      .insert({ transaction_id: input.transactionId, execution_run_id: input.executionRunId, amount_usd: input.amountUsd, description: input.description })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear el registro de costo.");
    return { id: String(data.id), transactionId: String(data.transaction_id), executionRunId: data.execution_run_id ? String(data.execution_run_id) : null, amountUsd: Number(data.amount_usd), description: String(data.description), recordedAt: String(data.recorded_at) };
  }

  async findByTransactionId(transactionId: string): Promise<CostRecordRecord[]> {
    const { data, error } = await this.client.from("cost_records").select("*").eq("transaction_id", transactionId);
    if (error || !data) throw new Error("No se pudieron leer los registros de costo.");
    return data.map((row) => ({ id: String(row.id), transactionId: String(row.transaction_id), executionRunId: row.execution_run_id ? String(row.execution_run_id) : null, amountUsd: Number(row.amount_usd), description: String(row.description), recordedAt: String(row.recorded_at) }));
  }
}
