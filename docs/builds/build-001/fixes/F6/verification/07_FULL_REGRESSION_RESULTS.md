# Full Regression Results

The candidate had previously completed the deterministic full Vitest run at the exact candidate SHA with **48 test files passed, 5 skipped; 452 tests passed, 11 skipped**. The independent verifier also reran the required focused lanes and `pnpm run test:security` successfully.

Additional checks recorded at the candidate:

- `pnpm run test:model`: 32/32;
- `pnpm run test:application`: 9/9;
- `pnpm run test:sql`: 13/13;
- `node .../tsc --noEmit`: passed;
- ESLint explicit source/test file list: passed;
- assurance manifest `--check`: passed;
- production `next build`: passed.

Full green regressions are insufficient for an `F6_VERIFIED` verdict because the repository-local counterexample demonstrates a semantic binding gap.
