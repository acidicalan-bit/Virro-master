# PORTABILITY-000 Candidate Report

## Scope

This candidate adds a Next standalone build, a non-root multi-stage OCI image,
local liveness, static lock-in ratchets, and documentation. It does not change
database schema, authentication semantics, domain rules, execution capability,
or production deployment.

## Baseline

- `BASE_SHA`: `d8e31040b5479cecc52971e9d0efc9da2628eb04`
- `BASE_TREE`: `f3295a4e5abbab065b1e8d9f89383c66536869c5`
- `NODE_VERSION`: 24
- `PNPM_VERSION`: 11.19.0

## Migration readiness matrix

Statuses are deliberately limited to `PROVEN`, `PARTIALLY_PROVEN`,
`NOT_PROVEN`, and `BLOCKED`.

| Dimension | Candidate status | Boundary |
| --- | --- | --- |
| `VERCEL_TO_CONTAINER_RUNTIME` | PARTIALLY_PROVEN | `CONTAINER_PROCESS_RUNTIME` is proven by CI build/smoke; `FULL_APPLICATION_RUNTIME_PARITY` is not proven by liveness alone. |
| `SUPABASE_DB_PORTABILITY` | PARTIALLY_PROVEN | SQL/RLS/RPC register exists; no database migration was attempted. |
| `SUPABASE_AUTH_PORTABILITY` | PARTIALLY_PROVEN | Trusted `AuthorityContext` is portable; SSR/session adapter remains provider-specific. |
| `SUPABASE_STORAGE_PORTABILITY` | PARTIALLY_PROVEN | Media object port exists; the concrete baseline application coupling remains. |
| `OPENAI_PROVIDER_PORTABILITY` | PARTIALLY_PROVEN | Provider calls remain in infrastructure adapters; no portability smoke call is made. |
| `LOCAL_FILESYSTEM_INDEPENDENCE` | PARTIALLY_PROVEN | Core paths have no durable writes; CI proves a read-only root with `/tmp` writable. |
| `ENVIRONMENT_PORTABILITY` | NOT_PROVEN | Existing `NEXT_PUBLIC_*` values create build-time coupling. |

`FULLY_PORTABLE` is intentionally not claimed. `SINGLE_IMAGE_MULTI_ENV=NOT_YET_PROVEN`.
The machine-checkable environment authority is
`scripts/portability/environment-contract.json`; the human-readable table is
checked for synchronization.

## Required CI evidence

The dedicated portability workflow must run against the exact candidate SHA and
complete `PORTABILITY_STATIC`, `CONTAINER_BUILD`, `CONTAINER_SMOKE`, assurance,
regression, TypeScript, lint, and production build jobs. A local machine without
Docker is a blocker for local smoke only; CI remains the authoritative container
evidence source.
