# BUILD 001 - Authority Model

## Canonical boundary

`resolveRequestAuthority(request)` verifies the Supabase principal and resolves an ACTIVE membership over an ACTIVE tenant. The resulting frozen `AuthorityContext` is the only user authority accepted by the canonical Core Lineage and Field Beta routes. Query, header and payload identifiers remain locators.

The canonical chain is:

```text
Supabase JWT/cookie -> AuthorityContext
  -> tenant-owned Project/Asset/OutcomeTransaction
  -> ExecutionAuthority + existing MutationLease
  -> execution/evidence/verification
  -> OWNER Human Acceptance
  -> commit_accepted_field_outcome
  -> AssetVersion + current head + StateCommit + COMMITTED
```

## Execution authority

`ExecutionAuthority` wraps, rather than replaces, `MutationLease`. It binds the authenticated authority, project, asset, transaction, base version, exact TaskSpec ID/hash, capability grant and mutation paths. The wrapper is immutable and is validated immediately before provider execution. It is request-scoped; the durable proof remains normalized through `OutcomeTransaction.owner_tenant_id` and its descendants.

## Roles

- ACTIVE `MEMBER`: tenant reads and ordinary resource/execution creation where the existing route permits it.
- ACTIVE `OWNER`: durable Human Acceptance and canonical commit.
- Suspended/revoked tenant or membership: no authority.
- Service role: infrastructure credential, never a user role or authority claim.

Human Acceptance and final commit reauthorize independently. The accepting OWNER may differ from the committing OWNER, but both must remain authorized at their respective trust boundary; acceptance is rejected at commit if the accepting membership was revoked.

## Client-controlled data

Tenant/project/resource/execution/spec/artifact/acceptance identifiers may locate records, but effective scope is derived from persisted parents. The canonical commit RPC accepts only `field_outcome_id`; every other identity is resolved under a row lock from durable relationships.

## Residual boundary

The service-role-backed execution repositories remain privileged. Their scope is constrained by the server-derived `AuthorityContext`, database lineage triggers and tenant-prefixed object keys, but a full service-role compromise still bypasses RLS.
