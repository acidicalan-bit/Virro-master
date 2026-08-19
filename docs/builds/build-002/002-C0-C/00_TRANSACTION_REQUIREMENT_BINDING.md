# BUILD 002-C0-C Transaction Requirement Binding

## Boundary

`OutcomeTransactionRequirementBinding` is the immutable, tenant-scoped authority artifact for one outcome transaction. It records the exact persisted published Blueprint and Requirement Profile addresses, including semantic hashes. The Requirement Profile is itself revalidated against the same Blueprint before publication and readback.

## Hash model

`bindingHash` is `canonicalSha256` over the schema version, trusted tenant and transaction identifiers, the exact Blueprint and Profile references, and the null policy reference. `boundAt` is metadata and is explicitly excluded from the hash. PostgreSQL stores and constrains the supplied hash; it does not compute semantic hashes.

## Persistence boundary

The composite primary key `(owner_tenant_id, outcome_transaction_id)` gives one binding per tenant and transaction. The transaction relationship uses the existing C0-B composite tenant/address key and `ON DELETE RESTRICT`. Exact three-column foreign keys bind the Blueprint and Requirement Profile. Table-owned insert triggers reject tenant mismatch and any Profile→Blueprint mismatch. An immutability trigger rejects update and delete.

Only `build002_bind_outcome_transaction_requirements(jsonb)` can write the table. The table grants `SELECT` only to `service_role`; direct service-role insert/update/delete and anon/authenticated access are revoked. The server-only repository requires a non-empty trusted `ownerTenantId`, derives the transaction check through the existing tenant-scoped transaction repository, and revalidates the persisted C0-B catalog on both write and read. It exposes only `publish` and `get`; there is no rebind, update, delete, or list-all operation.

This phase adds no HTTP route, readiness evaluation, signal ingestion, executor, mutation lease, or canonical state side effect. A changed authority requires a new outcome transaction.
