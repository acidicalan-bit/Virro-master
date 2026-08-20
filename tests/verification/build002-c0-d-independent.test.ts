import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { TenantAuthorityService } from "@/src/application/auth/tenant-authority-service";
import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import {
  OutcomeRequirementAuthorityError,
  OutcomeRequirementAuthorityResolver,
} from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { RequirementCatalogRepository } from "@/src/application/ports/outcome/requirement-catalog-repository";
import type { OutcomeTransactionRequirementBindingRepository } from "@/src/application/ports/outcome/transaction-requirement-binding-repository";
import type { OutcomeTransactionRecord, OutcomeTransactionRepository } from "@/src/application/ports/repositories";
import { freezeAuthorityContext, type TenantMembershipRecord, type TenantRecord } from "@/src/domain/auth/authority";
import { publishOutcomeBlueprint, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { createOutcomeTransactionRequirementBinding, type OutcomeTransactionRequirementBinding } from "@/src/domain/outcome/specification/outcome-transaction-requirement-binding";
import { publishOutcomeRequirementProfile, type OutcomeRequirementProfile } from "@/src/domain/outcome/specification/outcome-requirement-profile";

const TENANT_A = "10000000-0000-4000-8000-000000000001";
const TENANT_B = "10000000-0000-4000-8000-000000000002";
const TRANSACTION_ID = "20000000-0000-4000-8000-000000000001";
const BLUEPRINT_A = "30000000-0000-4000-8000-000000000001";
const BLUEPRINT_B = "30000000-0000-4000-8000-000000000002";
const PROFILE_A = "40000000-0000-4000-8000-000000000001";
const PROFILE_B = "40000000-0000-4000-8000-000000000002";
const PRINCIPAL_ID = "90000000-0000-4000-8000-000000000001";

describe("BUILD002-C0-D independent verifier", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/src/server/authenticated-principal-resolver");
    vi.doUnmock("@/src/infrastructure/supabase/server-client");
    vi.doUnmock("@/src/infrastructure/persistence/auth/supabase-tenant-authority-repository");
    vi.doUnmock("@/src/application/auth/tenant-authority-service");
    vi.doUnmock("@/src/infrastructure/persistence/supabase-repositories");
    vi.doUnmock("@/src/application/outcome/resolve-outcome-requirement-authority");
  });

  it("proves the production server entry is locator-only and has no HTTP reachability", () => {
    const source = readFileSync(resolve(process.cwd(), "src/server/outcome-requirement-authority-resolver.ts"), "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).toMatch(/resolveOutcomeRequirementAuthority\(\s*request:\s*Request,\s*outcomeTransactionId:\s*string/);
    expect(source).not.toContain("AuthorityContext");
    expect(source).not.toContain("searchParams");
    expect(source).not.toContain("x-tenant-id");
    const routeFiles = ["app/api", "pages/api"].flatMap((folder) => {
      try { return readFileSync(resolve(process.cwd(), folder, "requirements.ts"), "utf8"); } catch { return []; }
    });
    expect(routeFiles.join("\n")).not.toContain("resolveOutcomeRequirementAuthority");
    const tree = readFileSync(resolve(process.cwd(), "src/server/outcome-requirement-authority-resolver.ts"), "utf8");
    expect(tree).not.toContain("evaluateReadiness");
    expect(tree).not.toContain("qualifySignal");
  });

  it.each([
    ["zero active membership", [], "TENANT_MEMBERSHIP_REQUIRED"],
    ["revoked membership", [membership("a0000000-0000-4000-8000-000000000001", TENANT_A, "REVOKED")], "TENANT_MEMBERSHIP_REQUIRED"],
    ["suspended tenant", [membership("a0000000-0000-4000-8000-000000000001", TENANT_A)], "TENANT_MEMBERSHIP_INACTIVE", "SUSPENDED"],
    ["multiple active memberships", [membership("a0000000-0000-4000-8000-000000000001", TENANT_A), membership("a0000000-0000-4000-8000-000000000002", TENANT_B)], "TENANT_NOT_SELECTED"],
  ])("real TenantAuthorityService fails closed for %s", async (_label, memberships, expected, tenantStatus?: TenantRecord["status"]) => {
    const repository = fakeMembershipRepository(memberships, tenantStatus);
    await expect(new TenantAuthorityService(repository).resolveAuthority({ principal: { principalId: PRINCIPAL_ID, authenticatedAt: "2026-08-19T12:00:00.000Z" } }))
      .rejects.toMatchObject({ code: expected });
  });

  it("real TenantAuthorityService resolves exactly one active membership without a caller tenant selector", async () => {
    const repository = fakeMembershipRepository([membership("a0000000-0000-4000-8000-000000000001", TENANT_A)]);
    const authority = await new TenantAuthorityService(repository).resolveAuthority({ principal: { principalId: PRINCIPAL_ID, authenticatedAt: "2026-08-19T12:00:00.000Z" } });
    expect(authority.tenantId).toBe(TENANT_A);
    expect(repository.requestedTenantIds).toEqual([]);
  });

  it("proves authentication, membership and privileged construction order with independent module spies", async () => {
    const order: string[] = [];
    const authority = freezeAuthorityContext({ principalId: PRINCIPAL_ID, tenantId: TENANT_A, membershipId: "a0000000-0000-4000-8000-000000000001", membershipRole: "OWNER", authoritySource: "SUPABASE_AUTH", authorizationTimestamp: "2026-08-19T12:00:00.000Z" });
    const fakeDependencies = { outcomeTransactions: {}, outcomeTransactionRequirementBindings: {}, requirementCatalog: {} };
    vi.doMock("@/src/server/authenticated-principal-resolver", () => ({ resolveAuthenticatedPrincipal: async () => { order.push("resolveAuthenticatedPrincipal"); return { kind: "AUTHENTICATED", principal: { principalId: PRINCIPAL_ID, authenticatedAt: "2026-08-19T12:00:00.000Z" } }; } }));
    vi.doMock("@/src/infrastructure/supabase/server-client", () => ({ createUserScopedSupabaseClient: async () => { order.push("user-scoped-client"); return {}; } }));
    vi.doMock("@/src/infrastructure/persistence/auth/supabase-tenant-authority-repository", () => ({ SupabaseTenantAuthorityRepository: class { constructor() { order.push("membership-repository"); } } }));
    vi.doMock("@/src/application/auth/tenant-authority-service", () => ({ TenantAuthorityService: class { constructor() { order.push("tenant-authority-service"); } resolveAuthority() { order.push("resolveAuthority"); return authority; } } }));
    vi.doMock("@/src/infrastructure/persistence/supabase-repositories", () => ({ createTenantOutcomeRequirementAuthorityRepositories: () => { order.push("privileged-tenant-repositories"); return fakeDependencies; } }));
    vi.doMock("@/src/application/outcome/resolve-outcome-requirement-authority", () => ({ OutcomeRequirementAuthorityError, OutcomeRequirementAuthorityResolver: class { constructor() { order.push("application-resolver"); } resolve() { return Promise.resolve({ signalRequirements: [] }); } } }));

    const { resolveOutcomeRequirementAuthority } = await import("@/src/server/outcome-requirement-authority-resolver");
    await resolveOutcomeRequirementAuthority(new Request("https://example.test/internal?tenantId=" + TENANT_B, { headers: { "x-tenant-id": TENANT_B } }), TRANSACTION_ID);
    expect(order).toEqual(["resolveAuthenticatedPrincipal", "user-scoped-client", "membership-repository", "tenant-authority-service", "resolveAuthority", "privileged-tenant-repositories", "application-resolver"]);
  });

  it.each(["UNAUTHENTICATED", "INVALID_SESSION", "AUTH_ENVIRONMENT_FAILURE"])("does not construct membership or privileged repositories for %s", async (kind) => {
    const calls = { user: 0, membership: 0, privileged: 0 };
    vi.doMock("@/src/server/authenticated-principal-resolver", () => ({ resolveAuthenticatedPrincipal: async () => ({ kind }) }));
    vi.doMock("@/src/infrastructure/supabase/server-client", () => ({ createUserScopedSupabaseClient: async () => { calls.user += 1; return {}; } }));
    vi.doMock("@/src/infrastructure/persistence/auth/supabase-tenant-authority-repository", () => ({ SupabaseTenantAuthorityRepository: class { constructor() { calls.membership += 1; } } }));
    vi.doMock("@/src/application/auth/tenant-authority-service", () => ({ TenantAuthorityService: class {} }));
    vi.doMock("@/src/infrastructure/persistence/supabase-repositories", () => ({ createTenantOutcomeRequirementAuthorityRepositories: () => { calls.privileged += 1; return {}; } }));
    vi.doMock("@/src/application/outcome/resolve-outcome-requirement-authority", () => ({ OutcomeRequirementAuthorityError, OutcomeRequirementAuthorityResolver: class {} }));
    const { resolveOutcomeRequirementAuthority } = await import("@/src/server/outcome-requirement-authority-resolver");
    await expect(resolveOutcomeRequirementAuthority(new Request("https://example.test"), TRANSACTION_ID)).rejects.toMatchObject({ code: kind });
    expect(calls).toEqual({ user: 0, membership: 0, privileged: 0 });
  });

  it("resolves the canonical Precision Edit chain and reproduces persisted profile semantics", async () => {
    const fixture = createFixture();
    const result = await fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID });
    expect(result.signalRequirements.length).toBeGreaterThan(0);
    for (const requirement of result.signalRequirements) {
      const source = fixture.profile.requirements.find((item) => item.requirementId === requirement.requirementId);
      expect(source).toBeDefined();
      expect(requirement).toMatchObject({
        subjectKind: "OUTCOME_TRANSACTION",
        semanticType: source?.semanticType,
        critical: source?.critical,
        acceptedProvenance: source?.acceptedProvenance,
        qualificationRule: source?.qualificationRule,
        dependencySelectors: source?.dependencySelectors,
        blueprintId: fixture.blueprintA.id,
        blueprintVersion: fixture.blueprintA.version,
        blueprintHash: fixture.blueprintA.hash,
        policyId: null,
        policyHash: null,
      });
    }
  });

  it("accepts no caller tenant, Blueprint, Profile, requirements, TaskSpec or raw request authority", async () => {
    const fixture = createFixture();
    fixture.transaction.rawRequest = JSON.stringify({ tenantId: TENANT_B, blueprint: fixture.blueprintA, profile: fixture.profile, requirements: fixture.profile.requirements, inputRequirements: fixture.profile.requirements, readiness: "READY" });
    fixture.catalog.profile = null;
    fixture.catalog.blueprint = null;
    await expect(fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID })).rejects.toMatchObject({ code: "REQUIREMENT_AUTHORITY_NOT_FOUND" });
  });

  it.each([
    ["missing transaction", (f: Fixture) => { f.transactions.record = null; }],
    ["wrong transaction id", (f: Fixture) => { f.transactions.record = { ...f.transaction, id: "20000000-0000-4000-8000-000000000099" }; }],
    ["foreign transaction", (f: Fixture) => { f.transactions.record = { ...f.transaction, ownerTenantId: TENANT_B }; }],
    ["transaction read error", (f: Fixture) => { f.transactions.error = "foreign tenant id raw SQL detail"; }],
  ])("rejects %s with zero requirements", async (_label, mutate) => {
    const fixture = createFixture(); mutate(fixture);
    await expect(fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID })).rejects.toMatchObject({ code: "REQUIREMENT_AUTHORITY_NOT_FOUND" });
  });

  it.each([
    ["missing binding", (f: Fixture) => { f.bindings.record = null; }],
    ["tenant mismatch", (f: Fixture) => { f.bindings.record = { ...f.binding, ownerTenantId: TENANT_B }; }],
    ["transaction mismatch", (f: Fixture) => { f.bindings.record = { ...f.binding, outcomeTransactionId: "20000000-0000-4000-8000-000000000099" }; }],
    ["binding hash", (f: Fixture) => { f.bindings.record = { ...f.binding, bindingHash: "f".repeat(64) }; }],
    ["policy id", (f: Fixture) => { f.bindings.record = { ...f.binding, policy: { id: "policy", hash: null } } as never; }],
    ["policy hash", (f: Fixture) => { f.bindings.record = { ...f.binding, policy: { id: null, hash: "f".repeat(64) } } as never; }],
    ["binding read error", (f: Fixture) => { f.bindings.error = "foreign tenant table raw SQL detail"; }],
  ])("rejects binding %s", async (_label, mutate) => {
    const fixture = createFixture(); mutate(fixture);
    await expect(fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID })).rejects.toMatchObject({ code: "REQUIREMENT_AUTHORITY_NOT_FOUND" });
  });

  it.each([
    ["missing Blueprint", (f: Fixture) => { f.catalog.blueprint = null; }],
    ["Blueprint address", (f: Fixture) => { f.catalog.blueprint = { ...f.blueprintA, id: BLUEPRINT_B }; }],
    ["Blueprint version", (f: Fixture) => { f.catalog.blueprint = { ...f.blueprintA, version: 2 }; }],
    ["Blueprint hash", (f: Fixture) => { f.catalog.blueprint = { ...f.blueprintA, hash: "f".repeat(64) }; }],
    ["Blueprint retired", (f: Fixture) => { f.catalog.blueprint = { ...f.blueprintA, status: "RETIRED" }; }],
    ["Blueprint semantic tamper", (f: Fixture) => { f.catalog.blueprint = { ...f.blueprintA, seller: { ...f.blueprintA.seller, displayName: "stale hash mutation" } }; }],
    ["Blueprint read error", (f: Fixture) => { f.catalog.error = "supabase table foreign tenant raw SQL"; }],
  ])("rejects %s", async (_label, mutate) => {
    const fixture = createFixture(); mutate(fixture);
    await expect(fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID })).rejects.toMatchObject({ code: "REQUIREMENT_AUTHORITY_NOT_FOUND" });
  });

  it.each([
    ["missing Profile", (f: Fixture) => { f.catalog.profile = null; }],
    ["Profile address", (f: Fixture) => { f.catalog.profile = { ...f.profile, id: PROFILE_B }; }],
    ["Profile version", (f: Fixture) => { f.catalog.profile = { ...f.profile, version: 2 }; }],
    ["Profile hash", (f: Fixture) => { f.catalog.profile = { ...f.profile, hash: "f".repeat(64) }; }],
    ["Profile retired", (f: Fixture) => { f.catalog.profile = { ...f.profile, status: "RETIRED" }; }],
    ["Profile semantic tamper", (f: Fixture) => { f.catalog.profile = { ...f.profile, requirements: [{ ...f.profile.requirements[0], semanticType: "stale hash mutation" }] }; }],
    ["Profile policy", (f: Fixture) => { f.catalog.profile = { ...f.profile, policy: { id: "policy", hash: "f".repeat(64) } } as never; }],
    ["Profile read error", (f: Fixture) => { f.catalog.error = "raw SQL transport foreign tenant detail"; }],
  ])("rejects %s", async (_label, mutate) => {
    const fixture = createFixture(); mutate(fixture);
    await expect(fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID })).rejects.toMatchObject({ code: "REQUIREMENT_AUTHORITY_NOT_FOUND" });
  });

  it("rejects a valid Profile A paired with a valid Blueprint B and each Profile blueprint tuple mutation", async () => {
    const fixture = createFixture();
    const validBindingB = createOutcomeTransactionRequirementBinding({ ownerTenantId: TENANT_A, outcomeTransactionId: TRANSACTION_ID, blueprint: fixture.blueprintB, requirementProfile: fixture.profileB, boundAt: "2026-08-19T12:00:00.000Z" });
    fixture.bindings.record = { ...validBindingB, requirementProfile: fixture.binding.requirementProfile };
    fixture.catalog.blueprint = fixture.blueprintB;
    await expect(fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID })).rejects.toMatchObject({ code: "REQUIREMENT_AUTHORITY_NOT_FOUND" });
    for (const change of [{ id: BLUEPRINT_B }, { version: 2 }, { hash: "f".repeat(64) }]) {
      const next = createFixture();
      next.catalog.profile = { ...next.profile, blueprint: { ...next.profile.blueprint, ...change } } as never;
      await expect(next.resolver.resolve({ authority: next.authority, outcomeTransactionId: TRANSACTION_ID })).rejects.toMatchObject({ code: "REQUIREMENT_AUTHORITY_NOT_FOUND" });
    }
  });

  it("uses production compiler semantics, server clocks, and stable definition hashes", async () => {
    const fixture = createFixture();
    fixture.clock.value = "2026-08-19T12:00:00.000Z";
    const first = await fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID });
    fixture.clock.value = "2026-08-20T17:30:00.000Z";
    const second = await fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID });
    expect(first.resolvedAt).not.toBe(second.resolvedAt);
    expect(first.signalRequirements[0]?.createdAt).not.toBe(second.signalRequirements[0]?.createdAt);
    expect(first.signalRequirements.map((r) => [r.requirementId, r.requirementDefinitionHash])).toEqual(second.signalRequirements.map((r) => [r.requirementId, r.requirementDefinitionHash]));
    fixture.clock.value = "not-a-clock";
    await expect(fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID })).rejects.toMatchObject({ code: "CLOCK_INVALID" });
    fixture.clock.value = "2026-08-19T07:00:00-05:00";
    const offset = await fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID });
    expect(offset.resolvedAt).toBe("2026-08-19T12:00:00.000Z");
  });

  it("returns a deeply immutable result and performs reads only", async () => {
    const fixture = createFixture();
    const result = await fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.binding)).toBe(true);
    expect(Object.isFrozen(result.blueprint)).toBe(true);
    expect(Object.isFrozen(result.requirementProfile)).toBe(true);
    expect(Object.isFrozen(result.signalRequirements)).toBe(true);
    expect(Object.isFrozen(result.signalRequirements[0])).toBe(true);
    expect(() => ((result as { ownerTenantId: string }).ownerTenantId = TENANT_B)).toThrow();
    expect(fixture.writeCalls).toEqual({ transactionCreate: 0, transactionUpdate: 0, bindingPublish: 0, blueprintPublish: 0, profilePublish: 0, readiness: 0, signal: 0, execution: 0, stateCommit: 0 });
  });

  it("converges missing and foreign authority failures without a cross-tenant oracle", async () => {
    const missing = createFixture(); missing.transactions.record = null;
    const foreign = createFixture(); foreign.transactions.record = { ...foreign.transaction, ownerTenantId: TENANT_B };
    const mismatch = createFixture(); mismatch.bindings.record = { ...mismatch.binding, ownerTenantId: TENANT_B };
    const codes = await Promise.all([missing, foreign, mismatch].map(async (fixture) => {
      try { await fixture.resolver.resolve({ authority: fixture.authority, outcomeTransactionId: TRANSACTION_ID }); return "unexpected"; } catch (error) { return error instanceof OutcomeRequirementAuthorityError ? error.code : "raw"; }
    }));
    expect(codes).toEqual(["REQUIREMENT_AUTHORITY_NOT_FOUND", "REQUIREMENT_AUTHORITY_NOT_FOUND", "REQUIREMENT_AUTHORITY_NOT_FOUND"]);
  });
});

type Fixture = ReturnType<typeof createFixture>;

function createFixture() {
  const blueprintA = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition({ id: BLUEPRINT_A }), "2026-08-19T12:00:00.000Z");
  const blueprintB = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition({ id: BLUEPRINT_B, sku: { code: "PRECISION_EDIT_V02", digitalGoodClass: "OUTCOME_BLUEPRINT" } }), "2026-08-19T12:00:00.000Z");
  const profile = publishOutcomeRequirementProfile({ schemaVersion: "outcome-requirement-profile-v0.1", id: PROFILE_A, version: 1, previousVersionHash: null, blueprint: { id: blueprintA.id, version: blueprintA.version, hash: blueprintA.hash }, policy: null, requirements: [{ requirementId: "independent.minimum", semanticType: "text", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [] }] }, "2026-08-19T12:00:00.000Z", blueprintA);
  const profileB = publishOutcomeRequirementProfile({ schemaVersion: "outcome-requirement-profile-v0.1", id: PROFILE_B, version: 1, previousVersionHash: null, blueprint: { id: blueprintB.id, version: blueprintB.version, hash: blueprintB.hash }, policy: null, requirements: [{ requirementId: "independent.other", semanticType: "number", critical: false, acceptedProvenance: ["SYSTEM_DERIVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [] }] }, "2026-08-19T12:00:00.000Z", blueprintB);
  const binding = createOutcomeTransactionRequirementBinding({ ownerTenantId: TENANT_A, outcomeTransactionId: TRANSACTION_ID, blueprint: blueprintA, requirementProfile: profile, boundAt: "2026-08-19T12:00:00.000Z" });
  const transaction: OutcomeTransactionRecord = { id: TRANSACTION_ID, ownerTenantId: TENANT_A, projectId: "60000000-0000-4000-8000-000000000001", assetId: "70000000-0000-4000-8000-000000000001", baseVersionId: "80000000-0000-4000-8000-000000000001", status: "DRAFT", rawRequest: "independent request", createdAt: "2026-08-19T12:00:00.000Z", updatedAt: "2026-08-19T12:00:00.000Z", completedAt: null, abortReason: null };
  const authority = freezeAuthorityContext({ principalId: PRINCIPAL_ID, tenantId: TENANT_A, membershipId: "a0000000-0000-4000-8000-000000000001", membershipRole: "OWNER", authoritySource: "SUPABASE_AUTH", authorizationTimestamp: "2026-08-19T12:00:00.000Z" });
  const transactions = { record: transaction as OutcomeTransactionRecord | null, error: null as string | null, calls: 0, findById: async () => { transactions.calls += 1; if (transactions.error) throw new Error(transactions.error); return transactions.record; }, create: async () => { writeCalls.transactionCreate += 1; return transaction; }, updateStatus: async () => { writeCalls.transactionUpdate += 1; return transaction; } } as unknown as OutcomeTransactionRepository & { record: OutcomeTransactionRecord | null; error: string | null; calls: number };
  const bindings = { record: binding as OutcomeTransactionRequirementBinding | null, error: null as string | null, get: async () => { if (bindings.error) throw new Error(bindings.error); return bindings.record; }, publish: async () => { writeCalls.bindingPublish += 1; return binding; } } as unknown as OutcomeTransactionRequirementBindingRepository & { record: OutcomeTransactionRequirementBinding | null; error: string | null };
  const catalog = { profile, blueprint: blueprintA, error: null as string | null, getRequirementProfile: async () => { if (catalog.error) throw new Error(catalog.error); return catalog.profile; }, getBlueprint: async () => { if (catalog.error) throw new Error(catalog.error); return catalog.blueprint; }, publishBlueprint: async () => { writeCalls.blueprintPublish += 1; return blueprintA; }, publishRequirementProfile: async () => { writeCalls.profilePublish += 1; return profile; } } as unknown as RequirementCatalogRepository & { profile: OutcomeRequirementProfile | null; blueprint: OutcomeBlueprint | null; error: string | null };
  const writeCalls = { transactionCreate: 0, transactionUpdate: 0, bindingPublish: 0, blueprintPublish: 0, profilePublish: 0, readiness: 0, signal: 0, execution: 0, stateCommit: 0 };
  const clock = { value: "2026-08-19T12:00:00.000Z", now: () => clock.value };
  const resolver = new OutcomeRequirementAuthorityResolver({ transactions, bindings, catalog, clock });
  return { resolver, authority, transaction, binding, profile, profileB, blueprintA, blueprintB, transactions, bindings, catalog, clock, writeCalls };
}

function tenant(id: string, status: TenantRecord["status"] = "ACTIVE"): TenantRecord {
  return { id, kind: "PERSONAL", status, createdAt: "2026-08-19T12:00:00.000Z", updatedAt: "2026-08-19T12:00:00.000Z" };
}

function membership(id: string, tenantId: string, status: TenantMembershipRecord["status"] = "ACTIVE"): TenantMembershipRecord {
  return { id, tenantId, principalId: PRINCIPAL_ID, role: "OWNER", status, createdAt: "2026-08-19T12:00:00.000Z", revokedAt: status === "REVOKED" ? "2026-08-19T13:00:00.000Z" : null };
}

function fakeMembershipRepository(records: TenantMembershipRecord[], tenantStatus: TenantRecord["status"] = "ACTIVE") {
  return {
    requestedTenantIds: [] as string[],
    listActiveMemberships: async () => records.filter((record) => record.status === "ACTIVE"),
    findTenant: async (id: string) => tenant(id, tenantStatus),
    findActiveMembership: async (_principalId: string, id: string) => { return records.find((record) => record.tenantId === id && record.status === "ACTIVE") ?? null; },
  };
}
