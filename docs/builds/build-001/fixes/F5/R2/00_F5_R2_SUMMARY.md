# BUILD 001-F5-R2 Fail-Closed Privileged Repository Scope

**VERDICT: `F5_R2_FIXED`**

Baseline SHA: `6831e67e6c99d7116dfd627beda55b5859ce3770`
Candidate: working tree derived directly from the baseline
Result SHA: not committed; `HEAD` remains the baseline SHA
Remote project: `virro-build001-r` / `deajvmrxghbqpgbvsmsf`

The confirmed R3 bypass was the productive unscoped service-role bundle. The remediation separates a global/system bundle from a tenant-scoped bundle, makes the tenant factory require a non-empty scope, and makes tenant repository reads/writes and Storage fail closed with `TRUST_TENANT_SCOPE_REQUIRED` when scope is absent.

The exact changed candidate passed focused local controls and a real remote service-role harness. No application migration, dependency or configuration file outside the intended authority boundary was changed.
