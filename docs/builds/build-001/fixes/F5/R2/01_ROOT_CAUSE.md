# Root Cause

Before F5-R2:

`createApplicationServices()` → `createRepositories()` → `createSupabaseRepositories()` → `ownerTenantId = undefined`.

`ownedQuery` omitted the `owner_tenant_id` predicate when the scope was absent, and `resolveOwner` allowed caller input to become the persisted owner. Because the client used service-role capability, RLS could not compensate for this application boundary failure.

The remote R3 harness proved the productive unscoped bundle could read Tenant B's canonical project. The finding was confidentiality-impacting; no higher-impact mutation was required to establish F5 reopening.
