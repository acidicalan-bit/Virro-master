# Canonical Ownership Audit

## Single chain

`tenants.id`
-> `outcome_transactions.owner_tenant_id`
-> `projects/assets/asset_versions.owner_tenant_id`
-> transaction descendants (`partial_intents`, patches, leases, executions,
receipts, verifications, candidates, preservation runs/evidence, snapshots,
preferences, costs)
-> Field Beta outcomes, strategy runs, feedback, acceptance, criterion evidence
-> `state_commits` and media metadata
-> Storage key `tenants/{owner_tenant_id}/...`.

Core lineage and trust triggers derive descendant ownership from the parent and
reject mismatches. The commit RPC rechecks outcome, transaction, asset,
versions, execution, verification, acceptance, current OWNER membership and
current head in one authorized transaction. AuthorityContext, ExecutionAuthority
and MutationLease are actor/resource envelopes; none replaces persisted owner
lineage.

## Tenant field inventory

| Occurrence | Classification |
|---|---|
| `owner_tenant_id` on canonical tables and repository predicates | CANONICAL_AUTHORITY |
| repository `ownerTenantId` constructed by authenticated server services | DERIVED |
| `AuthorityContext.tenantId` after `resolveRequestAuthority` | DERIVED |
| Field Beta and criterion-evidence `tenant_id` | LEGACY_METADATA; database triggers bind it to canonical owner for proven rows |
| domain `tenantId` values and row mappers | DISPLAY_ONLY / METADATA |
| in-memory fixtures and test-only smoke constructors | TEST_ONLY |
| historical `owner_tenant_id IS NULL` | NON_CANONICAL / UNAUTHORIZED_LEGACY |

No UNKNOWN interpretation was found on a production-reachable canonical path.

