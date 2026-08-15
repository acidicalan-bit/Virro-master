import "server-only";

import type { AuthenticatedPrincipal } from "@/src/domain/auth/authority";
import { createUserScopedSupabaseClient } from "@/src/infrastructure/supabase/server-client";

export type PrincipalResolution =
  | { kind: "AUTHENTICATED"; principal: AuthenticatedPrincipal }
  | { kind: "UNAUTHENTICATED" }
  | { kind: "INVALID_SESSION" }
  | { kind: "AUTH_ENVIRONMENT_FAILURE" };

export async function resolveAuthenticatedPrincipal(request?: Request): Promise<PrincipalResolution> {
  try {
    const bearer = request?.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = await createUserScopedSupabaseClient(request);
    const { data, error } = await client.auth.getClaims(bearer);
    if (error) return { kind: "INVALID_SESSION" };
    const claims = (data?.claims ?? {}) as Record<string, unknown>;
    const principalId = typeof claims?.sub === "string" ? claims.sub : null;
    if (!principalId) return { kind: "UNAUTHENTICATED" };
    return { kind: "AUTHENTICATED", principal: { principalId, sessionId: typeof claims.session_id === "string" ? claims.session_id : undefined, authenticationAssurance: typeof claims.aal === "string" ? claims.aal : undefined, authenticatedAt: new Date().toISOString() } };
  } catch (error) {
    if (error instanceof Error && /required|configuration|SUPABASE/i.test(error.message)) return { kind: "AUTH_ENVIRONMENT_FAILURE" };
    return { kind: "INVALID_SESSION" };
  }
}
