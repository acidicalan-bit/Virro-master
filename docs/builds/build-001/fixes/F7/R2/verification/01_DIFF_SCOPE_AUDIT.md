# R2 diff and scope audit

## Range

`0c3465b5f288d90fad7dd2ae2150146da7352a70..a819dd4eb29cdad621872ea6b55d7c27090b5174`

| Classification | Files |
| --- | --- |
| ASSURANCE_CORE | `src/assurance/development-evidence.mts` |
| ISSUER/RUNNER | Implemented within `src/assurance/development-evidence.mts` |
| MANIFEST | `assurance/build-001-evidence-source.mts`, generated manifest, generator script |
| CI | `.github/workflows/assurance.yml` |
| TEST | Five files under `tests/assurance/` |
| DOCUMENTATION | Nine R2 implementation documents |
| UNRELATED | None |

The diff contains 19 files, 1,590 insertions, and 83 deletions. No application runtime, product `EvidenceReceipt`, Supabase migration, F3-F6 implementation, package manifest, or lockfile changed. The action changes are limited to the assurance workflow and only replace mutable major tags with commit SHAs. Workflow permissions remain `contents: read`.

The baseline already contains the independently verified R1.1 documentation under `F7/R1.1/verification/`. R2 does not delete or modify it.
