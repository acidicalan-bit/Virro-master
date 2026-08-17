# Legacy and Historical Data

`tenant_id` is retained for compatibility and domain display. It does not grant
read, write, candidate, evidence, verification, acceptance, commit, or Storage
authority. For proven canonical rows, existing database triggers require it to
match `owner_tenant_id`; a conflicting value is rejected.

Rows with `owner_tenant_id IS NULL` are historical ownership-unproven rows. The
repository's scoped equality predicates exclude them, the authenticated RLS
policies require non-null ownership, and canonical commit rejects them. No code
falls back to `tenant_id`, caller tenant, session tenant, or service-role power.

No historical backfill or reinterpretation occurs. Such rows remain
`NON_CANONICAL` / `UNAUTHORIZED_LEGACY` and require a separate migration or
product decision before authorization. No conflicted historical row was
silently assigned to a tenant.

