import { AuthorityError, freezeAuthorityContext, type AuthenticatedPrincipal, type AuthorityContext, type MembershipRole } from "@/src/domain/auth/authority";
import type { TenantMembershipRepository } from "@/src/application/ports/auth/authority-repositories";

export class TenantAuthorityService {
  constructor(private readonly memberships: TenantMembershipRepository) {}

  async resolveAuthority(input: { principal: AuthenticatedPrincipal; requestedTenantId?: string | null }): Promise<AuthorityContext> {
    const requestedTenantId = input.requestedTenantId?.trim() || null;
    const activeMemberships = await this.memberships.listActiveMemberships(input.principal.principalId);
    const selected = requestedTenantId
      ? activeMemberships.find((membership) => membership.tenantId === requestedTenantId)
      : activeMemberships.length === 1 ? activeMemberships[0] : undefined;
    if (!selected) {
      if (!activeMemberships.length) throw new AuthorityError("TENANT_MEMBERSHIP_REQUIRED", "No existe una membresía activa para este usuario.");
      if (!requestedTenantId) throw new AuthorityError("TENANT_NOT_SELECTED", "Debe seleccionarse un tenant activo.");
      throw new AuthorityError("RESOURCE_NOT_AUTHORIZED", "El tenant solicitado no está autorizado.");
    }
    const tenant = await this.memberships.findTenant(selected.tenantId);
    if (!tenant || tenant.status !== "ACTIVE") throw new AuthorityError("TENANT_MEMBERSHIP_INACTIVE", "El tenant no está activo.");
    const membership = await this.memberships.findActiveMembership(input.principal.principalId, selected.tenantId);
    if (!membership || membership.status !== "ACTIVE") throw new AuthorityError("TENANT_MEMBERSHIP_INACTIVE", "La membresía no está activa.");
    return freezeAuthorityContext({
      principalId: input.principal.principalId,
      tenantId: tenant.id,
      membershipId: membership.id,
      membershipRole: membership.role,
      sessionId: input.principal.sessionId,
      authenticationAssurance: input.principal.authenticationAssurance,
      authoritySource: "SUPABASE_AUTH",
      authorizationTimestamp: new Date().toISOString(),
    });
  }

  requireRole(authority: AuthorityContext, role: MembershipRole): void {
    if (authority.membershipRole !== role && !(role === "MEMBER" && authority.membershipRole === "OWNER")) {
      throw new AuthorityError("ROLE_NOT_AUTHORIZED", "El rol no permite esta operación.");
    }
  }
}
