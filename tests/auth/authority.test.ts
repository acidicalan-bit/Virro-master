import { describe, expect, it } from "vitest";

import { TenantAuthorityService } from "@/src/application/auth/tenant-authority-service";
import { AuthorityError, freezeAuthorityContext, type TenantMembershipRecord, type TenantRecord } from "@/src/domain/auth/authority";
import { getSupabaseKeyMigrationStatus } from "@/src/infrastructure/supabase/config";

const tenant = (id: string, status: TenantRecord["status"] = "ACTIVE"): TenantRecord => ({ id, kind: "PERSONAL", status, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
const membership = (id: string, tenantId: string, principalId: string, status: TenantMembershipRecord["status"] = "ACTIVE"): TenantMembershipRecord => ({ id, tenantId, principalId, role: "OWNER", status, createdAt: "2026-01-01T00:00:00.000Z", revokedAt: status === "REVOKED" ? "2026-01-02T00:00:00.000Z" : null });

describe("Foundation 1.5 authority", () => {
  it("derives immutable authority from verified principal and active membership", async () => {
    const principalId = "11111111-1111-4111-8111-111111111111";
    const tenantId = "22222222-2222-4222-8222-222222222222";
    const repo = { findTenant: async () => tenant(tenantId), findActiveMembership: async () => membership("33333333-3333-4333-8333-333333333333", tenantId, principalId), listActiveMemberships: async () => [membership("33333333-3333-4333-8333-333333333333", tenantId, principalId)] };
    const context = await new TenantAuthorityService(repo).resolveAuthority({ principal: { principalId, authenticatedAt: new Date().toISOString() } });
    expect(context.tenantId).toBe(tenantId);
    expect(Object.isFrozen(context)).toBe(true);
    expect(() => (context as { tenantId: string }).tenantId = "44444444-4444-4444-8444-444444444444").toThrow();
  });

  it("does not let a guessed tenant locator grant authority", async () => {
    const principalId = "11111111-1111-4111-8111-111111111111";
    const allowedTenant = "22222222-2222-4222-8222-222222222222";
    const guessedTenant = "44444444-4444-4444-8444-444444444444";
    const repo = { findTenant: async () => tenant(guessedTenant), findActiveMembership: async () => null, listActiveMemberships: async () => [membership("33333333-3333-4333-8333-333333333333", allowedTenant, principalId)] };
    await expect(new TenantAuthorityService(repo).resolveAuthority({ principal: { principalId, authenticatedAt: new Date().toISOString() }, requestedTenantId: guessedTenant })).rejects.toMatchObject({ code: "RESOURCE_NOT_AUTHORIZED" });
  });

  it("requires explicit selection for multiple active memberships", async () => {
    const principalId = "11111111-1111-4111-8111-111111111111";
    const a = "22222222-2222-4222-8222-222222222222";
    const b = "44444444-4444-4444-8444-444444444444";
    const repo = { findTenant: async (id: string) => tenant(id), findActiveMembership: async (p: string, id: string) => membership("33333333-3333-4333-8333-333333333333", id, p), listActiveMemberships: async () => [membership("33333333-3333-4333-8333-333333333333", a, principalId), membership("55555555-5555-4555-8555-555555555555", b, principalId)] };
    await expect(new TenantAuthorityService(repo).resolveAuthority({ principal: { principalId, authenticatedAt: new Date().toISOString() } })).rejects.toMatchObject({ code: "TENANT_NOT_SELECTED" });
  });

  it("fails closed for inactive tenant and invalid contexts", async () => {
    const principalId = "11111111-1111-4111-8111-111111111111";
    const tenantId = "22222222-2222-4222-8222-222222222222";
    const repo = { findTenant: async () => tenant(tenantId, "SUSPENDED"), findActiveMembership: async () => membership("33333333-3333-4333-8333-333333333333", tenantId, principalId), listActiveMemberships: async () => [membership("33333333-3333-4333-8333-333333333333", tenantId, principalId)] };
    await expect(new TenantAuthorityService(repo).resolveAuthority({ principal: { principalId, authenticatedAt: new Date().toISOString() } })).rejects.toMatchObject({ code: "TENANT_MEMBERSHIP_INACTIVE" });
    expect(() => freezeAuthorityContext({ principalId: "not-a-uuid", tenantId, membershipId: "33333333-3333-4333-8333-333333333333", membershipRole: "OWNER", authoritySource: "SUPABASE_AUTH", authorizationTimestamp: new Date().toISOString() })).toThrow(AuthorityError);
  });

  it("reports legacy-only key configuration without exposing values", () => {
    const previous = { publishable: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, secret: process.env.SUPABASE_SECRET_KEY, anon: process.env.SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY };
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; delete process.env.SUPABASE_SECRET_KEY; process.env.SUPABASE_ANON_KEY = "legacy-anon"; process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-service";
    expect(getSupabaseKeyMigrationStatus()).toBe("LEGACY_ONLY");
    for (const [key, value] of Object.entries(previous)) { const env = key === "publishable" ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : key === "secret" ? "SUPABASE_SECRET_KEY" : key === "anon" ? "SUPABASE_ANON_KEY" : "SUPABASE_SERVICE_ROLE_KEY"; if (value === undefined) delete process.env[env]; else process.env[env] = value; }
  });
});
