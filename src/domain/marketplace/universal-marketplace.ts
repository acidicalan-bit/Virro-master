import { z } from "zod";

import { MarketplaceProductContractSchema } from "@/src/domain/outcome/specification/outcome-blueprint";
import { canonicalSha256, immutableCopy, SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";

export const UNIVERSAL_MARKETPLACE_CATEGORY = {
  code: "UNIVERSAL_DIGITAL_MARKETPLACE",
  spanishName: "Marketplace Digital Universal",
  englishName: "Universal Digital Marketplace",
} as const;

export const MarketplaceProductClassSchema = z.enum([
  "FINISHED_OUTCOME",
  "OUTCOME_BUNDLE",
  "VERIFICATION_SERVICE",
  "DIGITAL_DELIVERABLE",
]);

export const BuyerAudienceSchema = z.enum([
  "DEVELOPER",
  "DESIGNER",
  "EDITOR",
  "AUTOMATION_SPECIALIST",
  "COMPANY",
  "NON_TECHNICAL_BUYER",
]);

export const DeliveryModeSchema = z.enum([
  "IN_APP_REVIEW",
  "SIGNED_DOWNLOAD",
  "CONTROLLED_SHARE",
  "EXTERNAL_HANDOFF",
]);

export const ProblemOutcomeTagSchema = z.object({
  kind: z.enum(["PROBLEM", "OUTCOME"]),
  value: z.string().trim().min(1).max(120),
  version: z.number().int().positive(),
}).strict();

export const MarketplaceCategoryDefinitionSchema = z.object({
  schemaVersion: z.literal("marketplace-category-v0.1"),
  version: z.number().int().positive(),
  previousVersionHash: z.string().regex(SHA256_PATTERN).nullable(),
  code: z.literal(UNIVERSAL_MARKETPLACE_CATEGORY.code),
  spanishName: z.literal(UNIVERSAL_MARKETPLACE_CATEGORY.spanishName),
  englishName: z.literal(UNIVERSAL_MARKETPLACE_CATEGORY.englishName),
}).strict();

export const MarketplaceCategoryVersionSchema = MarketplaceCategoryDefinitionSchema.extend({
  hash: z.string().regex(SHA256_PATTERN),
  publishedAt: z.string().datetime(),
}).strict();

export const PlatformInvariantProfileSchema = z.object({
  version: z.literal("platform-invariants-v0.1"),
  noProofNoCommit: z.literal(true),
  sameSpecVerification: z.literal(true),
  staleWriteProtection: z.literal(true),
  tenantIsolationRequired: z.literal(true),
  serverOnlySecrets: z.literal(true),
  sellerCodeIsUntrusted: z.literal(true),
}).strict();

export const MarketplaceProductFoundationSchema = z.object({
  schemaVersion: z.literal("marketplace-product-foundation-v0.1"),
  contract: MarketplaceProductContractSchema,
  productClass: MarketplaceProductClassSchema,
  outcomeCategory: z.object({
    id: z.string().trim().min(1).max(120),
    version: z.number().int().positive(),
  }).strict(),
  audiences: z.array(BuyerAudienceSchema).min(1),
  tags: z.array(ProblemOutcomeTagSchema),
  deliveryModes: z.array(DeliveryModeSchema).min(1),
  platformInvariants: PlatformInvariantProfileSchema,
}).strict();

export const ProjectOutcomeNeedSchema = z.object({
  id: z.uuid(),
  outcomeCategoryId: z.string().trim().min(1).max(120),
  outcomeCategoryVersion: z.number().int().positive(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED"]),
  productId: z.uuid().nullable(),
  transactionId: z.uuid().nullable(),
  acceptedAt: z.string().datetime().nullable(),
}).strict().superRefine((need, context) => {
  if (need.status === "COMPLETED" && (!need.transactionId || !need.acceptedAt)) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "A completed Project Outcome need requires an accepted Outcome transaction.",
    });
  }
  if (need.status !== "COMPLETED" && need.acceptedAt !== null) {
    context.addIssue({
      code: "custom",
      path: ["acceptedAt"],
      message: "Acceptance cannot be recorded before the Outcome need is completed.",
    });
  }
});

export const MarketplaceProjectSchema = z.object({
  schemaVersion: z.literal("marketplace-project-v0.1"),
  id: z.uuid(),
  executionProjectId: z.uuid(),
  tenantId: z.uuid(),
  customerId: z.uuid().nullable(),
  organizationId: z.uuid().nullable(),
  needs: z.array(ProjectOutcomeNeedSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict().superRefine((project, context) => {
  if (!project.customerId && !project.organizationId) {
    context.addIssue({ code: "custom", path: ["customerId"], message: "A marketplace Project requires a customer or organization owner." });
  }
});

export const AcceptedTransactionReferenceSchema = z.object({
  transactionId: z.uuid(),
  tenantId: z.uuid(),
  executionProjectId: z.uuid(),
  acceptanceRecordId: z.uuid(),
  acceptedAt: z.string().datetime(),
}).strict();

export const ProductRelationshipTypeSchema = z.enum([
  "COMPLEMENTS",
  "PREREQUISITE",
  "ALTERNATIVE",
  "SEQUENCE",
  "REPEAT",
]);

export const ProductRelationshipSchema = z.object({
  id: z.uuid(),
  sourceProductId: z.uuid(),
  targetProductId: z.uuid(),
  type: ProductRelationshipTypeSchema,
  status: z.enum(["HYPOTHESIS", "OBSERVED", "CURATED"]),
  evidenceRef: z.string().trim().min(1).max(500).nullable(),
}).strict();

export const CanonEntrySchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.unknown(),
  provenance: z.enum(["CUSTOMER_STATED", "INFERRED", "APPROVED"]),
  approvedAt: z.string().datetime().nullable(),
  approvedBy: z.string().trim().min(1).max(200).nullable(),
}).strict().superRefine((entry, context) => {
  const hasApproval = entry.approvedAt !== null && entry.approvedBy !== null;
  if (entry.provenance === "APPROVED" && !hasApproval) {
    context.addIssue({ code: "custom", path: ["provenance"], message: "APPROVED Canon data requires explicit approval provenance." });
  }
  if (entry.provenance !== "APPROVED" && (entry.approvedAt !== null || entry.approvedBy !== null)) {
    context.addIssue({ code: "custom", path: ["approvedAt"], message: "Inferred or customer-stated Canon data cannot carry approval metadata." });
  }
});

export const CustomerBusinessCanonSchema = z.object({
  schemaVersion: z.literal("customer-business-canon-v0.1"),
  id: z.uuid(),
  tenantId: z.uuid(),
  customerId: z.uuid().nullable(),
  organizationId: z.uuid().nullable(),
  version: z.number().int().positive(),
  entries: z.array(CanonEntrySchema),
}).strict().superRefine((canon, context) => {
  if (!canon.customerId && !canon.organizationId) {
    context.addIssue({ code: "custom", path: ["customerId"], message: "Canon requires a customer or organization owner." });
  }
});

export const AcceptedOutcomePurchaseSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  buyerId: z.uuid(),
  transactionId: z.uuid(),
  acceptanceRecordId: z.uuid().nullable(),
  outcomeCategoryId: z.string().trim().min(1).max(120),
  outcomeCategoryVersion: z.number().int().positive(),
  accepted: z.boolean(),
  acceptedAt: z.string().datetime().nullable(),
}).strict().superRefine((purchase, context) => {
  if (purchase.accepted && (purchase.acceptedAt === null || purchase.acceptanceRecordId === null)) {
    context.addIssue({ code: "custom", path: ["acceptedAt"], message: "Accepted purchases require an acceptance record and timestamp." });
  }
  if (!purchase.accepted && (purchase.acceptedAt !== null || purchase.acceptanceRecordId !== null)) {
    context.addIssue({ code: "custom", path: ["acceptedAt"], message: "Unaccepted purchases cannot carry acceptance evidence." });
  }
});

export const CrossCategoryRepeatWindowSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
}).strict().refine((window) => Date.parse(window.from) <= Date.parse(window.to), {
  message: "Measurement window must be ordered.",
});

export type MarketplaceCategoryDefinition = z.infer<typeof MarketplaceCategoryDefinitionSchema>;
export type MarketplaceCategoryVersion = z.infer<typeof MarketplaceCategoryVersionSchema>;
export type MarketplaceProductFoundation = z.infer<typeof MarketplaceProductFoundationSchema>;
export type MarketplaceProject = z.infer<typeof MarketplaceProjectSchema>;
export type CustomerBusinessCanon = z.infer<typeof CustomerBusinessCanonSchema>;
export type AcceptedOutcomePurchase = z.infer<typeof AcceptedOutcomePurchaseSchema>;
export type AcceptedTransactionReference = z.infer<typeof AcceptedTransactionReferenceSchema>;

export function publishMarketplaceCategory(
  definition: MarketplaceCategoryDefinition,
  publishedAt: string,
): MarketplaceCategoryVersion {
  const parsed = MarketplaceCategoryDefinitionSchema.parse(definition);
  return immutableCopy(MarketplaceCategoryVersionSchema.parse({
    ...parsed,
    hash: canonicalSha256(parsed),
    publishedAt,
  }));
}

export function verifyMarketplaceCategoryHash(category: MarketplaceCategoryVersion): boolean {
  const parsed = MarketplaceCategoryVersionSchema.parse(category);
  const { hash: _hash, publishedAt: _publishedAt, ...definition } = parsed;
  void _hash;
  void _publishedAt;
  return canonicalSha256(definition) === parsed.hash;
}

export class InMemoryMarketplaceCategoryRegistry {
  private readonly versions = new Map<number, MarketplaceCategoryVersion>();

  publish(definition: MarketplaceCategoryDefinition, publishedAt: string): MarketplaceCategoryVersion {
    const category = publishMarketplaceCategory(definition, publishedAt);
    if (this.versions.has(category.version)) throw new Error("Published marketplace category versions are immutable.");
    if (category.version === 1 && category.previousVersionHash !== null) {
      throw new Error("Marketplace category version 1 cannot reference a previous version.");
    }
    if (category.version > 1) {
      const previous = this.versions.get(category.version - 1);
      if (!previous || previous.hash !== category.previousVersionHash) {
        throw new Error("Marketplace category version chain is invalid.");
      }
    }
    this.versions.set(category.version, category);
    return immutableCopy(category);
  }

  get(version: number): MarketplaceCategoryVersion | null {
    const category = this.versions.get(version);
    return category ? immutableCopy(category) : null;
  }
}

export function validateMarketplaceProjectAgainstAcceptedTransactions(
  input: MarketplaceProject,
  acceptedTransactions: ReadonlyMap<string, AcceptedTransactionReference>,
): MarketplaceProject {
  const project = MarketplaceProjectSchema.parse(input);
  for (const need of project.needs) {
    if (need.status !== "COMPLETED" || !need.transactionId) continue;
    const accepted = acceptedTransactions.get(need.transactionId);
    if (!accepted) throw new Error(`Completed Outcome need ${need.id} does not reference a verified accepted transaction.`);
    const reference = AcceptedTransactionReferenceSchema.parse(accepted);
    if (reference.tenantId !== project.tenantId || reference.executionProjectId !== project.executionProjectId) {
      throw new Error(`Accepted transaction for Outcome need ${need.id} belongs to another tenant or Project.`);
    }
    if (reference.acceptedAt !== need.acceptedAt) {
      throw new Error(`Accepted transaction timestamp for Outcome need ${need.id} does not match its acceptance record.`);
    }
  }
  return immutableCopy(project);
}

export function calculateCrossCategoryRepeatRate(input: {
  purchases: AcceptedOutcomePurchase[];
  window: z.infer<typeof CrossCategoryRepeatWindowSchema>;
}): {
  acceptedPurchases: number;
  repeatTransitions: number;
  crossCategoryTransitions: number;
  rate: number | null;
  categoryVersions: string[];
  transitionMatrix: Record<string, number>;
} {
  const window = CrossCategoryRepeatWindowSchema.parse(input.window);
  const from = Date.parse(window.from);
  const to = Date.parse(window.to);
  const purchases = input.purchases
    .map((purchase) => AcceptedOutcomePurchaseSchema.parse(purchase))
    .filter((purchase) => purchase.accepted && purchase.acceptedAt !== null)
    .filter((purchase) => {
      const timestamp = Date.parse(purchase.acceptedAt as string);
      return timestamp >= from && timestamp <= to;
    });
  const purchaseIds = new Set<string>();
  const transactionIds = new Set<string>();
  for (const purchase of purchases) {
    if (purchaseIds.has(purchase.id) || transactionIds.has(purchase.transactionId)) {
      throw new Error("CrossCategoryRepeatRate input contains a duplicate purchase or transaction.");
    }
    purchaseIds.add(purchase.id);
    transactionIds.add(purchase.transactionId);
  }
  const byBuyer = new Map<string, AcceptedOutcomePurchase[]>();
  for (const purchase of purchases) {
    const buyerKey = `${purchase.tenantId}:${purchase.buyerId}`;
    const current = byBuyer.get(buyerKey) ?? [];
    current.push(purchase);
    byBuyer.set(buyerKey, current);
  }
  let repeatTransitions = 0;
  let crossCategoryTransitions = 0;
  const transitionMatrix: Record<string, number> = {};
  const categoryVersions = new Set<string>();
  for (const buyerPurchases of byBuyer.values()) {
    buyerPurchases.sort((left, right) => Date.parse(left.acceptedAt as string) - Date.parse(right.acceptedAt as string));
    for (const purchase of buyerPurchases) categoryVersions.add(`${purchase.outcomeCategoryId}@${purchase.outcomeCategoryVersion}`);
    for (let index = 1; index < buyerPurchases.length; index += 1) {
      const previous = buyerPurchases[index - 1];
      const current = buyerPurchases[index];
      repeatTransitions += 1;
      const key = `${previous.outcomeCategoryId}@${previous.outcomeCategoryVersion}->${current.outcomeCategoryId}@${current.outcomeCategoryVersion}`;
      transitionMatrix[key] = (transitionMatrix[key] ?? 0) + 1;
      if (previous.outcomeCategoryId !== current.outcomeCategoryId) crossCategoryTransitions += 1;
    }
  }
  return {
    acceptedPurchases: purchases.length,
    repeatTransitions,
    crossCategoryTransitions,
    rate: repeatTransitions === 0 ? null : crossCategoryTransitions / repeatTransitions,
    categoryVersions: [...categoryVersions].sort(),
    transitionMatrix,
  };
}
