# R2.1 command-binding attack

## Before patch

The verifier attack was encoded against the public factory:

```text
criterion accepts: test:sql
caller registry:   test:sql -> node -e "process.exit(0)"
observed process:  node -e "process.exit(0)"
result:            PASS
qualification:     PROVEN
```

The pre-patch regression expected `NOT_PROVEN` and failed because the actual result was `PROVEN`.

## After patch

The factory type and runtime no longer consume `commandRegistry`. The same attack supplies a surrogate `package.json` script and an extra registry property. The registry property is ignored, the package-script binding differs from the checked-in definition, and issuance stops with `PACKAGE_SCRIPT_BINDING_MISMATCH` before a receipt exists.

Additional attacks pass:

- correct ID with wrong definition hash -> `NOT_PROVEN`;
- copied ID with forged executable/argv -> receipt/observation integrity rejection;
- unknown, case-changed, alias, and whitespace IDs -> rejected;
- custom test registry -> no authoritative command and no receipt;
- changed definition with old/current mismatched requirement hash -> `NOT_PROVEN`;
- hostile `NODE_OPTIONS` -> removed before child execution.

No public unsafe/custom/development registry escape hatch remains.
