# Foundation 1.5 Phase B — Build 001

## Tenant authority envelope and core lineage

Build 001 closes the first active lineage boundary after Phase A. A verified
Supabase Auth claim is resolved to an active membership and frozen
`AuthorityContext`; the context is the only authority accepted by the new
`TenantCoreLineageService`.

The supported path is:

```text
request → resolveRequestAuthority → AuthorityContext
        → tenant-scoped repository → Project
        → Asset → AssetVersion → OutcomeTransaction
```

The four core records carry nullable `owner_tenant_id` for compatibility with
historical rows. New rows require a non-null owner at the database trigger and
application boundaries. Parent ownership must match the authority tenant for
Asset/Project, AssetVersion/Asset, and OutcomeTransaction/Project/Asset/Base
Version. Ownership is immutable once proven. No historical value is fabricated
or inferred.

`/api/core-lineage` accepts strict Zod requests and never accepts a tenant or
principal as an authority claim. Resource IDs are locators that are resolved
through tenant-filtered repositories. Unauthorized or cross-tenant locators
return a generic authorization failure without revealing existence.

Legacy service-role routes are migration compatibility surfaces only. They are
disabled by default and in production; a non-production controlled operator
may opt in with `INTERNAL_LEGACY_ROUTES_ENABLED=true` while the remaining
legacy flows are migrated. The switch is not an authentication boundary.

## Security delta and residual scope

- RLS policies allow authenticated reads/inserts only for rows whose owner
  tenant is `ACTIVE` and has an `ACTIVE` membership; asset updates require the
  same lifecycle proof in both `USING` and `WITH CHECK`; anonymous access
  remains revoked.
- The forward-only tenant-lifecycle repair migration closes the previously
  observed gap where an `ACTIVE` membership could retain direct RLS access to a
  `SUSPENDED` or `REVOKED` tenant's resources.
- Service-role credentials remain server-only and are not used by the new route.
- StateCommit atomicity, ExecutionRun/EvidenceReceipt tenant columns, Storage
  object isolation, recovery, queues, billing and marketplace work remain
  deferred to later bounded builds.
- Historical NULL ownership is not proof of tenant ownership and is not exposed
  through the authenticated core route.

## Validation plan

The gate requires deterministic unit tests for authority/lineage consistency,
legacy route fail-closed behavior, strict mass-assignment rejection, migration
static/upgrade checks, and two-real-user Supabase negative evidence. No provider
execution is part of Build 001.
