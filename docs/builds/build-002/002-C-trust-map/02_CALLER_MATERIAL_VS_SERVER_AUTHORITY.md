# Caller Material versus Server Authority

## Client material

The first C slice may accept only narrow material: requested action/context
references, user statements, source references, and policy-approved candidate
values. Material is untrusted data and is retained only as input to server
derivation.

## Server-derived fields

The server derives principal, tenant, membership, transaction ownership,
captured timestamps, signal identity, accepted provenance, requirement
snapshot, dependency identity and hash, evaluator identity, qualification
results, readiness aggregation, and every persisted content/definition hash.

## Server-validated fields

The server validates UUIDs, transaction status and ownership, active tenant
membership, Blueprint publication/version/hash, source policy, schema versions,
Signal semantic hashes, dependency references, qualification sets, temporal
validity, and BUILD002-B RPC results.

## Forbidden caller authority

The request must not be allowed to authoritatively set `ownerTenantId`,
`outcomeTransactionId`, `provenance`, `requirementDefinitionHash`,
`contentHash`, `dependencySnapshotHash`, `qualificationContentHash`,
`qualification outcome`, `readiness state`, `readinessContentHash`, evaluator
identity, or execution authority. Caller copies of these fields are rejected
or ignored, never merged into canonical state.

## Subject rule

Each evaluation is for exactly one `(ownerTenantId, outcomeTransactionId)`.
The tenant comes from the resolved authority and the transaction is loaded
through a tenant-scoped repository; body, query, and header values cannot
override either value.
