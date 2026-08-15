# BUILD 001-F2 - Attack Path

## Request boundary

| Element | Source before F2 | Trust classification |
| --- | --- | --- |
| Authentication | None | MISSING |
| Tenant identity | Omitted for run; unresolved for locators | MISSING |
| Project/resource identity | Names and UUID locators from client | CLIENT_CONTROLLED |
| AuthorityContext | None | MISSING |
| Enablement | `NODE_ENV` plus `INTERNAL_LEGACY_ROUTES_ENABLED` | OPERATIONAL_ONLY |
| Database/Storage access | Supabase service-role key | PRIVILEGED |

## Transitive writes

`runExperiment` can write project, asset, source AssetVersion/head, media, OutcomeTransaction, partial intent, patch, lease, execution, candidates, evidence, preservation records, verification and status transitions.

`recordPreference` accepts transaction/candidate UUIDs and writes preference state.

`approvePreserved` accepts only a transaction UUID, reads all related records through service role, then sequentially writes a new AssetVersion, head, StateCommit, candidate flag and transaction status.

`reject` can mutate transaction status. GET reads the complete experiment by locator.

## Partial-write points

The first durable writes occur before transaction creation: project, asset, source object, source AssetVersion, media record and head. Fault injection after transaction creation proves those rows plus the transaction remain. Approval likewise commits multiple writes without the BUILD 001 atomic RPC.

## Contamination

The route writes the same tables and compatible UUID-shaped records used by trusted workflows. A legacy locator can also target pre-existing canonical records. A boolean or environment marker cannot make this safe because service-role repositories and canonical tables are shared.
