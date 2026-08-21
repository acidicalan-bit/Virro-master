# BUILD 002-C1-D0 R1: Authority Marker Isolation and Graph Coherence

R1 hardens the D0 final write boundary without adding a second authority
operation or changing the C1-D0 application port.

## Marker isolation

`build002_readiness_authority_commits` no longer grants `INSERT` to
`service_role`. The only write path is the existing SECURITY DEFINER atomic
RPC. The marker trigger accepts only the transaction-local capability set by
that RPC; the capability table remains unreadable and unwritable by API roles.
The marker remains append-only and cannot be redirected by update or delete.

## Graph coherence

Immediately before a marker is inserted, a SECURITY DEFINER trigger verifies
the persisted graph linked by the marker:

- the dependency snapshot requirement hash set is duplicate-free and has a
  matching persisted requirement row for every hash;
- the snapshot signal-reference set exactly matches the current signal
  universe for those canonical requirements;
- the readiness links cover every canonical requirement exactly once;
- each linked qualification maps to its canonical requirement and snapshot,
  has the readiness evaluator and evaluation time, and its signal-link rows
  exactly match its signal arrays;
- the readiness-to-qualification graph expands to the same signal-reference
  set and does not use unsupported readiness states or policy data.

The trigger is a final relational safety net. It does not trust caller-owned
callbacks, introduce cryptographic signatures, write signals, change
transaction status, or create an operational execution path.

## Regression evidence

The R1 assurance test checks the isolated ACL and graph checks. The native
PostgreSQL suite adds a rollback-scoped negative control that deletes a
readiness link and proves a marker cannot be minted for the incomplete graph.
