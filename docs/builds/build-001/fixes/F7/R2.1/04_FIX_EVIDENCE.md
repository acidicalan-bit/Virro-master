# R2.1 fix evidence

## Security closure

- pre-patch attack: expected `NOT_PROVEN`, received `PROVEN`;
- post-patch R2.1 matrix: 12/12 passed;
- authoritative self-check receipt: exact ID/hash, Node executable, structured argv, repository-root cwd, exit 0, and `PROVEN`;
- real SQL authoritative receipt: `test:sql`, matching definition hash, Node executing the canonical Vitest argv, exit 0, and `PROVEN`;
- R2 provenance suite: 25/25 passed.

## Ordered regressions

- assurance: 87/87 passed;
- assurance plus security: 134/134 passed;
- F1 real SQL lane: 7/7 passed;
- BUILD 001 model lane: 30/30 passed;
- F2 actual-handler lane: 9/9 passed;
- complete Vitest: 46 files passed, 5 skipped; 429 tests passed, 11 skipped, zero failed;
- TypeScript: passed;
- ESLint: passed with no reported errors or warnings;
- deterministic manifest check: passed;
- production build: passed, including TypeScript and 19 static pages.

## Scope evidence

No package, lockfile, application runtime, product evidence, migration, Supabase, F3-F6, E4, dependency, or general CI change is required. Existing F1/F2 manifest receipts remain explicitly `DECLARED_ONLY`. Manifest schema v4 records the ID/hash requirement model without provenance escalation.
