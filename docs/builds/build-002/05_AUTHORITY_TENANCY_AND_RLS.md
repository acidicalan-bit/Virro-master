# Authority, Tenancy and RLS Trust Map

## Existing authority composition

`AuthorityContext` is derived from Supabase Auth plus the current
`tenant_memberships` row through `resolveRequestAuthority`. It contains the
principal, tenant, membership, role, session and authorization timestamp and is
frozen. `ExecutionAuthority` then binds that context to project, asset,
transaction, base version, TaskSpec and mutation paths. `MutationLease` limits
effect paths. The F1/F4 commit RPC independently reauthorizes the current OWNER
under PostgreSQL locks.

BUILD 002 readiness is a decision about sufficiency, not a capability. It must
be composed as:

```text
current DelegationReadiness
AND current ExecutionAuthority
AND existing commit-time OWNER reauthorization
```

Readiness cannot replace, widen, cache, or mutate any of these authorities.

## Server-mediated writes

Authenticated callers may submit raw signal material and a subject selector
only through a narrow server operation. The server derives tenant, subject,
requirement, provenance class, qualification, dependency hash and readiness
state. Direct authenticated INSERT/UPDATE/DELETE on authoritative BUILD 002
tables is denied. Service-role repositories are used only behind a trusted
tenant factory requiring non-empty `ownerTenantId`, following F5-R2.

## Proposed persistence policy

Every BUILD 002 row carries a tenant root and subject lineage. RLS read policy
is membership-scoped for the current tenant; cross-tenant and foreign-subject
references return no row or a server authorization error. Authoritative writes
are service-role-only and must validate the same tenant/subject FKs in the
server transaction. No service-role bundle may be created without trusted
tenant scope for canonical rows.

## Negative tenant matrix

| Attempt | Expected result |
| --- | --- |
| Tenant A reads Tenant B requirement/signal/qualification/readiness | RLS returns no rows; server maps to not found/forbidden |
| Tenant A evaluates Tenant B subject | `TENANT_NOT_AUTHORIZED`; no qualification or write |
| Tenant A injects a signal with Tenant B `tenant_id` | Server ignores/rejects caller tenant; FK/authority mismatch denies |
| Caller forges `subject_id` from another tenant | Subject lineage check denies before persistence |
| Caller references foreign dependency/signal | Exact tenant and subject FK check denies |
| Caller supplies `provenance`, qualification, readiness, definition or dependency hash | Field is rejected or ignored; server recomputes authoritative values |
| Unscoped service-role tenant bundle accesses canonical rows | Factory fails closed; no repository is created |
| Readiness is used as Storage/StateCommit authority | No capability is exposed; downstream authority checks still execute |

## RLS caveat

The current BUILD 001 canonical tables are service-role mediated and have no
direct authenticated grants. BUILD 002 must add its own tenant-rooted RLS
policies and native PostgreSQL tests; it must not weaken or rewrite F1-F9
migrations.
