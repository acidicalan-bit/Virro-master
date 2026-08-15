# ADR-002 - MutationLease Wrapper

Status: Accepted for BUILD 001 implementation

## Decision

`MutationLease` is `WRAPPED`, not extended, migrated or renamed. The request-scoped immutable `ExecutionAuthority` combines existing mutation paths with AuthorityContext, project/resource, transaction/base version, exact TaskSpec and its capability grant.

## Consequences

Existing kernel semantics and persistence remain intact. Future executors can receive a bounded envelope without introducing a competing capability framework. Expiring delegated credentials remain future work; BUILD 001 reauthorizes the live request instead.
