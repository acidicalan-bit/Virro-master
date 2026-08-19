# BUILD 002-B R2 Native E3 Matrix

The required workflow context remains `Required E0-E3 deterministic gates` with a disposable PostgreSQL 17 service. The permanent native test covers the nine-table RLS matrix, revoked and unrelated actors, anonymous ACL denial, authenticated write denial, five RPC ACLs, direct service-role INSERT denial, exact lineage controls, qualification/readiness rollback, service-role and privileged immutability, and a concurrent identical dependency write.

PGlite remains support evidence only. Native E3 is claimable only from the protected PostgreSQL service run; E4 remains unrun.

Protected run `32257490710` at candidate head `8bb98c2dd3cd491a7ad78b317c840d5c0fcb47b7` passed the required `Required E0-E3 deterministic gates` context. Native PostgreSQL 17 executed all six tests with 6/6 PASS. The same run passed E0-E2, local PostgreSQL support (15/15), TypeScript, ESLint, the complete deterministic regression (54 files passed, 6 skipped; 587 tests passed, 17 skipped), and the production build. E4 remains out of scope and was not run.
