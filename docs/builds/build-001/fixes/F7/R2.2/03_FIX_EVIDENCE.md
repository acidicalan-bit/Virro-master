# R2.2 Fix Evidence

Focused R2.2 tests: `5/5` PASS.

The tests prove:

- public context has only `contextId`, has no authority property, and is frozen;
- replacing or injecting an authority-shaped property cannot qualify a forged receipt;
- a legitimate runner-issued receipt remains `PROVEN` through the safe context;
- a manually constructed receipt remains `NOT_PROVEN`;
- R2.1 command-definition hash mismatch remains `NOT_PROVEN` and returned command requirements cannot mutate the private registry.

Regression results:

- assurance: `92/92` PASS;
- security + assurance: `139/139` PASS;
- F1 SQL integration: `7/7` PASS;
- R1 model and F2 application lanes: `39/39` PASS;
- TypeScript: PASS;
- ESLint: PASS;
- assurance manifest check: PASS;
- production build: PASS, 19 static pages;
- full Vitest: `47` files PASS, `5` skipped; `434` tests PASS, `11` skipped, using `--testTimeout=30000` to avoid load-related timeout noise.

No application files, package files, lockfiles, dependencies, migrations, or infrastructure changed.
