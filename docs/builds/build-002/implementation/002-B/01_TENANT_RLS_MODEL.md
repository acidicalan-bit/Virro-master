# BUILD 002-B Tenant and RLS Model

Each BUILD 002-B table has explicit `owner_tenant_id`, an exact `outcome_transaction_id`, and a composite foreign key to `outcome_transactions(owner_tenant_id, id)`. Link rows repeat the tenant and transaction so a service-role caller cannot cross tenant lineage by selecting a foreign parent id.

RLS is enabled for all nine tables. `authenticated` has SELECT only, governed by an ACTIVE `tenant_memberships` row for `auth.uid()` and an ACTIVE `tenants` row. `anon` and authenticated INSERT/UPDATE/DELETE privileges are revoked. `service_role` has SELECT/INSERT only; UPDATE and DELETE are revoked and immutable triggers remain defense-in-depth.

The productive repository factory is `createTenantSupabaseRepositories(ownerTenantId)`. It requires a non-empty trusted scope through `requireTenantScope`; the BUILD 002-B repository is attached only to this tenant bundle. `createSystemRepositories()` exposes no BUILD 002-B repository and therefore no tenant-canonical readiness data.

No tenant is inferred from JSON payload, evaluator metadata, hashes, or caller-provided callbacks.

