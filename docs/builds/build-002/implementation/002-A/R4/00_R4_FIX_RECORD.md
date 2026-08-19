# BUILD 002-A R4 Fix Record

## Baseline and finding

- R3 failed candidate: `7efd14e683b5f7552c1746fbd60695e1957fde08`.
- Finding: `NONCRITICAL_EXPIRY_OVERBLOCK` (A13).
- Reproduction: a critical qualification remained valid through T3 while an
  integrity-valid optional qualification expired at T1. At T2 the readiness
  decision became `INSUFFICIENT_SIGNAL` with `STALE_SOURCE`, although the
  equivalent critical-only case was `READY`.
- The prior aggregation used every `QUALIFIED` qualification when deciding
  whether expiry should overrule a ready state. That made optional historical
  evidence incorrectly control the critical decision.

## Corrective boundary

R4 is a pure-domain aggregation correction in
`src/domain/outcome/signal-readiness.ts`:

1. Expiry that can demote `READY` or `READY_WITH_CONDITIONS` is now computed
   only for `QUALIFIED` qualifications whose requirement is `critical: true`.
2. The readiness horizon (`validUntil`) was already derived from critical
   qualifications and remains unchanged.
3. A qualification with semantic outcome `INVALID`, a bad qualification hash,
   an invalid temporal interval, a future timestamp, or another binding
   mismatch remains fail-closed even when its requirement is non-critical.
4. Optional expiry is retained as historical/auditable input and does not
   invent a condition code. Explicit condition codes still produce
   `READY_WITH_CONDITIONS` and remain non-delegable under existing policy.

No API, executor, persistence, migration, RLS, TaskSpec, or schema material
was changed. BUILD 002-B/C/D/E remain unproven and are outside this fix.

## Permanent regression evidence

`tests/assurance/build002-a-signal-readiness.test.ts` adds the fourteen R4
cases required by the specification: optional expiry with and without a
critical horizon, critical horizon boundaries, critical expiry control,
non-critical invalid/hash-tampered/future/temporally impossible inputs,
explicit conditions, non-qualified optional history, ordering stability,
multiple optional horizons, and the optional current-to-expired transition.

The focused file passes `106/106` tests, comprising the previous 92 tests and
14 new R4 regressions.

## Version and provenance decision

Signal, qualification, readiness, dependency, requirement, and evaluator
schema versions remain unchanged. R4 changes only readiness aggregation and
fail-closed classification; it does not change serialized semantic hash
material or introduce a new trust boundary.

Result SHA is recorded after the normal R4 candidate commit. Independent
verification remains required before any release promotion.
