# BUILD 001-F7-R1.1-V - Diff scope audit

## Git gate

- candidate: `1f4b1ad3c6a7073dd7b1083a3e25862c9f76755a`;
- baseline and candidate parent: `501db46c421a351be789555dd1a09ca3252bb541`;
- merge-base: `501db46c421a351be789555dd1a09ca3252bb541`;
- initial worktree status: clean.

## Candidate diff

The 17 changed files are confined to:

- `src/assurance/development-evidence.mts`;
- assurance source and generated manifest;
- assurance tests;
- F7/R1 and R1.1 documentation.

No product route/component/runtime, Supabase source, migration, package file, lockfile, CI, F3-F6 implementation, or unrelated security control changed.

## Decision-path audit

Repository-wide search found one qualification path: `createAssuranceManifest` calls `evaluateClaim`, which calls `incompatibilityReasons`, which derives the relationship with `deriveStructuralIndependence`. No legacy evaluator or helper reads `declaredIndependence` to grant compatibility. Its only evaluator use adds a conflict reason after derived independence has already failed.
