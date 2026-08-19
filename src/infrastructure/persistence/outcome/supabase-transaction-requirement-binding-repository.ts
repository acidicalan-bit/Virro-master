import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { OutcomeTransactionRepository } from "@/src/application/ports/repositories";
import type { RequirementCatalogRepository } from "@/src/application/ports/outcome/requirement-catalog-repository";
import type { OutcomeTransactionRequirementBindingRepository } from "@/src/application/ports/outcome/transaction-requirement-binding-repository";
import {
  OutcomeTransactionRequirementBindingSchema,
  verifyOutcomeTransactionRequirementBindingHash,
  type OutcomeTransactionRequirementBinding,
} from "@/src/domain/outcome/specification/outcome-transaction-requirement-binding";
import { SupabaseRequirementCatalogRepository } from "@/src/infrastructure/persistence/outcome/supabase-requirement-catalog-repository";
import { SupabaseOutcomeTransactionRepository } from "@/src/infrastructure/persistence/outcome/supabase-outcome-repositories";

type Row = Record<string, unknown>;

export class SupabaseTransactionRequirementBindingRepository implements OutcomeTransactionRequirementBindingRepository {
  private readonly catalog: RequirementCatalogRepository;
  private readonly transactions: OutcomeTransactionRepository;

  constructor(
    private readonly client: SupabaseClient,
    private readonly ownerTenantId: string,
    catalog?: RequirementCatalogRepository,
    transactions?: OutcomeTransactionRepository,
  ) {
    if (!ownerTenantId.trim()) throw new Error("TRUST_TENANT_SCOPE_REQUIRED");
    this.catalog = catalog ?? new SupabaseRequirementCatalogRepository(client);
    this.transactions = transactions ?? new SupabaseOutcomeTransactionRepository(client, ownerTenantId);
  }

  async publish(binding: OutcomeTransactionRequirementBinding): Promise<OutcomeTransactionRequirementBinding> {
    const parsed = OutcomeTransactionRequirementBindingSchema.parse(binding);
    if (parsed.ownerTenantId !== this.ownerTenantId) throw new Error("TRUST_TENANT_SCOPE_MISMATCH");
    if (!verifyOutcomeTransactionRequirementBindingHash(parsed)) throw new Error("BUILD002_BINDING_HASH_INVALID");
    if (parsed.policy.id !== null || parsed.policy.hash !== null) throw new Error("BUILD002_BINDING_POLICY_UNRESOLVED");

    const transaction = await this.transactions.findById(parsed.outcomeTransactionId);
    if (!transaction || transaction.ownerTenantId !== this.ownerTenantId) {
      throw new Error("BUILD002_BINDING_TRANSACTION_TENANT_MISMATCH");
    }
    const profile = await this.catalog.getRequirementProfile(parsed.requirementProfile.id, parsed.requirementProfile.version);
    if (!profile || profile.hash !== parsed.requirementProfile.hash || profile.blueprint.id !== parsed.blueprint.id
      || profile.blueprint.version !== parsed.blueprint.version || profile.blueprint.hash !== parsed.blueprint.hash
      || profile.policy !== null) {
      throw new Error("BUILD002_BINDING_CATALOG_MISMATCH");
    }
    const blueprint = await this.catalog.getBlueprint(parsed.blueprint.id, parsed.blueprint.version);
    if (!blueprint || blueprint.hash !== parsed.blueprint.hash || blueprint.status !== "PUBLISHED") {
      throw new Error("BUILD002_BINDING_BLUEPRINT_MISMATCH");
    }

    const { data, error } = await this.client.rpc("build002_bind_outcome_transaction_requirements", {
      p_binding: bindingRpcPayload(parsed),
    });
    if (error || !data) throw new Error("BUILD002_BINDING_PERSISTENCE_FAILED");
    const persisted = await this.get(parsed.outcomeTransactionId);
    if (!persisted || persisted.bindingHash !== parsed.bindingHash) throw new Error("BUILD002_BINDING_PERSISTENCE_FAILED");
    return persisted;
  }

  async get(outcomeTransactionId: string): Promise<OutcomeTransactionRequirementBinding | null> {
    const { data, error } = await this.client
      .from("outcome_transaction_requirement_bindings")
      .select("*")
      .eq("owner_tenant_id", this.ownerTenantId)
      .eq("outcome_transaction_id", outcomeTransactionId)
      .maybeSingle();
    if (error) throw new Error("BUILD002_BINDING_READ_FAILED");
    if (!data) return null;
    const binding = bindingFromRow(data as Row);
    if (binding.ownerTenantId !== this.ownerTenantId || binding.outcomeTransactionId !== outcomeTransactionId) {
      throw new Error("BUILD002_BINDING_PERSISTED_ADDRESS_MISMATCH");
    }
    if (!verifyOutcomeTransactionRequirementBindingHash(binding)) throw new Error("BUILD002_BINDING_PERSISTED_HASH_INVALID");
    if (binding.policy.id !== null || binding.policy.hash !== null) throw new Error("BUILD002_BINDING_PERSISTED_POLICY_INVALID");
    const profile = await this.catalog.getRequirementProfile(binding.requirementProfile.id, binding.requirementProfile.version);
    const blueprint = await this.catalog.getBlueprint(binding.blueprint.id, binding.blueprint.version);
    if (!profile || !blueprint || profile.hash !== binding.requirementProfile.hash || blueprint.hash !== binding.blueprint.hash
      || profile.blueprint.id !== binding.blueprint.id || profile.blueprint.version !== binding.blueprint.version
      || profile.blueprint.hash !== binding.blueprint.hash || profile.policy !== null) {
      throw new Error("BUILD002_BINDING_PERSISTED_CATALOG_MISMATCH");
    }
    return binding;
  }
}

export function createSupabaseTransactionRequirementBindingRepository(
  client: SupabaseClient,
  ownerTenantId: string,
): OutcomeTransactionRequirementBindingRepository {
  return new SupabaseTransactionRequirementBindingRepository(client, ownerTenantId);
}

function bindingRpcPayload(binding: OutcomeTransactionRequirementBinding): Row {
  return {
    schema_version: binding.schemaVersion,
    owner_tenant_id: binding.ownerTenantId,
    outcome_transaction_id: binding.outcomeTransactionId,
    blueprint_id: binding.blueprint.id,
    blueprint_version: binding.blueprint.version,
    blueprint_hash: binding.blueprint.hash,
    requirement_profile_id: binding.requirementProfile.id,
    requirement_profile_version: binding.requirementProfile.version,
    requirement_profile_hash: binding.requirementProfile.hash,
    policy_id: binding.policy.id,
    policy_hash: binding.policy.hash,
    binding_hash: binding.bindingHash,
    bound_at: binding.boundAt,
  };
}

function bindingFromRow(row: Row): OutcomeTransactionRequirementBinding {
  return OutcomeTransactionRequirementBindingSchema.parse({
    schemaVersion: String(row.schema_version),
    ownerTenantId: String(row.owner_tenant_id),
    outcomeTransactionId: String(row.outcome_transaction_id),
    blueprint: { id: String(row.blueprint_id), version: Number(row.blueprint_version), hash: String(row.blueprint_hash) },
    requirementProfile: { id: String(row.requirement_profile_id), version: Number(row.requirement_profile_version), hash: String(row.requirement_profile_hash) },
    policy: { id: row.policy_id === null ? null : String(row.policy_id), hash: row.policy_hash === null ? null : String(row.policy_hash) },
    bindingHash: String(row.binding_hash),
    boundAt: normalizeDbInstant(row.bound_at),
  });
}

function normalizeDbInstant(value: unknown): string {
  const candidate = value instanceof Date ? value.toISOString() : String(value);
  const parsed = new Date(candidate);
  if (!Number.isFinite(parsed.getTime())) throw new Error("BUILD002_INVALID_DB_TIMESTAMP");
  const fraction = candidate.match(/\.(\d+)(?:Z|[+-]\d{2}:?\d{2})$/)?.[1];
  if (fraction && fraction.length > 3 && /[^0]/.test(fraction.slice(3))) {
    throw new Error("BUILD002_DB_TIMESTAMP_PRECISION_UNSUPPORTED");
  }
  return parsed.toISOString();
}
