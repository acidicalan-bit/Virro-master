# F5-V Evidence Index

| Evidence | Location/result |
|---|---|
| Candidate ancestry and scope | `01_DIFF_SCOPE_AUDIT.md`; merge-base exact |
| Tenant fields and ownership chain | `02_CANONICAL_OWNERSHIP_AUDIT.md` |
| Service-role factories and production reachability | `03_PRIVILEGED_PATH_AUDIT.md` |
| Required negative/positive matrix | `04_CROSS_TENANT_CONTROLS.md` |
| Legacy, NULL and conflicted ownership | `05_LEGACY_AND_HISTORICAL_DATA.md` |
| Storage and service-role boundary | `06_STORAGE_AND_SERVICE_ROLE.md` |
| Regression commands and counts | `07_REGRESSION_RESULTS.md` |
| Candidate implementation evidence | `../00_FINDING.md`, `../03_PRIVILEGED_PATH_AUDIT.md`, `../05_FIX_EVIDENCE.md` |
| Focused executable tests | `tests/security/build001-f5-tenant-ownership.test.ts`, `tests/security/legacy-route-surface.test.ts` |
| F1/F2/F4/F7 executable regressions | `tests/integration/build001-f1-canonical-commit.integration.test.ts`, `tests/security/build001-f2-legacy-precision-edit-isolation.test.ts`, `tests/security/build001-trust-foundation.test.ts`, `tests/assurance/*.test.ts` |

