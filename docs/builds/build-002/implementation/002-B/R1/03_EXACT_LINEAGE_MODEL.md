# BUILD 002-B R1 Exact Lineage Model

Requirement address:

`(owner_tenant_id, outcome_transaction_id, requirement_id, requirement_definition_hash)`

Signal address:

`(owner_tenant_id, outcome_transaction_id, signal_id, content_hash, requirement_id)`

The requirement and signal addresses are unique and referenced by full composite foreign keys from Signals, Qualifications, dependency-signal links, and qualification-signal links. Qualification links now persist `requirement_id`; it is populated from DependencySnapshot references and cannot be independently paired with a different Signal requirement.

Qualification persistence requires the supplied requirement hash to equal the Qualification's own hash. Signal ID/content-hash sets are compared against the exact DependencySnapshot references; no index-based pairing remains.

Readiness persistence loads every requested Qualification under the trusted scope, requires matching tenant/transaction/dependency/hash, verifies each qualification hash, and recomputes the canonical BUILD002-A requirement and qualification set hashes. A mismatch fails before the atomic RPC.

## OUTCOME_TRANSACTION_COMPOSITE_KEY_DECISION

The original B migration's unique `(owner_tenant_id, id)` index on `outcome_transactions` is retained because PostgreSQL requires a tenant-aware referenced key for every new composite FK. It is additive, has no duplicate rows in the tested migration chain, and does not alter BUILD001 status or RPC behavior. R1 does not create a second equivalent key.
