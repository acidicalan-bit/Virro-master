# BUILD 002-B R1 Findings and Fixes

## Preserved provenance

- Blocked B SHA: `62544fbdb422f8a40d6af0e370f00e8f0c6c3db9`
- Parent baseline: `f0183d272702fd5910be1d4f3ff93b8b69a2fc65`
- PR: #7
- Corrective work appends normally; no rewrite, force-push, or main mutation.

## Finding ledger

- **B1_NATIVE_E3_MISSING**: the old `test:sql` lane was PGlite-only. R1 adds a PostgreSQL 17 service to the existing required context and a dedicated `pg`-based E3 file.
- **B2_NONATOMIC_AUTHORITATIVE_GRAPH**: parent and links were separate client calls. R1 adds invoker RPCs for dependency, qualification, and readiness parent+lineage writes.
- **B3_EXACT_SIGNAL_HASH_PAIRING**: the index zip was removed. Qualification links are derived from the persisted DependencySnapshot signal references; exact signal address includes content hash and requirement id.
- **B4_REPOSITORY_ROUNDTRIP_UNPROVEN**: `build002-b-repository.test.ts` exercises the production repository serialization, RPC payloads, deserializers, trusted scope, and all five BUILD002-A hash verifiers.

BUILD002-A domain code remains unchanged.

