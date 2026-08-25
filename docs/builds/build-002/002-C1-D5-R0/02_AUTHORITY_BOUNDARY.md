# Authority Boundary

`public.build002_mutation_leases` is distinct from legacy
`public.mutation_leases`. Direct INSERT/UPDATE/DELETE is denied to anon,
authenticated, and service_role and additionally blocked by an immutable
trigger. Only `public.build002_grant_mutation_lease(...)`, SECURITY DEFINER
with an explicit `search_path`, can issue a canonical row. The capability token
is private to the migration-owned RPC.

The RPC accepts no tenant id, asset id, TaskSpec hash, capability grant, or
authority content as caller-controlled authority data. It never calls an
executor, provider, network client, or state commit.
