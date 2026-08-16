# Evidence Index

| Evidence | Location / command |
| --- | --- |
| Candidate and parent | `git rev-parse HEAD` = `4f5c7d25a492c5b835bc36aad485f6bc402cfbb9`; parent `ea21c0f3f152f2a1a59a18e795d49a7254e55d6c` |
| Composition cases A-G | `01_COMPOSITION_MATRIX.md`; disposable local Vitest harness, removed after pass |
| Result precedence | `02_RESULT_SEMANTICS.md`; `src/assurance/development-evidence.mts` `evaluateClaim` |
| Layer separation | `03_ASSURANCE_LAYERS.md`; R1/R2 assurance tests |
| Manifest and historical F1 | `04_MANIFEST_AND_BUILD_STATUS.md`; `assurance/build-001-evidence-manifest.json` |
| R1/R2/R2.1/R2.2 | `05_R1_R2_REGRESSION.md`; `tests/assurance` and security+assurance commands |
| F1/F2 | `06_F1_F2_REGRESSION.md`; `pnpm test:sql`, `pnpm test:model`, `pnpm test:application` |
| Complete gates | `07_FULL_REGRESSION_RESULTS.md` |
| Remote limits | `assurance/environment-lanes.json`; no E4 command executed |
| Scope | `git status`, `git diff --check`, and parent-to-candidate diff: no application files changed by this verification |

## Final Principle

Evidence is sufficient only when the right thing was tested and Virro has
grounds to trust that the claimed execution actually occurred.
