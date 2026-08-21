# BUILD 002-C1-D0 R1-1: Semantic Graph Closure

R1-1 keeps the existing D0 transaction and closes the remaining distinction
between individually valid artifacts and a valid authority graph.

The marker trigger now binds the persisted requirement projection to the
immutable C0 Requirement Profile, requires the canonical requirement hash set,
and checks every qualification against the marked snapshot, evaluator,
readiness timestamp, and exact `(signal_id, signal_content_hash)` rows. The
readiness qualification link set must equal the persisted qualification IDs
and hashes exactly.

The existing D0 RPC is narrowed to the canonical requirement-definition hash
set when checking the signal universe. Historical signals for other
requirements therefore do not poison the current candidate, while a new
canonical signal still invalidates the candidate before the marker write.

The application repository independently composes the requirement map,
qualification-to-requirement bindings, exact signal pairs, and a frozen
`evaluateDelegationReadiness()` result before invoking the single RPC.

Native PostgreSQL coverage retains the same-transaction direct-marker denial,
authenticated tenant-scoped marker reads, membership and asset-head lock
serialization, graph rollback, and the existing C1-D0 positive/negative
controls. No new migration, HTTP path, execution write, transaction status
transition, verifier, or C1-D1 work is introduced.
