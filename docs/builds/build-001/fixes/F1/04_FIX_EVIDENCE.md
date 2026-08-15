# BUILD 001-F1 - Fix Evidence

## Baseline and patch

- accepted baseline: `7cc0e3b9951f276dbaf4f74f73662e430b9960c9`;
- corrective migration: `20260815040000_build_001_f1_canonical_candidate_immutability.sql`;
- selected strategy: canonical candidate remains immutable and the redundant `committed` UPDATE is removed from the RPC;
- unchanged boundary: authority, exact evidence, acceptance, artifact lineage, stale-head CAS, idempotency, grants and SECURITY DEFINER confinement.

## Original reproducer

The real SQL suite applies the baseline migration set without the F1 migration, seeds a valid canonical fixture and invokes the actual RPC. Observed result:

```text
TRUST_STATE_COMMIT_IMMUTABLE
head = base version
transaction status = VERIFIED
asset versions = 1
StateCommits = 0
```

This confirms both the contradiction and PostgreSQL rollback before the patch.

## Result after F1

With all 20 repository migrations applied, the same legitimate boundary succeeds:

```text
idempotent = false
head = new immutable version
transaction status = COMMITTED
asset versions = 2
StateCommits = 1
candidate committed = false
```

A retry returns `idempotent = true` without creating another version or StateCommit.

## Immutability evidence

Direct UPDATE attempts remain denied:

- candidate content: `TRUST_STATE_COMMIT_IMMUTABLE`;
- candidate transaction lineage: `TRUST_TRANSACTION_IMMUTABLE`;
- candidate legacy `committed` flag: `TRUST_STATE_COMMIT_IMMUTABLE`;
- AssetVersion state: `TRUST_ASSET_VERSION_IMMUTABLE`.

No trigger was disabled or relaxed. No session flag, bypass or new UPDATE grant was introduced.

## Atomicity and negative paths

- stale head returns `TRUST_STALE_HEAD` with no version, StateCommit or transaction-status partial write;
- an attempt to bind the immutable outcome to the wrong transaction is denied by the existing append-only control before canonical commit state can be written;
- missing Human Acceptance returns `TRUST_HUMAN_ACCEPTANCE_REQUIRED` with no partial write;
- missing verification returns `TRUST_VERIFICATION_MISMATCH` with no partial write;
- unknown outcome returns `TRUST_RESOURCE_NOT_AUTHORIZED`;
- an injected StateCommit INSERT failure rolls back the new version, head movement and transaction status.

## Verification results

```text
Focused real PostgreSQL boundary: 1 file, 7 passed
Focused BUILD 001 security + F1: 2 files, 37 passed
Full test suite: 39 files passed, 5 skipped; 332 tests passed, 11 skipped
TypeScript: passed
ESLint: passed
Next.js production build: passed
```

The SQL validation used PostgreSQL 18.3 through PGlite 0.5.5, `pgcrypto`, a minimal Supabase role/auth bootstrap and every repository migration. It did not use `TrustHarness`.

## Remaining unknowns

- execution against a deployed Supabase project remains `UNKNOWN` because no remote credentials or infrastructure were used;
- unrelated BUILD 001 findings explicitly excluded by the F1 contract remain unresolved and require independent re-verification;
- F1 does not assert overall BUILD 001 acceptance.
