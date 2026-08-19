# Evaluation Orchestration

The proposed deterministic sequence for one transaction is:

1. Resolve authenticated authority and load the exact owned transaction.
2. Resolve the canonical Blueprint/version/policy (currently the C5 gap).
3. Compile the exact SignalRequirement set.
4. Classify accepted caller material into server-owned Signals.
5. Build and hash the DependencySnapshot from the requirements, Signals, and
   approved dependency bindings.
6. Qualify every requirement using BUILD002-A deterministic functions.
7. Aggregate readiness. Missing critical Signals, contradiction, UNKNOWN,
   stale/expired dependencies, or evaluator failure cannot produce READY.
8. Verify all domain hashes and persist through the BUILD002-B repository.
9. Return only product readiness metadata and immutable snapshot identifiers.

There is no LLM authority in this sequence. A semantic provider may be
deferred; if deferred, the result is non-READY or human-review-required.

The orchestration owns an evaluation/correlation ID and must be idempotent for
the same subject, requirement snapshot, Signal set, dependency snapshot, and
evaluator version. A retry may resume lower-level immutable snapshots but must
never reinterpret a caller declaration as canonical authority.

The sequence has zero executor, `ExecutionAuthority`, `MutationLease`,
`StateCommit`, Field Beta, or candidate-asset side effects. Those belong to
BUILD002-D or later.
