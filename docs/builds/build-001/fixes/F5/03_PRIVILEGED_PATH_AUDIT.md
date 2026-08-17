# BUILD 001-F5 Privileged Path Audit

| Path | Resource | Previous scope | New scope | State impact |
|---|---|---|---|---|
| Field Beta repository | Field Beta tables | `tenant_id` text | `owner_tenant_id` | feedback, verification, acceptance inputs |
| Outcome repository bundle | core and descendants | ID/FK only, service role | owner predicate on every read/update; owner on inserts | execution/evidence/commit preparation |
| Preservation runner | core, candidates, evidence | shared unscoped bundle | per-tenant scoped bundle | creates canonical evidence and candidates |
| Storage adapter | media objects | caller-provided key | `tenants/{authorizedTenant}/...` prefix | artifact read/write |
| Canonical commit RPC | StateCommit/head | F4/F1 database authority | unchanged; current membership + owner reauthorization | final state transition |
| Legacy transaction lab | outcome demo | previously unscoped service-role fallback | disposable in-memory repositories only | no canonical persistence |

The service-role key is still server-only. It bypasses RLS, so authorization is
performed by repository predicates and database lineage checks before results
are returned or canonical writes are attempted.

The legacy transaction lab has no authenticated tenant authority and is
explicitly contained to in-memory repositories. It cannot construct an
unscoped service-role bundle or read/write canonical tenant data.

No public API accepts a role, membership status, or client `ownerTenantId` as
the authority. A scoped insert with a conflicting owner fails before the
request is sent; descendant owner values are checked again by existing
database triggers.
