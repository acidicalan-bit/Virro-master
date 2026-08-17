# BUILD 001-F4 Independent Verification Summary

## Verdict

**F4_VERIFIED**

The candidate was inspected from the exact requested commit and deployed to the disposable Supabase staging project `virro-f4-staging`. The decisive gate was executed with two independent SQL Editor sessions against the same PostgreSQL 17.6 database. PGlite was not used as concurrency evidence.

## Candidate

- Branch: `codex/build001-f4-v`
- Candidate SHA: `fe10cbf0ab96d20bfe8cbac8a006a13e8af1cf77`
- Required parent: `fb375edd80e89f6146cb10db77da151ef1000d49`
- Parent check: PASS
- Worktree before verification documents: clean
- Staging project ref: `exgbzdiebhcfjurpowel`
- Staging region: `us-west-2`
- Applied migrations: 21/21 PASS

## Static conclusions

- Authoritative OWNER source: current `tenant_memberships` joined to current `tenants`, both checked at commit time; actor is `auth.uid()`.
- Static lock order: tenant row, then relevant active OWNER membership rows ordered by membership id, then the delegated F1 asset/head locks.
- Static linearization point: successful acquisition and validation of the tenant and required membership locks, before delegation to the original commit function.
- Stale `AuthorityContext`, `ExecutionAuthority`, `MutationLease`, and client role fields are not passed to the RPC and cannot replace its database checks.
- The wrapper revokes public access to the old unlocked function and exposes only the locked wrapper to authenticated callers.

The live database function definition and grants matched this design.

## Required scenarios

All required scenarios passed in real PostgreSQL. Revocation-first returned `TRUST_COMMIT_NOT_AUTHORIZED` with no canonical transition. In the reverse order, the commit held tenant and membership locks while the second session attempted revocation; the revocation completed only after commit, with commit state `COMMITTED`, two versions, one `StateCommit`, and membership status `REVOKED`. A subsequent commit attempt after revocation was denied. A second currently active OWNER committed a separate fixture successfully.

## Regression scope

F1 passed `13/13`, F2 passed `9/9`, F7 assurance passed `92/92`, and the full suite passed `442/442` with `11` environment-gated tests skipped. No application, migration, dependency, or test file was modified by this verification.

## Final principle

The implementation binds commit authorization to current database state and serializes revocation at the same tenant/membership rows. The F4 gate is verified.
