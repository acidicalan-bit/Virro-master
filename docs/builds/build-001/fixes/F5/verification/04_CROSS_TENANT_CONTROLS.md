# Cross-Tenant Controls

The repository boundary was exercised with independent Tenant A and Tenant B
values.

| Control | Result | Evidence |
|---|---|---|
| Tenant A resource + Tenant B scoped repository | DENIED / empty or rejected | `owner_tenant_id` predicate |
| Tenant A owner + legacy `tenant_id` Tenant B | DENIED | legacy field never used as read predicate; DB trigger rejects mismatch |
| caller-provided conflicting `ownerTenantId` | DENIED before request | `resolveOwner` and focused test |
| Tenant A descendant ID + Tenant B scope | DENIED | owner predicate precedes ID/FK lookup |
| `owner_tenant_id IS NULL` + matching legacy value | NOT AUTHORIZABLE | equality predicate cannot match NULL; no fallback |
| out-of-namespace Storage key | DENIED locally | `SupabaseMediaObjectStore.assertTenantKey` |
| unscoped transaction-lab persistence | NOT AVAILABLE | in-memory-only route |

Positive controls also passed: same-tenant scoped reads/writes remain valid, and
the same-tenant canonical commit path passed the local PostgreSQL F1/F4 tests.

