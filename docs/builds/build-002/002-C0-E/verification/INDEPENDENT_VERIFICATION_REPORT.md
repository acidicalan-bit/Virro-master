# BUILD 002-C0-E Independent Verification

This report belongs only to the verifier branch and is not product evidence
for the C0-E candidate until the dedicated workflow completes.

The verifier starts from the exact product candidate
`dd2311a7e5f0a877e45ae38f48d7d7be1f744d2c` and does not import or invoke the
authored C0-E test. It independently creates two tenants, two active
memberships, two tenant-owned transactions, two published Blueprint/Profile
pairs, and two immutable bindings in a fresh PostgreSQL 17 database.

The positive path uses the production `TenantAuthorityService`,
`OutcomeRequirementAuthorityResolver`, domain hash verification, and
`compileSignalRequirements`. Native adapters are test-only PostgreSQL
implementations of existing repository interfaces; they do not claim to prove
Supabase transport semantics already covered by C0-B/C0-C.

The verifier separately exercises zero/revoked membership, suspended and
revoked tenants, multiple memberships, foreign transactions, missing binding,
binding owner/transaction/hash tamper, missing and semantically tampered
Blueprint/Profile records, Profile-to-Blueprint mismatch, forged raw request
material, upstream invalid binding publication, four-session concurrency,
cross-tenant concurrency, and success/failure side-effect snapshots.

The expected revocation contract remains:
`AUTHORITY_REVOCATION_WINDOW = CURRENT_REQUEST_AUTHORITY_SNAPSHOT`.

No runtime source, migration, RPC, HTTP route, readiness evaluation, signal
ingestion, execution, provider call, MutationLease, or StateCommit behavior is
added by the verifier.

## Completed run

The independent workflow completed successfully on verifier commit
`74b219ad90b25cea5e10602b521c095c5ee9b5fe` (PostgreSQL 17.11). The independent
suite passed 6/6 tests; the authored C0-E regression passed 7/7; native
BUILD002-B passed 7/7; native C0-C passed 4/4; SQL passed 15/15; assurance
passed 271/271; model passed 32/32; application passed 9/9; and the full
Vitest regression passed 59 files / 657 tests, with 10 files / 53 tests
skipped. TypeScript, ESLint, assurance checks, and the production build all
passed. The verifier branch changes remain limited to this report, its
independent test, and its dedicated workflow; the product candidate remains
unchanged and unmerged.
