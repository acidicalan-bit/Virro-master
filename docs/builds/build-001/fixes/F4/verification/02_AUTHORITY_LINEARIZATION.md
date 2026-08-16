# BUILD 001-F4 Authority and Linearization Audit

## Authoritative OWNER source

The commit RPC derives the actor from `auth.uid()` and queries current `public.tenants` and `public.tenant_memberships`. A membership is authoritative only when its tenant is active, its principal is the actor or the acceptance recorder, its role is `OWNER`, and its status is `ACTIVE`.

`field_feedback.recorded_by_principal_id` supplies the acceptance principal to be revalidated. It is not accepted as authority by itself.

## Lock order

The wrapper's static order is:

1. lock the current tenant row by owner tenant id;
2. lock all relevant active OWNER membership rows, ordered by membership id;
3. invoke the renamed F1 commit function, which acquires its asset/head locks.

The membership query uses a deterministic order and the expected-row count guards the actor/acceptance-principal cases.

## Linearization point

The intended authorization linearization point is the successful `FOR UPDATE` acquisition and validation of the tenant and required membership rows, immediately before delegation. A revocation update touching the membership row must serialize either before this point (so the wrapper observes revoked/missing authority) or after it (so the commit owns the lock first).

This ordering is a static conclusion. No real two-session schedule was available to observe it.

## Stale authority audit

- `AuthorityContext`: application request metadata; not sent to the RPC as authority.
- `ExecutionAuthority`: frozen application envelope; not sent to the RPC as authority.
- `MutationLease`: application-side execution state; not used as the database OWNER decision.
- Client role, membership id, or tenant id fields: not accepted as RPC authority inputs.

The repository RPC boundary therefore remains current-database authoritative. Static status: `PROVEN`. Runtime race status: `NOT_PROVEN`.
