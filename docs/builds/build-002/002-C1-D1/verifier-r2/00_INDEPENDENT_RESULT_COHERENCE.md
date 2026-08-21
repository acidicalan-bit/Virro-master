# BUILD 002-C1-D1 R2 Independent Result-Coherence Verification

## Frozen product

- Product SHA: `e8c3afd69db1067cfeef99ecf105f62a5965df20`
- Product tree: `db3cadaecb7c026bc27c2e648e96160f14fa955c`
- Product branch: `build/build002-c1-d1-readiness-authority-orchestration`
- PR #29: open and not merged
- Failed R1 verifier evidence retained at `d030f2a832d8fd9aa223ca7d83076d9bd3e82da2`

The verifier branch is based directly on the frozen product SHA. Its only
changes are this verifier test, this documentation directory, and the
dedicated verifier workflow.

## Independent result

The focused verifier contains 25 checks and passes all 25. It independently
proves that the D1 result is one coherent historical pair:

- `authorityCommit.readinessId === readiness.id`;
- `authorityCommit.evaluationTime` is the same semantic instant as
  `readiness.createdAt`, using the frozen `instantEquals` domain helper;
- malformed times fail closed as `COMMIT_REJECTED`;
- a supported normalized representation such as `...11:00:00Z` is accepted
  for `...11:00:00.000Z`;
- sub-millisecond drift is rejected;
- `committedAt` remains a separate database commit timestamp.

The suite also covers the existing owner, transaction, principal, dependency
hash, and readiness hash bindings; READY, INSUFFICIENT_SIGNAL, zero-signal,
and HUMAN_REVIEW_REQUIRED positives; caller isolation; exact phase order;
short-circuiting; one-attempt D0 rejection mapping; deep immutability; and
the no-consequence boundary.

## Scope

No product source, migration, authored product test, HTTP route, execution
path, provider, or D0 implementation was modified. D1 still accepts only the
trusted `authority` and `outcomeTransactionId` input and returns a historical
commit-time snapshot. It does not establish post-commit currentness,
delegability, execution permission, or future HTTP caller authentication.

## Gate evidence

- R2 independent verifier: `25/25 PASS`.
- Authored D1 suite: `21/21 PASS`.
- Native D0 PostgreSQL 17: `10/10 PASS` in the required CI workflow.
- Full CI regression: `759 passed, 60 skipped; 65 files passed, 13 skipped`.
- TypeScript, ESLint, assurance, and production build: PASS.

Final verdict is `BUILD002_C1_D1_R2_VERIFIED` only when the dedicated CI run
for the final verifier SHA reports success.
