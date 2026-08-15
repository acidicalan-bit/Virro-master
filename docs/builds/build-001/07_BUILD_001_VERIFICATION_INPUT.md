# BUILD 001 - Verification Input

## Scope to verify

Verify the implementation commit whose parent is `fd3158b067b9b67b9420324266bdfb35c4607225` on `foundation/virro-vnext`. Do not substitute `origin/main` and do not treat deterministic SQL assertions as deployed Supabase proof.

## Primary artifacts

- `00_PRE_IMPLEMENTATION_TRUST_MAP.md`
- `01_AUTHORITY_MODEL.md` through `06_IMPLEMENTATION_EVIDENCE.md`
- `adrs/ADR-001_CANONICAL_OWNERSHIP.md`
- `adrs/ADR-002_MUTATION_LEASE_WRAPPER.md`
- `adrs/ADR-003_ATOMIC_PRIVILEGED_COMMIT.md`
- `supabase/migrations/20260815030000_build_001_trust_foundation_atomic_commit.sql`
- `tests/security/build001-trust-foundation.test.ts`
- `tests/integration/build001-trust-foundation.integration.test.ts`

## Local verification

```powershell
git diff --check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Confirm that the full deterministic suite has no regression and record skipped environment tests separately.

## Real Supabase verification

Use a disposable branch/database with the complete migration history. Set `RUN_BUILD001_TRUST_INTEGRATION=true` only there. Verify grants, RLS with two authenticated tenants, trigger-derived ownership, private Storage access, exact evidence rejection, stale-head concurrency, duplicate retry and rollback after forced errors. Run Supabase security/performance advisors.

## Required independent decisions

1. Does deployed PostgreSQL accept the migration without syntax/schema drift?
2. Do authenticated RLS tests deny every foreign execution/evidence/artifact read and write?
3. Does the RPC preserve the head/StateCommit invariant under concurrent requests and injected failures?
4. Is remaining service-role use acceptably centralized and scoped?
5. Are NULL-owned legacy rows demonstrably excluded from canonical commit?

The implementer does not declare BUILD 001 PASS. A clean-context verifier must determine acceptance.
