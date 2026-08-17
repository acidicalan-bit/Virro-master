# BUILD 001-F5 Design Decision

## Selected strategy

**A + B + C:** pass a server-derived tenant scope into the existing repository
bundle; use `owner_tenant_id` directly on tables that persist it; let existing
FK/lineage triggers derive and reject descendant ownership; retain legacy
`tenant_id` only as compatibility metadata.

The change is repository-native and additive. It does not introduce another
authorization service or change F1, F2, F4, F7, R1, or the canonical commit
RPC.

## Rejected alternatives

- Renaming every `tenant_id`: rejected because legacy schemas and display data
  still require compatibility fields.
- Relying on RLS: rejected because the affected repositories use service role.
- Backfilling NULL/conflicted historical rows: rejected because ownership is
  not provable without a product/data decision.
- A second authorization framework: rejected as unnecessary scope.
