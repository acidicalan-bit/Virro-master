# BUILD 001-F7-R1 - Fix evidence

Baseline: `2b6196a382565267069f836f878a82d80df9f223`

## Implementation evidence

- Development assurance schema upgraded to `virro-development-assurance-v2`.
- Receipt self-declaration of `requiredEvidenceLevel` removed.
- Claims now own the minimum level and all semantic requirements.
- Exact semantic compatibility gates PASS and FAIL.
- Criterion version/hash prevents silent semantic reuse.
- Manifest receipts identify the actual exercised boundary: model, PGlite, handler, static inspection or not executed.
- Existing F7 documentation no longer teaches automatic higher-level substitution.

## Focused results

- assurance suite: 3 files, 32 tests passed;
- false-proof regressions A-F: passed;
- F1/F2 evaluator positive controls: passed;
- typecheck: passed;
- manifest freshness: passed after v2 generation.

- F1 SQL: 7/7 passed;
- F2 actual handler: 9/9 passed;
- BUILD 001 model: 30/30 passed;
- security plus assurance: 79/79 passed;
- full Vitest: 374 passed, 11 skipped; 43 files passed, 5 skipped;
- TypeScript, ESLint and production build: passed.

## Scope evidence

No dependency was added. No product runtime, product EvidenceReceipt, migration, Supabase control, F3-F6 implementation or CI workflow was modified.
