# F4 Reverification Input

## Baseline

```text
BASELINE SHA: fb375edd80e89f6146cb10db77da151ef1000d49
BRANCH: codex/build001-f4
WORKTREE: C:/Users/alan-/OneDrive/Documentos/Codex/virro-build001-f4
```

## Commands Executed

```text
pnpm test:sql
pnpm test:model
pnpm test:application
node node_modules/vitest/vitest.mjs run tests/assurance --reporter=dot --testTimeout=30000
node node_modules/vitest/vitest.mjs run tests/security tests/assurance --reporter=dot --testTimeout=30000
node node_modules/vitest/vitest.mjs run --reporter=dot --testTimeout=30000
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node scripts/assurance/generate-build001-manifest.mts --check
node node_modules/next/dist/bin/next build
```

## Full Results

Full Vitest: 47 files passed, 5 skipped; 442 passed, 11 skipped. TypeScript,
ESLint, manifest check and production build passed. No remote E4 target or
production credential was used.

## Remaining Unknown

True multi-session revocation/commit interleaving was not executable with the
repository's PGlite-only local boundary. A disposable deployed or native
PostgreSQL multi-session test is still required for that final concurrency
observation; this is not silently represented as proven.
