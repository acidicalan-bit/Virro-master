import { z } from "zod";

import { canonicalSha256, immutableCopy, SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";

export const OUTCOME_BLUEPRINT_SCHEMA_VERSION = "outcome-blueprint-v0.1" as const;

export const DigitalGoodClassSchema = z.enum([
  "OUTCOME_BLUEPRINT",
  "OUTCOME_BUNDLE",
  "VERIFICATION_PROFILE",
  "CREATIVE_PRESET",
]);

export const OutcomeCapabilitySchema = z.enum([
  "READ_SOURCE",
  "CALL_IMAGE_PROVIDER",
  "WRITE_CANDIDATE",
  "APPLY_PRESERVATION",
  "READ_PRIVATE_CONTEXT",
  "NETWORK_ACCESS",
  "EXECUTE_CODE",
  "ACCESS_SECRETS",
  "COMMIT_CANONICAL",
]);

export const VariableVisibilitySchema = z.enum([
  "IMAGE_EXECUTOR",
  "PRESERVATION_ENGINE",
  "VERIFIER",
  "PRIVATE",
]);

const VariableBaseSchema = z.object({
  id: z.string().trim().min(1).max(120).regex(/^[a-z][A-Za-z0-9_.-]*$/),
  description: z.string().trim().min(1).max(1_000),
  critical: z.boolean(),
  visibility: z.array(VariableVisibilitySchema).min(1),
}).strict();

export const BlueprintVariableSchema = z.discriminatedUnion("kind", [
  VariableBaseSchema.extend({
    kind: z.literal("FIXED"),
    value: z.unknown(),
    overridePolicy: z.literal("DENY"),
  }).strict(),
  VariableBaseSchema.extend({
    kind: z.literal("PARAMETERIZED"),
    valueType: z.enum(["STRING", "NUMBER", "BOOLEAN", "OBJECT"]),
    required: z.boolean(),
    defaultValue: z.unknown().optional(),
    allowedValues: z.array(z.unknown()).min(1).optional(),
  }).strict(),
  VariableBaseSchema.extend({
    kind: z.literal("CONDITIONAL"),
    when: z.object({ variableId: z.string().min(1), equals: z.unknown() }).strict(),
    then: z.object({ variableId: z.string().min(1), required: z.boolean(), defaultValue: z.unknown().optional() }).strict(),
  }).strict(),
]);

export const VerificationCriterionSchema = z.object({
  id: z.string().trim().min(1).max(120).regex(/^[A-Z][A-Z0-9_]*$/),
  description: z.string().trim().min(1).max(1_000),
  critical: z.boolean(),
  verifier: z.enum(["PIXEL_DIFF", "EXACT_HASH", "HUMAN_REVIEW", "SAME_SPEC_GATE", "DETERMINISTIC_RULE"]),
  evidenceTypes: z.array(z.enum(["METRIC", "HASH", "HUMAN_JUDGMENT", "POLICY_CHECK", "EXECUTOR_ASSERTION"])).min(1),
  roles: z.array(z.enum(["IMAGE_EXECUTOR", "PRESERVATION_ENGINE", "VERIFIER"])).min(1),
}).strict();

export const OutcomeBlueprintDefinitionSchema = z.object({
  schemaVersion: z.literal(OUTCOME_BLUEPRINT_SCHEMA_VERSION),
  id: z.uuid(),
  version: z.number().int().positive(),
  previousVersionHash: z.string().regex(SHA256_PATTERN).nullable(),
  sku: z.object({
    code: z.string().trim().min(3).max(80).regex(/^[A-Z0-9][A-Z0-9_-]+$/),
    digitalGoodClass: DigitalGoodClassSchema,
  }).strict(),
  outcomeType: z.string().trim().min(3).max(120).regex(/^[A-Z][A-Z0-9_]*$/),
  seller: z.object({ sellerId: z.string().trim().min(1).max(120), displayName: z.string().trim().min(1).max(200) }).strict(),
  variables: z.array(BlueprintVariableSchema).min(1),
  deliverable: z.object({ mediaType: z.string().trim().min(3).max(120).regex(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/), description: z.string().trim().min(1).max(1_000) }).strict(),
  capabilityPolicy: z.object({
    required: z.array(OutcomeCapabilitySchema),
    optional: z.array(OutcomeCapabilitySchema),
    denied: z.array(OutcomeCapabilitySchema),
  }).strict(),
  securityProfile: z.object({
    unknownInputPolicy: z.enum(["REQUIRE_INPUT", "REJECT"]),
    promptInjectionPolicy: z.literal("TREAT_AS_DATA"),
    embeddedSecretPolicy: z.literal("FORBID"),
    allowedMimeTypes: z.array(z.string().trim().regex(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/)).min(1),
    maxSourceBytes: z.number().int().positive().max(100_000_000),
    operatorNotes: z.string().max(2_000).nullable(),
  }).strict(),
  qualityProfile: z.object({ criteria: z.array(VerificationCriterionSchema).min(1) }).strict(),
  budget: z.object({
    maxProviderCalls: z.number().int().min(0).max(20),
    maxCostUsd: z.number().nonnegative().nullable(),
    maxLatencyMs: z.number().int().positive().nullable(),
  }).strict(),
  verificationPolicy: z.object({
    requireSameSpecHash: z.literal(true),
    criticalUnknownBlocksCommit: z.literal(true),
    executorDoneIsEvidence: z.literal(false),
  }).strict(),
}).strict().superRefine((blueprint, context) => {
  const variableIds = new Set<string>();
  for (const [index, variable] of blueprint.variables.entries()) {
    if (variableIds.has(variable.id)) context.addIssue({ code: "custom", path: ["variables", index, "id"], message: `Duplicate variable id ${variable.id}.` });
    variableIds.add(variable.id);
    if (variable.kind === "FIXED" && !Object.hasOwn(variable, "value")) context.addIssue({ code: "custom", path: ["variables", index, "value"], message: "FIXED variables require an explicit value." });
  }
  for (const [index, variable] of blueprint.variables.entries()) {
    if (variable.kind !== "CONDITIONAL") continue;
    if (!variableIds.has(variable.when.variableId)) context.addIssue({ code: "custom", path: ["variables", index, "when", "variableId"], message: "Conditional source variable does not exist." });
    if (!variableIds.has(variable.then.variableId)) context.addIssue({ code: "custom", path: ["variables", index, "then", "variableId"], message: "Conditional target variable does not exist." });
  }
  const criterionIds = new Set<string>();
  for (const [index, criterion] of blueprint.qualityProfile.criteria.entries()) {
    if (criterionIds.has(criterion.id)) context.addIssue({ code: "custom", path: ["qualityProfile", "criteria", index, "id"], message: `Duplicate criterion id ${criterion.id}.` });
    criterionIds.add(criterion.id);
  }
  const required = new Set(blueprint.capabilityPolicy.required);
  const optional = new Set(blueprint.capabilityPolicy.optional);
  for (const [index, capability] of blueprint.capabilityPolicy.denied.entries()) {
    if (required.has(capability) || optional.has(capability)) context.addIssue({ code: "custom", path: ["capabilityPolicy", "denied", index], message: `${capability} cannot be both allowed and denied.` });
  }
});

export const OutcomeBlueprintSchema = OutcomeBlueprintDefinitionSchema.safeExtend({
  hash: z.string().regex(SHA256_PATTERN),
  status: z.enum(["PUBLISHED", "RETIRED"]),
  publishedAt: z.string().datetime(),
}).strict();

export const MarketplaceProductContractSchema = z.object({
  schemaVersion: z.literal("marketplace-product-contract-v0.1"),
  productId: z.uuid(),
  outcomeSku: z.string().min(3),
  blueprintId: z.uuid(),
  blueprintVersion: z.number().int().positive(),
  blueprintHash: z.string().regex(SHA256_PATTERN),
  sellerId: z.string().min(1),
  publicationStatus: z.enum(["DRAFT", "CURATED_REVIEW", "PUBLISHED", "SUSPENDED"]),
  commissionRate: z.number().min(0).max(1).nullable(),
}).strict();

export type OutcomeCapability = z.infer<typeof OutcomeCapabilitySchema>;
export type BlueprintVariable = z.infer<typeof BlueprintVariableSchema>;
export type VerificationCriterion = z.infer<typeof VerificationCriterionSchema>;
export type OutcomeBlueprintDefinition = z.infer<typeof OutcomeBlueprintDefinitionSchema>;
export type OutcomeBlueprint = z.infer<typeof OutcomeBlueprintSchema>;
export type MarketplaceProductContract = z.infer<typeof MarketplaceProductContractSchema>;

export function publishOutcomeBlueprint(
  input: OutcomeBlueprintDefinition,
  publishedAt: string,
): OutcomeBlueprint {
  const definition = OutcomeBlueprintDefinitionSchema.parse(input);
  const blueprint = OutcomeBlueprintSchema.parse({
    ...definition,
    hash: canonicalSha256(definition),
    status: "PUBLISHED",
    publishedAt,
  });
  return immutableCopy(blueprint);
}

export function verifyOutcomeBlueprintHash(blueprint: OutcomeBlueprint): boolean {
  const parsed = OutcomeBlueprintSchema.parse(blueprint);
  const { hash: _hash, status: _status, publishedAt: _publishedAt, ...definition } = parsed;
  void _hash;
  void _status;
  void _publishedAt;
  return canonicalSha256(definition) === parsed.hash;
}

export class InMemoryOutcomeBlueprintRegistry {
  private readonly versions = new Map<string, OutcomeBlueprint>();

  publish(input: OutcomeBlueprintDefinition, publishedAt: string): OutcomeBlueprint {
    const blueprint = publishOutcomeBlueprint(input, publishedAt);
    const key = this.key(blueprint.id, blueprint.version);
    if (this.versions.has(key)) throw new Error("Published Blueprint versions are immutable.");
    if (blueprint.version === 1 && blueprint.previousVersionHash !== null) {
      throw new Error("Blueprint version 1 cannot reference a previous version.");
    }
    if (blueprint.version > 1) {
      const previous = this.versions.get(this.key(blueprint.id, blueprint.version - 1));
      if (!previous || previous.hash !== blueprint.previousVersionHash) {
        throw new Error("Blueprint version chain is invalid.");
      }
    }
    this.versions.set(key, blueprint);
    return immutableCopy(blueprint);
  }

  get(id: string, version: number): OutcomeBlueprint | null {
    const value = this.versions.get(this.key(id, version));
    return value ? immutableCopy(value) : null;
  }

  private key(id: string, version: number): string {
    return `${id}:${version}`;
  }
}
