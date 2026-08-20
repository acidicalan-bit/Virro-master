# BUILD 002-A R4-1 — Evaluator Semantic Revocation

R4-1 closes the compatibility boundary introduced by the R4 temporal
causality repair. Evaluator identity is the exact tuple of `schemaVersion`,
`version`, and its canonical definition hash. The current default remains
`0.2.0`; the definition hash is derived from those two semantic fields.

Qualification and readiness content hashes continue to provide historical
integrity. A valid historical `0.1.0` artifact is not rewritten or rejected
as history, but it cannot contribute to a current `0.2.0` readiness result.
Readiness validity defaults to the current evaluator and therefore marks a
legacy readiness `STALE`; an explicit expected evaluator remains available
for historical inspection only. Delegation additionally requires the current
evaluator identity.

Malformed evaluator identities fail closed. Qualification evaluator mismatch
is structural invalidity, including for optional requirements, and is
deterministic regardless of input ordering. Current `0.2.0` qualifications and
readiness retain the normal `READY`/`CURRENT` path. R4 temporal behavior is
unchanged: future signals remain `SIGNAL_FROM_FUTURE`, incoherent windows
remain `SIGNAL_TEMPORAL_INVALID`, coherent expired evidence remains
`SIGNAL_EXPIRED`, and `capturedAt` remains excluded from signal content hashes.

No migration, persistence schema, RPC, C0, HTTP, ingestion, orchestration, or
BUILD002-C changes are part of R4-1.
