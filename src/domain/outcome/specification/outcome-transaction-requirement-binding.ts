import { z } from "zod";

import { canonicalSha256, immutableCopy, SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";
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

export const OUTCOME_TRANSACTION_REQUIREMENT_BINDING_SCHEMA_VERSION = "outcome-transaction-requirement-binding-v0.1" as const;

const AddressSchema = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  hash: z.string().regex(SHA256_PATTERN),
}).strict();

const PolicySchema = z.object({ id: z.null(), hash: z.null() }).strict();

export const OutcomeTransactionRequirementBindingDefinitionSchema = z.object({
  schemaVersion: z.literal(OUTCOME_TRANSACTION_REQUIREMENT_BINDING_SCHEMA_VERSION),
  ownerTenantId: z.uuid(),
  outcomeTransactionId: z.uuid(),
  blueprint: AddressSchema,
  requirementProfile: AddressSchema,
  policy: PolicySchema,
}).strict();

export const OutcomeTransactionRequirementBindingSchema = OutcomeTransactionRequirementBindingDefinitionSchema.extend({
  bindingHash: z.string().regex(SHA256_PATTERN),
  boundAt: z.string().datetime(),
}).strict();

export type OutcomeTransactionRequirementBindingDefinition = z.infer<typeof OutcomeTransactionRequirementBindingDefinitionSchema>;
export type OutcomeTransactionRequirementBinding = z.infer<typeof OutcomeTransactionRequirementBindingSchema>;

export function createOutcomeTransactionRequirementBinding(input: {
  ownerTenantId: string;
  outcomeTransactionId: string;
  blueprint: OutcomeBlueprint;
  requirementProfile: OutcomeRequirementProfile;
  boundAt: string;
}): OutcomeTransactionRequirementBinding {
  const blueprint = OutcomeBlueprintSchema.parse(input.blueprint);
  const profile = OutcomeRequirementProfileSchema.parse(input.requirementProfile);
  if (blueprint.status !== "PUBLISHED" || !verifyOutcomeBlueprintHash(blueprint)) {
    throw new Error("BUILD002_BINDING_BLUEPRINT_INVALID");
  }
  if (profile.status !== "PUBLISHED" || profile.policy !== null || !verifyOutcomeRequirementProfileHash(profile)) {
    throw new Error("BUILD002_BINDING_PROFILE_INVALID");
  }
  if (!verifyOutcomeRequirementProfileBlueprintBinding(profile, blueprint)) {
    throw new Error("BUILD002_BINDING_PROFILE_BLUEPRINT_MISMATCH");
  }
  return publishOutcomeTransactionRequirementBinding({
    schemaVersion: OUTCOME_TRANSACTION_REQUIREMENT_BINDING_SCHEMA_VERSION,
    ownerTenantId: input.ownerTenantId,
    outcomeTransactionId: input.outcomeTransactionId,
    blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash },
    requirementProfile: { id: profile.id, version: profile.version, hash: profile.hash },
    policy: { id: null, hash: null },
  }, input.boundAt);
}

export function publishOutcomeTransactionRequirementBinding(
  input: OutcomeTransactionRequirementBindingDefinition,
  boundAt: string,
): OutcomeTransactionRequirementBinding {
  const definition = OutcomeTransactionRequirementBindingDefinitionSchema.parse(input);
  return immutableCopy(OutcomeTransactionRequirementBindingSchema.parse({
    ...definition,
    bindingHash: canonicalSha256(definition),
    boundAt,
  }));
}

export function verifyOutcomeTransactionRequirementBindingHash(
  binding: OutcomeTransactionRequirementBinding,
): boolean {
  try {
    const parsed = OutcomeTransactionRequirementBindingSchema.parse(binding);
    const { bindingHash: _bindingHash, boundAt: _boundAt, ...definition } = parsed;
    void _bindingHash;
    void _boundAt;
    return canonicalSha256(definition) === parsed.bindingHash;
  } catch {
    return false;
  }
}
