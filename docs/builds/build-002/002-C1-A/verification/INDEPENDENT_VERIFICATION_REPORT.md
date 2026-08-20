# BUILD002-C1-A Independent Verification

## Scope

This report covers only the server-owned persisted Signal universe boundary.
The verifier branch is based directly on product SHA `963d06f74d44fef950acfd5ba5e30e0c562d5f9a` and contains verifier tests, workflow, and this report only. Product source, migrations, authored C1-A tests, and `assurance.yml` are not modified here.

## Independent Evidence

- The application verifier uses an independently authored repository adapter with R1/R2/R3, omission, injection, foreign-scope, malformed, hash-invalid, duplicate, future, expired, contradictory, immutability, and bounded-error cases.
- The query-builder verifier executes `SupabaseBuild002PersistenceRepository.listSignalsForRequirement` against an independently authored recording client. It captures the runtime `from`, `select`, exact tenant/transaction/definition-hash filters, and both deterministic order clauses.
- The native verifier creates a disposable PostgreSQL 17 database, applies all 29 migrations once, persists rows for separate tenant, transaction, and requirement-hash addresses, and proves exact selection/order plus unchanged counts.
- The dedicated workflow runs these tests, authored C1-A tests, and the required regression/typecheck/lint/assurance/build gates without secrets or provider credentials.

## Results

Results are recorded only after the dedicated verifier workflow completes. No product fix is performed by this branch.
