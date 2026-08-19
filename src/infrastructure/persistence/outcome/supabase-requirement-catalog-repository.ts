import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RequirementCatalogRepository } from "@/src/application/ports/outcome/requirement-catalog-repository";
import {
  OutcomeBlueprintSchema,
  verifyOutcomeBlueprintHash,
  type OutcomeBlueprint,
} from "@/src/domain/outcome/specification/outcome-blueprint";
import {
  OutcomeRequirementProfileSchema,
  verifyOutcomeRequirementProfileBlueprintBinding,
  verifyOutcomeRequirementProfileHash,
  type OutcomeRequirementProfile,
} from "@/src/domain/outcome/specification/outcome-requirement-profile";

type Row = Record<string, unknown>;

export class SupabaseRequirementCatalogRepository implements RequirementCatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async publishBlueprint(blueprint: OutcomeBlueprint): Promise<OutcomeBlueprint> {
    const parsed = OutcomeBlueprintSchema.parse(blueprint);
    if (parsed.status !== "PUBLISHED" || !verifyOutcomeBlueprintHash(parsed)) {
      throw new Error("BUILD002_BLUEPRINT_DOMAIN_HASH_INVALID");
    }
    const { data, error } = await this.client.rpc("build002_publish_outcome_blueprint", {
      p_blueprint: blueprintRpcPayload(parsed),
    });
    if (error || !data) throw new Error("BUILD002_BLUEPRINT_PERSISTENCE_FAILED");
    const persisted = await this.getBlueprint(parsed.id, parsed.version);
    if (!persisted || persisted.id !== parsed.id || persisted.version !== parsed.version || persisted.hash !== parsed.hash) {
      throw new Error("BUILD002_BLUEPRINT_PERSISTENCE_FAILED");
    }
    return persisted;
  }

  async getBlueprint(id: string, version: number): Promise<OutcomeBlueprint | null> {
    const { data, error } = await this.client
      .from("outcome_blueprints")
      .select("*")
      .eq("id", id)
      .eq("version", version)
      .maybeSingle();
    if (error) throw new Error("BUILD002_BLUEPRINT_READ_FAILED");
    if (!data) return null;
    const blueprint = blueprintFromRow(data as Row);
    if (blueprint.id !== id || blueprint.version !== version) {
      throw new Error("BUILD002_BLUEPRINT_PERSISTED_ADDRESS_MISMATCH");
    }
    if (blueprint.status !== "PUBLISHED" || !verifyOutcomeBlueprintHash(blueprint)) {
      throw new Error("BUILD002_BLUEPRINT_PERSISTED_INVALID");
    }
    return blueprint;
  }

  async publishRequirementProfile(profile: OutcomeRequirementProfile): Promise<OutcomeRequirementProfile> {
    const parsed = OutcomeRequirementProfileSchema.parse(profile);
    if (parsed.status !== "PUBLISHED" || parsed.policy !== null || !verifyOutcomeRequirementProfileHash(parsed)) {
      throw new Error("BUILD002_PROFILE_DOMAIN_HASH_INVALID");
    }
    const persistedBlueprint = await this.getBlueprint(parsed.blueprint.id, parsed.blueprint.version);
    if (!persistedBlueprint || !verifyOutcomeRequirementProfileBlueprintBinding(parsed, persistedBlueprint)) {
      throw new Error("BUILD002_PROFILE_PERSISTED_BLUEPRINT_MISMATCH");
    }
    const { data, error } = await this.client.rpc("build002_publish_outcome_requirement_profile", {
      p_profile: profileRpcPayload(parsed),
    });
    if (error || !data) throw new Error("BUILD002_PROFILE_PERSISTENCE_FAILED");
    const persisted = await this.getRequirementProfile(parsed.id, parsed.version);
    if (!persisted || persisted.id !== parsed.id || persisted.version !== parsed.version || persisted.hash !== parsed.hash) {
      throw new Error("BUILD002_PROFILE_PERSISTENCE_FAILED");
    }
    return persisted;
  }

  async getRequirementProfile(id: string, version: number): Promise<OutcomeRequirementProfile | null> {
    const { data, error } = await this.client
      .from("outcome_requirement_profiles")
      .select("*")
      .eq("id", id)
      .eq("version", version)
      .maybeSingle();
    if (error) throw new Error("BUILD002_PROFILE_READ_FAILED");
    if (!data) return null;
    const profile = profileFromRow(data as Row);
    if (profile.id !== id || profile.version !== version) {
      throw new Error("BUILD002_PROFILE_PERSISTED_ADDRESS_MISMATCH");
    }
    if (profile.status !== "PUBLISHED" || profile.policy !== null || !verifyOutcomeRequirementProfileHash(profile)) {
      throw new Error("BUILD002_PROFILE_PERSISTED_INVALID");
    }
    const blueprint = await this.getBlueprint(profile.blueprint.id, profile.blueprint.version);
    if (!blueprint || !verifyOutcomeRequirementProfileBlueprintBinding(profile, blueprint)) {
      throw new Error("BUILD002_PROFILE_PERSISTED_BLUEPRINT_MISMATCH");
    }
    return profile;
  }
}

export function createSupabaseRequirementCatalogRepository(client: SupabaseClient): RequirementCatalogRepository {
  return new SupabaseRequirementCatalogRepository(client);
}

function blueprintRpcPayload(blueprint: OutcomeBlueprint): Row {
  const { hash, status, publishedAt, ...definition } = blueprint;
  void hash;
  void status;
  return { ...blueprint, publishedAt, definition };
}

function profileRpcPayload(profile: OutcomeRequirementProfile): Row {
  const { hash, status, publishedAt, ...definition } = profile;
  void hash;
  void status;
  return { ...profile, definition, publishedAt };
}

function blueprintFromRow(row: Row): OutcomeBlueprint {
  return OutcomeBlueprintSchema.parse({
    ...(row.definition as Row),
    hash: String(row.hash),
    status: String(row.status),
    publishedAt: normalizeDbInstant(row.published_at),
  });
}

function profileFromRow(row: Row): OutcomeRequirementProfile {
  return OutcomeRequirementProfileSchema.parse({
    ...(row.definition as Row),
    hash: String(row.hash),
    status: String(row.status),
    publishedAt: normalizeDbInstant(row.published_at),
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
