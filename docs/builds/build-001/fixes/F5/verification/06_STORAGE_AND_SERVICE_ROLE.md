# Storage and Service Role

The local media adapter receives the server-derived owner tenant and accepts
only keys under `tenants/{ownerTenantId}/`. Reads, writes and read URLs reject
an outside prefix before calling Supabase Storage. Caller metadata and legacy
`tenant_id` do not select the namespace.

The Supabase service-role key is server-only and bypasses RLS, so repository
predicates, owner checks and existing database lineage triggers remain the
authorization controls. Service-role capability alone is insufficient.

`REAL_RLS = NOT_PROVEN` and `REAL_STORAGE_POLICY = NOT_PROVEN`. This verification
proves local namespace construction and service-role repository behavior only;
it does not claim remote policy enforcement.

