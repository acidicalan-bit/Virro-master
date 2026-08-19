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

Current status is **BLOCKED** because the canonical server-backed
OutcomeTransaction -> published Blueprint/version/policy -> compiled
SignalRequirement source is not present or uniquely identifiable in the
baseline. This is a C21 stop condition, not a reason to invent a registry or
implement around it.

No runtime or migration changes are authorized until that blocker is resolved
in a subsequent architecture decision.
