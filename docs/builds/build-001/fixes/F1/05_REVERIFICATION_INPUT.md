# BUILD 001-F1 - Re-verification Input

## Target

Independently verify only the critical contradiction in `commit_accepted_field_outcome(uuid)` and the F1 corrective migration. Do not infer overall BUILD 001 PASS from this result.

## Expected fixed behavior

For an ACTIVE tenant with an ACTIVE OWNER, a VERIFIED transaction, exact TaskSpec evidence, a successful execution and durable Human Acceptance, the RPC must atomically:

1. insert one immutable AssetVersion referencing the delivered candidate;
2. move `assets.current_version_id` from the exact base version to that version;
3. insert one StateCommit;
4. set the outcome transaction to COMMITTED;
5. leave the canonical candidate row unchanged;
6. return an idempotent result on retry.

## Required adversarial checks

- run the baseline migration set without F1 and confirm `TRUST_STATE_COMMIT_IMMUTABLE` plus full rollback;
- run all migrations with F1 and confirm the legitimate transition succeeds;
- attempt direct changes to candidate content, lineage and `committed` and confirm denial;
- attempt AssetVersion mutation and confirm denial;
- verify stale-head, wrong-transaction binding, missing acceptance, missing verification and unknown-resource failures;
- inject a failure at StateCommit insertion and confirm no partial version/head/status transition;
- inspect function EXECUTE grants, SECURITY DEFINER and empty `search_path` for unintended expansion.

## Reproduction command

Install PGlite outside the repository, point `PGLITE_PACKAGE_ROOT` at its `@electric-sql/pglite` package, then run:

```powershell
$env:PGLITE_PACKAGE_ROOT='<external-pglite-package-root>'
pnpm vitest run tests/integration/build001-f1-canonical-commit.integration.test.ts
```

The suite bootstraps the required Supabase-compatible roles and `auth.uid()`, applies repository migrations in filename order, and exercises actual PL/pgSQL functions, triggers and transaction rollback.

## Review scope

Expected F1 implementation files are limited to:

- one additive corrective migration;
- one real PostgreSQL integration test;
- F1 finding, contract, decision, reproduction, evidence and re-verification documents;
- ADR-004 for canonical candidate immutability.

Legacy paths, service-role tenant filtering, verifier policy, OWNER TOCTOU, broader StateCommit design and test architecture are expressly outside this fix.
