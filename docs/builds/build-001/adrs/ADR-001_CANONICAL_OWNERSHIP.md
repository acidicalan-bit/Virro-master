# ADR-001 - Canonical Ownership

Status: Accepted for BUILD 001 implementation

## Decision

Use `outcome_transactions.owner_tenant_id` as the normalized downstream ownership root. Derive nullable owner columns on execution-domain children through database relationships. Keep historical NULL ownership unchanged.

## Consequences

Cross-tenant references fail at the database boundary, RLS can filter descendants directly, and arbitrary duplicated tenant claims do not confer authority. Nullable history requires explicit exclusion from the canonical path.
