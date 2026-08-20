import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { OutcomeTransactionRecord, OutcomeTransactionRepository } from "@/src/application/ports/repositories";
import type { RequirementCatalogRepository } from "@/src/application/ports/outcome/requirement-catalog-repository";
import type { OutcomeTransactionRequirementBindingRepository } from "@/src/application/ports/outcome/transaction-requirement-binding-repository";
import {
  OutcomeRequirementAuthorityResolver,
} from "@/src/application/outcome/resolve-outcome-requirement-authority";
import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { freezeAuthorityContext } from "@/src/domain/auth/authority";
import { publishOutcomeBlueprint, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import {
  createOutcomeTransactionRequirementBinding,
  type OutcomeTransactionRequirementBinding,
} from "@/src/domain/outcome/specification/outcome-transaction-requirement-binding";
import {
  publishOutcomeRequirementProfile,
  type OutcomeRequirementProfile,
} from "@/src/domain/outcome/specification/outcome-requirement-profile";

const tenantId = "10000000-0000-4000-8000-000000000001";
const transactionId = "20000000-0000-4000-8000-000000000001";
const profileId = "40000000-0000-4000-8000-000000000001";
const authority = freezeAuthorityContext({
  principalId: "90000000-0000-4000-8000-000000000001",
  tenantId,
  membershipId: "a0000000-0000-4000-8000-000000000001",
  membershipRole: "OWNER",
  authoritySource: "SUPABASE_AUTH",
  authorizationTimestamp: "2026-08-19T12:00:00.000Z",
});

describe("BUILD002-C0-D application authority resolver", () => {
  it("resolves only the tenant-scoped immutable chain and compiles canonical requirements", async () => {
    const fixture = createFixture();
    const result = await fixture.resolver.resolve({ authority, outcomeTransactionId: transactionId });

    expect(result.ownerTenantId).toBe(tenantId);
    expect(result.outcomeTransactionId).toBe(transactionId);
    expect(result.signalRequirements.length).toBeGreaterThan(0);
    expect(result.signalRequirements.every((requirement) => (
      requirement.subjectKind === "OUTCOME_TRANSACTION"
      && requirement.blueprintId === fixture.blueprint.id
      && requirement.blueprintVersion === fixture.blueprint.version
      && requirement.blueprintHash === fixture.blueprint.hash
      && requirement.policyId === null
      && requirement.policyHash === null
    ))).toBe(true);
    expect(fixture.catalog.profileCalls).toEqual([[profileId, 1]]);
    expect(fixture.catalog.blueprintCalls).toEqual([[fixture.blueprint.id, 1]]);
  });

  it("derives createdAt from the trusted clock and keeps definition hashes stable", async () => {
    const fixture = createFixture();
    fixture.clock.value = "2026-08-19T12:00:00.000Z";
    const first = await fixture.resolver.resolve({ authority, outcomeTransactionId: transactionId });
    fixture.clock.value = "2026-08-20T17:30:00.000Z";
    const second = await fixture.resolver.resolve({ authority, outcomeTransactionId: transactionId });

    expect(first.resolvedAt).not.toBe(second.resolvedAt);
    expect(first.signalRequirements.map((item) => [item.requirementId, item.requirementDefinitionHash]))
      .toEqual(second.signalRequirements.map((item) => [item.requirementId, item.requirementDefinitionHash]));
  });

  it.each([
    ["missing transaction", (fixture: Fixture) => { fixture.transactions.record = null; }],
    ["foreign-tenant transaction", (fixture: Fixture) => { fixture.transactions.record = { ...fixture.transaction, ownerTenantId: "10000000-0000-4000-8000-000000000099" }; }],
    ["missing binding", (fixture: Fixture) => { fixture.bindings.record = null; }],
    ["binding tenant mismatch", (fixture: Fixture) => { fixture.bindings.record = { ...fixture.binding, ownerTenantId: "10000000-0000-4000-8000-000000000099" }; }],
    ["binding transaction mismatch", (fixture: Fixture) => { fixture.bindings.record = { ...fixture.binding, outcomeTransactionId: "20000000-0000-4000-8000-000000000099" }; }],
    ["invalid binding hash", (fixture: Fixture) => { fixture.bindings.record = { ...fixture.binding, bindingHash: "f".repeat(64) }; }],
    ["non-null binding policy", (fixture: Fixture) => { fixture.bindings.record = { ...fixture.binding, policy: { id: "policy", hash: "f".repeat(64) } } as never; }],
    ["missing persisted Blueprint", (fixture: Fixture) => { fixture.catalog.blueprint = null; }],
    ["wrong Blueprint hash", (fixture: Fixture) => { fixture.catalog.blueprint = { ...fixture.blueprint, hash: "f".repeat(64) }; }],
    ["wrong Blueprint version/address", (fixture: Fixture) => { fixture.catalog.blueprint = { ...fixture.blueprint, version: 2 }; }],
    ["retired Blueprint", (fixture: Fixture) => { fixture.catalog.blueprint = { ...fixture.blueprint, status: "RETIRED" }; }],
    ["semantically hash-invalid Blueprint", (fixture: Fixture) => { fixture.catalog.blueprint = { ...fixture.blueprint, seller: { ...fixture.blueprint.seller, displayName: "Tampered" } }; }],
    ["missing persisted RequirementProfile", (fixture: Fixture) => { fixture.catalog.profile = null; }],
    ["wrong Profile hash", (fixture: Fixture) => { fixture.catalog.profile = { ...fixture.profile, hash: "f".repeat(64) }; }],
    ["wrong Profile version/address", (fixture: Fixture) => { fixture.catalog.profile = { ...fixture.profile, version: 2 }; }],
    ["retired Profile", (fixture: Fixture) => { fixture.catalog.profile = { ...fixture.profile, status: "RETIRED" }; }],
    ["semantically hash-invalid Profile", (fixture: Fixture) => { fixture.catalog.profile = { ...fixture.profile, requirements: [{ ...fixture.profile.requirements[0], semanticType: "tampered" }] }; }],
    ["Profile with non-null policy", (fixture: Fixture) => { fixture.catalog.profile = { ...fixture.profile, policy: { id: "policy", hash: "f".repeat(64) } } as never; }],
    ["Profile-Blueprint id mismatch", (fixture: Fixture) => { fixture.catalog.profile = { ...fixture.profile, blueprint: { ...fixture.profile.blueprint, id: "30000000-0000-4000-8000-000000000099" } }; }],
    ["Profile-Blueprint version mismatch", (fixture: Fixture) => { fixture.catalog.profile = { ...fixture.profile, blueprint: { ...fixture.profile.blueprint, version: 2 } }; }],
    ["Profile-Blueprint hash mismatch", (fixture: Fixture) => { fixture.catalog.profile = { ...fixture.profile, blueprint: { ...fixture.profile.blueprint, hash: "f".repeat(64) } }; }],
  ])("returns zero compiled requirements for %s", async (_name, mutate) => {
    const fixture = createFixture();
    mutate(fixture);
    await expect(fixture.resolver.resolve({ authority, outcomeTransactionId: transactionId }))
      .rejects.toMatchObject({ code: "REQUIREMENT_AUTHORITY_NOT_FOUND" });
  });

  it("does not accept caller-created catalog objects or transaction input as authority", async () => {
    const fixture = createFixture();
    fixture.transactions.record = { ...fixture.transaction, rawRequest: JSON.stringify({ requirementProfile: fixture.profile, blueprint: fixture.blueprint }), ownerTenantId: tenantId };
    fixture.catalog.profile = null;
    fixture.catalog.blueprint = null;
    await expect(fixture.resolver.resolve({ authority, outcomeTransactionId: transactionId }))
      .rejects.toMatchObject({ code: "REQUIREMENT_AUTHORITY_NOT_FOUND" });
    expect(fixture.transactions.record.rawRequest).toContain("requirementProfile");
  });

  it("requires an internal trusted authority before any repository read", async () => {
    const fixture = createFixture();
    await expect(fixture.resolver.resolve({ authority: undefined as never, outcomeTransactionId: transactionId }))
      .rejects.toMatchObject({ code: "AUTHORITY_REQUIRED" });
    expect(fixture.transactions.calls).toBe(0);
    expect(fixture.bindings.calls).toBe(0);
  });

  it("has no persistence, readiness, HTTP, or execution surface", () => {
    const source = readFileSync(resolve(process.cwd(), "src/application/outcome/resolve-outcome-requirement-authority.ts"), "utf8");
    expect(source).toContain("compileSignalRequirements");
    expect(source).not.toContain("evaluateReadiness");
    expect(source).not.toContain("qualifySignal");
    expect(source).not.toContain("insert");
    expect(source).not.toContain("StateCommit");
    expect(source).not.toContain("MutationLease");
  });
});

type Fixture = ReturnType<typeof createFixture>;

function createFixture() {
  const blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), "2026-08-19T12:00:00.000Z");
  const profile = publishOutcomeRequirementProfile({
    schemaVersion: "outcome-requirement-profile-v0.1",
    id: profileId,
    version: 1,
    previousVersionHash: null,
    blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash },
    policy: null,
    requirements: [{
      requirementId: "authority.minimum",
      semanticType: "text",
      critical: true,
      acceptedProvenance: ["OBSERVED"],
      qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
      dependencySelectors: [],
    }],
  }, "2026-08-19T12:00:00.000Z", blueprint);
  const binding = createOutcomeTransactionRequirementBinding({
    ownerTenantId: tenantId,
    outcomeTransactionId: transactionId,
    blueprint,
    requirementProfile: profile,
    boundAt: "2026-08-19T12:00:00.000Z",
  });
  const transaction: OutcomeTransactionRecord = {
    id: transactionId,
    ownerTenantId: tenantId,
    projectId: "60000000-0000-4000-8000-000000000001",
    assetId: "70000000-0000-4000-8000-000000000001",
    baseVersionId: "80000000-0000-4000-8000-000000000001",
    status: "DRAFT",
    rawRequest: "customer request",
    createdAt: "2026-08-19T12:00:00.000Z",
    updatedAt: "2026-08-19T12:00:00.000Z",
    completedAt: null,
    abortReason: null,
  };
  const transactions = {
    record: transaction as OutcomeTransactionRecord | null,
    calls: 0,
    findById: async () => { transactions.calls += 1; return transactions.record; },
  } as unknown as OutcomeTransactionRepository & { record: OutcomeTransactionRecord | null; calls: number };
  const bindings = {
    record: binding as OutcomeTransactionRequirementBinding | null,
    calls: 0,
    get: async () => { bindings.calls += 1; return bindings.record; },
  } as unknown as OutcomeTransactionRequirementBindingRepository & { record: OutcomeTransactionRequirementBinding | null; calls: number };
  const catalog = {
    profile,
    blueprint,
    profileCalls: [] as Array<[string, number]>,
    blueprintCalls: [] as Array<[string, number]>,
    getRequirementProfile: async (id: string, version: number) => { catalog.profileCalls.push([id, version]); return catalog.profile; },
    getBlueprint: async (id: string, version: number) => { catalog.blueprintCalls.push([id, version]); return catalog.blueprint; },
  } as unknown as RequirementCatalogRepository & { profile: OutcomeRequirementProfile | null; blueprint: OutcomeBlueprint | null; profileCalls: Array<[string, number]>; blueprintCalls: Array<[string, number]> };
  const clock = { value: "2026-08-19T12:00:00.000Z", now: () => clock.value };
  const resolver = new OutcomeRequirementAuthorityResolver({ transactions, bindings, catalog, clock });
  return { resolver, transaction, binding, blueprint, profile, transactions, bindings, catalog, clock };
}
