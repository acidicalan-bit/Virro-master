# BUILD 002-B R1 Native E3 Evidence

The required workflow context remains exactly `Required E0-E3 deterministic gates`.

The deterministic job now provisions `postgres:17` with a health check and runs:

`BUILD002_NATIVE_PG_E3=true BUILD002_NATIVE_PG_URL=postgresql://postgres:postgres@localhost:5432/virro_e3 pnpm exec vitest run tests/native/build002-b-postgres.e3.test.ts`

The test uses the declared `pg` dev dependency, applies every repository migration in lexical order, creates Supabase-compatible roles/schemas, and uses separate sessions for tenant A, tenant B, and revoked membership. It covers own-tenant visibility, cross-tenant invisibility, authenticated write denial, exact wrong-hash lineage rejection, and revoked-member reads.

Local Windows cannot execute this lane because no native PostgreSQL server, `psql`, `pg_isready`, or Docker is installed. Therefore local evidence remains `PGlite support`; native E3 is claimed only from the protected GitHub Actions run below.

Protected CI evidence:

- Workflow run: `32250566096`
- Candidate head: `c2ed3a415cb3c477664e2fb88b5703cf905de931`
- PostgreSQL service: `postgres:17`
- Required context: `Required E0-E3 deterministic gates` PASS
- Native E3 step: PASS
- Full deterministic regression and production build: PASS

## Final R1 gate record

- PGlite support test: 5/5 PASS (support evidence only).
- E0-E2 assurance: 9 files, 201/201 PASS.
- Native PostgreSQL E3: 1 file, 3/3 PASS on PostgreSQL 17 with independent tenant and revoked-membership sessions.
- Full deterministic regression: 54 files passed, 6 skipped; 587 tests passed, 14 skipped.
- TypeScript, ESLint, assurance check, and production build: PASS.
- R1 atomic RPC failure injection: PASS; failed child insertion leaves no parent row.
- R1 exact lineage controls: PASS; wrong content-hash links and non-paired signal sets are rejected.
- E4 remains out of scope and was not run.
