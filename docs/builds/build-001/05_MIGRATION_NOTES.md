# BUILD 001 - Migration Notes

## Migration

`20260815030000_build_001_trust_foundation_atomic_commit.sql`

## Data impact

- Additive nullable ownership columns on downstream execution, evidence, verification, artifact and commit records.
- Additive acceptance bindings: execution, TaskSpec ID/version/hash and accepted candidate.
- Additive criterion-evidence TaskSpec version and issuer role.
- No DELETE, destructive type change or historical ownership backfill.
- Existing NULL-owned rows remain compatibility history and are excluded from canonical reads/commit.

## Constraints and triggers

New triggers derive ownership, enforce immutable proven owners and validate execution, resource, candidate, TaskSpec and StateCommit relationships. Strict lineage checks are skipped for NULL-owned history, preventing the migration from assigning meaning that current data cannot prove.

## Grants/RLS

Downstream authenticated access is SELECT-only under ACTIVE tenant/membership RLS. Direct authenticated asset/version mutations are revoked. Two RPCs receive explicit authenticated EXECUTE grants: atomic initial asset creation and accepted outcome commit.

## Recovery

The migration is forward-only and non-destructive. If rollout fails, stop application traffic to the new RPC and fix forward. Dropping the new functions/policies/triggers/columns is not recommended after writes because it would remove the evidence needed to interpret canonical rows.

## Deployment order

1. Back up and test on a disposable Supabase branch/database.
2. Apply all prior repository migrations, then this migration.
3. Run database advisors and inspect function/grant ownership.
4. Execute two-tenant negative RLS tests and the authenticated RPC test.
5. Exercise stale-head, duplicate retry and forced transaction rollback.
6. Enable the application route only after evidence is retained.

## Compatibility

Legacy NULL-owned records are not canonical. The non-production legacy route guard remains unchanged. New application code requires the migration before canonical Field Beta commit or atomic asset initialization is used.
