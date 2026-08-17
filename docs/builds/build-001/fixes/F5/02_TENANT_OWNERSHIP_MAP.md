# BUILD 001-F5 Tenant Ownership Map

## Canonical chain

`tenants.id`
-> `outcome_transactions.owner_tenant_id` (canonical transaction root)
-> `projects.owner_tenant_id`, `assets.owner_tenant_id`, and
   `asset_versions.owner_tenant_id`
-> transaction descendants (`partial_intents`, `transaction_patches`,
   `mutation_leases`, `execution_runs`, `evidence_receipts`,
   `verification_runs`, `state_commits`, `cost_records`, snapshots,
   candidates, preservation runs/evidence, preferences)
-> Field Beta rows (`field_outcomes`, strategy runs, feedback, regressions,
   golden cases, samples, judgments, criterion evidence)
-> `media_storage` metadata and tenant-prefixed Storage objects.

The descendants persist `owner_tenant_id`; the existing Build 001 triggers
derive it from the trusted parent and reject a conflicting value. The F1/F4
RPCs re-read the current transaction owner and membership state inside their
transaction, so `AuthorityContext`, `ExecutionAuthority`, and
`MutationLease` cannot replace persisted ownership.

## Field classification

| Field | Classification | Authority |
|---|---|---|
| `owner_tenant_id` | `CANONICAL_AUTHORITY` | persisted tenant FK / lineage trigger |
| `tenant_id` on Field Beta and criterion evidence | `LEGACY_COMPATIBILITY` | retained metadata; not an access predicate |
| `AuthorityContext.tenantId` | `DERIVED` | server authority resolver |
| repository `ownerTenantId` scope | `DERIVED` | server construction from authority |
| `tenantId` in domain/test records | `DISPLAY/METADATA` or `TEST_FIXTURE` | never trusted by scoped repository |

Historical rows with `owner_tenant_id IS NULL` remain unproven. This patch does
not backfill or reinterpret them; they cannot be authorized by the canonical
scoped path.
