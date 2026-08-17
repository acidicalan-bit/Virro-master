# Privileged Path Audit

| Path | Authority source | Scope/control | Classification |
|---|---|---|---|
| `/api/field-beta` | `resolveRequestAuthority` | `createFieldBetaService(authority)` -> scoped repositories and Field Beta repository | PROVEN locally |
| `/api/core-lineage` | `resolveRequestAuthority` | user-scoped client plus owner predicates and lineage checks | PROVEN locally |
| canonical commit service/RPC | authenticated request and current DB membership | RPC reauthorization and lineage/commit checks | F1/F4 regression PASS |
| preservation verification service | server-provided owner tenant | scoped repository bundle and Storage namespace | PROVEN locally |
| `createSupabaseRepositories(ownerTenantId)` | server constructor argument | every outcome repository receives the scope | PROVEN by static audit and tests |
| `createRepositories()` / general legacy services | no tenant argument | only imported by legacy routes with `isLegacyInternalRouteEnabled`; production always disabled | NON-PRODUCTION LEGACY, not production-reachable |
| `/api/transaction-lab` | no authenticated tenant authority | in-memory repositories only; no Supabase fallback | CONTAINED |
| preservation-study and other legacy routes | none | explicit legacy guard; disabled in production | NON-PRODUCTION LEGACY |
| real-smoke constructors | test environment | test-only / BUILD 004 smoke | TEST_ONLY |

Direct service-role clients are server-only. The only production canonical
service-role paths pass an authenticated server-derived tenant to scoped
repositories, or use the authenticated user-scoped commit/lineage path.

The static route-surface test found explicit fail-closed guards on all legacy
persistence APIs. No indirect production import of the unscoped legacy factory
was found.

