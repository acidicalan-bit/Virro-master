import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  AcceptedOutcomePurchaseSchema,
  calculateCrossCategoryRepeatRate,
  CanonEntrySchema,
  InMemoryMarketplaceCategoryRegistry,
  MarketplaceCategoryDefinitionSchema,
  MarketplaceProductFoundationSchema,
  MarketplaceProjectSchema,
  publishMarketplaceCategory,
  UNIVERSAL_MARKETPLACE_CATEGORY,
  validateMarketplaceProjectAgainstAcceptedTransactions,
  verifyMarketplaceCategoryHash,
} from "@/src/domain/marketplace/universal-marketplace";
import {
  ClientCapabilityProfileSchema,
  OutcomeConfigurationSchema,
  ReviewDecisionSchema,
} from "@/src/domain/marketplace/mobile-contracts";

const ids = {
  project: "70000000-0000-4000-8000-000000000001",
  executionProject: "70000000-0000-4000-8000-000000000002",
  tenant: "70000000-0000-4000-8000-000000000003",
  customer: "70000000-0000-4000-8000-000000000004",
  need: "70000000-0000-4000-8000-000000000005",
  product: "70000000-0000-4000-8000-000000000006",
  transaction: "70000000-0000-4000-8000-000000000007",
  blueprint: "70000000-0000-4000-8000-000000000008",
  seller: "seller-001",
  buyer: "70000000-0000-4000-8000-000000000009",
  purchaseA: "70000000-0000-4000-8000-000000000010",
  purchaseB: "70000000-0000-4000-8000-000000000011",
  purchaseC: "70000000-0000-4000-8000-000000000012",
  idempotency: "70000000-0000-4000-8000-000000000013",
  taskSpec: "70000000-0000-4000-8000-000000000014",
  baseVersion: "70000000-0000-4000-8000-000000000015",
};

const now = "2026-08-11T20:00:00.000Z";
const later = "2026-08-12T20:00:00.000Z";

function categoryDefinition(version = 1, previousVersionHash: string | null = null) {
  return MarketplaceCategoryDefinitionSchema.parse({
    schemaVersion: "marketplace-category-v0.1",
    version,
    previousVersionHash,
    ...UNIVERSAL_MARKETPLACE_CATEGORY,
  });
}

function purchase(input: {
  id: string;
  category: string;
  accepted: boolean;
  acceptedAt: string | null;
}) {
  return AcceptedOutcomePurchaseSchema.parse({
    id: input.id,
    tenantId: ids.tenant,
    buyerId: ids.buyer,
    transactionId: input.id,
    acceptanceRecordId: input.accepted ? ids.need : null,
    outcomeCategoryId: input.category,
    outcomeCategoryVersion: 1,
    accepted: input.accepted,
    acceptedAt: input.acceptedAt,
  });
}

describe("Universal Digital Marketplace domain foundation", () => {
  it("keeps the canonical category identity and version history stable", () => {
    const registry = new InMemoryMarketplaceCategoryRegistry();
    const first = registry.publish(categoryDefinition(), now);
    const replay = publishMarketplaceCategory(categoryDefinition(), later);
    const second = registry.publish(categoryDefinition(2, first.hash), later);

    expect(first).toMatchObject(UNIVERSAL_MARKETPLACE_CATEGORY);
    expect(first.hash).toBe(replay.hash);
    expect(second.hash).not.toBe(first.hash);
    expect(second.previousVersionHash).toBe(first.hash);
    expect(verifyMarketplaceCategoryHash(first)).toBe(true);
    expect(() => registry.publish(categoryDefinition(), later)).toThrow(/immutable/);
  });

  it("does not let a marketplace Project bypass an accepted Outcome transaction", () => {
    const base = {
      schemaVersion: "marketplace-project-v0.1",
      id: ids.project,
      executionProjectId: ids.executionProject,
      tenantId: ids.tenant,
      customerId: ids.customer,
      organizationId: null,
      createdAt: now,
      updatedAt: now,
    } as const;

    expect(() => MarketplaceProjectSchema.parse({
      ...base,
      needs: [{
        id: ids.need,
        outcomeCategoryId: "IMAGE_EDIT",
        outcomeCategoryVersion: 1,
        status: "COMPLETED",
        productId: ids.product,
        transactionId: null,
        acceptedAt: null,
      }],
    })).toThrow(/accepted Outcome transaction/);

    const completed = MarketplaceProjectSchema.parse({
      ...base,
      needs: [{
        id: ids.need,
        outcomeCategoryId: "IMAGE_EDIT",
        outcomeCategoryVersion: 1,
        status: "COMPLETED",
        productId: ids.product,
        transactionId: ids.transaction,
        acceptedAt: later,
      }],
    });
    expect(() => validateMarketplaceProjectAgainstAcceptedTransactions(completed, new Map())).toThrow(/verified accepted transaction/);
    const accepted = {
      transactionId: ids.transaction,
      tenantId: ids.tenant,
      executionProjectId: ids.executionProject,
      acceptanceRecordId: ids.need,
      acceptedAt: later,
    };
    expect(() => validateMarketplaceProjectAgainstAcceptedTransactions(completed, new Map([[ids.transaction, { ...accepted, tenantId: ids.customer }]]))).toThrow(/another tenant or Project/);
    expect(validateMarketplaceProjectAgainstAcceptedTransactions(completed, new Map([[ids.transaction, accepted]])).needs[0].status).toBe("COMPLETED");
  });

  it("counts only accepted purchases in CrossCategoryRepeatRate", () => {
    const metric = calculateCrossCategoryRepeatRate({
      purchases: [
        purchase({ id: ids.purchaseA, category: "IMAGE_EDIT", accepted: true, acceptedAt: now }),
        purchase({ id: ids.purchaseB, category: "DOCUMENT", accepted: false, acceptedAt: null }),
        purchase({ id: ids.purchaseC, category: "AUDIO", accepted: true, acceptedAt: later }),
      ],
      window: { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T23:59:59.999Z" },
    });

    expect(metric).toMatchObject({ acceptedPurchases: 2, repeatTransitions: 1, crossCategoryTransitions: 1, rate: 1 });
    expect(Object.keys(metric.transitionMatrix)).toEqual(["IMAGE_EDIT@1->AUDIO@1"]);
  });

  it("does not treat same-category repeat as cross-category repeat", () => {
    const metric = calculateCrossCategoryRepeatRate({
      purchases: [
        purchase({ id: ids.purchaseA, category: "IMAGE_EDIT", accepted: true, acceptedAt: now }),
        purchase({ id: ids.purchaseB, category: "IMAGE_EDIT", accepted: true, acceptedAt: later }),
      ],
      window: { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T23:59:59.999Z" },
    });

    expect(metric).toMatchObject({ repeatTransitions: 1, crossCategoryTransitions: 0, rate: 0 });
  });

  it("requires acceptance evidence and does not join buyers across tenants", () => {
    expect(() => AcceptedOutcomePurchaseSchema.parse({
      id: ids.purchaseA,
      tenantId: ids.tenant,
      buyerId: ids.buyer,
      transactionId: ids.transaction,
      acceptanceRecordId: null,
      outcomeCategoryId: "IMAGE_EDIT",
      outcomeCategoryVersion: 1,
      accepted: true,
      acceptedAt: now,
    })).toThrow(/acceptance record/);

    const secondTenant = "70000000-0000-4000-8000-000000000099";
    const metric = calculateCrossCategoryRepeatRate({
      purchases: [
        purchase({ id: ids.purchaseA, category: "IMAGE_EDIT", accepted: true, acceptedAt: now }),
        { ...purchase({ id: ids.purchaseB, category: "AUDIO", accepted: true, acceptedAt: later }), tenantId: secondTenant },
      ],
      window: { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T23:59:59.999Z" },
    });

    expect(metric).toMatchObject({ acceptedPurchases: 2, repeatTransitions: 0, crossCategoryTransitions: 0, rate: null });
  });

  it("prevents seller product configuration from weakening platform invariants", () => {
    const foundation = {
      schemaVersion: "marketplace-product-foundation-v0.1",
      contract: {
        schemaVersion: "marketplace-product-contract-v0.1",
        productId: ids.product,
        outcomeSku: "PRECISION_EDIT_V01",
        blueprintId: ids.blueprint,
        blueprintVersion: 1,
        blueprintHash: "a".repeat(64),
        sellerId: ids.seller,
        publicationStatus: "CURATED_REVIEW",
        commissionRate: null,
      },
      productClass: "FINISHED_OUTCOME",
      outcomeCategory: { id: "IMAGE_EDIT", version: 1 },
      audiences: ["DESIGNER"],
      tags: [{ kind: "OUTCOME", value: "precision image edit", version: 1 }],
      deliveryModes: ["IN_APP_REVIEW"],
      platformInvariants: {
        version: "platform-invariants-v0.1",
        noProofNoCommit: true,
        sameSpecVerification: true,
        staleWriteProtection: true,
        tenantIsolationRequired: true,
        serverOnlySecrets: true,
        sellerCodeIsUntrusted: true,
      },
    } as const;

    expect(MarketplaceProductFoundationSchema.parse(foundation).platformInvariants.noProofNoCommit).toBe(true);
    expect(() => MarketplaceProductFoundationSchema.parse({
      ...foundation,
      platformInvariants: { ...foundation.platformInvariants, noProofNoCommit: false },
    })).toThrow();
  });

  it("does not silently promote inferred Canon data to approved", () => {
    expect(CanonEntrySchema.parse({
      key: "brand.tone",
      value: "restrained",
      provenance: "INFERRED",
      approvedAt: null,
      approvedBy: null,
    }).provenance).toBe("INFERRED");

    expect(() => CanonEntrySchema.parse({
      key: "brand.tone",
      value: "restrained",
      provenance: "APPROVED",
      approvedAt: null,
      approvedBy: null,
    })).toThrow(/explicit approval provenance/);
  });

  it("keeps mobile configuration client-neutral and idempotent", () => {
    const configuration = OutcomeConfigurationSchema.parse({
      schemaVersion: "outcome-configuration-v0.1",
      idempotencyKey: ids.idempotency,
      productId: ids.product,
      blueprint: { id: ids.blueprint, version: 1, hash: "b".repeat(64) },
      projectId: ids.project,
      canon: { id: ids.customer, version: 1 },
      intent: [{ kind: "TEXT", text: "Cambia solamente la chamarra." }],
      parameters: {},
    });

    expect(configuration.idempotencyKey).toBe(ids.idempotency);
    expect(() => OutcomeConfigurationSchema.parse({ ...configuration, paid: true })).toThrow();
  });

  it("binds review decisions to Task Spec and base version without client verification flags", () => {
    const decision = {
      schemaVersion: "review-decision-v0.1",
      idempotencyKey: ids.idempotency,
      transactionId: ids.transaction,
      taskSpecId: ids.taskSpec,
      taskSpecHash: "c".repeat(64),
      baseVersionId: ids.baseVersion,
      decision: "ACCEPT",
      correction: null,
    } as const;

    expect(ReviewDecisionSchema.parse(decision).decision).toBe("ACCEPT");
    expect(() => ReviewDecisionSchema.parse({ ...decision, verified: true })).toThrow();
  });

  it("models capabilities without device identity or secrets", () => {
    const profile = ClientCapabilityProfileSchema.parse({
      schemaVersion: "client-capability-profile-v0.1",
      surface: "RESPONSIVE_WEB",
      viewport: "COMPACT",
      supportsFileUpload: true,
      supportsCameraCapture: true,
      supportsMicrophoneCapture: true,
      supportsPushNotifications: false,
      maxUploadBytes: 10_000_000,
      acceptedMimeTypes: ["image/png"],
    });

    expect(profile.surface).toBe("RESPONSIVE_WEB");
    expect(profile).not.toHaveProperty("deviceId");
    expect(profile).not.toHaveProperty("sessionToken");
  });

  it("keeps the canonical category, buyer thesis, architecture, and mobile boundary in PROJECT_SPEC", () => {
    const spec = readFileSync("PROJECT_SPEC.md", "utf8");
    expect(spec).toContain("Marketplace Digital Universal / Universal Digital Marketplace");
    expect(spec).toContain("The customer is buying back time, attention and execution risk.");
    expect(spec).toContain("Convertimos el trabajo digital en algo que simplemente puedes pedir.");
    expect(spec).toContain("Outcome SKU → Outcome Blueprint → Spec Compiler → Task Spec → Spec Lenses → Governed Runtime → Evidence → Spec Gate → Commit/Delivery");
    expect(spec).toContain("first-class product surface");
    expect(spec).toContain("[NOT IMPLEMENTED] Native iOS/Android applications");
  });
});
