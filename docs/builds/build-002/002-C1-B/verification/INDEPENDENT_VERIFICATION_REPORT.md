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

Results are recorded after the exact pull-request workflow completes.

| Gate | Result |
| --- | --- |
| Product required `pull_request` run | PENDING |
| Independent assurance | PENDING |
| Independent native PostgreSQL 17 | PENDING |
| Authored C1-B and native regression | PENDING |
| C1-A / Build002-A/B / C0 regression | PENDING |
| BUILD001 regression | PENDING |
| Full Vitest / TypeScript / ESLint / assurance / build | PENDING |

## Decision

`BUILD002_C1_B_INDEPENDENT_VERIFICATION_BLOCKED`

This placeholder is replaced only by the verifier after the exact workflow,
PR state, product ancestry, and clean worktree have been independently checked.
