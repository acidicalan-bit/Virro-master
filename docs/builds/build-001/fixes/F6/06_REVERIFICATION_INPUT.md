# Reverification Input

Baseline: `6454b7a30ada30800b2836298b2b04f8f25cf324`

Run from the isolated F6 worktree:

```text
node node_modules/vitest/vitest.mjs run tests/outcome/criterion-machine-evidence.test.ts --reporter=verbose
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run tests/integration/build001-f1-canonical-commit.integration.test.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/security/build001-f2-legacy-precision-edit-isolation.test.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/security/build001-trust-foundation.test.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/security/build001-f5-tenant-ownership.test.ts tests/security/legacy-route-surface.test.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/assurance --reporter=verbose
node node_modules/vitest/vitest.mjs run --reporter=verbose --testTimeout=60000
```

The `pnpm run test:sql` wrapper is reported separately if pnpm attempts a non-interactive `node_modules` purge; the underlying Vitest SQL test is the relevant command result.
