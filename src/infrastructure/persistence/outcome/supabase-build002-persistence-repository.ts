import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DelegationReadiness,
  DependencySnapshot,
  Signal,
  SignalQualification,
  SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";
import {
  DelegationReadinessSchema,
  DependencySnapshotSchema,
  SignalQualificationSchema,
  SignalRequirementSchema,
  SignalSchema,
  verifyDependencySnapshotHash,
  verifyQualificationHash,
  verifyReadinessHash,
  verifySignalContentHash,
  verifySignalRequirementHash,
} from "@/src/domain/outcome/signal-readiness";
import type {
  Build002PersistenceRepository,
  Build002ReadinessQualificationLink,
  Build002TenantSnapshotScope,
} from "@/src/application/ports/outcome/build002-persistence-repository";

type Row = Record<string, unknown>;

export class SupabaseBuild002PersistenceRepository implements Build002PersistenceRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId: string) {
    if (!ownerTenantId.trim()) throw new Error("TRUST_TENANT_SCOPE_REQUIRED");
  }

  async insertRequirementSnapshot(scope: Build002TenantSnapshotScope, requirement: SignalRequirement): Promise<SignalRequirement> {
    this.assertScope(scope);
    if (!verifySignalRequirementHash(requirement)) throw new Error("BUILD002_REQUIREMENT_HASH_INVALID");
    const { data, error } = await this.client.from("build002_signal_requirements").insert({
      owner_tenant_id: this.ownerTenantId,
      outcome_transaction_id: scope.outcomeTransactionId,
      requirement_id: requirement.requirementId,
      semantic_type: requirement.semanticType,
      critical: requirement.critical,
      accepted_provenance: requirement.acceptedProvenance,
      qualification_rule: requirement.qualificationRule,
      dependency_selectors: requirement.dependencySelectors,
      blueprint_id: requirement.blueprintId,
      blueprint_version: requirement.blueprintVersion,
      blueprint_hash: requirement.blueprintHash,
      policy_id: requirement.policyId,
      policy_hash: requirement.policyHash,
      schema_version: requirement.definitionSchemaVersion,
      requirement_definition_hash: requirement.requirementDefinitionHash,
      created_at: requirement.createdAt,
    }).select("*").single();
    if (error || !data) throw new Error("BUILD002_REQUIREMENT_PERSISTENCE_FAILED");
    return requirementFromRow(data as Row);
  }

  async findRequirementSnapshot(scope: Build002TenantSnapshotScope, requirementDefinitionHash: string): Promise<SignalRequirement | null> {
    this.assertScope(scope);
    const { data, error } = await this.client.from("build002_signal_requirements").select("*").eq("owner_tenant_id", this.ownerTenantId).eq("outcome_transaction_id", scope.outcomeTransactionId).eq("requirement_definition_hash", requirementDefinitionHash).maybeSingle();
    if (error) throw new Error("BUILD002_REQUIREMENT_READ_FAILED");
    return data ? requirementFromRow(data as Row) : null;
  }

  async insertSignal(scope: Build002TenantSnapshotScope, requirementDefinitionHash: string, signal: Signal): Promise<Signal> {
    this.assertScope(scope);
    this.assertDomainScope(scope, signal.ownerTenantId, signal.transactionId);
    if (!verifySignalContentHash(signal)) throw new Error("BUILD002_SIGNAL_HASH_INVALID");
    const { data, error } = await this.client.from("build002_signals").insert({
      signal_id: signal.signalId,
      owner_tenant_id: this.ownerTenantId,
      outcome_transaction_id: scope.outcomeTransactionId,
      requirement_id: signal.requirementId,
      requirement_definition_hash: requirementDefinitionHash,
      payload: signal.payload,
      source: signal.source,
      provenance: signal.provenance,
      captured_at: signal.capturedAt,
      valid_until: signal.validUntil,
      dependency_identity: signal.dependency.identity,
      dependency_hash: signal.dependency.hash,
      schema_version: signal.schemaVersion,
      content_hash: signal.contentHash,
    }).select("*").single();
    if (error || !data) throw new Error("BUILD002_SIGNAL_PERSISTENCE_FAILED");
    return signalFromRow(data as Row);
  }

  async findSignal(scope: Build002TenantSnapshotScope, signalId: string): Promise<Signal | null> {
    this.assertScope(scope);
    const { data, error } = await this.client.from("build002_signals").select("*").eq("owner_tenant_id", this.ownerTenantId).eq("outcome_transaction_id", scope.outcomeTransactionId).eq("signal_id", signalId).maybeSingle();
    if (error) throw new Error("BUILD002_SIGNAL_READ_FAILED");
    return data ? signalFromRow(data as Row) : null;
  }

  async insertDependencySnapshot(scope: Build002TenantSnapshotScope, snapshot: DependencySnapshot): Promise<string> {
    this.assertScope(scope);
    this.assertDomainScope(scope, snapshot.ownerTenantId, snapshot.transactionId);
    if (!verifyDependencySnapshotHash(snapshot)) throw new Error("BUILD002_DEPENDENCY_HASH_INVALID");
    const { data, error } = await this.client.from("build002_dependency_snapshots").insert({
      owner_tenant_id: this.ownerTenantId,
      outcome_transaction_id: scope.outcomeTransactionId,
      requirement_definition_hashes: snapshot.requirementDefinitionHashes,
      signal_references: snapshot.signalReferences,
      dependency_bindings: snapshot.dependencyBindings,
      blueprint_hash: snapshot.blueprintHash,
      policy_hash: snapshot.policyHash,
      task_spec_hash: snapshot.taskSpecHash,
      transaction_semantic_hash: snapshot.transactionSemanticHash,
      source_asset_version_hash: snapshot.sourceAssetVersionHash,
      context_lens_hash: snapshot.contextLensHash,
      schema_version: snapshot.schemaVersion,
      dependency_snapshot_hash: snapshot.dependencySnapshotHash,
    }).select("*").single();
    if (error || !data) throw new Error("BUILD002_DEPENDENCY_PERSISTENCE_FAILED");
    const row = data as Row;
    const id = String(row.id);
    const requirementLinks = snapshot.requirementDefinitionHashes.map((hash) => ({ owner_tenant_id: this.ownerTenantId, outcome_transaction_id: scope.outcomeTransactionId, dependency_snapshot_id: id, requirement_definition_hash: hash }));
    const signalLinks = snapshot.signalReferences.map((reference) => ({ owner_tenant_id: this.ownerTenantId, outcome_transaction_id: scope.outcomeTransactionId, dependency_snapshot_id: id, signal_id: reference.signalId, signal_content_hash: reference.contentHash, requirement_id: reference.requirementId }));
    if (requirementLinks.length > 0) {
      const { error: linkError } = await this.client.from("build002_dependency_requirements").insert(requirementLinks);
      if (linkError) throw new Error("BUILD002_DEPENDENCY_REQUIREMENT_LINEAGE_FAILED");
    }
    if (signalLinks.length > 0) {
      const { error: linkError } = await this.client.from("build002_dependency_signals").insert(signalLinks);
      if (linkError) throw new Error("BUILD002_DEPENDENCY_SIGNAL_LINEAGE_FAILED");
    }
    return id;
  }

  async findDependencySnapshot(scope: Build002TenantSnapshotScope, dependencySnapshotHash: string): Promise<DependencySnapshot | null> {
    this.assertScope(scope);
    const { data, error } = await this.client.from("build002_dependency_snapshots").select("*").eq("owner_tenant_id", this.ownerTenantId).eq("outcome_transaction_id", scope.outcomeTransactionId).eq("dependency_snapshot_hash", dependencySnapshotHash).maybeSingle();
    if (error) throw new Error("BUILD002_DEPENDENCY_READ_FAILED");
    return data ? dependencyFromRow(data as Row) : null;
  }

  async insertQualification(scope: Build002TenantSnapshotScope, requirementDefinitionHash: string, dependencySnapshotId: string, qualification: SignalQualification): Promise<SignalQualification> {
    this.assertScope(scope);
    this.assertDomainScope(scope, qualification.ownerTenantId, qualification.transactionId);
    if (!verifyQualificationHash(qualification)) throw new Error("BUILD002_QUALIFICATION_HASH_INVALID");
    const { data, error } = await this.client.from("build002_signal_qualifications").insert({
      id: qualification.id,
      owner_tenant_id: this.ownerTenantId,
      outcome_transaction_id: scope.outcomeTransactionId,
      requirement_id: qualification.requirementId,
      requirement_definition_hash: requirementDefinitionHash,
      dependency_snapshot_id: dependencySnapshotId,
      dependency_snapshot_hash: qualification.dependencySnapshotHash,
      signal_ids: qualification.signalIds,
      signal_content_hashes: qualification.signalContentHashes,
      evaluator: qualification.evaluator,
      outcome: qualification.outcome,
      reason_code: qualification.reasonCode,
      evidence_valid_until: qualification.evidenceValidUntil,
      qualified_at: qualification.qualifiedAt,
      schema_version: qualification.schemaVersion,
      qualification_content_hash: qualification.qualificationContentHash,
    }).select("*").single();
    if (error || !data) throw new Error("BUILD002_QUALIFICATION_PERSISTENCE_FAILED");
    const links = qualification.signalIds.map((signalId, index) => ({ owner_tenant_id: this.ownerTenantId, outcome_transaction_id: scope.outcomeTransactionId, qualification_id: qualification.id, qualification_content_hash: qualification.qualificationContentHash, signal_id: signalId, signal_content_hash: qualification.signalContentHashes[index] ?? qualification.signalContentHashes[0] }));
    if (links.length > 0) {
      const { error: linkError } = await this.client.from("build002_qualification_signals").insert(links);
      if (linkError) throw new Error("BUILD002_QUALIFICATION_SIGNAL_LINEAGE_FAILED");
    }
    return qualificationFromRow(data as Row);
  }

  async findQualification(scope: Build002TenantSnapshotScope, qualificationId: string): Promise<SignalQualification | null> {
    this.assertScope(scope);
    const { data, error } = await this.client.from("build002_signal_qualifications").select("*").eq("owner_tenant_id", this.ownerTenantId).eq("outcome_transaction_id", scope.outcomeTransactionId).eq("id", qualificationId).maybeSingle();
    if (error) throw new Error("BUILD002_QUALIFICATION_READ_FAILED");
    return data ? qualificationFromRow(data as Row) : null;
  }

  async insertReadiness(scope: Build002TenantSnapshotScope, dependencySnapshotId: string, readiness: DelegationReadiness, qualificationLinks: Build002ReadinessQualificationLink[]): Promise<DelegationReadiness> {
    this.assertScope(scope);
    this.assertDomainScope(scope, readiness.ownerTenantId, readiness.transactionId);
    if (!verifyReadinessHash(readiness)) throw new Error("BUILD002_READINESS_HASH_INVALID");
    const { data, error } = await this.client.from("build002_delegation_readiness").insert({
      id: readiness.id,
      owner_tenant_id: this.ownerTenantId,
      outcome_transaction_id: scope.outcomeTransactionId,
      requirement_set_hash: readiness.requirementSetHash,
      qualification_set_hash: readiness.qualificationSetHash,
      dependency_snapshot_id: dependencySnapshotId,
      dependency_snapshot_hash: readiness.dependencySnapshotHash,
      task_spec_hash: readiness.taskSpecHash,
      source_asset_version_hash: readiness.sourceAssetVersionHash,
      blueprint_hash: readiness.blueprintHash,
      policy_hash: readiness.policyHash,
      evaluator: readiness.evaluator,
      state: readiness.state,
      blocking_codes: readiness.blockingCodes,
      condition_codes: readiness.conditionCodes,
      created_at: readiness.createdAt,
      valid_until: readiness.validUntil,
      schema_version: readiness.schemaVersion,
      readiness_content_hash: readiness.readinessContentHash,
    }).select("*").single();
    if (error || !data) throw new Error("BUILD002_READINESS_PERSISTENCE_FAILED");
    if (qualificationLinks.length > 0) {
      const links = qualificationLinks.map((link) => ({ owner_tenant_id: this.ownerTenantId, outcome_transaction_id: scope.outcomeTransactionId, readiness_id: readiness.id, readiness_content_hash: readiness.readinessContentHash, qualification_id: link.qualificationId, qualification_content_hash: link.qualificationContentHash }));
      const { error: linkError } = await this.client.from("build002_readiness_qualifications").insert(links);
      if (linkError) throw new Error("BUILD002_READINESS_QUALIFICATION_LINEAGE_FAILED");
    }
    return readinessFromRow(data as Row);
  }

  async findReadiness(scope: Build002TenantSnapshotScope, readinessId: string): Promise<DelegationReadiness | null> {
    this.assertScope(scope);
    const { data, error } = await this.client.from("build002_delegation_readiness").select("*").eq("owner_tenant_id", this.ownerTenantId).eq("outcome_transaction_id", scope.outcomeTransactionId).eq("id", readinessId).maybeSingle();
    if (error) throw new Error("BUILD002_READINESS_READ_FAILED");
    return data ? readinessFromRow(data as Row) : null;
  }

  async listReadiness(scope: Build002TenantSnapshotScope): Promise<DelegationReadiness[]> {
    this.assertScope(scope);
    const { data, error } = await this.client.from("build002_delegation_readiness").select("*").eq("owner_tenant_id", this.ownerTenantId).eq("outcome_transaction_id", scope.outcomeTransactionId).order("created_at", { ascending: false });
    if (error || !data) throw new Error("BUILD002_READINESS_LIST_FAILED");
    return data.map((row) => readinessFromRow(row as Row));
  }

  private assertScope(scope: Build002TenantSnapshotScope): void {
    if (scope.ownerTenantId.trim() !== this.ownerTenantId) throw new Error("TRUST_TENANT_SCOPE_MISMATCH");
    if (!scope.outcomeTransactionId.trim()) throw new Error("TRUST_TRANSACTION_SCOPE_REQUIRED");
  }

  private assertDomainScope(scope: Build002TenantSnapshotScope, ownerTenantId: string, transactionId: string): void {
    if (ownerTenantId !== scope.ownerTenantId || transactionId !== scope.outcomeTransactionId) throw new Error("TRUST_TENANT_SCOPE_MISMATCH");
  }
}

export function createTenantBuild002PersistenceRepository(client: SupabaseClient, ownerTenantId: string): Build002PersistenceRepository {
  return new SupabaseBuild002PersistenceRepository(client, ownerTenantId.trim());
}

function requirementFromRow(row: Row): SignalRequirement {
  return SignalRequirementSchema.parse({ requirementId: String(row.requirement_id), subjectKind: "OUTCOME_TRANSACTION", semanticType: String(row.semantic_type), critical: Boolean(row.critical), acceptedProvenance: row.accepted_provenance, qualificationRule: row.qualification_rule, dependencySelectors: row.dependency_selectors, blueprintId: String(row.blueprint_id), blueprintVersion: Number(row.blueprint_version), blueprintHash: String(row.blueprint_hash), policyId: row.policy_id === null ? null : String(row.policy_id), policyHash: row.policy_hash === null ? null : String(row.policy_hash), definitionSchemaVersion: String(row.schema_version), requirementDefinitionHash: String(row.requirement_definition_hash), createdAt: String(row.created_at) });
}

function signalFromRow(row: Row): Signal {
  return SignalSchema.parse({ signalId: String(row.signal_id), ownerTenantId: String(row.owner_tenant_id), transactionId: String(row.outcome_transaction_id), requirementId: String(row.requirement_id), payload: row.payload, source: row.source, provenance: String(row.provenance), capturedAt: String(row.captured_at), validUntil: row.valid_until === null ? null : String(row.valid_until), dependency: { identity: String(row.dependency_identity), hash: String(row.dependency_hash) }, schemaVersion: String(row.schema_version), contentHash: String(row.content_hash) });
}

function dependencyFromRow(row: Row): DependencySnapshot {
  return DependencySnapshotSchema.parse({ schemaVersion: String(row.schema_version), ownerTenantId: String(row.owner_tenant_id), transactionId: String(row.outcome_transaction_id), requirementDefinitionHashes: row.requirement_definition_hashes, signalReferences: row.signal_references, dependencyBindings: row.dependency_bindings, blueprintHash: row.blueprint_hash === null ? null : String(row.blueprint_hash), policyHash: row.policy_hash === null ? null : String(row.policy_hash), taskSpecHash: row.task_spec_hash === null ? null : String(row.task_spec_hash), transactionSemanticHash: row.transaction_semantic_hash === null ? null : String(row.transaction_semantic_hash), sourceAssetVersionHash: row.source_asset_version_hash === null ? null : String(row.source_asset_version_hash), contextLensHash: row.context_lens_hash === null ? null : String(row.context_lens_hash), dependencySnapshotHash: String(row.dependency_snapshot_hash) });
}

function qualificationFromRow(row: Row): SignalQualification {
  return SignalQualificationSchema.parse({ schemaVersion: String(row.schema_version), id: String(row.id), ownerTenantId: String(row.owner_tenant_id), transactionId: String(row.outcome_transaction_id), requirementId: String(row.requirement_id), requirementDefinitionHash: String(row.requirement_definition_hash), signalIds: row.signal_ids, signalContentHashes: row.signal_content_hashes, dependencySnapshotHash: String(row.dependency_snapshot_hash), evaluator: row.evaluator, outcome: String(row.outcome), reasonCode: String(row.reason_code), evidenceValidUntil: row.evidence_valid_until === null ? null : String(row.evidence_valid_until), qualifiedAt: String(row.qualified_at), qualificationContentHash: String(row.qualification_content_hash) });
}

function readinessFromRow(row: Row): DelegationReadiness {
  return DelegationReadinessSchema.parse({ schemaVersion: String(row.schema_version), id: String(row.id), ownerTenantId: String(row.owner_tenant_id), transactionId: String(row.outcome_transaction_id), requirementSetHash: String(row.requirement_set_hash), qualificationSetHash: String(row.qualification_set_hash), dependencySnapshotHash: String(row.dependency_snapshot_hash), taskSpecHash: row.task_spec_hash === null ? null : String(row.task_spec_hash), sourceAssetVersionHash: row.source_asset_version_hash === null ? null : String(row.source_asset_version_hash), blueprintHash: row.blueprint_hash === null ? null : String(row.blueprint_hash), policyHash: row.policy_hash === null ? null : String(row.policy_hash), evaluator: row.evaluator, state: String(row.state), blockingCodes: row.blocking_codes, conditionCodes: row.condition_codes, createdAt: String(row.created_at), validUntil: row.valid_until === null ? null : String(row.valid_until), readinessContentHash: String(row.readiness_content_hash) });
}
