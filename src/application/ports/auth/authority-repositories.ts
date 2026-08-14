import type { TenantMembershipRecord, TenantRecord, TenantMembershipRecord as Membership } from "@/src/domain/auth/authority";

export interface TenantMembershipRepository {
  findTenant(tenantId: string): Promise<TenantRecord | null>;
  findActiveMembership(principalId: string, tenantId: string): Promise<Membership | null>;
  listActiveMemberships(principalId: string): Promise<Membership[]>;
}

export interface PrivilegedTenantPersistence {
  provisionPersonalTenant(input: { principalId: string }): Promise<{ tenant: TenantRecord; membership: Membership }>;
  revokeMembership(input: { membershipId: string; principalId: string }): Promise<Membership>;
}

export type { TenantMembershipRecord };
