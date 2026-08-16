# BUILD 001-F7-R1.1 - Fix evidence

## Required controls

`tests/assurance/derived-independence.test.ts` proves:

- same actor plus declared independence -> `NOT_PROVEN`;
- distinct actors in the same context -> `NOT_PROVEN`;
- missing bindings, identities or contexts -> `NOT_PROVEN`;
- fake declaration without relationships -> `NOT_PROVEN`;
- wrong verifier role -> `NOT_PROVEN`;
- `RECORDED_ONLY` with the same actor -> `PROVEN` when all other semantics match;
- distinct actors and contexts with execution/verification roles -> `PROVEN`, even when display names match and declared metadata says `IMPLEMENTER`.

The R1 semantic attack suite remains unchanged in meaning. The generated manifest records `participantBindings` and `independenceAssessments`; F1 E3 and F2 E2 compatible receipts retain `PROVEN` through their existing automated-or-independent criteria.

Full command results are recorded in the result commit report. No dependency was added or changed.
