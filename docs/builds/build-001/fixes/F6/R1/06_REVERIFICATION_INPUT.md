# Reverification Input

Baseline SHA: `5d85eee43741b18104f3817b4418623596e83bf8`.

Required commands:

```text
node node_modules/vitest/vitest.mjs run tests/outcome/criterion-machine-evidence.test.ts --reporter=verbose
pnpm run test:sql
pnpm run test:model
pnpm run test:application
pnpm run test:security
node node_modules/vitest/vitest.mjs run --reporter=dot --testTimeout=60000
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js <explicit app/src/tests/scripts file list>
node scripts/assurance/generate-build001-manifest.mts --check
node node_modules/next/dist/bin/next build
```

The result must preserve `FAILED` versus `INCOMPLETE` and must not promote a partial historical F6 binding.
