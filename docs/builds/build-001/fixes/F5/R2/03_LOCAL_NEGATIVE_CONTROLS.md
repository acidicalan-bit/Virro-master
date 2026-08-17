# Local Negative Controls

Focused F5-R2 test file: `tests/security/build001-f5-r2-privileged-repository-scope.test.ts`.

- empty or missing tenant scope: rejected with `TRUST_TENANT_SCOPE_REQUIRED`;
- system bundle: contains no `projects` or other tenant-canonical repositories;
- unscoped project read/create: fails before a terminal database operation;
- unscoped Storage: rejected with `TRUST_TENANT_SCOPE_REQUIRED`;
- scoped owner mismatch: rejected with the existing canonical ownership error;
- former unscoped productive factory reference: absent.

Result: `7/7 PASS`.
