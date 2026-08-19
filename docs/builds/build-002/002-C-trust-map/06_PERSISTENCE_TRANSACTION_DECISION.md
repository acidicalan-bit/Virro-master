# Persistence Transaction Decision

BUILD002-B provides atomicity per authoritative object through five RPCs:
requirement, Signal, DependencySnapshot, SignalQualification, and
DelegationReadiness. A Supabase client calling those RPCs separately does not
create one transaction for the whole evaluation graph.

## Decision for C

The preferred implementation boundary is **Option B: one narrow,
repository-owned orchestration transaction** for a complete evaluation graph,
after the C5 canonical requirement source is available. It must call or
internalize the same BUILD002-A hash/semantic checks and end with one
authoritative readiness row only after all required graph objects succeed.

Until that boundary exists, C may use Option A only for a resumable draft
workflow that explicitly cannot claim READY and cannot expose partial objects
as current readiness. It must not silently present the existing five separate
RPC calls as whole-evaluation atomicity.

## Partial failure model

Immutable lower-level snapshots may remain after a failed qualification because
they cannot satisfy the readiness foreign-key/qualification-set requirements
by themselves. They are historical, non-READY data. A retry must reuse or
append immutable snapshots under an idempotency key; it must never mutate them
or create a readiness row from incomplete/contradictory data.

If product requirements demand all-or-nothing graph visibility rather than
safe resumability, Option B is mandatory. No fallback may create READY on an
exception or persistence timeout.
