# Remote Service-Role Verification

Project: `virro-build001-r` (`deajvmrxghbqpgbvsmsf`)
Credential handling: existing legacy `service_role` was copied from Chrome to the local environment without reading or recording its value.

Actual product path exercised through a temporary Vitest harness importing `createApplicationServices()` and `createTenantSupabaseRepositories()`:

- Tenant B scoped project read: `PASS`;
- Tenant A scoped read of Tenant B project: `DENIED` / no row;
- Tenant A owner override to Tenant B: `DENIED` before mutation;
- missing-scope tenant factory: `DENIED` with `TRUST_TENANT_SCOPE_REQUIRED`;
- production system bundle exposes tenant projects: `FALSE`;
- no unauthorized remote row was created.

The temporary harness was removed after execution. No secret or JWT was written to evidence.
