# Evidence and Exit Gate

## Expected evidence classes

- **E1:** pure deterministic orchestration and domain semantics.
- **E2:** authenticated HTTP/application authority boundary.
- **E3:** native PostgreSQL/RLS/RPC persistence and atomicity.
- **E4:** later remote authenticated environment evidence.

BUILD002-B is promoted and frozen at product tree `2c8fe253...`; its
independent verifier remains historical on closed PR #8 and is not product
runtime. BUILD002-A and BUILD002-B must remain untouched by C architecture.

## Exit gate

`BUILD002_C_TRUST_MAP_VERIFIED` requires identified route choke points,
explicit caller/server fields, server-owned provenance, an exact requirement
source, deterministic orchestration, an explicit whole-evaluation transaction
decision, no execution authority, and a complete negative-control matrix.

The prior C5 blocker is resolved at architecture level by the immutable
OutcomeRequirementProfile and TransactionRequirementBinding defined in the
appended C5 documents. The current repository still has no implementation of
those artifacts, so the result is `ARCHITECTURE_READY_PENDING_C0_IMPLEMENTATION`.

This gate does not authorize HTTP/runtime work. C0 implementation remains
blocked until the profile, Blueprint persistence, transaction binding,
resolver, and native immutability/RLS evidence are independently verified.
