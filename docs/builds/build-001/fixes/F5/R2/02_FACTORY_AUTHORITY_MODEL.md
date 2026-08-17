# Factory Authority Model

## Global/system capability

`createSystemRepositories()` returns only the genuinely global repositories used by compiler, benchmark and blind-evaluation services. `createRepositories()` now selects this global bundle and its cache cannot contain tenant-canonical repositories.

## Tenant capability

`createTenantSupabaseRepositories(ownerTenantId: string)` requires a non-empty trusted scope and validates it before constructing the privileged client bundle. Tenant repositories receive the validated scope. `ownedQuery`, tenant-owned inserts, owner resolution and the Supabase media object store reject missing scope with `TRUST_TENANT_SCOPE_REQUIRED`.

## Productive caller audit

| Caller | Classification | Result |
|---|---|---|
| `src/server/services.ts` global services | `GLOBAL_SYSTEM` | Uses system-only bundle |
| `src/server/field-beta-services.ts` | `TENANT_SCOPED` | Uses resolved authority tenant |
| `src/server/preservation-services.ts` | `TENANT_SCOPED` | Requires explicit owner tenant; legacy internal default remains explicit |
| `src/server/preservation-study-services.ts` | `GLOBAL_SYSTEM` / legacy study path | Uses study repository; no tenant bundle factory |
| `tests/**` | `TEST_ONLY` | No production authority |
| former `createSupabaseRepositories()` no-arg path | `INVALID_UNSCOPED` | Removed |
