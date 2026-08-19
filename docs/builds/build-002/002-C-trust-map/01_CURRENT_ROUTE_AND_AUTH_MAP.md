# Current Route and Authority Map

## Authentication entrypoint

`src/server/authenticated-principal-resolver.ts` reads a bearer token (or the
server cookie client) and calls Supabase `auth.getClaims`. It returns an
authenticated principal containing only the server-observed subject and
session metadata. Missing or invalid claims fail closed.

`src/server/tenant-authority.ts` then constructs `TenantAuthorityService` with
`SupabaseTenantAuthorityRepository`. It lists active memberships, resolves an
active tenant, rechecks the membership, and returns a frozen `AuthorityContext`
whose source is `SUPABASE_AUTH`.

The current `tenantId` query parameter / `x-tenant-id` header is a caller hint,
not proof. It is accepted only when it matches an active membership. A C route
should not accept tenant selection as authoritative request data; it should
use a server-selected active authority or reject ambiguity.

## Existing authenticated routes

- `/api/core-lineage`: authenticated project, asset, version, and transaction
  operations through `TenantCoreLineageService` and a user-scoped repository.
- `/api/field-beta`: authenticated Field Beta operations; OWNER is required for
  feedback and canonical commit.
- `/api/auth/provision`: authenticated personal-tenant provisioning.
- No readiness evaluation route exists.

## Repository choke points

`createTenantSupabaseRepositories(ownerTenantId)` requires a non-empty trusted
tenant scope and includes `build002Readiness`. `createSystemRepositories()`
does not expose BUILD002 repositories. BUILD002 reads are tenant and
transaction filtered; writes use the five BUILD002-B RPCs.

## Current boundary classification

| Boundary | Classification | Reason |
|---|---|---|
| Auth principal from Supabase claims | PROVEN | Server-side claims validation path exists. |
| Active membership and tenant status | PROVEN | Membership repository and service recheck both. |
| Transaction ownership | PARTIAL | Core-lineage repository scopes reads/writes, but no C evaluation service exists. |
| Tenant request hint | PARTIAL | Validated against membership but still accepted from query/header. |
| Readiness API | MISSING | No route or application service exists. |
| Blueprint-to-transaction source | UNKNOWN | No persistent Blueprint repository or transaction binding was found. |
| Provenance minting | MISSING | Current BUILD002 repository accepts a domain Signal carrying provenance. |
