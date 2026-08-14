import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PrivilegedTenantPersistence, TenantMembershipRepository } from "@/src/application/ports/auth/authority-repositories";
import type { MembershipRole, TenantMembershipRecord, TenantRecord } from "@/src/domain/auth/authority";

export class SupabaseTenantAuthorityRepository implements TenantMembershipRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findTenant(tenantId: string): Promise<TenantRecord | null> {
    const { data, error } = await this.client.from("tenants").select("id, kind, status, created_at, updated_at").eq("id", tenantId).maybeSingle();
    if (error) throw new Error("No se pudo resolver el tenant.");
    return data ? tenantRow(data) : null;
  }

  async findActiveMembership(principalId: string, tenantId: string): Promise<TenantMembershipRecord | null> {
    const { data, error } = await this.client.from("tenant_memberships").select("id, tenant_id, principal_id, role, status, created_at, revoked_at").eq("principal_id", principalId).eq("tenant_id", tenantId).eq("status", "ACTIVE").maybeSingle();
    if (error) throw new Error("No se pudo resolver la membresía.");
    return data ? membershipRow(data) : null;
  }

  async listActiveMemberships(principalId: string): Promise<TenantMembershipRecord[]> {
    const { data, error } = await this.client.from("tenant_memberships").select("id, tenant_id, principal_id, role, status, created_at, revoked_at").eq("principal_id", principalId).eq("status", "ACTIVE").order("created_at");
    if (error) throw new Error("No se pudieron leer las membresías.");
    return (data ?? []).map(membershipRow);
  }
}

export class SupabasePrivilegedTenantPersistence implements PrivilegedTenantPersistence {
  constructor(private readonly client: SupabaseClient) {}

  async provisionPersonalTenant(input: { principalId: string }): Promise<{ tenant: TenantRecord; membership: TenantMembershipRecord }> {
    const { data, error } = await this.client.rpc("provision_personal_tenant", { p_principal_id: input.principalId });
    if (error || !data) throw new Error("No se pudo provisionar el tenant personal.");
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("La provisión no devolvió autoridad.");
    return { tenant: { id: String(row.tenant_id), kind: "PERSONAL", status: "ACTIVE", createdAt: String(row.tenant_created_at), updatedAt: String(row.tenant_updated_at) }, membership: { id: String(row.membership_id), tenantId: String(row.tenant_id), principalId: String(row.principal_id), role: "OWNER", status: "ACTIVE", createdAt: String(row.membership_created_at), revokedAt: null } };
  }

  async revokeMembership(input: { membershipId: string; principalId: string }): Promise<TenantMembershipRecord> {
    const { data, error } = await this.client.rpc("revoke_tenant_membership", { p_membership_id: input.membershipId, p_actor_principal_id: input.principalId });
    if (error || !data) throw new Error("No se pudo revocar la membresía.");
    return membershipRow(Array.isArray(data) ? data[0] : data);
  }
}

function tenantRow(row: Record<string, unknown>): TenantRecord {
  return { id: String(row.id), kind: row.kind as TenantRecord["kind"], status: row.status as TenantRecord["status"], createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

function membershipRow(row: Record<string, unknown>): TenantMembershipRecord {
  return { id: String(row.id), tenantId: String(row.tenant_id), principalId: String(row.principal_id), role: row.role as MembershipRole, status: row.status as TenantMembershipRecord["status"], createdAt: String(row.created_at), revokedAt: row.revoked_at === null || row.revoked_at === undefined ? null : String(row.revoked_at) };
}
