# Foundation 1.5 Phase A — Identity and Tenant Authority

Phase A establishes the bounded authenticated boundary for internal Field Beta.
The approved REAL_AUTH/REAL_RLS two-user boundary and revocation proof has been
demonstrated; Phase A still does not declare public multi-tenant readiness or
complete active-lineage and Storage isolation.

## Authority pipeline

```text
Supabase Auth verified claims
  → AuthenticatedPrincipal
  → requested tenant locator
  → active TenantMembership
  → active Tenant
  → immutable AuthorityContext
  → tenant-scoped application operation
```

`auth.users.id` / JWT `sub` is the only authenticated principal identifier.
Email, metadata, client user IDs and tenant IDs are not authority.

## Durable authority

- `tenants` is the isolation root.
- `tenant_memberships` is the durable principal-to-tenant relation.
- Membership status is `ACTIVE` or `REVOKED` and revocation is not deletion.
- Initial roles are `OWNER` and `MEMBER`.
- A personal tenant is provisioned idempotently through a privileged server RPC.
- Personal-tenant cardinality is one per Auth principal, enforced by the
  nullable unique `tenants.personal_owner_principal_id`; organization tenants
  are not blocked by personal-tenant ownership rules.
- `auth.users` references use restrictive deletion semantics; deleting an Auth
  principal cannot silently erase membership history or business evidence.

## Field Beta boundary

`/field-beta` and `/api/field-beta` require a verified Supabase Auth principal
and an active membership. The requested tenant is only a locator. Both the
SSR page and API resolve the shared `AuthorityContext` before exposing or
constructing the protected Field Beta experience; an authenticated principal
without current tenant authority receives no protected shell. Services are
cached per tenant and principal, never globally.

The active Field Beta records can carry UUID `owner_tenant_id`. Existing
`internal-lab` values remain historical compatibility data and are not a
current authority source.

## Privileged access

The service-role/secret key is infrastructure authority only. It remains
behind server adapters for provisioning and legacy persistence while the full
Field Beta lineage is migrated. It is never passed to the browser or treated
as user authority.

Generic personal-tenant provisioning after OWNER revocation is currently
`UNSUPPORTED_IN_PHASE_A`: revocation is not silently undone and the unique
personal-owner constraint prevents a second personal tenant. Reactivation or
re-membership requires a future explicit privileged lifecycle operation.

## Storage and deferred work

The existing `media` bucket remains private. New tenant-safe object paths and
AssetRecord authorization are required before direct user-scoped Storage
access. Full two-tenant Storage negative proof is Phase B.

No public API, marketplace, organization-management UX, SSO, MFA, queues,
Redis, ORM, policy engine or native client is introduced.
