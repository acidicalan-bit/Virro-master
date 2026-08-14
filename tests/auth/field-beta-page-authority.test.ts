import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveRequestAuthorityMock, headersMock, redirectMock, notFoundMock } = vi.hoisted(() => ({
  resolveRequestAuthorityMock: vi.fn(),
  headersMock: vi.fn(async () => new Headers()),
  redirectMock: vi.fn((location: string): never => { throw new Error(`REDIRECT:${location}`); }),
  notFoundMock: vi.fn((): never => { throw new Error("NOT_FOUND"); }),
}));

vi.mock("@/src/server/tenant-authority", () => ({ resolveRequestAuthority: resolveRequestAuthorityMock }));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock, notFound: notFoundMock }));
vi.mock("@/src/ui/field-beta-lab", () => ({ FieldBetaLab: () => "protected-field-beta-shell" }));

import FieldBetaPage from "@/app/field-beta/page";
import { AuthorityError } from "@/src/domain/auth/authority";

const principal = { principalId: "11111111-1111-4111-8111-111111111111", authenticatedAt: "2026-08-14T00:00:00.000Z" };
const authority = { principalId: principal.principalId, tenantId: "22222222-2222-4222-8222-222222222222", membershipId: "33333333-3333-4333-8333-333333333333", membershipRole: "OWNER" as const, authoritySource: "SUPABASE_AUTH" as const, authorizationTimestamp: "2026-08-14T00:00:00.000Z" };

describe("Field Beta SSR authority boundary", () => {
  beforeEach(() => {
    process.env.FIELD_BETA_INTERNAL_ENABLED = "true";
    headersMock.mockResolvedValue(new Headers());
    resolveRequestAuthorityMock.mockResolvedValue({ kind: "AUTHENTICATED", principal, authority });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.FIELD_BETA_INTERNAL_ENABLED;
  });

  it("renders only after complete active tenant authority resolves", async () => {
    const rendered = await FieldBetaPage({ searchParams: Promise.resolve({}) });
    expect(rendered).toBeDefined();
    expect(resolveRequestAuthorityMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no membership", new AuthorityError("TENANT_MEMBERSHIP_REQUIRED", "missing")],
    ["revoked membership", new AuthorityError("TENANT_MEMBERSHIP_INACTIVE", "revoked")],
    ["foreign tenant", new AuthorityError("RESOURCE_NOT_AUTHORIZED", "foreign")],
    ["suspended tenant", new AuthorityError("TENANT_MEMBERSHIP_INACTIVE", "suspended")],
    ["multiple memberships without selection", new AuthorityError("TENANT_NOT_SELECTED", "select")],
  ])("does not render for %s", async (_label, error) => {
    resolveRequestAuthorityMock.mockRejectedValueOnce(error);
    await expect(FieldBetaPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("redirects unauthenticated users without rendering the protected shell", async () => {
    resolveRequestAuthorityMock.mockResolvedValueOnce({ kind: "UNAUTHENTICATED" });
    await expect(FieldBetaPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/auth?next=/field-beta");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("passes the requested tenant locator to the shared authority boundary", async () => {
    await expect(FieldBetaPage({ searchParams: Promise.resolve({ tenantId: "44444444-4444-4444-8444-444444444444" }) })).resolves.toBeDefined();
    const request = resolveRequestAuthorityMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).searchParams.get("tenantId")).toBe("44444444-4444-4444-8444-444444444444");
  });

  it("does not provision or mutate authority during GET rendering", () => {
    const source = readFileSync("app/field-beta/page.tsx", "utf8");
    expect(source).not.toContain("provisionPersonalTenant");
    expect(source).not.toContain("createPrivilegedSupabaseClient");
  });
});
