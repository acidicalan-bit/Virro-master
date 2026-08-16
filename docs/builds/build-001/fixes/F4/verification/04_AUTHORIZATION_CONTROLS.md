# BUILD 001-F4 Authorization Controls

## Current authority

The security-definer wrapper uses `auth.uid()` as the actor and reads the current tenant and membership rows. It does not trust a caller-supplied owner id, role, membership id, `AuthorityContext`, `ExecutionAuthority`, `MutationLease`, or callback.

## Revocation path

The existing membership-revocation function updates the membership status and revocation timestamp only when an active OWNER authorizes the action. F4 locks the same membership row before commit authorization, so a revocation and commit must contend on the same row in a real database.

## Alternate authority paths

Repository inspection found no RPC parameter or application object that can substitute stale authority for `tenant_memberships`. The old unlocked commit function is renamed and revoked from caller roles. The remaining uncertainty is runtime serialization, not an identified alternate authority input.

## Classification

- Current database membership and tenant state: `PRIVATE_AUTHORITY` / authoritative.
- Application authority envelopes: `SAFE_SNAPSHOT`/request metadata only; not commit authority.
- Commit RPC: `PUBLIC_OPERATION` with internal authority validation.
- Exposed unlocked delegate or mutable registry: none found.
