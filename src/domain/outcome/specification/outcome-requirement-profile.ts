import { z } from "zod";

import {
  OutcomeBlueprintSchema,
  verifyOutcomeBlueprintHash,
  type OutcomeBlueprint,
} from "@/src/domain/outcome/specification/outcome-blueprint";
import { canonicalSha256, immutableCopy, SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";
import {
  compileSignalRequirement,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";

export const OUTCOME_REQUIREMENT_PROFILE_SCHEMA_VERSION = "outcome-requirement-profile-v0.1" as const;

const HashSchema = z.string().regex(SHA256_PATTERN);
const BlueprintReferenceSchema = z.object({ id: z.uuid(), version: z.number().int().positive(), hash: HashSchema }).strict();
const PolicyReferenceSchema = z.object({ id: z.string().trim().min(1).max(160), hash: HashSchema }).strict().nullable();
const DependencySelectorSchema = z.object({ identity: z.string().trim().min(1).max(160), required: z.boolean() }).strict();
const QualificationRuleSchema = z.object({ version: z.string().trim().min(1).max(80), cardinality: z.enum(["SINGLE_VALUED", "MULTI_VALUED"]), humanReviewRequired: z.boolean() }).strict();

export const OutcomeRequirementProfileRequirementSchema = z.object({
  requirementId: z.string().trim().min(1).max(120).regex(/^[a-z][A-Za-z0-9_.-]*$/),
  semanticType: z.string().trim().min(1).max(160),
  critical: z.boolean(),
  acceptedProvenance: z.array(z.enum(["CUSTOMER_STATED", "OBSERVED", "SYSTEM_DERIVED", "INFERRED", "APPROVED", "UNKNOWN"])).min(1),
  qualificationRule: QualificationRuleSchema,
  dependencySelectors: z.array(DependencySelectorSchema),
}).strict();

export const OutcomeRequirementProfileDefinitionSchema = z.object({
  schemaVersion: z.literal(OUTCOME_REQUIREMENT_PROFILE_SCHEMA_VERSION),
  id: z.uuid(),
  version: z.number().int().positive(),
  previousVersionHash: HashSchema.nullable(),
  blueprint: BlueprintReferenceSchema,
  policy: PolicyReferenceSchema,
  requirements: z.array(OutcomeRequirementProfileRequirementSchema).min(1),
}).strict();

export const OutcomeRequirementProfileSchema = OutcomeRequirementProfileDefinitionSchema.extend({
  hash: HashSchema,
  status: z.enum(["PUBLISHED", "RETIRED"]),
  publishedAt: z.string().datetime(),
}).strict();

export type OutcomeRequirementProfileRequirement = z.infer<typeof OutcomeRequirementProfileRequirementSchema>;
export type OutcomeRequirementProfileDefinition = z.infer<typeof OutcomeRequirementProfileDefinitionSchema>;
export type OutcomeRequirementProfile = z.infer<typeof OutcomeRequirementProfileSchema>;

function normalizeDefinition(input: OutcomeRequirementProfileDefinition): OutcomeRequirementProfileDefinition {
  const parsed = OutcomeRequirementProfileDefinitionSchema.parse(input);
  const requirementIds = new Set<string>();
  const requirements = parsed.requirements.map((requirement) => {
    if (requirementIds.has(requirement.requirementId)) throw new Error("OUTCOME_REQUIREMENT_PROFILE_DUPLICATE_REQUIREMENT_ID");
    requirementIds.add(requirement.requirementId);

    const selectors = new Map<string, boolean>();
    for (const selector of requirement.dependencySelectors) {
      const previous = selectors.get(selector.identity);
      if (previous !== undefined && previous !== selector.required) throw new Error("OUTCOME_REQUIREMENT_PROFILE_CONFLICTING_SELECTOR");
      selectors.set(selector.identity, selector.required);
    }
    return {
      ...requirement,
      acceptedProvenance: [...new Set(requirement.acceptedProvenance)].sort(),
      dependencySelectors: [...selectors.entries()]
        .map(([identity, required]) => ({ identity, required }))
        .sort((left, right) => left.identity.localeCompare(right.identity) || Number(left.required) - Number(right.required)),
    };
  }).sort((left, right) => left.requirementId.localeCompare(right.requirementId));
  return { ...parsed, requirements };
}

function definitionFromProfile(profile: OutcomeRequirementProfile): OutcomeRequirementProfileDefinition {
  return {
    schemaVersion: profile.schemaVersion,
    id: profile.id,
    version: profile.version,
    previousVersionHash: profile.previousVersionHash,
    blueprint: profile.blueprint,
    policy: profile.policy,
    requirements: profile.requirements,
  };
}

export function publishOutcomeRequirementProfile(
  input: OutcomeRequirementProfileDefinition,
  publishedAt: string,
  blueprint?: OutcomeBlueprint,
): OutcomeRequirementProfile {
  const definition = normalizeDefinition(input);
  if (blueprint && !verifyOutcomeRequirementProfileBlueprintBinding({ ...definition, hash: canonicalSha256(definition), status: "PUBLISHED", publishedAt }, blueprint)) {
    throw new Error("OUTCOME_REQUIREMENT_PROFILE_BLUEPRINT_MISMATCH");
  }
  return immutableCopy(OutcomeRequirementProfileSchema.parse({
    ...definition,
    hash: canonicalSha256(definition),
    status: "PUBLISHED",
    publishedAt,
  }));
}

export function verifyOutcomeRequirementProfileHash(profile: OutcomeRequirementProfile): boolean {
  try {
    const parsed = OutcomeRequirementProfileSchema.parse(profile);
    const normalized = normalizeDefinition(definitionFromProfile(parsed));
    return canonicalSha256(normalized) === parsed.hash;
  } catch {
    return false;
  }
}

export function verifyOutcomeRequirementProfileBlueprintBinding(profile: OutcomeRequirementProfile, blueprint: OutcomeBlueprint): boolean {
  try {
    const parsedProfile = OutcomeRequirementProfileSchema.parse(profile);
    const parsedBlueprint = OutcomeBlueprintSchema.parse(blueprint);
    return parsedBlueprint.status === "PUBLISHED"
      && verifyOutcomeBlueprintHash(parsedBlueprint)
      && parsedProfile.blueprint.id === parsedBlueprint.id
      && parsedProfile.blueprint.version === parsedBlueprint.version
      && parsedProfile.blueprint.hash === parsedBlueprint.hash;
  } catch {
    return false;
  }
}

export function compileSignalRequirements(
  profile: OutcomeRequirementProfile,
  createdAt: string,
  blueprint?: OutcomeBlueprint,
): SignalRequirement[] {
  const parsed = OutcomeRequirementProfileSchema.parse(profile);
  if (parsed.status !== "PUBLISHED") throw new Error("OUTCOME_REQUIREMENT_PROFILE_NOT_PUBLISHED");
  if (!verifyOutcomeRequirementProfileHash(parsed)) throw new Error("OUTCOME_REQUIREMENT_PROFILE_HASH_INVALID");
  if (blueprint && !verifyOutcomeRequirementProfileBlueprintBinding(parsed, blueprint)) throw new Error("OUTCOME_REQUIREMENT_PROFILE_BLUEPRINT_MISMATCH");
  return parsed.requirements.map((requirement) => compileSignalRequirement({
    requirementId: requirement.requirementId,
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: requirement.semanticType,
    critical: requirement.critical,
    acceptedProvenance: requirement.acceptedProvenance,
    qualificationRule: requirement.qualificationRule,
    dependencySelectors: requirement.dependencySelectors,
    blueprintId: parsed.blueprint.id,
    blueprintVersion: parsed.blueprint.version,
    blueprintHash: parsed.blueprint.hash,
    policyId: parsed.policy?.id ?? null,
    policyHash: parsed.policy?.hash ?? null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, createdAt));
}

export class InMemoryOutcomeRequirementProfileRegistry {
  private readonly versions = new Map<string, OutcomeRequirementProfile>();

  publish(input: OutcomeRequirementProfileDefinition, publishedAt: string, blueprint?: OutcomeBlueprint): OutcomeRequirementProfile {
    const profile = publishOutcomeRequirementProfile(input, publishedAt, blueprint);
    const key = this.key(profile.id, profile.version);
    if (this.versions.has(key)) throw new Error("Published Requirement Profile versions are immutable.");
    if (profile.version === 1 && profile.previousVersionHash !== null) throw new Error("OUTCOME_REQUIREMENT_PROFILE_INVALID_VERSION_CHAIN");
    if (profile.version > 1) {
      const previous = this.versions.get(this.key(profile.id, profile.version - 1));
      if (!previous || previous.hash !== profile.previousVersionHash) throw new Error("OUTCOME_REQUIREMENT_PROFILE_INVALID_VERSION_CHAIN");
    }
    this.versions.set(key, profile);
    return immutableCopy(profile);
  }

  get(id: string, version: number): OutcomeRequirementProfile | null {
    const profile = this.versions.get(this.key(id, version));
    return profile ? immutableCopy(profile) : null;
  }

  private key(id: string, version: number): string {
    return `${id}:${version}`;
  }
}
