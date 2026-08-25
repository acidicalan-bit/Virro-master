# BUILD 002-C1-D5-R0 Trust Map

The caller supplies only principal, membership, D4 authority id, and an exact
candidate path. Tenant identity, transaction, asset, source version, TaskSpec,
blueprint, dependency snapshot, readiness, admission, and authority hashes are
derived from the locked D4 graph.

The consequence boundary is a new append-only `build002_mutation_leases` fact.
The RPC locks current tenant membership, transaction, asset/version, D4 row,
admission, readiness, dependency snapshot, and the semantic patch/intent pair.
It then verifies the persisted TaskSpec hash again. No execution, provider,
state-commit, or transaction-status operation is reachable from this boundary.

`targetPath` is proven only when it is an exact TaskSpec value id with
`critical=false` and non-UNKNOWN provenance, and an exact current
`transaction_patches`/`partial_intents` pair using `SET_ATTRIBUTE` or
`ADJUST_ATTRIBUTE`. Prefixes, wildcards, categories other than `MUTABLE`, and
unlisted paths are rejected.
