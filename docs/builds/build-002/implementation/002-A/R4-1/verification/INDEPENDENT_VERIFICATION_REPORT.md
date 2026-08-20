# BUILD 002-A R4 + R4-1 Independent Verification

## Scope and ancestry

The verifier is based directly on product commit
`adc26f298388cd4292d6a279ad1b5dff589f6be6`, which is the direct descendant
of R4 `c69d9be9901230682b9403fd0d36a9c3b0faa677` and canonical `main`
`488362de5ce00d583007eba68fda4b3a5eef80d5`. The verifier imports production
domain code only. It does not import the authored R4/R4-1 test file.

## Independent findings

- Past and same-instant signals qualify; future signals are rejected as
  `INVALID / SIGNAL_FROM_FUTURE` even when their content hash verifies.
- `capturedAt` remains outside `contentHash`. Coherent intervals qualify,
  coherent expired intervals produce `STALE_SOURCE / SIGNAL_EXPIRED`, and
  equal or reversed windows produce `INVALID / SIGNAL_TEMPORAL_INVALID`.
- Temporal-window invalidity has deterministic precedence over future capture,
  independent of signal array ordering. Both single-valued and multi-valued
  evidence reject future or incoherent members.
- Future critical evidence cannot produce `READY`,
  `READY_WITH_CONDITIONS`, or delegation; the current signal path remains
  `READY` and delegable.
- The current evaluator is exactly schema
  `build002-qualification-evaluator-v0.1`, version `0.2.0`, with the
  canonical definition hash. A wrong definition hash fails closed.
- A canonical, hash-valid `0.1.0` qualification remains historical evidence
  but cannot contribute to current readiness. Optional and mixed legacy
  qualifications fail closed with `QUALIFICATION_EVALUATOR_MISMATCH`.
- A hash-valid legacy readiness is `STALE` under default currentness and is
  not delegable. It can be `CURRENT` only under an explicit historical lens,
  while delegation remains false. A current `0.2.0` readiness is `CURRENT`
  and delegable. Bad evaluator hashes remain internally hash-valid only when
  deliberately re-sealed, but are not semantically current.
- Explicit legacy replay may describe a historical `READY` result, but it is
  operationally non-delegable. Future C1 orchestration must use the
  server-owned `currentDefaultEvaluator()` and must not accept evaluator
  selection from a client or request.

## Evidence

Independent verifier test: 18/18 PASS locally. The independent GitHub
workflow uses Ubuntu with PostgreSQL 17, no secrets, and runs the verifier,
authored BUILD 002-A, BUILD 002-B, C0 authored/native, BUILD 001, SQL,
assurance, model, application, full Vitest, TypeScript, ESLint,
`assurance:check`, and production build gates.

Product required workflow run `32339095647` passed at product SHA
`adc26f298388cd4292d6a279ad1b5dff589f6be6`. The independent verifier run
`32340758226` (job `96339225830`) also passed on Ubuntu. The verifier PR is
kept open and unmerged solely until this report is recorded; it targets the
product branch, not `main`.

No migrations, persistence, RPC, server, HTTP, C0, or BUILD002-C changes were
introduced by the product candidate or the verifier.
