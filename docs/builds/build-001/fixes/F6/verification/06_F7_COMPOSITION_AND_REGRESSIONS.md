# F7 Composition and Regressions

F6 binding remains additive to F7: provenance, semantic compatibility, independence, command binding, and definition binding are separately checked. The F7 assurance suite passed 146/146 in the independent run; in particular, perfect labels/hashes without authoritative provenance remain rejected.

Regression commands passed:

- F1 SQL canonical commit: 13/13;
- F2 legacy isolation: 9/9;
- F4 trust foundation: 32/32;
- F5 tenant ownership and legacy route surface: 7/7;
- F7 assurance coverage: 146/146 for `pnpm run test:security`.

These regressions do not negate the F6 finding because they do not prove that every material input to the global verifier status is fingerprinted.
