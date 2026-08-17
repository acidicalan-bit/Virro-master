# BUILD 001-F5 Fix Evidence

## Focused controls

- Tenant A scoped read includes `owner_tenant_id = Tenant A` and never uses
  legacy `tenant_id` as authority.
- Tenant B cannot read or mutate a Tenant A row by presenting a legacy or
  descendant ID.
- A scoped writer cannot insert a conflicting owner.
- Descendant inserts carry the scoped owner and remain subject to the existing
  transaction-lineage triggers.
- Storage access outside the authorized tenant namespace fails before the
  service-role client is called.
- Same-tenant repository construction remains compatible with the existing
  server path.

Focused regression: `tests/security/build001-f5-tenant-ownership.test.ts`
passes 4/4.

Regression results from this worktree:

- F1 local PostgreSQL: 13/13 passed.
- F2 legacy isolation: 9/9 passed.
- F4 trust-foundation/linearization contract: 32/32 passed.
- F7 assurance suites: 42/42 passed.
- Full Vitest: 446 passed, 11 skipped across 53 files (457 tests).
- TypeScript: passed.
- Focused ESLint: passed.
- Assurance manifest check: passed.
- Production build: passed.

## Boundary classification

The repository and local PGlite tests prove application predicates and local
PostgreSQL lineage behavior. A disposable remote RLS/Storage deployment was
not required for this narrow patch; `REAL_RLS` and remote Storage policy
behavior remain `NOT_PROVEN` for BUILD 001-R.
