# BUILD 002-A R4 Signal Temporal Causality

R4 closes the temporal causality gap at the pure signal qualification
boundary. Signal temporal metadata is canonicalized through `parseInstant`:
both `capturedAt` and `validUntil` are normalized without changing the
semantic signal content hash, which continues to exclude `capturedAt`.

Qualification applies deterministic fail-closed precedence after structural,
content-hash, and exact snapshot binding checks:

1. `capturedAt >= validUntil` yields `INVALID / SIGNAL_TEMPORAL_INVALID`.
2. `capturedAt > evaluationTime` yields `INVALID / SIGNAL_FROM_FUTURE`.
3. A coherent interval with `validUntil <= evaluationTime` retains
   `STALE_SOURCE / SIGNAL_EXPIRED`.

The checks apply to every supplied signal, including optional and multi-valued
members, and do not depend on array order. A future signal therefore cannot
become a qualified input to readiness. Existing readiness semantics classify
the resulting invalid qualification as `INSUFFICIENT_SIGNAL`, preserving the
existing non-delegable behavior without adding a readiness state.

Because evaluator behavior changed, the default evaluator version is now
`0.2.0` under the existing evaluator schema version. No migration, RPC,
persistence, C0, HTTP, ingestion, readiness orchestration, or execution code
is changed by this repair.
