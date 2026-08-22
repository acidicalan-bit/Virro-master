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

## Evidence dimensions

| Dimension | Candidate status | Boundary |
| --- | --- | --- |
| Vercel to container runtime | PARTIALLY_PROVEN | Standalone build and ordinary Next build are both required; Docker smoke is CI evidence. |
| Supabase DB to PostgreSQL | PARTIALLY_PROVEN | SQL/RLS/RPC register exists; no database migration was attempted. |
| Supabase Auth extraction | PARTIALLY_PROVEN | Trusted `AuthorityContext` is portable; SSR/session adapter remains provider-specific. |
| Supabase Storage extraction | PARTIALLY_PROVEN | Media object port exists; Supabase adapter remains current implementation. |
| OpenAI provider extraction | PARTIALLY_PROVEN | Provider calls remain in infrastructure adapters; no portability smoke call is made. |
| Local filesystem independence | PARTIALLY_PROVEN | Core paths have no durable writes; read-only container smoke is required. |
| Environment portability | NOT_PROVEN | Existing `NEXT_PUBLIC_*` values create build-time coupling. |

`FULLY_PORTABLE` is intentionally not claimed. `SINGLE_IMAGE_MULTI_ENV=NOT_YET_PROVEN`.

## Required CI evidence

The dedicated portability workflow must run against the exact candidate SHA and
complete `PORTABILITY_STATIC`, `CONTAINER_BUILD`, `CONTAINER_SMOKE`, assurance,
regression, TypeScript, lint, and production build jobs. A local machine without
Docker is a blocker for local smoke only; CI remains the authoritative container
evidence source.
