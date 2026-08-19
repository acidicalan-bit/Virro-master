# C5 Transaction Requirement Binding

## Artifact

`TransactionRequirementBinding` is an immutable server-created record:

```text
ownerTenantId
outcomeTransactionId
blueprintId
blueprintVersion
blueprintHash
requirementProfileId
requirementProfileVersion
requirementProfileHash
policyId nullable
policyHash nullable
bindingHash
boundAt
```

The binding has an exact composite reference to the published Blueprint and
Profile. It cannot point to a missing, retired, invalid, or hash-mismatched
source. The binding itself is tenant-scoped and has a unique
`(ownerTenantId, outcomeTransactionId)` address for C0: **exactly one immutable
binding per transaction**. A changed requirement source requires a new
OutcomeTransaction, not a mutable current-profile pointer or silent rebind.

## Selection versus authority

The caller may select an allowed product/action identifier where the existing
workflow supports that choice. The caller may not submit tenant, transaction
ownership, Blueprint hash, Profile hash, or policy hash. The server loads the
owned transaction, resolves the catalog source, verifies hashes/status/version
chain, and writes the binding through an internal/server-only path.

Published catalog definitions are global system data; the binding and all
compiled runtime snapshots are tenant-scoped. Authenticated callers have no
direct INSERT/UPDATE/DELETE rights.

## Staleness

Binding integrity is historical and immutable. A newer Profile never silently
changes an existing transaction. Business policy may later mark the old
transaction stale, but that currentness decision is separate from binding
integrity and requires a new transaction for a new authority.
