# BUILD 001-F5 Reverification Input

Run from the result commit in the isolated F5 worktree:

```text
node node_modules/vitest/vitest.mjs run tests/security/build001-f5-tenant-ownership.test.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/integration/build001-f1-canonical-commit.integration.test.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/security/build001-f2-legacy-precision-edit-isolation.test.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/security/build001-trust-foundation.test.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/assurance --reporter=verbose
node node_modules/typescript/bin/tsc --noEmit
```

Expected security decision: `FIXED` when all focused and regression suites are
green and the full repository checks remain green. No remote RLS claim should
be inferred from these local results.
