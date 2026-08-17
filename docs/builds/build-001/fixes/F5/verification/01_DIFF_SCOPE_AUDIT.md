# Diff Scope Audit

## Ancestry

`git merge-base 9f977fc5f83ebcf48b0316edec79d9ba7edb1520 334382fc4d234a6500712a6ac76c10fe42bd9c0e`
returned `9f977fc5f83ebcf48b0316edec79d9ba7edb1520`.

Commits after the baseline:

- `71b3b812a39a564af4166101249932832162a03d` - canonical ownership implementation.
- `55352a83c81b20f77d3ead2f303334075880b7af` - legacy transaction-lab containment.
- `334382fc4d234a6500712a6ac76c10fe42bd9c0e` - documentation-only evidence count.

## Changed-file classification

| Files | Classification |
|---|---|
| `src/infrastructure/persistence/outcome/supabase-field-beta-repository.ts` | CANONICAL_OWNERSHIP / PRIVILEGED_REPOSITORY |
| `src/infrastructure/persistence/outcome/supabase-outcome-repositories.ts` | CANONICAL_OWNERSHIP / PRIVILEGED_REPOSITORY |
| `src/infrastructure/persistence/supabase-repositories.ts` | PRIVILEGED_REPOSITORY |
| `src/infrastructure/storage/supabase-media-object-store.ts` | STORAGE |
| `src/server/field-beta-services.ts`, `src/server/preservation-services.ts` | PRIVILEGED_REPOSITORY / DERIVED_SCOPE |
| `app/api/transaction-lab/route.ts` | LEGACY_CONTAINMENT |
| `tests/outcome/build005-field-beta.test.ts`, `tests/security/build001-f5-tenant-ownership.test.ts` | TEST |
| `docs/builds/build-001/fixes/F5/**` | DOCUMENTATION |

No migrations, package files, lockfiles, CI, or unrelated product paths changed.
The route change is necessary to remove its prior unscoped service-role fallback.

