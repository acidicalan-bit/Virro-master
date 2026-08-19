import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  principal: vi.fn(),
  userClient: vi.fn(),
  authority: vi.fn(),
  factory: vi.fn(),
  authorityRepository: vi.fn(),
  serviceConstructed: vi.fn(),
}));

vi.mock("@/src/server/authenticated-principal-resolver", () => ({ resolveAuthenticatedPrincipal: mocks.principal }));
vi.mock("@/src/infrastructure/supabase/server-client", () => ({ createUserScopedSupabaseClient: mocks.userClient }));
vi.mock("@/src/infrastructure/persistence/auth/supabase-tenant-authority-repository", () => ({
  SupabaseTenantAuthorityRepository: class {
    constructor() { mocks.authorityRepository(); }
  },
}));
vi.mock("@/src/application/auth/tenant-authority-service", () => ({
  TenantAuthorityService: class {
    constructor() { mocks.serviceConstructed(); }
    resolveAuthority(input: unknown) { return mocks.authority(input); }
  },
}));
vi.mock("@/src/infrastructure/persistence/supabase-repositories", () => ({ createTenantOutcomeRequirementAuthorityRepositories: mocks.factory }));
vi.mock("@/src/application/outcome/resolve-outcome-requirement-authority", () => ({
  OutcomeRequirementAuthorityError: class extends Error {
    readonly code: string;
    constructor(code: string) { super(code); this.code = code; }
  },
  OutcomeRequirementAuthorityResolver: class {
    constructor() {}
    resolve(input: unknown) { return Promise.resolve({ input }); }
  },
}));

import { resolveOutcomeRequirementAuthority } from "@/src/server/outcome-requirement-authority-resolver";
import { AuthorityError } from "@/src/domain/auth/authority";

const principal = { principalId: "90000000-0000-4000-8000-000000000001", authenticatedAt: "2026-08-19T12:00:00.000Z" };
const authority = { principalId: principal.principalId, tenantId: "10000000-0000-4000-8000-000000000001", membershipId: "a0000000-0000-4000-8000-000000000001", membershipRole: "OWNER" as const, authoritySource: "SUPABASE_AUTH" as const, authorizationTimestamp: "2026-08-19T12:00:00.000Z" };

describe("BUILD002-C0-D server authority boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userClient.mockResolvedValue({});
    mocks.factory.mockReturnValue({ outcomeTransactions: {}, outcomeTransactionRequirementBindings: {}, requirementCatalog: {} });
    mocks.authority.mockResolvedValue(authority);
    mocks.principal.mockResolvedValue({ kind: "AUTHENTICATED", principal });
  });

  it.each([
    ["UNAUTHENTICATED", { kind: "UNAUTHENTICATED" }],
    ["INVALID_SESSION", { kind: "INVALID_SESSION" }],
    ["AUTH_ENVIRONMENT_FAILURE", { kind: "AUTH_ENVIRONMENT_FAILURE" }],
  ])("does not construct privileged repositories for %s", async (_label, result) => {
    mocks.principal.mockResolvedValueOnce(result);
    await expect(resolveOutcomeRequirementAuthority(new Request("https://example.test"), "20000000-0000-4000-8000-000000000001"))
      .rejects.toMatchObject({ code: result.kind });
    expect(mocks.userClient).not.toHaveBeenCalled();
    expect(mocks.factory).not.toHaveBeenCalled();
  });

  it.each([
    ["no active memberships", "TENANT_MEMBERSHIP_REQUIRED"],
    ["revoked or suspended authority", "TENANT_MEMBERSHIP_INACTIVE"],
    ["multiple active memberships", "TENANT_NOT_SELECTED"],
  ])("fails before privileged repositories for %s", async (_label, code) => {
    mocks.authority.mockRejectedValueOnce(new AuthorityError(code as "TENANT_MEMBERSHIP_REQUIRED" | "TENANT_MEMBERSHIP_INACTIVE" | "TENANT_NOT_SELECTED", code));
    await expect(resolveOutcomeRequirementAuthority(new Request("https://example.test"), "20000000-0000-4000-8000-000000000001"))
      .rejects.toMatchObject({ code });
    expect(mocks.factory).not.toHaveBeenCalled();
  });

  it("ignores query and header tenant selectors and passes only server-derived authority", async () => {
    const request = new Request("https://example.test/internal?tenantId=10000000-0000-4000-8000-000000000099", { headers: { "x-tenant-id": "10000000-0000-4000-8000-000000000099" } });
    await resolveOutcomeRequirementAuthority(request, "20000000-0000-4000-8000-000000000001");
    expect(mocks.authority).toHaveBeenCalledWith({ principal });
    expect(mocks.factory).toHaveBeenCalledWith(authority.tenantId);
  });

  it("constructs privileged tenant repositories only after successful authority resolution", async () => {
    await resolveOutcomeRequirementAuthority(new Request("https://example.test"), "20000000-0000-4000-8000-000000000001");
    expect(mocks.authority.mock.invocationCallOrder[0]).toBeLessThan(mocks.factory.mock.invocationCallOrder[0]);
    expect(mocks.factory).toHaveBeenCalledWith(authority.tenantId);
  });

  it("exposes a locator-only server function and no HTTP or later-phase surface", () => {
    const source = readFileSync(resolve(process.cwd(), "src/server/outcome-requirement-authority-resolver.ts"), "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).toMatch(/resolveOutcomeRequirementAuthority\(\s*request:\s*Request,\s*outcomeTransactionId:\s*string/);
    expect(source).not.toContain("searchParams");
    expect(source).not.toContain("x-tenant-id");
    expect(source).not.toContain("AuthorityContext");
    expect(source).not.toContain("evaluateReadiness");
    expect(source).not.toContain("app/api/");
  });
});
