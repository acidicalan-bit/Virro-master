# BUILD 001 - Security Decisions

## Decision summary

| Decision | Choice | Reason |
| --- | --- | --- |
| Ownership | Normalized transaction root plus derived nullable downstream owners | Enforceable without fabricating historical tenants |
| MutationLease evolution | `WRAPPED` by immutable `ExecutionAuthority` | Preserves the current primitive while adding subject, tenant, resource, spec and capability scope |
| Final commit | One PostgreSQL RPC | Provides row locking, rollback and idempotency in the authoritative store |
| Function privilege | Narrow `SECURITY DEFINER` | Authenticated arbitrary table writes remain revoked |
| Human Acceptance | Separate OWNER record, rechecked at commit | Machine verification cannot mint human consent and consent cannot bypass final authority |
| Evidence | Exact execution/spec/artifact/issuer tuple | Prevents cross-run, cross-version and executor-self-assertion substitution |
| History | No backfill | Unknown ownership remains unknown |

## Service-role inventory

| Use | Class | BUILD 001 treatment |
| --- | --- | --- |
| Principal/authority resolution | `AVOIDABLE` | User-scoped bearer/cookie client is used |
| Core Lineage asset initialization | `AVOIDABLE` | User-scoped atomic initialization RPC replaces direct asset/version/head writes |
| Field execution repositories | `REQUIRED` for current architecture | Centralized server factory; scope comes from AuthorityContext and database triggers |
| Private Storage upload/read URL | `REQUIRED` for current architecture | Centralized server-only credential and tenant-prefixed generated keys |
| Precision Edit/Transaction Lab | `LEGACY` | Disabled by default and always disabled in production; not canonical |

## Threats closed deterministically

Cross-tenant read/mutation/reference, forged tenant/project/execution/acceptance IDs, foreign artifacts, wrong TaskSpec version/hash, foreign execution evidence, absent/partial verification, absent acceptance, stale heads, partial commit failure and duplicate retry are covered by deterministic tests and SQL contract assertions.

## Residual risk

No migration was deployed during this implementation. Static SQL and deterministic tests are not proof of live RLS, PostgREST grants, trigger behavior or Storage policy. Service-role compromise remains high impact. TaskSpec hash recomputation occurs in the application; PostgreSQL binds the snapshot and hash tuple but does not independently implement the canonical JSON hash algorithm.
