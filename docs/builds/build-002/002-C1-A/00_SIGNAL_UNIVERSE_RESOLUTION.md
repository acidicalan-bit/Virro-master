# BUILD 002-C1-A Signal Universe Resolution

BUILD 002-C1-A is a read-only runtime slice. It resolves the complete
persisted Signal universe for the canonical requirements produced by C0-D.
It does not qualify Signals, produce Readiness, create dependency snapshots,
ingest Signals, execute work, or change transaction status.

## Authority path

The server entry accepts only an authenticated `Request` and an
`outcomeTransactionId` resource locator. It first calls the frozen C0-D
`resolveOutcomeRequirementAuthority` boundary. Only after that succeeds does it
construct the narrow privileged `build002Readiness` repository using the
server-derived `ownerTenantId`.

The caller supplies no requirement ID, requirement hash, Signal ID, Signal
hash, provenance, capture time, or evidence payload. The resolver iterates the
complete canonical C0-D requirement set and asks the repository for every row
matching the trusted tenant, transaction, and exact requirement-definition
hash.

## Persistence contract

`listSignalsForRequirement` is the only new port operation. Supabase applies
all three scope predicates and deterministic `captured_at ASC, signal_id ASC`
ordering. Every row is reconstructed through `SignalSchema`, normalized by the
existing timestamp rules, and checked with `verifySignalContentHash`. A
malformed, hash-invalid, duplicate, or scope-inconsistent row fails the whole
resolution; it is never silently omitted.

Future, expired, unknown, incompatible, and contradictory Signals remain in
the returned universe. BUILD002-A remains responsible for semantic
qualification. An empty result is valid and means that later qualification may
classify the requirement as missing.

## Non-goals and writes

There is no migration and no evaluator selector. C1-A performs no
qualification, readiness, dependency-snapshot, Signal, transaction-status,
execution, or StateCommit write. The returned structure is a deep immutable
snapshot. C1-B will later bind this server-owned universe to dependency
snapshot persistence.
