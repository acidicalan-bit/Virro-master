# BUILD 001 - Tenant Boundary

## Ownership root

The minimum normalized root is `outcome_transactions.owner_tenant_id`. Project, asset and base version already carry the same owner. New downstream records derive their owner from the transaction or their durable parent in database triggers; caller-supplied owner values must match and cannot reassign proven ownership.

| Durable stage | Authoritative resolution |
| --- | --- |
| Execution, receipt, verification, candidate, preservation, cost, snapshot | `record.transaction_id -> outcome_transactions.owner_tenant_id` |
| Criterion evidence | transaction + execution + verification tuple |
| Field outcome/strategy | transaction plus source/candidate/execution tuple |
| Human Acceptance | field outcome plus delivered strategy/execution/spec tuple |
| StateCommit | transaction + asset + previous/new version + current head tuple |
| Media metadata | `media_storage.asset_id -> assets.owner_tenant_id` |
| Storage object | server-generated `tenants/{tenantId}/...` namespace and durable artifact row |

## Enforcement

- Nullable additive owner columns avoid inventing history.
- New tenant-owned descendants receive owner from a parent trigger.
- Cross-tenant parents, execution references, candidate references and TaskSpec snapshots fail closed.
- Authenticated reads require non-null owner, ACTIVE membership and ACTIVE tenant.
- Authenticated direct asset/version mutation is revoked.
- Server-generated storage keys include the resolved tenant ID; client object keys are not accepted.

## Historical records

No backfill is performed. `owner_tenant_id IS NULL` continues to mean ownership is unproven. Compatibility triggers permit historical/legacy NULL lineages to keep operating only behind the existing non-production legacy guard; such records cannot enter the canonical RPC because it requires proven ownership.

## RLS scope

RLS provides read isolation for all downstream tables touched by the canonical chain. Writes remain server-side. The final mutation uses a narrow RPC that performs its own authorization and lineage checks because arbitrary authenticated table writes cannot express the atomic invariant.

## Storage limitation

The application writes private objects through the centralized server store. BUILD 001 adds tenant namespaces and durable artifact checks, but does not claim deployed `storage.objects` policy verification. A real environment test remains required before public multi-tenant approval.
