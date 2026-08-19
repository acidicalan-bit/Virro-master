# BUILD 002-B E3 Negative Control Matrix

## Local support evidence

`tests/integration/build002-b-persistence-rls.integration.test.ts` runs against PGlite and passed **4/4**:

1. Complete tenant-rooted snapshot graph and child lineage.
2. Authenticated direct INSERT denial, own-tenant SELECT, and revoked-member read denial.
3. Service-role UPDATE/DELETE denial (privilege revocation; immutable trigger remains installed).
4. Cross-tenant composite FK and missing-parent rejection.

These are deterministic local support checks. PGlite is not counted as native PostgreSQL multi-session evidence.

## Required native controls

The requested E3 gate requires a disposable native PostgreSQL server and independent sessions for foreign requirement/transaction/signal/dependency/qualification/readiness references, authenticated INSERT/UPDATE/DELETE, service-role mutation, active/revoked/unrelated/anonymous reads, and missing trusted factory scope. No `postgres`, `psql`, `pg_isready`, Docker, or repository-supported native PostgreSQL service is available in this worktree environment. Therefore E3 is **BLOCKED**, not PASS, and no remote/provider evidence is claimed.

