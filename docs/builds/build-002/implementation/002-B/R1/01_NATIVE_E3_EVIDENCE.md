# BUILD 002-B R1 Native E3 Evidence

The required workflow context remains exactly `Required E0-E3 deterministic gates`.

The deterministic job now provisions `postgres:17` with a health check and runs:

`BUILD002_NATIVE_PG_E3=true BUILD002_NATIVE_PG_URL=postgresql://postgres:postgres@localhost:5432/virro_e3 pnpm exec vitest run tests/native/build002-b-postgres.e3.test.ts`

The test uses the declared `pg` dev dependency, applies every repository migration in lexical order, creates Supabase-compatible roles/schemas, and uses separate sessions for tenant A, tenant B, and revoked membership. It covers own-tenant visibility, cross-tenant invisibility, authenticated write denial, exact wrong-hash lineage rejection, and revoked-member reads.

Local Windows cannot execute this lane because no native PostgreSQL server, `psql`, `pg_isready`, or Docker is installed. Therefore local evidence remains `PGlite support`; native E3 becomes claimable only from the protected GitHub Actions run for the corrective head.

