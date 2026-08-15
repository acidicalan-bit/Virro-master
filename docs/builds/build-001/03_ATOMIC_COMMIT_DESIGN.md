# BUILD 001 - Atomic Commit Design

## Operation

`public.commit_accepted_field_outcome(uuid)` is the only canonical finalization mechanism. PostgREST invokes one PostgreSQL function, so version creation, head movement, StateCommit creation, candidate marking and transaction finalization share one database transaction.

## Preconditions

The function derives and validates:

1. `auth.uid()` and an ACTIVE OWNER membership over an ACTIVE tenant.
2. Field outcome, transaction, asset and base-version ownership.
3. `VERIFIED` transaction and passed machine verification.
4. READY TaskSpec snapshot with exact ID, version, hash, transaction, asset and base version.
5. Durable Human Acceptance bound to the delivered candidate, execution and exact spec; accepting authority remains active.
6. Passed verification for the same execution.
7. One PASS receipt for every critical non-human criterion, with allowed evidence type, correct issuer role and exact artifact tuple.
8. Delivered candidate ownership, execution and base-version lineage.

## Atomic invariant

The asset row is locked `FOR UPDATE`. Head movement uses compare-and-set against `transaction.base_version_id`. If any statement or injected failure raises, PostgreSQL rolls back the version, head and StateCommit together. The StateCommit trigger independently checks that its new version is the visible head and its parent is the transaction base.

## Concurrency and retries

- Concurrent commits serialize on the asset row.
- A moved head returns `TRUST_STALE_HEAD` (`40001`).
- `unique(state_commits.transaction_id)` prevents duplicates.
- A retry after a successful commit returns the same StateCommit/version with `idempotent=true` after consistency validation.
- A retry after rollback sees no partial state and may execute normally.

## Privilege choice

`SECURITY INVOKER` is insufficient because authenticated clients deliberately lack direct INSERT/UPDATE rights on `asset_versions`, `assets` and `state_commits`; granting those rights would recreate the forbidden multi-request mutation surface. The function is therefore `SECURITY DEFINER`, uses empty `search_path`, schema-qualified relations, internal `auth.uid()` reauthorization, revoked PUBLIC/anon execute and an explicit authenticated grant.
