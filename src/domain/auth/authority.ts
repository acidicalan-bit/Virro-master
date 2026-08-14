import { z } from "zod";

export const MembershipRoleSchema = z.enum(["OWNER", "MEMBER"]);
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

export const AuthoritySourceSchema = z.literal("SUPABASE_AUTH");

export type AuthenticatedPrincipal = Readonly<{
  principalId: string;
  sessionId?: string;
  authenticationAssurance?: string;
  authenticatedAt: string;
}>;

export type AuthorityContext = Readonly<{
  principalId: string;
  tenantId: string;
  membershipId: string;
  membershipRole: MembershipRole;
  sessionId?: string;
  authenticationAssurance?: string;
  authoritySource: "SUPABASE_AUTH";
  authorizationTimestamp: string;
}>;

export type TenantRecord = Readonly<{
  id: string;
  kind: "PERSONAL" | "ORGANIZATION";
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  createdAt: string;
  updatedAt: string;
}>;

export type TenantMembershipRecord = Readonly<{
  id: string;
  tenantId: string;
  principalId: string;
  role: MembershipRole;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
  revokedAt: string | null;
}>;

export class AuthorityError extends Error {
  constructor(readonly code: "UNAUTHENTICATED" | "TENANT_NOT_SELECTED" | "TENANT_MEMBERSHIP_REQUIRED" | "TENANT_MEMBERSHIP_INACTIVE" | "RESOURCE_NOT_AUTHORIZED" | "ROLE_NOT_AUTHORIZED" | "AUTHORITY_CONTEXT_INVALID", message: string) {
    super(message);
    this.name = "AuthorityError";
  }
}

export function freezeAuthorityContext(input: AuthorityContext): AuthorityContext {
  if (!z.uuid().safeParse(input.principalId).success || !z.uuid().safeParse(input.tenantId).success || !z.uuid().safeParse(input.membershipId).success) {
    throw new AuthorityError("AUTHORITY_CONTEXT_INVALID", "El contexto de autoridad no es válido.");
  }
  return Object.freeze({ ...input });
}
