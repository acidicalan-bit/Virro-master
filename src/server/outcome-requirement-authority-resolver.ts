import "server-only";

import { AuthorityError } from "@/src/domain/auth/authority";
import { TenantAuthorityService } from "@/src/application/auth/tenant-authority-service";
import {
  OutcomeRequirementAuthorityError,
  OutcomeRequirementAuthorityResolver,
  type ResolvedOutcomeRequirementAuthority,
  type TrustedClock,
} from "@/src/application/outcome/resolve-outcome-requirement-authority";
import { SupabaseTenantAuthorityRepository } from "@/src/infrastructure/persistence/auth/supabase-tenant-authority-repository";
import { createTenantOutcomeRequirementAuthorityRepositories } from "@/src/infrastructure/persistence/supabase-repositories";
import { createUserScopedSupabaseClient } from "@/src/infrastructure/supabase/server-client";
import { resolveAuthenticatedPrincipal } from "@/src/server/authenticated-principal-resolver";

const systemClock: TrustedClock = Object.freeze({ now: () => new Date().toISOString() });

export async function resolveOutcomeRequirementAuthority(
  request: Request,
  outcomeTransactionId: string,
): Promise<ResolvedOutcomeRequirementAuthority> {
  const resolvedPrincipal = await resolveAuthenticatedPrincipal(request);
  if (resolvedPrincipal.kind !== "AUTHENTICATED") {
    throw new OutcomeRequirementAuthorityError(resolvedPrincipal.kind);
  }

  const userClient = await createUserScopedSupabaseClient(request);
  let authority;
  try {
    authority = await new TenantAuthorityService(new SupabaseTenantAuthorityRepository(userClient)).resolveAuthority({
      principal: resolvedPrincipal.principal,
    });
  } catch (error) {
    if (error instanceof AuthorityError) {
      if (error.code === "TENANT_NOT_SELECTED") {
        throw new OutcomeRequirementAuthorityError("TENANT_NOT_SELECTED");
      }
      if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
        throw new OutcomeRequirementAuthorityError("TENANT_MEMBERSHIP_REQUIRED");
      }
      if (error.code === "TENANT_MEMBERSHIP_INACTIVE") {
        throw new OutcomeRequirementAuthorityError("TENANT_MEMBERSHIP_INACTIVE");
      }
    }
    throw new OutcomeRequirementAuthorityError("REQUIREMENT_AUTHORITY_NOT_FOUND");
  }

  const repositories = createTenantOutcomeRequirementAuthorityRepositories(authority.tenantId);
  return new OutcomeRequirementAuthorityResolver({
    transactions: repositories.outcomeTransactions,
    bindings: repositories.outcomeTransactionRequirementBindings,
    catalog: repositories.requirementCatalog,
    clock: systemClock,
  }).resolve({ authority, outcomeTransactionId });
}
