# BUILD 002-C1-D2: Post-Commit Readiness Currentness

This slice revalidates a historical BUILD 002-C1-D0/D1 readiness assessment
against a new trusted server evaluation instant. It is read-only and
non-atomic with any future consequence.

The public operation accepts only `authority` and `authorityCommitId`.
The authority context is copied before the first asynchronous operation. The
historical marker is read through a dedicated scoped reader using both
`id = authorityCommitId` and `owner_tenant_id = authority.tenantId`; a
cross-tenant marker is therefore denied at query scope. The returned marker
must also have `authorityCommitId === requested authorityCommitId`; query scope
is necessary but not sufficient. Marker validation is fail-closed to the exact
frozen schema version `build002-readiness-authority-commit-v0.1`, including a
non-empty historical dependency snapshot ID.

The operation then re-resolves C0-D from the marker's server-derived
transaction, validates the historical readiness and dependency graph, resolves
the current C1-A signal universe and C1-B dependency snapshot, and delegates
classification to the frozen `evaluateReadinessValidity` domain primitive.
`SOURCE_ASSET_HEAD_CHANGED` is the only C1-B error translated to `STALE`.
Other current-state failures fail closed.

The result is immutable and exposes `CURRENT`, `STALE`, or `EXPIRED` plus
deterministic reason codes. It deliberately does not call C1-C, D0, D1,
`isDelegable`, execution, providers, StateCommit, or any consequence path.

## Boundary meanings

`HISTORICAL AUTHORITY != CURRENTNESS`

`CURRENTNESS != READINESS STATE`

`READY != DELEGABLE`

`CURRENT + READY != EXECUTION AUTHORITY`

`D2 CURRENT != SERIALIZED CONSEQUENCE AUTHORITY`

Every result carries:

- `assessmentScope = NON_ATOMIC_POST_COMMIT_CURRENTNESS`
- `consequenceBoundary = SERIALIZED_RECHECK_REQUIRED_FOR_CONSEQUENCE`

Membership, tenant status, resource authority, and all other consequence-time
checks remain outside D2 and must be revalidated by a future serialized gate.
