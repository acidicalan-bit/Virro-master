# BUILD 002-B Implementation Record

## Scope

Changed only development assurance persistence, the tenant-scoped repository bundle, focused integration tests, and this documentation. No API route, executor, TaskSpec, Field Beta, runtime, billing, UI, or BUILD 002-C/D/E behavior was added.

## Files

- `supabase/migrations/20260819120000_build_002_b_readiness_persistence.sql`
- `src/application/ports/outcome/build002-persistence-repository.ts`
- `src/infrastructure/persistence/outcome/supabase-build002-persistence-repository.ts`
- `src/application/ports/repositories.ts`
- `src/infrastructure/persistence/supabase-repositories.ts`
- `tests/integration/build002-b-persistence-rls.integration.test.ts`

## Verification state

- BUILD 002-A: merged through protected main at `f0183d272702fd5910be1d4f3ff93b8b69a2fc65`.
- PGlite support test: 4/4 PASS.
- Existing SQL regression: 15/15 PASS.
- BUILD 001 model regression: 32/32 PASS.
- BUILD 001 application regression: 9/9 PASS.
- Assurance manifest/check: PASS; assurance tests: 198/198 PASS.
- TypeScript, ESLint, and production build: PASS.
- The two F7 assurance files pass in isolation: 37/37 PASS. A concurrent full-suite run reached 580 PASS/11 skipped but hit three existing Windows temporary-directory timeouts; this is retained as an environmental full-suite limitation, not presented as a clean full-suite PASS.
- Native PostgreSQL E3: unavailable in the local Windows environment; protected CI is the authoritative native boundary.

The local environment still skips native PostgreSQL, but protected CI run `32257490710` at R2 candidate head `8bb98c2dd3cd491a7ad78b317c840d5c0fcb47b7` supplied the required E3 evidence: PostgreSQL 17 native test 6/6 PASS, local PostgreSQL support 15/15 PASS, full deterministic regression 54 files passed and 6 skipped (587 tests passed and 17 skipped), TypeScript, ESLint, and production build PASS. E4 remains not run.

## R1 corrective record

- R1 migration: `supabase/migrations/20260819123000_build_002_b_r1_atomic_lineage.sql`.
- Native E3 workflow: `.github/workflows/assurance.yml`, unchanged required context name, PostgreSQL 17 service.
- Native E3 test: `tests/native/build002-b-postgres.e3.test.ts`.
- E2 production repository test: `tests/assurance/build002-b-repository.test.ts`, 3/3 PASS.
- New dependency: test-only `pg` and `@types/pg`; no production import.
- B1-B4 are addressed in code, but candidate status remains pending the protected CI native PostgreSQL result. E4, API, executor, execution binding, and BUILD002-C/D/E remain unproven and out of scope.
- Protected CI run `32250314495` passed at head `6dbc458641eff48b428afe2e6db072b139d40ea1`: PostgreSQL 17 native E3, E0-E2, full deterministic regression, TypeScript, ESLint, and production build all PASS. E4 remains not run.

## Known boundaries

The repository methods validate BUILD 002-A hashes and enforce trusted tenant/transaction scope. R2 routes all five authoritative writes through narrow RPC entrypoints, and aggregate RPCs persist parent/link graphs atomically. No claim is made for remote E4, HTTP caller enforcement, or executor gating.

## R2 corrective candidate

The independent R1 result reproduced `DIRECT_INSERT_PARTIAL_GRAPH`, so R1 is preserved as failed/blocked historical evidence and R2 appends normally from `7f10830e0d3fad85a061e04148f05ce1aef950a4`.

R2 adds `supabase/migrations/20260819130000_build_002_b_r2_write_boundary.sql`. It revokes `service_role` INSERT on all nine BUILD002 tables, adds Requirement and Signal RPC entrypoints, hardens all five write functions as `SECURITY DEFINER` with `search_path = pg_catalog, public`, and enforces exact relational requirement coverage for Readiness. The repository now uses RPCs exclusively for all five authoritative writes and normalizes database timestamp output before domain parsing.

R2 changes the supported production trust boundary to `DB_ENTRYPOINT_ENFORCED_ATOMICITY`; canonical BUILD002 hashes remain `SERVER_DOMAIN_REQUIRED` and are verified in the production repository before each RPC. Migration owners/superusers remain infrastructure authority and are outside this application-role claim.
