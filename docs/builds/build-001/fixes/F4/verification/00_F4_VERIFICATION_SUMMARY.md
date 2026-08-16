# BUILD 001-F4 Independent Verification Summary

## Verdict

**F4_BLOCKED**

The candidate was inspected from the exact requested commit, and the SQL design provides a plausible tenant-first lock protocol. The decisive PostgreSQL multi-session gate could not be executed in this worktree: no local PostgreSQL server/client, Docker/Podman, Supabase CLI, or repository-supported shared-database harness is available. PGlite is not accepted as concurrency evidence because independent instances do not share a database and sequential transactions do not establish inter-session serialization.

## Candidate

- Branch: `codex/build001-f4-v`
- Candidate SHA: `fe10cbf0ab96d20bfe8cbac8a006a13e8af1cf77`
- Required parent: `fb375edd80e89f6146cb10db77da151ef1000d49`
- Parent check: PASS
- Worktree before verification documents: clean

## Static conclusions

- Authoritative OWNER source: current `tenant_memberships` joined to current `tenants`, both checked at commit time; actor is `auth.uid()`.
- Static lock order: tenant row, then relevant active OWNER membership rows ordered by membership id, then the delegated F1 asset/head locks.
- Static linearization point: successful acquisition and validation of the tenant and required membership locks, before delegation to the original commit function.
- Stale `AuthorityContext`, `ExecutionAuthority`, `MutationLease`, and client role fields are not passed to the RPC and cannot replace its database checks.
- The wrapper revokes public access to the old unlocked function and exposes only the locked wrapper to authenticated callers.

These are static design findings, not live multi-session proof.

## Required scenarios

Revocation-first, commit-first, acceptance-then-revocation, cross-actor authorization, and zero-partial-state behavior remain **NOT_PROVEN as concurrent database behavior** because the required native multi-session execution was unavailable. Existing sequential/PGlite fixtures cannot upgrade that status.

## Regression scope

F1, F2, F7, and the full suite were **NOT RUN in this verification**. The contract requires the native multi-session gate to pass before those regressions are executed. No application, migration, dependency, or test file was modified by this verification.

## Final principle

The static implementation appears to bind commit authorization to current database state, but without real PostgreSQL multi-session evidence the F4 gate is blocked rather than verified.
