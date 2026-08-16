# Linearization Decision

## Chosen Strategy

Option A, current-state reauthorization under database row locks, is selected.
The authoritative tenant row is locked first. Relevant OWNER membership rows
for the commit actor and acceptance actor are then selected and locked in
ascending membership-ID order. The successful acquisition and validation of
the actor membership is the authorization linearization point.

At that point:

- a previously committed revocation is visible and the commit is denied;
- a later revocation cannot update the locked membership until the canonical
  transaction completes;
- the F1 mutation remains one transaction and retains its asset/head lock and
  atomicity checks.

## Alternatives Rejected

- Option B, an authority epoch, is unnecessary because the existing durable
  membership row supplies the authoritative version and lock.
- Option C, an existing repository concurrency primitive, was not present at
  the database authority boundary; the existing asset lock did not cover
  membership revocation.
- A second unlocked SELECT was rejected because it would only narrow the race
  window and would not establish serialization.

## Lock Order

`tenant -> tenant_memberships (membership.id ascending) -> F1 asset/head`

The revocation function updates the membership row and therefore conflicts with
the membership lock. No broad table lock or service-role bypass is used.
