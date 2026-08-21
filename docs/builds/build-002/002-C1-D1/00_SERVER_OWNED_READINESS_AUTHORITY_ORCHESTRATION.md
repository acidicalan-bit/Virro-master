# BUILD 002-C1-D1 Server-Owned Readiness Authority Orchestration

## Candidate Scope

This candidate composes the frozen C0-D requirement authority, C1-A signal
universe, C1-B dependency snapshot, C1-C readiness candidate, the material
read-back boundary, and the frozen C1-D0 atomic commit primitive. It adds no
HTTP route, migration, execution path, provider call, or StateCommit write.

The only orchestration input is an authenticated `AuthorityContext` and an
`outcomeTransactionId`. Caller-supplied tenant, signal, readiness, evaluator,
clock, policy, or material fields are not accepted or consulted.

## Exact Sequence

The sequence is single-pass and has no retry loop:

1. C0-D resolves requirement authority.
2. C1-A resolves the complete persisted signal universe.
3. C1-B re-reads and binds transaction, asset-head, source-version, and signal dependencies.
4. C1-C derives qualifications and readiness with the server evaluator and clock.
5. The material resolver re-reads transaction, asset, and base version and checks tenant/project/asset/version ownership, current head, binding addresses, and policy nullness.
6. D0 is invoked exactly once with the server-derived graph.

Every phase maps failures to a bounded phase error. D0 rejection maps to
`COMMIT_REJECTED`; raw repository or database details are not returned.

## Material Boundary

Transaction semantic and source asset-version hashes are recomputed from the
fresh read and must equal the C1-B dependency snapshot. The blueprint hash is
taken from C0-D and must match the snapshot; policy remains `null`. The D0
payload therefore cannot be supplied by the caller or by a stale transaction
mirror.

## Result Boundary

The result is a deeply immutable snapshot containing the D0
`authorityCommit` record and the exact C1-C `readiness` assessment. D1 commits
readiness assessments, not only `READY` assessments: a valid
`INSUFFICIENT_SIGNAL` assessment may be historical authoritative evidence.
Authority of an assessment does not mean that the assessment is `READY`.

A successful D1 result is one coherent pair:
`AuthorityCommit` <-> `DelegationReadiness`. The pair is bound by the exact
readiness identity, readiness content hash, dependency snapshot hash, and
evaluation instant. A D0 record whose `readinessId` names another readiness,
or whose `evaluationTime` is not the same canonical instant as
`readiness.createdAt`, is rejected as `COMMIT_REJECTED`. The D1 boundary uses
the frozen domain instant semantics and fails closed for malformed timestamps.
`evaluationTime` is the readiness evaluation instant; it is intentionally not
required to equal `committedAt`, which is the database marker commit time.

The result states `COMMIT_TIME_SERIALIZED` and explicitly records
`REVALIDATION_REQUIRED_FOR_CONSEQUENCE`. Even `READY` does not establish
current delegability or execution permission. A later signal, membership,
asset-head, or expiry change is not silently promoted to permanent currentness;
future consequence revalidation remains outside C1-D1.

## Exclusions

No execution authority, mutation lease, execution run, provider call, or
StateCommit operation is created. C1-D0 remains the sole atomic authority
marker writer. C1-D1 does not implement C1-D0 concurrency, C1-D1 current-state
revalidation, HTTP, or product promotion.
