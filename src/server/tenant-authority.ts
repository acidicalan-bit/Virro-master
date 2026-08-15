import "server-only";

import { createPrivilegedSupabaseClient, createUserScopedSupabaseClient } from "@/src/infrastructure/supabase/server-client";
import { SupabasePrivilegedTenantPersistence, SupabaseTenantAuthorityRepository } from "@/src/infrastructure/persistence/auth/supabase-tenant-authority-repository";
import { TenantAuthorityService } from "@/src/application/auth/tenant-authority-service";
import { resolveAuthenticatedPrincipal, type PrincipalResolution } from "@/src/server/authenticated-principal-resolver";

export async function resolveRequestAuthority(request: Request): Promise<PrincipalResolution & { authority?: Awaited<ReturnType<TenantAuthorityService["resolveAuthority"]>> }> {
  const resolved = await resolveAuthenticatedPrincipal(request);
  if (resolved.kind !== "AUTHENTICATED") return resolved;
  const requestedTenantId = new URL(request.url).searchParams.get("tenantId") || request.headers.get("x-tenant-id");
  const userClient = await createUserScopedSupabaseClient(request);
  const authority = await new TenantAuthorityService(new SupabaseTenantAuthorityRepository(userClient)).resolveAuthority({ principal: resolved.principal, requestedTenantId });
  return { ...resolved, authority };
}

export async function provisionPersonalTenant(principalId: string) {
  return new SupabasePrivilegedTenantPersistence(createPrivilegedSupabaseClient()).provisionPersonalTenant({ principalId });
}
