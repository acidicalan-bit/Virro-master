# BUILD 002-C0-D — Server Requirement Authority Resolver

## Scope

C0-D resolves the exact canonical requirements for one outcome transaction. It is an internal server/application operation only. It does not evaluate readiness, persist compiled requirements, ingest signals, authorize execution, add an HTTP route, or change C0-A/B/C semantics.

## Trust Direction

`authenticated principal -> active tenant authority -> tenant-scoped repositories -> tenant-owned OutcomeTransaction -> immutable C0-C binding -> persisted published Blueprint/Profile -> canonical SignalRequirement[]`

The only caller locator is `outcomeTransactionId`. Tenant identity, membership, role, catalog addresses, hashes, policy, requirements, timestamps, and readiness state are server-derived or loaded from authoritative persistence.

## Authentication and Tenant Selection

The server resolver reuses `resolveAuthenticatedPrincipal`, `TenantAuthorityService`, and the verified Supabase membership repository. It does not read `tenantId` query parameters or `x-tenant-id` headers. Zero active memberships fails closed; multiple active memberships fail with `TENANT_NOT_SELECTED` because no server-owned selection exists. Privileged tenant repositories are constructed only after successful authentication and active tenant authority resolution.

## Resolution

The application resolver reads the tenant-scoped transaction and exact C0-C binding, verifies binding hash, tenant/transaction addresses, and null policy. It then loads the exact persisted Profile and Blueprint by the binding's id/version, verifies published status, hashes, exact addresses, null policy, and the Profile-to-Blueprint tuple. Any failure yields no compiled requirements and a bounded internal failure.

Compilation reuses `compileSignalRequirements(profile, serverDerivedCreatedAt, blueprint)`. The clock is trusted server/test infrastructure; callers cannot supply `createdAt`. Requirement definition hashes remain stable when only the resolution timestamp changes.

## Result and Side Effects

The result is an immutable in-memory wrapper containing the tenant id, transaction id, verified binding, verified catalog objects, compiled requirements, and `resolvedAt`. Resolution is read-only: it performs no SignalRequirement, Signal, qualification, readiness, transaction, binding, catalog, execution, lease, or StateCommit writes.

There is no HTTP surface, readiness evaluation, signal ingestion, executor invocation, or C0-E work. C0-E remains the next phase.
