# BUILD 001-F5 Patch Contract

1. Scope only privileged Build 001/outcome repositories, Field Beta access,
   and the directly used storage-object adapter.
2. Accept a server-derived tenant scope when constructing the repository
   bundle; do not accept a client tenant label as authority.
3. Add `owner_tenant_id = authorizedTenant` to every privileged canonical
   read/update and to descendant writes. Existing database lineage triggers
   remain the final consistency check.
4. Reject a conflicting `ownerTenantId` before a scoped insert.
5. Keep legacy `tenant_id` values for compatibility/display, but never use them
   as an authorization predicate.
6. Enforce `tenants/{authorizedTenant}/...` for storage keys used by the
   scoped adapter.
7. Preserve F1/F2/F4/F7 behavior, the existing service-role requirement, and
   the no-backfill rule. No migration is required.
