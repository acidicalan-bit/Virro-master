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

Product PR #22 is open against `main`; its required `Required E0-E3 deterministic gates` run `32349404217` succeeded for product SHA `963d06f74d44fef950acfd5ba5e30e0c562d5f9a`.

Verifier PR #23 is open against `build/build002-c1-a-signal-universe`; it is intentionally unmerged. The independent workflow run `32350170348` succeeded for verifier SHA `3f987cf9185c964b7deeea0933ab4a23750371be` (job `96367406237`, `ubuntu-latest`, PostgreSQL 17 service).

The independent application verifier passed 10/10 tests. The independent native PostgreSQL verifier passed 1/1 test after applying all 29 migrations. Authored C1-A application and native regressions passed 13/13 and 1/1. The combined regression gates passed 308/308 assurance tests, 32/32 model tests, 9/9 application tests, 15/15 SQL tests, and full Vitest passed 61 files with 11 skipped, 704 tests with 49 skipped. TypeScript, ESLint, assurance check, and production build passed. ESLint reported one pre-existing unused `SIGNAL_B` warning in an unrelated integration test.

The runtime query-builder test captured the production repository calls and verified exact tenant, transaction, requirement-definition-hash, `captured_at ASC`, and `signal_id ASC` clauses. Valid rows reconstructed; malformed, hash-invalid, and duplicate rows failed closed. Future, expired, and contradictory signals remained visible. Foreign scope, wrong requirement, caller omission, and caller injection controls passed. No qualification, readiness, C1-B, execution, provider, or persistence writes occurred.

No product fix was performed by this branch. Product files changed by the verifier: none.
