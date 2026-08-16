# BUILD 001-F7-R1.1 - Attack reproduction

## Before patch

Command:

```text
pnpm exec vitest run tests/assurance/derived-independence.test.ts
```

Persistent attack fixture: semantically matching E3 PASS evidence, criterion `INDEPENDENT_VERIFIER`, identical executor/verifier, and `independence: INDEPENDENT_VERIFIER`.

Observed at baseline `501db46c421a351be789555dd1a09ca3252bb541`:

```text
expected NOT_PROVEN
received PROVEN
1 failed
```

## Attack matrix retained after patch

The test file now preserves attacks for identical actor, identical context, absent executor, absent verifier, absent stable identities/contexts, fake declaration alone and wrong verifier role. It also rejects the removed legacy `independence` field at the strict schema boundary.
