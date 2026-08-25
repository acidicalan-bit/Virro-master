# Authority Boundary

The only public productive operation remains the service-role RPC
`build002_grant_execution_authority(uuid,uuid,uuid,uuid,text)`. Callers supply
identity selectors and a TaskSpec selector; they do not supply tenant,
transaction, asset, blueprint, profile, dependency, evaluator or capability
facts. PostgreSQL locks and rereads those facts, checks principal/membership
identity equality, then writes one immutable authority row. The row grants no
MutationLease or execution consequence.

`build002_validate_execution_authority_row` is private and is used by both
idempotent retry branches and validates the content hash over all persisted
authority material.
