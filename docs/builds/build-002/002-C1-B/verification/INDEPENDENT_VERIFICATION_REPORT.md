# BUILD 002-C1-B Independent Dependency-Authority Verification

This report is verifier-owned. It is produced from a branch created directly
from product SHA `73169586cd89c75bba973bdf3ab6e8bae82c0a7d` and does not import
the authored C1-B tests.

## Scope and provenance

- Product branch: `build/build002-c1-b-dependency-snapshot`
- Product SHA: `73169586cd89c75bba973bdf3ab6e8bae82c0a7d`
- Product base: `main`
- Verifier branch: `verify/build002-c1-b-independent`
- Runtime: GitHub Actions `ubuntu-latest`, PostgreSQL `17`
- Provider calls and credentials: none

## Independent checks

The assurance verifier checks the server signature and authority-first order,
complete requirement/signal binding, zero-signal requirements, caller-hash
attacks, cross-requirement duplicate IDs, ownership and source-head checks,
transaction semantic and source-version hash sensitivity, temporal evidence
retention for later C1-D revalidation, immutable hash-valid output, and the
absence of write/qualification/readiness/execution operations.

The native verifier creates a disposable PostgreSQL 17 database, applies the
repository's 29 migrations, inserts two tenant-owned fixture chains, resolves
one chain through independent recording adapters, verifies zero canonical
writes and cross-tenant isolation, then verifies stale source-head rejection.

## Results

The exact product `pull_request` run `32387849190` passed on product SHA
`73169586cd89c75bba973bdf3ab6e8bae82c0a7d`; required job
`96486600372` passed. The independent verifier `pull_request` run
`32389068358` passed on verifier SHA `3446daa597593eda73fa75ca4d38e3879f3cd1e9`;
job `96490540073` passed on `ubuntu-latest` with PostgreSQL `17.11`.

| Gate | Result |
| --- | --- |
| Product required `pull_request` run | PASS |
| Independent assurance | 11/11 PASS |
| Independent native PostgreSQL 17 | 2/2 PASS |
| Authored C1-B assurance | 15/15 PASS |
| Authored C1-B native | 1/1 PASS |
| C1-A / Build002-A/B / C0 regression | PASS |
| BUILD001 SQL, assurance, model and application | PASS |
| Full Vitest | 62 files passed, 12 skipped; 720 tests passed, 51 skipped |
| TypeScript | PASS |
| ESLint | PASS, one pre-existing unused `SIGNAL_B` warning |
| Assurance check | PASS |
| Production build | PASS |

No provider calls or credentials were used. The native database was
disposable and was dropped by the test teardown.

## Decision

`BUILD002_C1_B_INDEPENDENTLY_VERIFIED`
