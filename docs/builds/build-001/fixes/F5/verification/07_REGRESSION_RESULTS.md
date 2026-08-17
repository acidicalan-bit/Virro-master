# Regression Results

Executed from candidate `334382fc4d234a6500712a6ac76c10fe42bd9c0e`.

- F5 focused plus legacy containment: 7/7 PASS.
- F1 local PostgreSQL (`build001-f1-canonical-commit`): 13/13 PASS.
- F2 legacy precision-edit isolation: 9/9 PASS.
- F4 trust foundation/linearization: 32/32 PASS.
- F7 assurance suites: 42/42 PASS.
- Security plus assurance together with 60-second timeout: 14 files, 146/146 PASS.
- Full Vitest: 48 files PASS, 5 skipped; 447 passed, 11 skipped (458 total).
- TypeScript: PASS.
- ESLint over `app`, `src`, `tests`, and `scripts`: exit 0; only the expected ignored CSS warning.
- Assurance manifest check: PASS.
- Production Next build: PASS, including TypeScript and 19/19 static pages.

The literal `pnpm run test:sql` invocation aborted before running because pnpm
attempted to purge the temporary linked `node_modules` without a TTY. The same
script target was then run directly through the installed Vitest binary and
passed 13/13. The same direct execution method was used for the other package
test targets; no test failure was observed.

