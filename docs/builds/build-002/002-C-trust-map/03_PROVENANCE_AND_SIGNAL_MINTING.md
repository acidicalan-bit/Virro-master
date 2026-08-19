# Provenance and Signal Minting

`provenance` is a server classification, not a client enum.

| Source class | Server classification | Rule |
|---|---|---|
| Authenticated user statement | `CUSTOMER_STATED` | Evidence is attributable to the caller, never observed. |
| Trusted deterministic local observation | `OBSERVED` | Only a named server source contract may mint it. |
| Trusted system calculation | `SYSTEM_DERIVED` | Deterministic server calculation with recorded source/version. |
| Semantic interpretation | `INFERRED` | A deterministic or explicitly deferred semantic evaluator labels it. |
| Human approval | `APPROVED` | Requires the existing authority model; not caller self-assertion. |
| Missing/unverifiable source | `UNKNOWN` | Critical UNKNOWN prevents READY. |

The first C slice should implement user-stated material only, unless a
specific deterministic server observation contract is approved. General
connector ingestion is out of scope.

The server creates the Signal identity and recomputes `contentHash` from the
canonical semantic projection. `capturedAt` is server-owned for server
observations. Caller-supplied provenance, signal ID, content hash, dependency
hash, schema version, or timestamp cannot be copied into authoritative state.

Signals are idempotent by the canonical subject, requirement identity, source
identity/version, semantic content hash, and server capture policy. The API
must not promise global deduplication beyond the constraints actually present
in BUILD002-B.
