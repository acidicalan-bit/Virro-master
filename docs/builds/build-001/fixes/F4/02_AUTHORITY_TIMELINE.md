# Authority Timeline

## Before F4

```text
auth.uid()
  -> read field_outcome.owner_tenant_id
  -> read ACTIVE OWNER membership (no row lock)
  -> read transaction
  -> lock asset/head row
  -> verify acceptance, execution, evidence and artifact
  -> write AssetVersion, head, StateCommit and COMMITTED status
```

The revocation transaction could commit between the membership read and the
asset lock. The application `AuthorityContext` was only an earlier assertion;
the RPC still needed a current check, but the check was not serialized with
revocation.

## After F4

```text
auth.uid()
  -> read outcome and accepting principal
  -> lock ACTIVE tenant row
  -> lock current OWNER membership rows (stable id order)
  -> delegate to F1 canonical validation and mutation
  -> existing asset/head lock and atomic state transition
```

If the actor membership is absent, revoked or no longer OWNER, the wrapper
denies. If the accepting OWNER is no longer current, the wrapper denies with
`TRUST_HUMAN_ACCEPTANCE_AUTHORITY_REVOKED`. A revocation attempting to update a
membership already locked by the wrapper waits until the canonical transaction
finishes.

Acceptance does not preserve commit authority after revocation. A different
currently authorized OWNER must independently satisfy the commit check.
