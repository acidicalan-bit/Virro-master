# BUILD 002-B Immutability and Lineage

Historical rows are append-only. Every authoritative table receives a `before update or delete` trigger calling the existing `public.build005_immutable_insert_only()` function. A later readiness assessment is a new row; there is no `current_status`, `is_ready`, `approved`, or mutable readiness pointer.

Relational lineage:

- requirement, signal, dependency, qualification, and readiness rows reference the same tenant-rooted outcome transaction;
- signals reference the exact requirement definition hash;
- dependency links reference exact requirement hashes and signal ids within the same tenant/transaction;
- qualifications reference the exact requirement and dependency snapshot composite keys;
- qualification links reference exact signal ids and content hashes;
- readiness references the exact dependency snapshot and qualification links.

JSONB is used for accepted provenance, qualification rules, selectors, payload/source, evaluator, dependency arrays, and blocking/condition codes. These values are domain material and are checked by BUILD 002-A schemas and hashes; the database does not claim to recompute TypeScript canonical SHA-256.

Uniqueness is identity-scoped, not global semantic deduplication. Semantic hashes are indexed through composite uniqueness where they are needed to make referenced immutable versions addressable, always under `(owner_tenant_id, outcome_transaction_id)`. No historical backfill occurs.

The repository inserts parent and child rows through narrow calls. Parent rows contain the complete exact arrays, so reconstruction does not depend on child links alone. A future orchestration/RPC boundary should group a complete snapshot set in one database transaction before exposing it to product flows; BUILD 002-B does not add that execution or API boundary.

